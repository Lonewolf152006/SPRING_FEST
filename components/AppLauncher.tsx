
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
    const [briefing, setBriefing] = useState("Loading your AI Daily Briefing...");

    useEffect(() => {
        GeminiService.generateDailyBriefing(tasks, events).then(setBriefing);
    }, [tasks, events]);

    // Updated colors to cool tones
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

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in-up">
            {/* Briefing Widget - Light Glass with Soft Cool Gradient */}
            <div className="mb-12 bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2 relative z-10">{getGreeting()}, {role}.</h2>
                <div className="flex items-start gap-4 mt-4 relative z-10">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                        <span className="text-2xl">✨</span>
                    </div>
                    <div>
                        <p className="text-slate-600 text-lg leading-relaxed italic">"{briefing}"</p>
                    </div>
                </div>
            </div>

            {/* App Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableApps.map(app => (
                    <button 
                        key={app.id}
                        onClick={() => onNavigate(app.id)}
                        className="bg-white/60 hover:bg-white/90 backdrop-blur-sm border border-white/50 rounded-2xl p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl group"
                    >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-3xl shadow-md mb-4 group-hover:scale-110 transition-transform text-white`}>
                            {app.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{app.name}</h3>
                        <p className="text-slate-500 text-sm">{app.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default AppLauncher;
