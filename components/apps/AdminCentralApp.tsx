
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../../services/geminiService';
import { AuthService } from '../../services/authService';
import { DatabaseService } from '../../services/databaseService';
import { supabase } from '../../services/supabaseClient';
import { ScholarshipMatch, SafetyAlert, UserRole } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';

const AdminCentralApp = () => {
    const [activeTab, setActiveTab] = useState<'scholarship' | 'safety' | 'identity' | 'assignments'>('scholarship');

    // Scholarship State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
    const [matching, setMatching] = useState(false);
    
    // Safety State
    const [alert, setAlert] = useState<SafetyAlert | null>(null);
    const [monitoring, setMonitoring] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Identity Control State
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [provisioning, setProvisioning] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: UserRole.STUDENT });
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Assignments State
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
    const [currentAssignments, setCurrentAssignments] = useState<string[]>([]);
    const [isSavingAssignments, setIsSavingAssignments] = useState(false);

    useEffect(() => {
        if (activeTab === 'identity' || activeTab === 'assignments') {
            fetchProfiles();
        }
        if (activeTab === 'assignments') {
            fetchAssignments();
        }
    }, [activeTab]);

    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setProfiles(data || []);
        } catch (e) {
            console.error("Profile sync failed", e);
        } finally {
            setLoadingProfiles(false);
        }
    };

    const fetchAssignments = async () => {
        const data = await DatabaseService.getAssignments();
        if (selectedTeacherId) {
            const assignedToTeacher = data.filter((a: any) => a.teacher_id === selectedTeacherId).map((a: any) => a.student_id);
            setCurrentAssignments(assignedToTeacher);
        }
    };

    useEffect(() => {
        if (selectedTeacherId) {
            fetchAssignments();
        } else {
            setCurrentAssignments([]);
        }
    }, [selectedTeacherId]);

    const toggleAssignment = (studentId: string) => {
        setCurrentAssignments(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const saveAssignments = async () => {
        if (!selectedTeacherId) return;
        setIsSavingAssignments(true);
        await DatabaseService.syncAssignments(selectedTeacherId, currentAssignments);
        setIsSavingAssignments(false);
        window.alert("Institutional roster updated for Faculty Member.");
    };

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        setProvisioning(true);
        setStatusMsg(null);
        try {
            await AuthService.signUp(newUser.email, newUser.password, newUser.fullName, newUser.role);
            setStatusMsg({ type: 'success', text: `Identity Vault updated for ${newUser.fullName}.` });
            setNewUser({ fullName: '', email: '', password: '', role: UserRole.STUDENT });
            fetchProfiles();
        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || "Failed to provision credentials." });
        } finally {
            setProvisioning(false);
        }
    };

    const mockStudentsForMatch = [
        { id: 'S1', name: "Maria Garcia", gpa: 3.8, income: "Low", interests: ["Engineering", "Robotics"] },
        { id: 'S2', name: "John Doe", gpa: 3.2, income: "Medium", interests: ["Arts", "History"] },
    ];

    const handleMatch = async (student: any) => {
        setSelectedStudent(student);
        setMatching(true);
        setMatches([]); 
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
                    <h2 className="text-3xl font-bold text-slate-800">Admin Central</h2>
                    <p className="text-red-600 font-mono text-[10px] uppercase tracking-[0.2em] mt-1 font-black">Security Clearance Required</p>
                </div>
                <div className="flex bg-white/70 backdrop-blur-md rounded-2xl p-1 border border-slate-200 shadow-sm ring-4 ring-slate-100/50 overflow-x-auto max-w-[500px]">
                    <button onClick={() => setActiveTab('scholarship')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'scholarship' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Finances</button>
                    <button onClick={() => setActiveTab('safety')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'safety' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Surveillance</button>
                    <button onClick={() => setActiveTab('identity')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'identity' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Identity</button>
                    <button onClick={() => setActiveTab('assignments')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'assignments' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Assignments</button>
                </div>
            </div>

            {activeTab === 'scholarship' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                        <h3 className="text-slate-800 font-bold mb-6 flex items-center gap-2">Student Registry</h3>
                        <div className="space-y-4">
                            {mockStudentsForMatch.map(s => (
                                <div key={s.id} className={`p-6 rounded-2xl border transition-all cursor-pointer ${selectedStudent?.id === s.id ? 'bg-red-50 border-red-200 shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'}`} onClick={() => handleMatch(s)}>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800">{s.name}</h4>
                                        <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">GPA {s.gpa}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">{s.interests.join(", ")}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 p-8 flex flex-col shadow-sm">
                        <h3 className="text-slate-800 font-bold mb-6">Scholarship Matching Engine</h3>
                        {!selectedStudent && <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50"><div className="text-6xl mb-4">📜</div><p>Awaiting student selection...</p></div>}
                        {matching && <div className="flex-1 flex items-center justify-center text-red-500 animate-pulse font-bold">Vectorizing academic profile...</div>}
                        {matches.length > 0 && !matching && (
                            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
                                {matches.map((m, i) => (
                                    <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-red-200 transition-all">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-lg font-bold text-slate-800">{m.name}</h4>
                                            <span className="text-emerald-600 font-black text-lg">{m.amount}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 rounded-full mb-3 overflow-hidden">
                                            <div className="bg-red-500 h-full" style={{width: `${m.probability}%`}}></div>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed">{m.matchReason}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'safety' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    <div className="bg-slate-900 rounded-[40px] relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl">
                        <div className="text-center p-10 z-10">
                            <div className="text-8xl mb-8 animate-pulse">📡</div>
                            <p className="text-slate-400 mb-10 font-mono tracking-widest text-xs uppercase">Vision_Stream_Active</p>
                            <button onClick={() => fileRef.current?.click()} className="bg-red-600 hover:bg-red-500 text-white px-10 py-5 rounded-[32px] font-black shadow-2xl shadow-red-600/30 transition-all active:scale-95">
                                {monitoring ? 'SCANNING...' : 'ANALYZE SECURITY FEED'}
                            </button>
                            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleSafetyCheck} />
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] border border-slate-200 p-10 flex flex-col shadow-sm">
                        <h3 className="text-slate-800 font-bold mb-8">Security Assessment</h3>
                        {!alert ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50">
                                <div className="text-6xl mb-4">🛡️</div>
                                <p>Awaiting surveillance stream analysis...</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className={`p-6 rounded-3xl border-2 flex items-center gap-6 ${alert.severity === 'Danger' ? 'bg-red-50 border-red-500 text-red-700' : alert.severity === 'Caution' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'}`}>
                                    <div className="text-4xl">{alert.severity === 'Danger' ? '🚨' : alert.severity === 'Caution' ? '⚠️' : '✅'}</div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Severity Level</div>
                                        <div className="text-xl font-black">{alert.severity}</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">AI Observation</h4>
                                    <p className="text-slate-700 leading-relaxed font-medium">"{alert.description}"</p>
                                </div>
                                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
                                    <h4 className="text-xs font-black opacity-60 uppercase tracking-widest mb-2">Recommended Action</h4>
                                    <p className="text-lg font-bold">{alert.actionItem}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'identity' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm h-fit">
                        <h3 className="text-slate-800 font-bold mb-6">Provision Identity</h3>
                        <form onSubmit={handleProvision} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Full Name</label>
                                <input required value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Email</label>
                                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Password</label>
                                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Role</label>
                                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700">
                                    <option value={UserRole.STUDENT}>Student</option>
                                    <option value={UserRole.TEACHER}>Teacher</option>
                                    <option value={UserRole.ADMIN}>Administrator</option>
                                </select>
                            </div>
                            {statusMsg && (
                                <div className={`p-4 rounded-xl text-xs font-bold ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {statusMsg.text}
                                </div>
                            )}
                            <button type="submit" disabled={provisioning} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                {provisioning ? 'Provisioning...' : 'Initialize Identity'}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Identity Vault</h3>
                            <button onClick={fetchProfiles} className="text-xs font-black text-red-500 uppercase tracking-widest hover:underline">Sync Feed</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loadingProfiles ? (
                                <div className="h-full flex items-center justify-center text-red-500 font-bold animate-pulse">Synchronizing Profiles...</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {profiles.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400`}>{p.full_name?.charAt(0)}</div>
                                                        <div className="font-bold text-slate-700 text-sm">{p.full_name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-600">{p.role}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'assignments' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-fade-in">
                    <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col gap-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Faculty Roster</h3>
                            <p className="text-xs text-slate-500">Select a teacher to manage their student link.</p>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-[500px] custom-scrollbar">
                            {profiles.filter(p => p.role === UserRole.TEACHER).map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => setSelectedTeacherId(t.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTeacherId === t.id ? 'bg-red-600 border-red-700 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'}`}
                                >
                                    <div className="font-bold text-sm">{t.full_name}</div>
                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${selectedTeacherId === t.id ? 'text-red-100' : 'text-slate-400'}`}>ID: {t.id.substring(0,8)}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-200 p-8 flex flex-col shadow-sm">
                        {!selectedTeacherId ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                                <div className="text-6xl">👤</div>
                                <p className="font-bold text-xl">Select a Teacher to Initialize Linkage</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">Assign Students</h3>
                                        <p className="text-xs text-slate-500">Linking students to: <span className="font-black text-red-600">{profiles.find(p => p.id === selectedTeacherId)?.full_name}</span></p>
                                    </div>
                                    <button 
                                        onClick={saveAssignments}
                                        disabled={isSavingAssignments}
                                        className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all"
                                    >
                                        {isSavingAssignments ? 'SYNCING...' : 'SAVE CHANGES'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar pr-2">
                                    {profiles.filter(p => p.role === UserRole.STUDENT).map(s => {
                                        const isAssigned = currentAssignments.includes(s.id);
                                        return (
                                            <div 
                                                key={s.id} 
                                                onClick={() => toggleAssignment(s.id)}
                                                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${isAssigned ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        {s.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold text-sm ${isAssigned ? 'text-indigo-900' : 'text-slate-700'}`}>{s.full_name}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{s.email}</div>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isAssigned ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-slate-200 group-hover:border-indigo-400'}`}>
                                                    {isAssigned && "✓"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCentralApp;