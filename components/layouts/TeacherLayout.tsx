
import React, { useState, useContext } from 'react';
import { UserRole } from '../../types';
import { ROLE_NAVIGATION } from '../../utils/navigation';
import { HierarchyContext } from '../../App';

interface TeacherLayoutProps {
    children: React.ReactNode;
    activeRoute: string;
    onNavigate: (route: string) => void;
    onLogout: () => void;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children, activeRoute, onNavigate, onLogout }) => {
    const { userProfile } = useContext(HierarchyContext);
    const navItems = ROLE_NAVIGATION[UserRole.TEACHER];
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const displayName = userProfile?.full_name || 'Faculty Member';
    const currentXp = userProfile?.xp || 0;
    const currentLevel = userProfile?.level || 1;
    
    // Level Math: 1000 XP per level
    const nextLevelXp = currentLevel * 1000;
    const prevLevelXp = (currentLevel - 1) * 1000;
    const progressInCurrentLevel = currentXp - prevLevelXp;
    const levelRange = 1000;
    const progressPercent = Math.min(100, Math.max(0, (progressInCurrentLevel / levelRange) * 100));

    return (
        <div className="flex min-h-screen bg-teal-50/30 text-slate-800 font-sans w-full overflow-x-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-teal-100 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold">P</div>
                    <span className="font-bold text-slate-800 truncate max-w-[100px]">{displayName}</span>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    {isMobileMenuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Gamified Sidebar */}
            <aside className={`
                fixed lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto inset-y-0 left-0 z-50 w-64 bg-white/90 lg:bg-white/70 backdrop-blur-xl border-r border-teal-100/50 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-sm
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-teal-100/50 bg-gradient-to-b from-teal-50/50 to-transparent mt-16 lg:mt-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-xl shadow-sm border border-teal-200 font-black">
                            {displayName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800 truncate max-w-[140px]">{displayName}</h3>
                            <p className="text-[10px] text-teal-500 uppercase font-bold tracking-wider">Lvl {currentLevel} Prestige</p>
                        </div>
                    </div>
                    {/* Prestige Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden border border-slate-100">
                        <div className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full shadow-sm transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mt-1.5 tracking-tighter">
                        <span>{currentXp.toLocaleString()} Authority</span>
                        <span>Next: {nextLevelXp.toLocaleString()}</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar px-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                onNavigate(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden ${
                                activeRoute === item.id 
                                ? 'bg-teal-100 text-teal-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <span className={`text-xl transition-transform group-hover:scale-110 ${activeRoute === item.id ? 'text-teal-600' : ''}`}>{item.icon}</span>
                            <span className="block">{item.label}</span>
                            {activeRoute === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-500 rounded-r-full"></div>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-teal-100/50">
                     <button onClick={onLogout} className="w-full flex items-center justify-start gap-3 px-4 py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group">
                        <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
                        <span className="block text-xs font-bold uppercase tracking-wider">Sign Out</span>
                     </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 relative bg-[#f0fdfa] w-full max-w-full flex flex-col min-w-0 overflow-x-hidden">
                <header className="h-16 border-b border-teal-100/50 flex items-center justify-between px-6 lg:px-10 bg-white/60 backdrop-blur-md sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.3)]"></span>
                        <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
                            {activeRoute.replace('-', ' ')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-extrabold text-teal-600 bg-teal-100/80 px-3 py-1 rounded-full border border-teal-200 hidden sm:block uppercase tracking-widest">Faculty Context</span>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 shadow-inner flex items-center justify-center text-white font-bold border border-white">
                           {displayName.charAt(0)}
                        </div>
                    </div>
                </header>

                <div className="relative z-10 p-6 lg:p-10 mt-16 lg:mt-0 pb-20 w-full">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <div className="relative z-10 w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherLayout;
