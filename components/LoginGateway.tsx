
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { AuthService } from '../services/authService';

interface LoginGatewayProps {
  onLogin: (role: UserRole, userId: string) => void;
}

const LoginGateway: React.FC<LoginGatewayProps> = ({ onLogin }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
        if (authMode === 'signup') {
            const user = await AuthService.signUp(email, password, fullName, selectedRole);
            // On success, the triggering of handle_new_user in DB takes care of the profile.
            // We can now log in or inform user to check email if confirmation is on.
            alert("Account created successfully! You can now log in.");
            setAuthMode('login');
        } else {
            const user = await AuthService.signIn(email, password);
            if (user) {
                const profile = await AuthService.getProfile(user.id);
                if (profile) {
                    onLogin(profile.role as UserRole, user.id);
                }
            }
        }
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 selection:bg-indigo-200 overflow-x-hidden bg-slate-50">
      
      {/* Background and Nav same as before */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-rose-50/50 animate-gradient-shift bg-[length:400%_400%] -z-10"></div>
      </div>

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 lg:px-12 py-4 flex justify-between items-center ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 py-3' : 'bg-transparent py-6'}`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shadow-lg">
                <span className="text-xl">A</span>
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-xl">AMEP<span className="text-indigo-600">.ai</span></span>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm shadow-lg hover:bg-slate-800 transition-all"
        >
            Portal Login
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center pt-32 pb-20 px-4">
            <div className="text-center max-w-5xl mx-auto mb-16 z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-slate-200/60 text-indigo-900 text-xs font-extrabold uppercase tracking-[0.2em] mb-8 shadow-sm">
                    Identity-Aware Educational OS
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">
                    Adaptive Mastery <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600">Intelligence</span>
                </h1>
                <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto mb-12">
                    Connect your Supabase account to sync your learning roadmap across all devices.
                </p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => { setIsModalOpen(true); setAuthMode('signup'); }}
                        className="px-10 py-5 bg-indigo-600 text-white rounded-full font-black text-lg shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                    >
                        <span>✨</span> Create Scholar Account
                    </button>
                    <button 
                        onClick={() => { setIsModalOpen(true); setAuthMode('login'); }}
                        className="px-10 py-5 bg-white border border-slate-200 text-slate-700 rounded-full font-bold text-lg hover:bg-slate-50 transition-all"
                    >
                        Member Sign In
                    </button>
                </div>
            </div>

            {/* Same HUD Preview as before */}
            <div id="hud-preview" className="w-full max-w-5xl mx-auto relative z-0 animate-fade-in-up delay-300 px-4">
                 <div className="relative bg-slate-900 rounded-[28px] border border-white/10 shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[2/1] flex flex-col md:flex-row cursor-pointer" onClick={() => setIsModalOpen(true)}>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                    <div className="w-full md:w-1/3 border-r border-white/10 p-8 flex flex-col justify-between relative z-10 bg-slate-900/50 backdrop-blur-sm">
                        <div>
                            <div className="text-white font-bold text-lg mb-4">Neural HUD</div>
                            <div className="space-y-4">
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[75%] animate-pulse"></div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 w-[90%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                        <div className="text-indigo-500/20 text-9xl font-black">AMEP</div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-bold text-sm px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10">Sync Required to Unlock Full Potential</span>
                        </div>
                    </div>
                 </div>
            </div>
      </section>

      {/* AUTH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-fade-in" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white p-8 md:p-10 rounded-[40px] border border-white shadow-2xl max-w-md w-full animate-pop-in overflow-hidden">
              
              <div className="mb-8 text-center">
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                    {authMode === 'login' ? 'Welcome Back' : 'Join the Network'}
                 </h2>
                 <p className="text-slate-500 mt-2 font-medium">
                    {authMode === 'login' ? 'Resume your learning roadmap.' : 'Initialize your scholarly identity.'}
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                {authMode === 'signup' && (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                            <input 
                                required
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                                placeholder="Dr. Jane Doe / Alex Smith"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Identity Role</label>
                            <select 
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value as UserRole)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                            >
                                <option value={UserRole.STUDENT}>Student</option>
                                <option value={UserRole.TEACHER}>Teacher</option>
                                <option value={UserRole.ADMIN}>Administrator</option>
                            </select>
                        </div>
                    </>
                )}

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                    <input 
                        required
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                        placeholder="you@institution.edu"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Security Password</label>
                    <input 
                        required
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <span>{authMode === 'login' ? 'Authenticate' : 'Initialize Account'}</span>
                    )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                 <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
                 >
                    {authMode === 'login' ? "Don't have an account? Sign up" : "Already registered? Log in"}
                 </button>
              </div>

           </div>
        </div>
      )}

      <style>{`
        @keyframes liquid { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient-shift { animation: liquid 20s ease infinite; }
        @keyframes pop-in { 0% { opacity: 0; transform: scale(0.9) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default LoginGateway;
