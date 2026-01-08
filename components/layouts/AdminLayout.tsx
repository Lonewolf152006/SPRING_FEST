
import React, { useState } from 'react';
import { UserRole } from '../../types';
import { ROLE_NAVIGATION } from '../../utils/navigation';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeRoute: string;
    onNavigate: (route: string) => void;
    onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeRoute, onNavigate, onLogout }) => {
    const navItems = ROLE_NAVIGATION[UserRole.ADMIN];
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-100 text-slate-800 overflow-hidden font-mono selection:bg-indigo-100">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">A</div>
                    <span className="font-bold text-slate-800 tracking-tight">ADMIN</span>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
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
                fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/90 lg:bg-white/70 backdrop-blur-xl border-r border-indigo-100/50 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-sm
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-indigo-100/50 flex items-center gap-3 bg-gradient-to-b from-indigo-50/50 to-transparent mt-16 lg:mt-0">
                    <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">
                        A
                    </div>
                    <div>
                        <h3 className="font-bold tracking-tight text-slate-800">AMEP ADMIN</h3>
                        <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold">Level 5 Access</p>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                onNavigate(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                activeRoute === item.id 
                                ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 shadow-sm' 
                                : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 border border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg opacity-70">{item.icon}</span>
                                <span>{item.label}</span>
                            </div>
                            {activeRoute === item.id && <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-indigo-100/50">
                    <div className="bg-white/50 p-3 rounded-lg mb-4 border border-indigo-100/50 backdrop-blur-sm">
                        <div className="text-[10px] text-slate-500 uppercase mb-1 font-bold">System Status</div>
                        <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Operational
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full text-center py-2 text-xs text-slate-500 hover:text-white uppercase font-bold border border-slate-200 hover:border-red-500 hover:bg-red-500 rounded-lg transition-all shadow-sm">
                        Secure Logout
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 relative bg-slate-50 w-full flex flex-col">
                <header className="h-16 border-b border-indigo-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm rotate-45 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.3)]"></div>
                        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tighter">
                            {activeRoute.replace('-', '_')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-bold text-indigo-500 border border-indigo-100 px-3 py-1 rounded bg-indigo-50 hidden sm:block">ROOT_MODE</div>
                        <div className="w-9 h-9 bg-slate-900 rounded flex items-center justify-center text-white text-xs border border-slate-700 shadow-inner">AD</div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth mt-16 lg:mt-0">
                    {/* Subtle Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-200/10 rounded-full blur-[120px] pointer-events-none"></div>
                    
                    <div className="p-6 lg:p-10 relative z-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
