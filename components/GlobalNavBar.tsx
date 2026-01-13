
import React, { useState } from 'react';
import { UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface GlobalNavBarProps {
    onNavigate: (route: string) => void;
    currentRoute: string;
    role: UserRole;
    onLogout: () => void;
    dbStatus?: 'connecting' | 'connected' | 'error';
}

const GlobalNavBar: React.FC<GlobalNavBarProps> = ({ onNavigate, currentRoute, role, onLogout, dbStatus = 'connecting' }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const roleAccent = role === UserRole.STUDENT ? 'indigo' : role === UserRole.TEACHER ? 'teal' : 'rose';

    const allApps = [
        { id: 'launcher', name: 'Home Base', icon: '🏠', color: 'bg-slate-100 text-slate-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'classroom', name: 'Dashboard', icon: '🎓', color: 'bg-orange-100 text-orange-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'planner', name: 'Smart Planner', icon: '🗓️', color: 'bg-indigo-100 text-indigo-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'career', name: 'Career Cell', icon: '💼', color: 'bg-blue-100 text-blue-600', roles: [UserRole.STUDENT] }, 
        { id: 'connect', name: 'Connect', icon: '💬', color: 'bg-pink-100 text-pink-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'events', name: 'Event Hub', icon: '🎉', color: 'bg-amber-100 text-amber-600', roles: [UserRole.STUDENT, UserRole.TEACHER] },
        { id: 'wellness', name: 'Wellness', icon: '🌱', color: 'bg-emerald-100 text-emerald-600', roles: [UserRole.STUDENT] },
        { id: 'admin-central', name: 'Ops Central', icon: '🛡️', color: 'bg-red-100 text-red-600', roles: [UserRole.ADMIN] },
    ];

    const availableApps = allApps.filter(app => app.roles.includes(role));

    const getStatusBadge = () => {
        switch (dbStatus) {
            case 'connected':
                return (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Neural Sync Active
                    </div>
                );
            case 'error':
                return (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border border-rose-100 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Sync Interrupted
                    </div>
                );
            default:
                return (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border border-slate-100 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"></span>
                        Handshaking...
                    </div>
                );
        }
    };

    return (
        <div className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 z-50 relative shadow-sm">
            <div className="flex items-center gap-6">
                <div className="relative">
                    <button 
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`w-12 h-12 rounded-2xl hover:bg-${roleAccent}-50 flex items-center justify-center transition-all group active:scale-90`}
                    >
                        <div className="grid grid-cols-3 gap-1 group-hover:gap-1.5 transition-all">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className={`w-1 h-1 bg-${roleAccent}-600 rounded-full`}></div>
                            ))}
                        </div>
                    </button>
                    
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}></div>
                            <div className="absolute top-16 left-0 w-[340px] bg-white/95 backdrop-blur-2xl rounded-[32px] border border-slate-200 shadow-2xl p-6 grid grid-cols-3 gap-4 z-20 animate-fade-in-up ring-1 ring-slate-900/5">
                                {availableApps.map(app => (
                                    <button 
                                        key={app.id}
                                        onClick={() => { onNavigate(app.id); setMenuOpen(false); }}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-slate-50 transition-all group hover:shadow-md active:scale-95"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl ${app.color} flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform`}>
                                            {app.icon}
                                        </div>
                                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center">{app.name}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg bg-${roleAccent}-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-${roleAccent}-600/20 uppercase`}>
                            {role.charAt(0)}
                        </span>
                        AMEP<span className={`text-${roleAccent}-600`}>.OS</span>
                    </h1>
                </div>

                {getStatusBadge()}
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                     <div className={`text-[10px] font-black text-${roleAccent}-600 uppercase tracking-[0.2em] mb-0.5`}>{currentRoute.replace('-', '_')}</div>
                     <div className="text-xs font-bold text-slate-400 text-right">{role} Identity</div>
                </div>
                
                <div className="relative">
                    <button 
                        onClick={() => setProfileOpen(!profileOpen)}
                        className={`w-11 h-11 rounded-[14px] shadow-lg transition-all hover:scale-105 border-2 border-white flex items-center justify-center font-black text-sm active:scale-90 bg-${roleAccent}-100 text-${roleAccent}-600`}
                    >
                        {role.charAt(0)}
                    </button>

                    {profileOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                            <div className="absolute top-14 right-0 w-64 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-[24px] shadow-2xl py-3 z-20 animate-fade-in ring-1 ring-slate-900/5">
                                <div className="px-5 py-3 border-b border-slate-100 mb-2">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Identity</p>
                                    <p className="text-slate-800 font-black text-base">{role}</p>
                                </div>
                                <button 
                                    onClick={() => { onLogout(); setProfileOpen(false); }}
                                    className="w-full text-left px-5 py-3 text-sm text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-3 font-black uppercase tracking-widest"
                                >
                                    <span>🚪</span> Terminate Session
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default GlobalNavBar;
