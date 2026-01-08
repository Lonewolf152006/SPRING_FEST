
import React, { useState } from 'react';
import { UserRole } from '../../types';
import { ROLE_NAVIGATION } from '../../utils/navigation';

interface TeacherLayoutProps {
    children: React.ReactNode;
    activeRoute: string;
    onNavigate: (route: string) => void;
    onLogout: () => void;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children, activeRoute, onNavigate, onLogout }) => {
    const navItems = ROLE_NAVIGATION[UserRole.TEACHER];
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-teal-50/30 text-slate-800 overflow-hidden font-sans">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-teal-100 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold">P</div>
                    <span className="font-bold text-slate-800">Prof. Day</span>
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

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/90 lg:bg-white/70 backdrop-blur-xl border-r border-teal-100/50 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-sm
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 flex items-center gap-3 border-b border-teal-100/50 bg-gradient-to-b from-teal-50/50 to-transparent mt-16 lg:mt-0">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-xl shadow-sm border border-teal-200">
                        🍎
                    </div>
                    <div className="block">
                        <h3 className="font-bold text-sm text-slate-800">Prof. Day</h3>
                        <p className="text-[10px] text-teal-500 uppercase font-bold tracking-wider">Faculty Admin</p>
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
            <main className="flex-1 relative overflow-hidden bg-[#f0fdfa] w-full flex flex-col">
                <header className="h-16 border-b border-teal-100/50 flex items-center justify-between px-6 lg:px-10 bg-white/60 backdrop-blur-md sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.3)]"></span>
                        <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
                            {activeRoute.replace('-', ' ')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-extrabold text-teal-600 bg-teal-100/80 px-3 py-1 rounded-full border border-teal-200 hidden sm:block uppercase tracking-widest">Live Context</span>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 shadow-inner flex items-center justify-center text-white font-bold border border-white">T</div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth mt-16 lg:mt-0">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-200/20 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <div className="p-6 lg:p-10 relative z-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TeacherLayout;
