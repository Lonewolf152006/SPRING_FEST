
import React, { useState } from 'react';
import { UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface GlobalNavBarProps {
    onNavigate: (route: string) => void;
    currentRoute: string;
    role: UserRole;
    onLogout: () => void;
}

const GlobalNavBar: React.FC<GlobalNavBarProps> = ({ onNavigate, currentRoute, role, onLogout }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const allApps = [
        { id: 'launcher', name: 'Launcher', icon: '🏠', color: 'bg-slate-100 text-slate-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'classroom', name: 'Classroom', icon: '🎓', color: 'bg-orange-100 text-orange-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'planner', name: 'Smart Planner', icon: '🗓️', color: 'bg-indigo-100 text-indigo-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'career', name: 'Career', icon: '💼', color: 'bg-blue-100 text-blue-600', roles: [UserRole.STUDENT] }, 
        { id: 'connect', name: 'Connect', icon: '💬', color: 'bg-pink-100 text-pink-600', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'events', name: 'Event Hub', icon: '🎉', color: 'bg-amber-100 text-amber-600', roles: [UserRole.STUDENT, UserRole.TEACHER] },
        { id: 'wellness', name: 'Wellness', icon: '🌱', color: 'bg-emerald-100 text-emerald-600', roles: [UserRole.STUDENT] },
        { id: 'admin-central', name: 'Admin Central', icon: '🛡️', color: 'bg-red-100 text-red-600', roles: [UserRole.ADMIN] },
    ];

    const availableApps = allApps.filter(app => app.roles.includes(role));
    const isDbConnected = !!supabase;

    return (
        <div className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-6 z-50 relative shadow-sm">
            <div className="flex items-center gap-4">
                {/* App Switcher */}
                <div className="relative">
                    <button 
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors group"
                    >
                        <div className="grid grid-cols-3 gap-1 group-hover:gap-1.5 transition-all">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="w-1 h-1 bg-slate-500 rounded-full"></div>
                            ))}
                        </div>
                    </button>
                    
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}></div>
                            <div className="absolute top-14 left-0 w-80 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-4 grid grid-cols-3 gap-4 z-20 animate-fade-in-up ring-1 ring-slate-900/5">
                                {availableApps.map(app => (
                                    <button 
                                        key={app.id}
                                        onClick={() => { onNavigate(app.id); setMenuOpen(false); }}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/80 transition-all group hover:shadow-md"
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform`}>
                                            {app.icon}
                                        </div>
                                        <span className="text-xs text-slate-600 font-medium">{app.name}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">AI</span>
                    AMEP OS
                </h1>

                {/* Cloud Sync Badge */}
                <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${isDbConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    {isDbConnected ? 'Cloud Sync Active' : 'Local Only'}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                     <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{currentRoute.toUpperCase()}</div>
                     <div className="text-[10px] text-slate-400 font-medium text-right">{role} View</div>
                </div>
                
                {/* User Profile Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setProfileOpen(!profileOpen)}
                        className={`w-9 h-9 rounded-full shadow-lg transition-transform hover:scale-105 border-2 border-white ${role === UserRole.STUDENT ? 'bg-indigo-100 text-indigo-600' : role === UserRole.TEACHER ? 'bg-teal-100 text-teal-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center font-bold text-sm`}
                    >
                        {role.charAt(0)}
                    </button>

                    {profileOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                            <div className="absolute top-12 right-0 w-48 bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl py-2 z-20 animate-fade-in ring-1 ring-slate-900/5">
                                <div className="px-4 py-2 border-b border-slate-100 mb-2">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Signed in as</p>
                                    <p className="text-slate-800 font-bold text-sm">{role}</p>
                                </div>
                                <button 
                                    onClick={() => { onLogout(); setProfileOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <span>🚪</span> Logout
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
