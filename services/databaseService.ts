
import { supabase } from "./supabaseClient";
import { Task, PeerReview, MoodEntry, EventPlan, Poll } from "../types";

export const DatabaseService = {
    // --- Tasks ---
    async getTasks(userId: string): Promise<Task[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('amep_tasks')
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }
        return data || [];
    },

    async upsertTask(userId: string, task: Task) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_tasks')
            .upsert({ 
                id: task.id, 
                user_id: userId, 
                title: task.title, 
                status: task.status, 
                priority: task.priority, 
                deadline: task.deadline, 
                source: task.source 
            });
        if (error) console.error("Error saving task:", error);
    },

    // --- Mastery ---
    async getMasteryScores(userId: string): Promise<Record<string, number>> {
        if (!supabase) return {};
        const { data, error } = await supabase
            .from('amep_mastery')
            .select('subject_id, score')
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error fetching mastery:", error);
            return {};
        }
        
        return (data || []).reduce((acc, curr) => ({
            ...acc,
            [curr.subject_id]: curr.score
        }), {});
    },

    async updateMasteryScore(userId: string, subjectId: string, score: number) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_mastery')
            .upsert({ 
                user_id: userId, 
                subject_id: subjectId, 
                score: score,
                last_updated: new Date().toISOString()
            }, { onConflict: 'user_id,subject_id' });
        
        if (error) console.error("Error updating mastery:", error);
    },

    // --- Proctoring & Logs ---
    async logSession(userId: string, mode: string, reportData: any) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_proctoring_logs')
            .insert({
                user_id: userId,
                mode: mode,
                report_data: reportData
            });

        if (error) console.error("Error logging session:", error);
    },

    async getRecentProctoringLogs(limit = 50) {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('amep_proctoring_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error("Error fetching proctoring logs:", error);
            return [];
        }
        return data || [];
    },

    // --- Peer Reviews ---
    async savePeerReview(review: PeerReview) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_peer_reviews')
            .insert({
                id: review.id,
                team_id: review.teamId,
                from_id: review.fromStudentId,
                to_id: review.toStudentId,
                scores: {
                    teamwork: review.teamworkScore,
                    creativity: review.creativityScore,
                    communication: review.communicationScore
                },
                comment: review.comment
            });

        if (error) console.error("Error saving peer review:", error);
    },

    async getPeerReviews(teamId?: string) {
        if (!supabase) return [];
        let query = supabase.from('amep_peer_reviews').select('*');
        if (teamId) query = query.eq('team_id', teamId);
        
        const { data, error } = await query;
        if (error) {
            console.error("Error fetching peer reviews:", error);
            return [];
        }

        return (data || []).map(d => ({
            id: d.id,
            teamId: d.team_id,
            fromStudentId: d.from_id,
            toStudentId: d.to_id,
            teamworkScore: d.scores.teamwork,
            creativityScore: d.scores.creativity,
            communicationScore: d.scores.communication,
            comment: d.comment,
            timestamp: new Date(d.created_at).getTime()
        }));
    },

    // --- Wellness ---
    async saveWellnessEntry(userId: string, entry: MoodEntry) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_wellness_entries')
            .insert({
                user_id: userId,
                transcription: entry.transcription,
                sentiment: entry.sentiment,
                score: entry.score,
                advice: entry.advice
            });
        if (error) console.error("Error saving wellness entry:", error);
    },

    async getWellnessEntries(userId: string) {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('amep_wellness_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error fetching wellness entries:", error);
            return [];
        }
        return data || [];
    },

    // --- Events ---
    async saveEventPlan(userId: string, plan: EventPlan, idea: string) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_event_plans')
            .insert({
                user_id: userId,
                idea: idea,
                checklist: plan.checklist,
                budget: plan.budgetEstimate,
                email_draft: plan.emailDraft
            });
        if (error) console.error("Error saving event plan:", error);
    },

    // --- Live Polls ---
    async createPoll(poll: Poll, teacherId: string) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_polls')
            .insert({
                id: poll.id,
                teacher_id: teacherId,
                question: poll.question,
                options: poll.options,
                is_active: poll.isActive
            });
        if (error) console.error("Error creating poll:", error);
    },

    async getActivePoll(): Promise<Poll | null> {
        if (!supabase) return null;
        const { data, error } = await supabase
            .from('amep_polls')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;
        return {
            id: data.id,
            question: data.question,
            options: data.options,
            totalVotes: data.options.reduce((acc: number, o: any) => acc + o.votes, 0),
            isActive: data.is_active
        };
    },

    async updatePollVotes(pollId: string, options: any[]) {
        if (!supabase) return;
        const { error } = await supabase
            .from('amep_polls')
            .update({ options: options })
            .eq('id', pollId);
        if (error) console.error("Error updating poll votes:", error);
    }
};
