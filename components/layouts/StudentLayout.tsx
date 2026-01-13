
import React, { useState, useContext } from 'react';
import { UserRole } from '../../types';
import { ROLE_NAVIGATION } from '../../utils/navigation';
import { HierarchyContext } from '../../App';

interface StudentLayoutProps {
    children: React.ReactNode;
    activeRoute: string;
    onNavigate: (route: string) => void;
    onLogout: () => void;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children, activeRoute, onNavigate, onLogout }) => {
    const { userProfile } = useContext(HierarchyContext);
    const navItems = ROLE_NAVIGATION[UserRole.STUDENT];
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const displayName = userProfile?.full_name || 'Scholar';
    const currentXp = userProfile?.xp || 0;
    const currentLevel = userProfile?.level || 1;
    
    // Level Math: 1000 XP per level
    const nextLevelXp = currentLevel * 1000;
    const prevLevelXp = (currentLevel - 1) * 1000;
    const progressInCurrentLevel = currentXp - prevLevelXp;
    const levelRange = 1000;
    const progressPercent = Math.min(100, Math.max(0, (progressInCurrentLevel / levelRange) * 100));

    return (
        <div className="flex min-h-screen bg-indigo-50/30 text-slate-800 font-sans selection:bg-indigo-200 w-full overflow-x-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-indigo-100 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">A</div>
                    <span className="font-bold text-slate-800">AMEP</span>
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
                fixed lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto inset-y-0 left-0 z-50 w-64 bg-white/90 lg:bg-white/70 backdrop-blur-xl border-r border-white/50 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-sm
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-indigo-100/50 bg-gradient-to-b from-indigo-50/50 to-transparent mt-16 lg:mt-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-lg text-indigo-600 shadow-sm font-black">
                            {displayName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-800 truncate max-w-[140px]">{displayName}</h3>
                            <span className="text-[10px] text-indigo-500 uppercase tracking-widest font-bold">Lvl {currentLevel} Scholar</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-100">
                        <div className="bg-gradient-to-r from-indigo-400 to-purple-400 h-full shadow-sm transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>{currentXp.toLocaleString()} XP</span>
                        <span>Next: {nextLevelXp.toLocaleString()}</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                onNavigate(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                                activeRoute === item.id 
                                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                                : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'
                            }`}
                        >
                            <span className={`text-xl transition-transform group-hover:scale-110 ${activeRoute === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-indigo-100/50">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-bold uppercase tracking-wider text-center">
                        <span>🚪</span> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative bg-[#f8fafc] w-full max-w-full flex flex-col min-w-0 overflow-x-hidden">
                <header className="hidden lg:flex h-16 bg-white/60 backdrop-blur-md border-b border-indigo-100/50 items-center justify-between px-10 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.3)]"></span>
                        <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
                            {activeRoute.replace('-', ' ')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
                             <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online
                             </div>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                           Partition: {userProfile?.full_name.split(' ')[0]}'s Link
                        </div>
                    </div>
                </header>

                <div className="relative z-10 p-6 lg:p-10 mt-16 lg:mt-0 pb-20 w-full">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <div className="relative z-10 w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
