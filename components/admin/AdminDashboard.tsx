
import React, { useState, useEffect, useContext } from 'react';
import { AdminReport, SchoolClass, Subject } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { HierarchyContext } from '../../App';

const AdminDashboard = () => {
    const { classes, subjects } = useContext(HierarchyContext);
    const [report, setReport] = useState<AdminReport | null>(null);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [viewMode, setViewMode] = useState<'analytics' | 'hierarchy'>('analytics');

    useEffect(() => {
        const mockStats = { term: 'Spring 2024', activeUsers: 4500, avgGrade: 88, dept: 'Engineering' };
        GeminiService.generateAdminReport(mockStats).then(setReport);
    }, []);

    const overallMastery = subjects.length > 0 
        ? Math.round(subjects.reduce((acc, sub) => acc + (sub.concepts.reduce((a, c) => a + c.masteryScore, 0) / sub.concepts.length), 0) / subjects.length)
        : 0;

    return (
        <div className="animate-fade-in-up space-y-8 pb-10 px-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Institutional Intelligence</h1>
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                    <button onClick={() => setViewMode('analytics')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Analytics</button>
                    <button onClick={() => setViewMode('hierarchy')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'hierarchy' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Structure Management</button>
                </div>
            </div>
            
            {viewMode === 'analytics' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-[200px]">
                            <h3 className="font-bold opacity-80 text-sm uppercase">Unified Mastery</h3>
                            <p className="text-5xl font-bold">{overallMastery}%</p>
                            <div className="text-xs bg-white/20 px-2 py-1 rounded inline-block w-fit">Across {subjects.length} Subjects</div>
                            <div className="absolute -right-4 -bottom-4 text-9xl opacity-10">📉</div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-[200px] flex flex-col justify-between">
                            <h3 className="font-bold text-slate-400 text-sm uppercase">Adoption Pulse</h3>
                            <div className="text-4xl font-bold text-slate-800">{report?.adoptionRate || 92}%</div>
                            <div className="flex gap-1 h-12 items-end">
                                {[30, 45, 60, 55, 80, 95, 92].map((h, i) => (
                                    <div key={i} className="flex-1 bg-indigo-100 rounded-t group-hover:bg-indigo-500 transition-colors" style={{height: `${h}%`}}></div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl h-[200px] flex flex-col justify-between">
                            <h3 className="font-bold opacity-80 text-sm uppercase">Confidence Score</h3>
                            <p className="text-5xl font-bold">{report?.adminConfidenceScore || 85}/100</p>
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full" style={{width: `${report?.adminConfidenceScore || 85}%`}}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-indigo-100 p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                            AI Institutional Health Summary
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed italic">
                            "{report?.institutionHealthPulse || "Synchronizing cross-departmental data feeds..."}"
                        </p>
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Class & Subject Management */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-slate-800">Structure Registry</h3>
                             <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm">Add New Class</button>
                        </div>
                        <div className="space-y-4">
                            {classes.map(cls => (
                                <div key={cls.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-slate-700">{cls.name}</h4>
                                        <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-full font-bold uppercase text-slate-400">Class ID: {cls.id}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {subjects.filter(s => s.classId === cls.id).map(s => (
                                            <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-indigo-500">📚</span>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{s.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase">Teacher: {s.teacherId}</div>
                                                    </div>
                                                </div>
                                                <button className="text-[10px] font-bold text-indigo-600 hover:underline">Edit Subject</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-indigo-200 hover:text-indigo-400 transition-all">+ Assign Subject</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Teacher Adoption Rates */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6">Faculty Engagement</h3>
                        <div className="space-y-6">
                            {['Prof. Day (T1)', 'Dr. Vance (T2)', 'Sarah Jenkins (T3)'].map((teacher, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">{teacher.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-bold text-slate-700">{teacher}</span>
                                            <span className="text-xs font-bold text-indigo-600">{85 + (i * 4)}% Adoption</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full" style={{width: `${85 + (i * 4)}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard;
