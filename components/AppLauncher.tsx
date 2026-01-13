
import React, { useEffect, useState } from 'react';
import { GeminiService } from '../services/geminiService';
import { Task, CalendarEvent, UserRole } from '../types';

interface AppLauncherProps {
    onNavigate: (app: string) => void;
    tasks: Task[];
    events: CalendarEvent[];
    role: UserRole;
}

const AppLauncher: React.FC<AppLauncherProps> = ({ onNavigate, tasks, events, role }) => {
    const [briefing, setBriefing] = useState("Synchronizing neural briefing data...");

    useEffect(() => {
        GeminiService.generateDailyBriefing(tasks, events).then(setBriefing);
    }, [tasks, events]);

    const allApps = [
        { id: 'classroom', name: 'Classroom', desc: role === UserRole.TEACHER ? 'Manage Classes' : role === UserRole.ADMIN ? 'Analytics' : 'Learning Dashboard', icon: '🎓', color: 'from-blue-400 to-indigo-500', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'planner', name: 'Smart Planner', desc: 'Calendar & Tasks', icon: '🗓️', color: 'from-cyan-400 to-blue-500', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'career', name: 'Career Cell', desc: 'Interviews & Resume', icon: '💼', color: 'from-indigo-400 to-violet-500', roles: [UserRole.STUDENT] },
        { id: 'connect', name: 'Connect', desc: 'Team Chat & Vision', icon: '💬', color: 'from-violet-400 to-fuchsia-500', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
        { id: 'events', name: 'Event Hub', desc: 'Clubs & Planners', icon: '🎉', color: 'from-sky-400 to-blue-400', roles: [UserRole.STUDENT, UserRole.TEACHER] },
        { id: 'wellness', name: 'Wellness Wing', desc: 'Mental Health Support', icon: '🌱', color: 'from-emerald-400 to-teal-500', roles: [UserRole.STUDENT] },
        { id: 'admin-central', name: 'Admin Central', desc: 'Safety & Scholarships', icon: '🛡️', color: 'from-slate-500 to-slate-700', roles: [UserRole.ADMIN] },
    ];

    const availableApps = allApps.filter(app => app.roles.includes(role));

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    }

    const quickActions = role === UserRole.STUDENT ? [
        { label: 'Resume Practice', route: 'practice', icon: '⚔️' },
        { label: 'Project Research', route: 'projects', icon: '🧪' }
    ] : role === UserRole.TEACHER ? [
        { label: 'Start Live Class', route: 'live-class', icon: '📡' },
        { label: 'Review Grading', route: 'grading', icon: '📝' }
    ] : [
        { label: 'User Registry', route: 'user-mgmt', icon: '👥' },
        { label: 'Global Status', route: 'admin-central', icon: '🛡️' }
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
            <div className="mb-12 bg-white/70 backdrop-blur-xl rounded-[40px] p-10 border border-white/60 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-[100px] opacity-60 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3">Institutional Briefing</div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{getGreeting()}, {role}.</h2>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm">
                                <span className="text-2xl">✨</span>
                            </div>
                            <p className="text-slate-600 text-xl leading-relaxed italic max-w-2xl font-medium">"{briefing}"</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        {quickActions.map(action => (
                            <button 
                                key={action.route}
                                onClick={() => onNavigate(action.route)}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <span>{action.icon}</span>
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {availableApps.map(app => (
                    <button 
                        key={app.id}
                        onClick={() => onNavigate(app.id)}
                        className="bg-white/60 hover:bg-white/90 backdrop-blur-md border border-white/50 rounded-[32px] p-8 text-left transition-all hover:-translate-y-2 hover:shadow-2xl group border-b-4 border-b-transparent hover:border-b-indigo-500"
                    >
                        <div className={`w-16 h-16 rounded-[24px] bg-gradient-to-br ${app.color} flex items-center justify-center text-4xl shadow-xl mb-6 group-hover:scale-110 transition-transform text-white`}>
                            {app.icon}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">{app.name}</h3>
                        <p className="text-slate-500 font-medium leading-relaxed">{app.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default AppLauncher;
