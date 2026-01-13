
import React, { useState, useEffect, useRef, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { LessonPlan, ConfusionAnalysis, Subject, ExamProctoringAnalysis } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';
import { HierarchyContext } from '../../App';
import { DatabaseService } from '../../services/databaseService';

const TeacherDashboard = () => {
    const { subjects, currentUserId, students: globalStudents, userProfile } = useContext(HierarchyContext);
    const [proctoringLogs, setProctoringLogs] = useState<any[]>([]);
    const [view, setView] = useState<'overview' | 'proctoring'>('overview');
    
    const mySubjects = subjects.filter(s => s.teacherId === currentUserId);
    
    // In a real scenario, this would be fetched based on assigned students
    const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);

    const [lpInput, setLpInput] = useState({ subject: mySubjects[0]?.name || 'General Science', grade: '10th Grade', objectives: '' });
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [confusionAnalysis, setConfusionAnalysis] = useState<ConfusionAnalysis | null>(null);
    const [analyzingConfusion, setAnalyzingConfusion] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            // Requirement: Pass currentUserId to restrict proctoring data
            const logs = await DatabaseService.getRecentProctoringLogs(currentUserId);
            if (Array.isArray(logs)) {
                setProctoringLogs(logs.filter(l => l.mode === 'EXAM' || l.mode === 'PROCTORING_EVIDENCE'));
            }
        };

        const fetchAnalytics = async () => {
            const data = await DatabaseService.getDetailedStudentAnalytics(currentUserId);
            const flagged = data.filter(s => s.confusionIndex > 60);
            setAtRiskStudents(flagged);
        };

        fetchLogs();
        fetchAnalytics();
        const interval = setInterval(() => {
            fetchLogs();
            fetchAnalytics();
        }, 10000);
        return () => clearInterval(interval);
    }, [currentUserId]);

    const handleGenerate = async () => {
        if (!lpInput.objectives) return;
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

    const confusionScore = confusionAnalysis?.confusionScore || 12;

    return (
        <div className="space-y-8 animate-fade-in-up pb-20 relative px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-teal-600 text-white px-2 py-0.5 rounded-md uppercase tracking-widest">Faculty Account</span>
                        <span className="text-[10px] font-black text-teal-600/60 uppercase tracking-widest">Identity: {currentUserId.substring(0,8)}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Hello, {userProfile?.full_name?.split(' ')[0] || 'Professor'}.</h1>
                    <p className="text-slate-500 font-medium mt-2">Overseeing assigned students • Restricted Access Active</p>
                </div>
                <div className="flex bg-white/70 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 shadow-sm ring-4 ring-slate-100/50">
                    <button onClick={() => setView('overview')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'overview' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>📊 Overview</button>
                    <button onClick={() => setView('proctoring')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'proctoring' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>🛡️ Proctoring</button>
                </div>
            </div>

            {view === 'overview' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white border-2 border-teal-500 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[180px] group hover:bg-teal-500 transition-all duration-300">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-600 group-hover:text-teal-100 mb-1">Roster Count</h3>
                                <p className="text-5xl font-black text-slate-900 group-hover:text-white">{atRiskStudents.length + 12}</p>
                            </div>
                            <div className="flex justify-between items-end"><div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-xl group-hover:bg-white/20">🎓</div></div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-[32px] p-6 flex flex-col justify-between h-[180px] shadow-sm relative overflow-hidden">
                             <div className="relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Assigned Pulse</h3>
                                <div className="text-5xl font-black text-slate-900">{confusionScore}%</div>
                                <div className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Average Confusion</div>
                             </div>
                             <button onClick={() => fileInputRef.current?.click()} className="relative z-10 w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2">📸 {analyzingConfusion ? 'SCANNING...' : 'CAM FEED'}</button>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSnapshotUpload} />
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[32px] p-6 flex flex-col justify-between h-[180px] shadow-sm">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Assigned Tasks</h3>
                                <p className="text-5xl font-black text-slate-900">8</p>
                            </div>
                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Roster Monitoring 📝</div>
                        </div>

                        <div className="bg-slate-900 rounded-[32px] p-6 text-white flex flex-col justify-between h-[180px] shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Oversight Mode</h3>
                                <p className="text-4xl font-black">{proctoringLogs.length > 0 ? 'ACTIVE' : 'READY'}</p>
                            </div>
                            <div className="absolute right-0 bottom-0 p-4 opacity-10 text-6xl">🛡️</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[40px] p-10 shadow-sm lg:col-span-2">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                    Roster Critical Alerts
                                </h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{atRiskStudents.length} HIGH CONFUSION DETECTED</span>
                            </div>
                            <div className="space-y-6">
                                {atRiskStudents.length === 0 ? (
                                    <div className="py-20 text-center opacity-30">
                                        <div className="text-6xl mb-4">✅</div>
                                        <p className="font-bold">No critical cognitive flags in your roster.</p>
                                    </div>
                                ) : (
                                    atRiskStudents.map((student, idx) => (
                                        <div key={idx} className="bg-white border border-slate-100 rounded-[28px] p-6 flex items-center justify-between group hover:border-red-200 transition-all shadow-sm">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-lg text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">{student.name.charAt(0)}</div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-lg">{student.name}</div>
                                                    <div className="text-[10px] text-rose-500 font-extrabold uppercase tracking-widest">Confidence Index: {student.confusionIndex}%</div>
                                                </div>
                                            </div>
                                            <button className="text-[10px] text-indigo-500 font-black hover:underline uppercase tracking-widest">Intervene ➔</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl border border-teal-100 rounded-[40px] p-10 shadow-sm flex flex-col">
                            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
                                <span className="p-3 bg-teal-50 rounded-2xl text-teal-600 text-xl shadow-inner">✨</span> Lab Synthesizer
                            </h3>
                            <div className="space-y-6 flex-1">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">Active Target</label>
                                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm outline-none font-bold text-slate-700 focus:border-teal-500 transition-all cursor-pointer">
                                        <option>Assigned Group Alpha</option>
                                        <option>Custom Lab Session</option>
                                    </select>
                                </div>
                                <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm h-48 resize-none transition-all outline-none" placeholder="Session objectives..." value={lpInput.objectives} onChange={e => setLpInput({...lpInput, objectives: e.target.value})} />
                                <button onClick={handleGenerate} disabled={loading} className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all">
                                    {loading ? 'Synthesizing...' : 'Generate ➔'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-slate-900 rounded-[48px] border border-white/10 p-12 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-12">
                                <div>
                                    <h2 className="text-3xl font-black text-white flex items-center gap-4">
                                        <span className="w-4 h-4 bg-rose-500 rounded-full animate-pulse"></span>
                                        Roster Proctoring Grid
                                    </h2>
                                    <p className="text-slate-400 mt-2 text-lg">Monitoring exclusively assigned student sessions.</p>
                                </div>
                            </div>

                            {proctoringLogs.length === 0 ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center opacity-30 text-slate-500">
                                    <div className="text-8xl mb-6">🛡️</div>
                                    <p className="text-2xl font-bold">No active links from your assigned roster.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-8">
                                    {proctoringLogs.map((log, i) => {
                                        const student = globalStudents.find(s => s.id === log.studentId);
                                        return (
                                            <div key={i} className="bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/10 transition-all">
                                                <div className="flex flex-col lg:flex-row justify-between gap-10">
                                                    <div className="flex items-center gap-8 min-w-[250px]">
                                                        <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-2xl font-black">
                                                            {student?.name?.charAt(0) || 'S'}
                                                        </div>
                                                        <div>
                                                            <div className="text-white font-black text-xl tracking-tight">{student?.name || 'Assigned Student'}</div>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-emerald-400">Secure Link Initialized</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <button className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest">Access Vault</button>
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
