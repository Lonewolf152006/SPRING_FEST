
import React, { useState, useEffect, useRef, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { LessonPlan, ConfusionAnalysis, Subject, ExamProctoringAnalysis } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';
import { HierarchyContext } from '../../App';

interface FollowUpTask {
    id: string;
    desc: string;
    assignee: string;
    date: string;
    status: 'pending' | 'done';
}

interface AtRiskStudent {
    name: string;
    issue: string;
    gpa: number;
    attendance: number;
    trend: 'down' | 'flat' | 'up';
    recentScores: { task: string; score: number }[];
    participation: string;
    notes: string;
    tasks: FollowUpTask[];
}

const TeacherDashboard = () => {
    const { subjects, currentUserId, students: globalStudents } = useContext(HierarchyContext);
    const [proctoringLogs, setProctoringLogs] = useState<any[]>([]);
    const [view, setView] = useState<'overview' | 'proctoring'>('overview');
    
    // Filtered subjects for current teacher
    const mySubjects = subjects.filter(s => s.teacherId === currentUserId);
    
    const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([
        { 
            name: "Jordan Lee", 
            issue: "Declining Engagement", 
            gpa: 2.4, 
            attendance: 78, 
            trend: 'down',
            recentScores: [ { task: "Quiz 1", score: 85 }, { task: "Midterm", score: 72 }, { task: "Final Project", score: 60 } ],
            participation: "Rarely volunteers. Often distracted during lectures.",
            notes: "Needs a parent conference regarding recent drop in focus.",
            tasks: [
                { id: '1', desc: 'Schedule Parent Conference', assignee: 'Me', date: 'Oct 28', status: 'pending' },
                { id: '2', desc: 'Alert School Counselor', assignee: 'Mr. Davis', date: 'Oct 29', status: 'done' }
            ]
        },
        { 
            name: "Casey Ray", 
            issue: "Missed Homework", 
            gpa: 2.9, 
            attendance: 85, 
            trend: 'flat',
            recentScores: [ { task: "Calculus Test", score: 82 }, { task: "Lit Review", score: 45 }, { task: "Chem Lab", score: 88 } ],
            participation: "Active in class but inconsistent with submissions.",
            notes: "Check in about workload management.",
            tasks: []
        }
    ]);

    const [lpInput, setLpInput] = useState({ subject: mySubjects[0]?.name || '', grade: '10th Grade', objectives: '' });
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [confusionAnalysis, setConfusionAnalysis] = useState<ConfusionAnalysis | null>(null);
    const [analyzingConfusion, setAnalyzingConfusion] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Properly handled async fetching to avoid calling .filter() on a Promise
    useEffect(() => {
        const fetchLogs = async () => {
            const logs = await GeminiService.getProctoringLogs();
            if (Array.isArray(logs)) {
                setProctoringLogs(logs.filter(l => l.mode === 'EXAM'));
            }
        };
        const interval = setInterval(fetchLogs, 5000);
        fetchLogs();
        return () => clearInterval(interval);
    }, []);

    const handleGenerate = async () => {
        if (!lpInput.subject || !lpInput.grade || !lpInput.objectives) return;
        setLoading(true);
        try {
            const plan = await GeminiService.createLessonPlan(lpInput.subject, lpInput.grade, lpInput.objectives);
            setLessonPlan(plan);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleSnapshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        setAnalyzingConfusion(true);
        const base64 = await blobToBase64(file);
        const res = await GeminiService.analyzeClassroomImage(base64);
        setConfusionAnalysis(res);
        setAnalyzingConfusion(false);
    }

    const confusionScore = confusionAnalysis?.confusionScore || 0;

    return (
        <div className="space-y-8 animate-fade-in-up pb-20 relative px-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Command Center</h1>
                    <p className="text-slate-500 text-sm mt-1">Real-time faculty oversight & curriculum adaptation</p>
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                    <button 
                        onClick={() => setView('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
                    >
                        📊 Overview
                    </button>
                    <button 
                        onClick={() => setView('proctoring')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'proctoring' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500'}`}
                    >
                        🛡️ Secure Proctoring
                    </button>
                </div>
            </div>

            {view === 'overview' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-teal-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[180px]">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Class Mastery</h3>
                                <p className="text-5xl font-bold mt-2">76%</p>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mt-2 bg-white/10 w-fit px-2 py-1 rounded">Target: 80% Term Avg</div>
                            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 translate-y-10 blur-xl"></div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[180px] shadow-sm">
                             <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">Classroom Engagement</h3>
                             <div className="flex flex-col items-center">
                                <div className="text-5xl font-bold text-slate-800">{confusionScore}%</div>
                                <div className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Confusion Index</div>
                             </div>
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                             >
                                📸 {analyzingConfusion ? 'Analyzing...' : 'Snap Classroom'}
                             </button>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSnapshotUpload} />
                        </div>

                        <div className="bg-indigo-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[180px]">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Assignments Sent</h3>
                                <p className="text-5xl font-bold mt-2">12</p>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mt-2 bg-white/10 w-fit px-2 py-1 rounded">4 Pending Review</div>
                            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 translate-y-10 blur-xl"></div>
                        </div>

                        <div className="bg-rose-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-between min-h-[180px]">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Active Exams</h3>
                                <p className="text-5xl font-bold mt-2">{proctoringLogs.length > 0 ? '1' : '0'}</p>
                            </div>
                            <button onClick={() => setView('proctoring')} className="text-[10px] font-bold uppercase tracking-widest mt-2 bg-white text-rose-500 w-fit px-3 py-1.5 rounded-xl">View Proctoring</button>
                            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 translate-y-10 blur-xl"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white/70 backdrop-blur-xl border border-red-100 rounded-3xl p-8 shadow-sm lg:col-span-2">
                            <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                                <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                Students At Risk
                            </h3>
                            <div className="space-y-6">
                                {atRiskStudents.map((student, idx) => (
                                    <div key={idx} className="bg-white border border-slate-100 rounded-[24px] p-6 flex items-center justify-between group hover:border-red-200 transition-all shadow-sm">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">{student.name.charAt(0)}</div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-lg">{student.name}</div>
                                                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{student.issue}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-red-500">GPA {student.gpa}</div>
                                            <button className="text-[10px] text-indigo-500 font-bold hover:underline uppercase tracking-widest">Intervention Logs</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl border border-indigo-100 rounded-3xl p-8 shadow-sm flex flex-col">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <span className="p-2 bg-indigo-50 rounded-xl">✨</span> AI Lesson Planner
                            </h3>
                            <div className="space-y-5 flex-1">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Assigned Subject</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-bold text-slate-700"
                                        value={lpInput.subject}
                                        onChange={e => setLpInput({...lpInput, subject: e.target.value})}
                                    >
                                        {mySubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Learning Objectives</label>
                                    <textarea 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-40 resize-none transition-all focus:bg-white focus:border-indigo-500 outline-none"
                                        placeholder="Enter curriculum goals..."
                                        value={lpInput.objectives}
                                        onChange={e => setLpInput({...lpInput, objectives: e.target.value})}
                                    />
                                </div>
                                <button 
                                    onClick={handleGenerate}
                                    className="w-full py-4 bg-indigo-600 text-white font-extrabold rounded-xl shadow-lg hover:bg-indigo-500 transition-all active:scale-[0.98] mt-4"
                                >
                                    {loading ? 'Thinking...' : 'Generate Adaptive Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-slate-900 rounded-[40px] border border-white/10 p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <div className="text-[150px] font-black text-white">SECURE</div>
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                                        Institutional Proctoring Dashboard
                                    </h2>
                                    <p className="text-slate-400 mt-1">Real-time cognitive & emotional state analysis of examinees.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Exam Sessions</div>
                                    <div className="text-white font-black text-2xl">{proctoringLogs.length > 0 ? '1' : '0'}</div>
                                </div>
                            </div>

                            {proctoringLogs.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 text-slate-500">
                                    <div className="text-7xl mb-4">🛡️</div>
                                    <p className="text-xl">No secure exam sessions are currently active.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {proctoringLogs.map((log, i) => {
                                        const student = globalStudents.find(s => s.id === log.studentId);
                                        const { proctoring } = log;
                                        
                                        return (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/10 transition-all group">
                                                <div className="flex flex-col lg:flex-row justify-between gap-8">
                                                    <div className="flex items-center gap-6 min-w-[200px]">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${proctoring.faceDetected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                            {student?.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-white font-bold text-lg">{student?.name}</div>
                                                            <div className={`text-[10px] font-black uppercase tracking-widest ${proctoring.faceDetected ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {proctoring.faceDetected ? 'Face Detected' : 'FACE NOT FOUND'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                                                        <div>
                                                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-2">
                                                                <span>Attention</span>
                                                                <span className="text-white">{proctoring.attentionScore}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500" style={{width: `${proctoring.attentionScore}%`}}></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-2">
                                                                <span>Confusion</span>
                                                                <span className="text-white">{proctoring.confusionScore}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-500" style={{width: `${proctoring.confusionScore}%`}}></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-2">
                                                                <span>Stress</span>
                                                                <span className="text-white">{proctoring.stressScore}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div className={`h-full ${proctoring.stressScore > 70 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{width: `${proctoring.stressScore}%`}}></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-2">
                                                                <span>Confidence</span>
                                                                <span className="text-white">{proctoring.confidenceScore}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500" style={{width: `${proctoring.confidenceScore}%`}}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center">
                                                        <button className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all">Secure Log</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TeacherDashboard;
