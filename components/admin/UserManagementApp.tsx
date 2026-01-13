
import React, { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';
import { supabase } from '../../services/supabaseClient';
import { UserRole } from '../../types';

const UserManagementApp = () => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [provisioning, setProvisioning] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Form State
    const [newUser, setNewUser] = useState({ 
        fullName: '', 
        email: '', 
        password: '', 
        role: UserRole.STUDENT 
    });

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setProfiles(data || []);
        } catch (e) {
            console.error("Fetch profiles error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newUser.password.length < 6) {
            setStatusMsg({ type: 'error', text: "Security protocol requires a minimum of 6 characters for user passwords." });
            return;
        }

        setProvisioning(true);
        setStatusMsg(null);
        try {
            await AuthService.signUp(newUser.email, newUser.password, newUser.fullName, newUser.role);
            setStatusMsg({ 
                type: 'success', 
                text: `Successfully provisioned ${newUser.fullName} as ${newUser.role}. Profile record initialized via SQL trigger.` 
            });
            setNewUser({ fullName: '', email: '', password: '', role: UserRole.STUDENT });
            fetchProfiles();
        } catch (err: any) {
            const msg = err.message || "";
            if (msg.includes('Database error saving new user')) {
                 setStatusMsg({ type: 'error', text: "Critical: Database trigger failed. Ensure 'handle_new_user' SQL trigger is installed in the dashboard." });
            } else if (msg.includes('Email signups are disabled')) {
                 setStatusMsg({ type: 'error', text: "Auth Policy Error: Enable 'Allow new users to sign up' in Supabase Auth settings." });
            } else {
                 setStatusMsg({ type: 'error', text: msg || "Failed to initialize credentials." });
            }
        } finally {
            setProvisioning(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in-up pb-20 px-4">
            <div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Identity Vault</h2>
                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] font-mono">Institutional User Provisioning System</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Enrollment Card */}
                <div className="lg:col-span-4 bg-white/70 backdrop-blur-xl border border-white/60 rounded-[40px] p-8 shadow-sm flex flex-col h-fit">
                    <div className="mb-8 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            🔑
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">New Identity</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Provision Access</p>
                        </div>
                    </div>

                    <form onSubmit={handleProvision} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Legal Name</label>
                            <input 
                                required
                                value={newUser.fullName}
                                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                placeholder="Jordan Scholar"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Institutional Email</label>
                            <input 
                                required
                                type="email"
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                placeholder="jordan@institution.edu"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Temp Password (Min 6 chars)</label>
                            <input 
                                required
                                type="password"
                                minLength={6}
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm focus:border-indigo-500 outline-none transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">System Role</label>
                            <select 
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value={UserRole.STUDENT}>Student</option>
                                <option value={UserRole.TEACHER}>Teacher</option>
                                <option value={UserRole.ADMIN}>Administrator</option>
                            </select>
                        </div>

                        {statusMsg && (
                            <div className={`p-4 rounded-2xl text-[10px] font-black uppercase leading-relaxed text-center ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                {statusMsg.text}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={provisioning}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[24px] shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 mt-4"
                        >
                            {provisioning ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>Enroll into Network ➔</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Directory Table */}
                <div className="lg:col-span-8 bg-white rounded-[40px] border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px]">
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-lg">Active Identity Directory</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{profiles.length} Active Profiles</span>
                            <button onClick={fetchProfiles} className="text-[10px] font-black text-indigo-600 hover:text-indigo-500 uppercase tracking-widest transition-colors">Sync Database</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="h-full flex items-center justify-center flex-col gap-4">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Neural Registry...</p>
                            </div>
                        ) : profiles.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                                <div className="text-8xl mb-6">👥</div>
                                <p className="text-xl font-bold">The Registry is Empty</p>
                                <p className="text-sm">Provision your first user to populate the vault.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Identity</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permission Level</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Identifier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {profiles.map((p, i) => (
                                        <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm transition-all group-hover:scale-110 ${p.role === UserRole.TEACHER ? 'bg-emerald-100 text-emerald-600' : p.role === UserRole.ADMIN ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                        {p.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-bold text-slate-700 text-base">{p.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight border shadow-sm ${p.role === UserRole.TEACHER ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : p.role === UserRole.ADMIN ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                    {p.role}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticated</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <span className="font-mono text-[9px] text-slate-300 bg-slate-50 px-2 py-1 rounded truncate inline-block max-w-[100px] border border-slate-100">
                                                    {p.id}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    
                    <div className="px-10 py-6 bg-indigo-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <span className="text-xl">🛡️</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Security Protocol Alpha: All connections are encrypted and logged.</p>
                        </div>
                        <button className="text-[10px] font-black bg-white/20 px-3 py-2 rounded-xl hover:bg-white/30 transition-all uppercase tracking-widest">Download Audit Log</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserManagementApp;
