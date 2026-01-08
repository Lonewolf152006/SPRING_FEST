
import React, { useState, useRef } from 'react';
import { GeminiService } from '../../services/geminiService';
import { ScholarshipMatch, SafetyAlert } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';

const AdminCentralApp = () => {
    const [activeTab, setActiveTab] = useState<'scholarship' | 'safety'>('scholarship');

    // Scholarship State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
    const [matching, setMatching] = useState(false);
    
    // Safety State
    const [alert, setAlert] = useState<SafetyAlert | null>(null);
    const [monitoring, setMonitoring] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Mock Students
    const students = [
        { id: 1, name: "Maria Garcia", gpa: 3.8, income: "Low", interests: ["Engineering", "Robotics"] },
        { id: 2, name: "John Doe", gpa: 3.2, income: "Medium", interests: ["Arts", "History"] },
    ];

    const handleMatch = async (student: any) => {
        setSelectedStudent(student);
        setMatching(true);
        setMatches([]); // Clear prev
        const res = await GeminiService.matchScholarships(student);
        setMatches(res);
        setMatching(false);
    }

    const handleSafetyCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        setMonitoring(true);
        const base64 = await blobToBase64(file);
        const res = await GeminiService.analyzeSafetyFeed(base64);
        setAlert(res);
        setMonitoring(false);
    }

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white">Admin Central</h2>
                    <p className="text-red-400/80">Operations & Safety</p>
                </div>
                <div className="flex bg-slate-800 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setActiveTab('scholarship')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'scholarship' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Scholarships</button>
                    <button onClick={() => setActiveTab('safety')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'safety' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Safety Monitor</button>
                </div>
            </div>

            {activeTab === 'scholarship' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                    {/* Student List */}
                    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                        <h3 className="text-white font-bold mb-4">Student Database</h3>
                        <div className="space-y-3">
                            {students.map(s => (
                                <div key={s.id} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedStudent?.id === s.id ? 'bg-red-600/20 border-red-500' : 'bg-slate-900/50 border-white/5 hover:bg-slate-700'}`} onClick={() => handleMatch(s)}>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white">{s.name}</h4>
                                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">GPA {s.gpa}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{s.interests.join(", ")} • Income: {s.income}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Match Results */}
                    <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><span className="text-xl">🎓</span> AI Scholarship Matcher</h3>
                        
                        {!selectedStudent && <div className="flex-1 flex items-center justify-center text-slate-500">Select a student to find matches</div>}
                        
                        {matching && <div className="flex-1 flex items-center justify-center text-red-400 animate-pulse">Analyzing financial & academic profile...</div>}

                        {matches.length > 0 && !matching && (
                            <div className="grid grid-cols-1 gap-4">
                                {matches.map((m, i) => (
                                    <div key={i} className="bg-slate-900/50 p-6 rounded-xl border border-white/5 hover:border-red-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-lg font-bold text-white">{m.name}</h4>
                                            <span className="text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded">{m.amount}</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-2 rounded-full mb-3 overflow-hidden">
                                            <div className="bg-red-500 h-full" style={{width: `${m.probability}%`}}></div>
                                        </div>
                                        <p className="text-slate-400 text-sm leading-relaxed">{m.matchReason}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-8 h-full">
                    {/* Feed */}
                    <div className="bg-black rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-700 group">
                        <div className="text-center p-8">
                            <div className="text-4xl mb-4">📹</div>
                            <p className="text-slate-500 mb-6">Live Camera Feed Simulation</p>
                            <button onClick={() => fileRef.current?.click()} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all">
                                {monitoring ? 'Scanning...' : 'Upload Frame'}
                            </button>
                            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleSafetyCheck} />
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2"><span className="text-xl">🛡️</span> Security Analysis</h3>
                        
                        {!alert ? (
                            <div className="flex-1 flex items-center justify-center text-slate-500 opacity-50">System Standby</div>
                        ) : (
                            <div className="flex-1 space-y-8 animate-fade-in-up">
                                <div className={`p-6 rounded-2xl border text-center ${alert.severity === 'Danger' ? 'bg-red-900/20 border-red-500 text-red-400' : alert.severity === 'Caution' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-400' : 'bg-green-900/20 border-green-500 text-green-400'}`}>
                                    <div className="text-xs uppercase font-bold mb-2">Status</div>
                                    <div className="text-4xl font-bold">{alert.severity}</div>
                                </div>
                                <div>
                                    <h4 className="text-slate-400 font-bold text-sm uppercase mb-2">Detected Activity</h4>
                                    <p className="text-white text-lg">{alert.description}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <h4 className="text-slate-400 font-bold text-sm uppercase mb-2">Recommended Protocol</h4>
                                    <p className="text-slate-200 font-mono text-sm">>> {alert.actionItem}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminCentralApp;
