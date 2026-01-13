import { supabase } from "./supabaseClient";
import { Task, PeerReview, MoodEntry, EventPlan, Poll, SchoolClass } from "../types";

export const DatabaseService = {
    // --- Connectivity Check ---
    async ping(): Promise<boolean> {
        try {
            if (!supabase) return false;
            const { data, error } = await supabase.from('profiles').select('id').limit(1);
            if (error) throw error;
            return true;
        } catch (e) {
            console.error("Database connection check failed:", e);
            return false;
        }
    },

    // --- User Stats (XP/Level) ---
    async getUserStats(userId: string): Promise<{ xp: number; level: number }> {
        const localKey = `amep_stats_${userId}`;
        try {
            if (!supabase) {
                const saved = localStorage.getItem(localKey);
                return saved ? JSON.parse(saved) : { xp: 0, level: 1 };
            }

            const { data, error } = await supabase
                .from('amep_user_stats')
                .select('xp, level')
                .eq('user_id', userId)
                .single();
            
            if (error || !data) {
                const initial = { user_id: userId, xp: 0, level: 1, updated_at: new Date().toISOString() };
                await supabase.from('amep_user_stats').insert(initial);
                return { xp: 0, level: 1 };
            }
            return data;
        } catch (e) {
            const saved = localStorage.getItem(localKey);
            return saved ? JSON.parse(saved) : { xp: 0, level: 1 };
        }
    },

    async updateUserStats(userId: string, xp: number, level: number) {
        const localKey = `amep_stats_${userId}`;
        localStorage.setItem(localKey, JSON.stringify({ xp, level }));
        try {
            if (!supabase) return;
            await supabase
                .from('amep_user_stats')
                .upsert({ 
                    user_id: userId, 
                    xp: xp, 
                    level: level,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        } catch (e) {
            console.warn("Stats persistence failed.");
        }
    },

    // --- Class Management ---
    async getClasses(): Promise<SchoolClass[]> {
        try {
            if (!supabase) return [];
            // Assuming a table amep_classes exists
            const { data, error } = await supabase.from('amep_classes').select('*');
            if (error) throw error;
            return (data || []).map(c => ({
                id: c.id,
                name: c.name,
                teacherIds: c.teacher_ids || [],
                studentIds: c.student_ids || []
            }));
        } catch (e) {
            return [];
        }
    },

    async createClass(name: string): Promise<SchoolClass | null> {
        try {
            if (!supabase) return null;
            const { data, error } = await supabase.from('amep_classes').insert({ name }).select().single();
            if (error) throw error;
            return {
                id: data.id,
                name: data.name,
                teacherIds: [],
                studentIds: []
            };
        } catch (e) {
            console.error("Failed to create class:", e);
            return null;
        }
    },

    // --- Assignments Management ---
    async getAssignments(): Promise<any[]> {
        try {
            if (!supabase) return [];
            const { data, error } = await supabase.from('amep_assignments').select('*');
            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async syncAssignments(teacherId: string, studentIds: string[]) {
        try {
            if (!supabase) return;
            // Clear existing for this teacher
            await supabase.from('amep_assignments').delete().eq('teacher_id', teacherId);
            // Bulk insert new
            if (studentIds.length > 0) {
                const inserts = studentIds.map(sid => ({ teacher_id: teacherId, student_id: sid }));
                await supabase.from('amep_assignments').insert(inserts);
            }
        } catch (e) {
            console.error("Assignment sync failed:", e);
        }
    },

    // --- Student Performance Ledger Data ---
    async getDetailedStudentAnalytics(teacherId?: string): Promise<any[]> {
        try {
            if (!supabase) throw new Error("Offline");

            let assignedStudentIds: string[] | null = null;
            if (teacherId) {
                const { data: assignments } = await supabase
                    .from('amep_assignments')
                    .select('student_id')
                    .eq('teacher_id', teacherId);
                assignedStudentIds = (assignments || []).map(a => a.student_id);
                if (assignedStudentIds.length === 0) return [];
            }

            let query = supabase.from('profiles').select('id, full_name, email').eq('role', 'Student');
            if (assignedStudentIds) {
                query = query.in('id', assignedStudentIds);
            }
            
            const { data: profiles, error: pError } = await query;
            if (pError) throw pError;

            const { data: mastery } = await supabase.from('amep_mastery').select('*');
            const { data: logs } = await supabase
                .from('amep_proctoring_logs')
                .select('*')
                .order('created_at', { ascending: false });

            return (profiles || []).map(p => {
                const studentMastery = (mastery || []).filter(m => m.user_id === p.id);
                const recentLog = (logs || []).find(l => l.user_id === p.id && l.report_data?.confusionScore !== undefined);
                
                return {
                    id: p.id,
                    name: p.full_name,
                    email: p.email || `${p.full_name.toLowerCase().replace(' ', '.')}@amep-edu.org`,
                    confusionIndex: recentLog?.report_data?.confusionScore ?? 0,
                    mood: recentLog?.report_data?.mood || 'Stable',
                    mastery: studentMastery.map(m => ({
                        subjectId: m.subject_id,
                        score: m.score
                    })),
                    lastActive: recentLog?.created_at || new Date().toISOString()
                };
            });
        } catch (e) {
            return [];
        }
    },

    async getLatestStudentMetric(studentId: string): Promise<any | null> {
        try {
            if (!supabase) return null;
            const { data, error } = await supabase
                .from('amep_proctoring_logs')
                .select('report_data')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error || !data) return null;
            const report = data.report_data;
            if (report?.confusionScore !== undefined) {
                return {
                    confusionScore: report.confusionScore,
                    summary: report.summary || "System sync successful.",
                    mood: report.mood || 'focused'
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Subscribes to real-time updates for a specific student's biometric metrics.
     * Uses Supabase Realtime (WebSockets) to push updates instantly.
     */
    subscribeToStudentMetrics(studentId: string, callback: (data: any) => void) {
        if (!supabase) return () => {};
        
        const channel = supabase
            .channel(`student-metrics-${studentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'amep_proctoring_logs',
                    filter: `user_id=eq.${studentId}`,
                },
                (payload) => {
                    const report = payload.new.report_data;
                    // Filter for reports containing confusion scores
                    if (report && report.confusionScore !== undefined) {
                        callback({
                            confusionScore: report.confusionScore,
                            summary: report.summary || "Real-time sync update received.",
                            mood: report.mood || 'focused'
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] Subscription status for ${studentId}: ${status}`);
            });
            
        return () => {
            supabase.removeChannel(channel);
        };
    },

    // --- Tasks ---
    async getTasks(userId: string): Promise<Task[]> {
        try {
            if (!supabase) return [];
            const { data, error } = await supabase.from('amep_tasks').select('*').eq('user_id', userId);
            if (error) throw error;
            return data || [];
        } catch (error) {
            return [];
        }
    },

    async upsertTask(userId: string, task: Task) {
        try {
            if (!supabase) return;
            await supabase.from('amep_tasks').upsert({ 
                id: task.id, 
                user_id: userId, 
                title: task.title, 
                status: task.status, 
                priority: task.priority, 
                deadline: task.deadline, 
                source: task.source 
            });
        } catch (error) {
            console.warn("Task sync failed.");
        }
    },

    // --- Mastery ---
    async getMasteryScores(userId: string): Promise<Record<string, number>> {
        try {
            if (!supabase) return {};
            const { data, error } = await supabase.from('amep_mastery').select('subject_id, score').eq('user_id', userId);
            if (error) throw error;
            return (data || []).reduce((acc, curr) => ({ ...acc, [curr.subject_id]: curr.score }), {});
        } catch (error) {
             return {};
        }
    },

    async updateMasteryScore(userId: string, subjectId: string, score: number) {
        try {
            if (!supabase) return;
            await supabase.from('amep_mastery').upsert({ 
                user_id: userId, 
                subject_id: subjectId, 
                score: score,
                last_updated: new Date().toISOString()
            }, { onConflict: 'user_id,subject_id' });
        } catch (error) {
            console.warn("Mastery sync failed.");
        }
    },

    // --- Logging & Sessions ---
    async logSession(userId: string, mode: string, reportData: any) {
        try {
            if (!supabase) return;
            await supabase.from('amep_proctoring_logs').insert({
                user_id: userId,
                mode: mode,
                report_data: reportData,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.warn("Log failed.");
        }
    },

    async saveSessionSnapshot(userId: string, base64Image: string, sessionMode: string, step: number) {
        try {
            if (!supabase) return;
            await supabase.from('amep_proctoring_logs').insert({
                user_id: userId,
                mode: 'PROCTORING_EVIDENCE',
                report_data: { sessionMode, step, snapshot: base64Image, timestamp: Date.now(), event: 'PERIODIC_10S_CHECK' },
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Proctoring evidence storage failed:", e);
        }
    },

    async getRecentProctoringLogs(teacherId?: string): Promise<any[]> {
        try {
            if (!supabase) return [];
            
            let assignedStudentIds: string[] | null = null;
            if (teacherId) {
                const { data: assignments } = await supabase.from('amep_assignments').select('student_id').eq('teacher_id', teacherId);
                assignedStudentIds = (assignments || []).map(a => a.student_id);
                if (assignedStudentIds.length === 0) return [];
            }

            let query = supabase.from('amep_proctoring_logs').select('*').order('created_at', { ascending: false }).limit(50);
            if (assignedStudentIds) {
                query = query.in('user_id', assignedStudentIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map(log => ({
                ...log.report_data,
                id: log.id,
                created_at: log.created_at,
                mode: log.mode,
                studentId: log.user_id
            }));
        } catch (e) {
             return [];
        }
    },

    // --- Interactive Polls ---
    async createPoll(poll: Poll) {
        try {
            if (!supabase) return;
            await supabase.from('amep_polls').insert({
                id: poll.id,
                teacher_id: 'T1',
                question: poll.question,
                options: poll.options,
                is_active: poll.isActive,
                created_at: new Date().toISOString()
            });
        } catch (e) {
             console.warn("Poll failed.");
        }
    },

    async getActivePoll(): Promise<Poll | null> {
        try {
            if (!supabase) return null;
            const { data, error } = await supabase
                .from('amep_polls')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (error || !data) return null;
            return {
                id: data.id,
                question: data.question,
                options: data.options,
                totalVotes: data.options.reduce((acc: number, o: any) => acc + o.votes, 0),
                isActive: data.is_active
            };
        } catch (e) {
             return null;
        }
    },

    // --- Event Planning ---
    async saveEventPlan(userId: string, plan: EventPlan, prompt: string) {
        try {
            if (!supabase) return;
            await supabase.from('amep_event_plans').insert({
                user_id: userId,
                prompt: prompt,
                checklist: plan.checklist,
                email_draft: plan.emailDraft,
                budget_estimate: plan.budgetEstimate,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Event plan storage failed:", e);
        }
    },

    // --- Wellness Entries ---
    async saveWellnessEntry(userId: string, entry: MoodEntry) {
        try {
            if (!supabase) return;
            await supabase.from('amep_wellness_entries').insert({
                user_id: userId,
                transcription: entry.transcription,
                sentiment: entry.sentiment,
                score: entry.score,
                advice: entry.advice,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Wellness entry storage failed:", e);
        }
    },

    async getWellnessEntries(userId: string): Promise<any[]> {
        try {
            if (!supabase) return [];
            const { data, error } = await supabase
                .from('amep_wellness_entries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("Failed to fetch wellness entries:", e);
            return [];
        }
    }
};