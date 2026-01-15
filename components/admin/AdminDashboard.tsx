
import React, { useState, useEffect, useContext } from 'react';
import { AdminReport, SchoolClass, Subject, UserRole } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { AuthService } from '../../services/authService';
import { supabase } from '../../services/supabaseClient';
import { HierarchyContext } from '../../App';

const AdminDashboard = () => {
    const { classes, subjects } = useContext(HierarchyContext);
    const [report, setReport] = useState<AdminReport | null>(null);
    const [viewMode, setViewMode] = useState<'analytics' | 'hierarchy' | 'users'>('analytics');
    
    // User Provisioning State
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [provisioning, setProvisioning] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: UserRole.STUDENT });
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const mockStats = { term: 'Spring 2024', activeUsers: 4500, avgGrade: 88, dept: 'Engineering' };
        GeminiService.generateAdminReport(mockStats).then(setReport);
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const { data, error } = await supabase.from('profiles').select('*').order('full_name');
            if (error) throw error;
            setProfiles(data || []);
        } catch (e) {
            console.error("Failed to fetch profiles", e);
        } finally {
            setLoadingProfiles(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newUser.password.length < 6) {
            setStatusMsg({ type: 'error', text: "Passwords must be at least 6 characters for security compliance." });
            return;
        }

        setProvisioning(true);
        setStatusMsg(null);
        try {
            await AuthService.signUp(newUser.email, newUser.password, newUser.fullName, newUser.role);
            setStatusMsg({ type: 'success', text: `Identity initialized for ${newUser.fullName}. (Note: Standard signup may require re-login as Admin if session switches).` });
            setNewUser({ fullName: '', email: '', password: '', role: UserRole.STUDENT });
            fetchProfiles();
        } catch (err: any) {
            const msg = err.message || "";
            if (msg.includes('Database error saving new user')) {
                setStatusMsg({ type: 'error', text: "Infrastructure failure: Ensure the SQL trigger 'handle_new_user' is installed in your Supabase dashboard." });
            } else if (msg.includes('Email signups are disabled')) {
                setStatusMsg({ type: 'error', text: "Security policy conflict: Enable email signups in Supabase 'Auth > Providers' settings." });
            } else {
                setStatusMsg({ type: 'error', text: msg || "Failed to provision account." });
            }
        } finally {
            setProvisioning(false);
        }
    };

    const overallMastery = subjects.length > 0 
        ? Math.round(subjects.reduce((acc, sub) => acc + (sub.concepts.reduce((a, c) => a + c.masteryScore, 0) / sub.concepts.length), 0) / subjects.length)
        : 0;

    return (
        <div className="animate-fade-in-up space-y-8 pb-10 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Institutional Intelligence</h1>
                    <p className="text-slate-500 text-sm">System Administration & Oversight</p>
                </div>
                <div className="flex bg-white/70 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 shadow-sm ring-4 ring-slate-100/50">
                    <button onClick={() => setViewMode('analytics')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Analytics</button>
                    <button onClick={() => setViewMode('hierarchy')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'hierarchy' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Structure</button>
                    <button onClick={() => setViewMode('users')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Identity MGMT</button>
                </div>
            </div>
            
            {viewMode === 'analytics' && (
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

                    <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-indigo-100 p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                            AI Institutional Health Summary
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed italic">
                            "{report?.institutionHealthPulse || "Synchronizing cross-departmental data feeds..."}"
                        </p>
                    </div>
                </>
            )}

            {viewMode === 'hierarchy' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
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

                    <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
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

            {viewMode === 'users' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Provisioning Form */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600 text-sm">🔑</span>
                                Account Provisioning
                            </h3>
                            
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Legal Full Name</label>
                                    <input 
                                        required
                                        value={newUser.fullName}
                                        onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="Jordan Scholar"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Institutional Email</label>
                                    <input 
                                        required
                                        type="email"
                                        value={newUser.email}
                                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="jordan@institution.edu"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Initial Password (Min 6 chars)</label>
                                    <input 
                                        required
                                        type="password"
                                        minLength={6}
                                        value={newUser.password}
                                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Identity Role</label>
                                    <select 
                                        value={newUser.role}
                                        onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                                    >
                                        <option value={UserRole.STUDENT}>Student</option>
                                        <option value={UserRole.TEACHER}>Teacher</option>
                                        <option value={UserRole.ADMIN}>Administrator</option>
                                    </select>
                                </div>

                                {statusMsg && (
                                    <div className={`p-4 rounded-2xl text-[10px] font-bold ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {statusMsg.text}
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={provisioning}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {provisioning ? (
                                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : 'Provision Identity'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* User Directory */}
                    <div className="lg:col-span-8 flex flex-col h-[600px] bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Unified Identity Registry</h3>
                            <button onClick={fetchProfiles} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">Refresh Feed</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loadingProfiles ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                </div>
                            ) : profiles.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <div className="text-5xl mb-4">👥</div>
                                    <p className="font-bold">No registered profiles detected.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {profiles.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${p.role === UserRole.TEACHER ? 'bg-teal-100 text-teal-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                            {p.full_name?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-bold text-slate-700 text-sm">{p.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${p.role === UserRole.TEACHER ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                        {p.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-[9px] text-slate-400 truncate max-w-[120px]">
                                                    {p.id}
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
        </div>
    )
}

export default AdminDashboard;
