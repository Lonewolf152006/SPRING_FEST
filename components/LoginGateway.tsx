
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { AuthService } from '../services/authService';
import { DatabaseService } from '../services/databaseService';

interface LoginGatewayProps {
  onLogin: (role: UserRole, userId: string) => void;
  dbStatus: 'connecting' | 'connected' | 'error';
}

const LoginGateway: React.FC<LoginGatewayProps> = ({ onLogin, dbStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [error, setError] = useState<{message: string; isBackendRestricted?: boolean; isInvalidCreds?: boolean; needsProfile?: boolean; isDbTriggerError?: boolean} | null>(null);

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

    // Stricter frontend validation to match Supabase policy
    if (authMode === 'signup' && password.length < 6) {
        setError({ message: "Security protocol requires at least 6 characters for the password. Entry rejected." });
        return;
    }

    setLoading(true);

    try {
        if (authMode === 'signup') {
            try {
                const user = await AuthService.signUp(email, password, fullName, selectedRole);
                alert("Account created! Please check your email for a verification link if 'Confirm Email' is enabled in your Supabase settings.");
                setAuthMode('login');
            } catch (err: any) {
                const msg = err.message || "";
                if (msg.includes('Signups not allowed') || msg.includes('Email signups are disabled')) {
                    setError({
                        message: "Institutional Signup Policy Restricted. In your Supabase Dashboard, go to 'Auth > Providers > Email' and enable 'Allow new users to sign up'.",
                        isBackendRestricted: true
                    });
                    setShowSetupHelp(true);
                } else if (msg.includes('Database error saving new user')) {
                    setError({
                        message: "Neural Sync Failed: The database trigger 'handle_new_user' encountered a terminal error. The 'profiles' table must be initialized via SQL.",
                        isDbTriggerError: true
                    });
                    setShowSetupHelp(true);
                } else if (msg.includes('least 6 characters')) {
                    setError({ message: "Password length rejected by neural vault. Use 6+ characters." });
                } else {
                    setError({ message: msg });
                }
            }
        } else {
            try {
                const user = await AuthService.signIn(email, password);
                if (user) {
                    const profile = await AuthService.getProfile(user.id);
                    if (profile) {
                        onLogin(profile.role as UserRole, user.id);
                    } else {
                        setError({ 
                            message: "Handshake verified, but Neural Profile not found. This indicates the database trigger was missing during enrollment.", 
                            needsProfile: true 
                        });
                        setShowSetupHelp(true);
                    }
                }
            } catch (err: any) {
                const msg = err.message || "";
                if (msg.includes('Invalid login credentials') || msg.includes('Email not confirmed')) {
                    setError({
                        message: msg.includes('Email not confirmed') 
                            ? "Handshake Rejected: Email identity not yet verified. Check inbox or disable 'Confirm Email' in settings."
                            : "Access Denied: Identity unknown to the network. Create an account or use Demo Mode.",
                        isInvalidCreds: true
                    });
                } else {
                    setError({ message: msg });
                }
            }
        }
    } catch (err: any) {
        setError({ message: err.message || "A network link error occurred during handshake." });
    } finally {
        setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
      const mockId = role === UserRole.TEACHER ? 'T1' : role === UserRole.ADMIN ? 'A1' : 'S1';
      onLogin(role, mockId);
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 selection:bg-indigo-200 overflow-x-hidden bg-slate-50">
      
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
        <button onClick={() => { setIsModalOpen(true); setAuthMode('login'); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-95">
            Portal Access
        </button>
      </nav>

      <section className="min-h-screen flex flex-col items-center pt-32 pb-20 px-4">
            <div className="text-center max-w-5xl mx-auto mb-16 z-10 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-slate-200/60 text-indigo-900 text-xs font-black uppercase tracking-[0.3em] mb-10 shadow-sm">
                    Adaptive Intelligence Educational OS
                </div>
                <h1 className="text-7xl md:text-9xl font-black text-slate-900 mb-10 tracking-tighter leading-[0.85]">
                    Adaptive <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600">Intelligence</span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 font-medium leading-relaxed max-w-3xl mx-auto mb-16">
                    Autonomous mastery tracking, neural proctoring, and project-based growth for the next generation of scholars.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <button onClick={() => { setIsModalOpen(true); setAuthMode('signup'); }} className="px-12 py-6 bg-indigo-600 text-white rounded-full font-black text-xl shadow-2xl shadow-indigo-600/30 hover:scale-105 transition-all flex items-center justify-center gap-4">
                        <span>✨</span> Initialize Identity
                    </button>
                    <button onClick={() => { setIsModalOpen(true); setAuthMode('login'); }} className="px-12 py-6 bg-white border-2 border-slate-100 text-slate-700 rounded-full font-black text-xl hover:bg-slate-50 transition-all hover:shadow-xl active:scale-95">
                        Network Sign In
                    </button>
                </div>
            </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-fade-in" onClick={() => setIsModalOpen(false)}></div>
           <div className="relative bg-white p-10 md:p-12 rounded-[48px] border border-white shadow-2xl max-w-md w-full animate-pop-in overflow-y-auto max-h-[95vh] custom-scrollbar">
              
              <div className="mb-8 text-center">
                 <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                    {authMode === 'login' ? 'Sync Profile' : 'Enroll Identity'}
                 </h2>
                 <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                    {authMode === 'login' ? 'Authorization Required' : 'Institutional Onboarding'}
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {error && (
                    <div className={`p-6 rounded-[32px] text-[11px] font-bold text-center leading-relaxed border transition-all ${error.isDbTriggerError ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-rose-100' : 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-100'} shadow-xl mb-6`}>
                        <div className="flex items-center justify-center gap-2 mb-3 uppercase tracking-[0.2em] font-black text-[10px]">
                            <span>⚠️ Neural Diagnostics</span>
                        </div>
                        <div className="mb-4">{error.message}</div>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                type="button"
                                onClick={() => handleDemoLogin(UserRole.STUDENT)}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                            >
                                Neural Bypass: Login as Guest ➔
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowSetupHelp(!showSetupHelp)}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] uppercase tracking-widest font-black"
                            >
                                {showSetupHelp ? 'Collapse Documentation' : 'Resolve Backend Identity Issues'}
                            </button>
                        </div>
                    </div>
                )}

                {showSetupHelp && (
                    <div className="bg-slate-900 rounded-[32px] p-6 text-left animate-fade-in border border-white/10 my-6 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-4xl">🛠️</div>
                        <h4 className="text-white text-[10px] font-black uppercase mb-4 border-b border-white/10 pb-3 flex justify-between">
                            <span>Backend Recovery Protocol</span>
                            <span className="text-emerald-400 font-mono">Step_01</span>
                        </h4>
                        <div className="space-y-6 text-[10px] text-slate-300 leading-relaxed">
                            <div>
                                <p className="text-indigo-400 font-black mb-1 uppercase tracking-tighter">1. Enable Global Signup</p>
                                <p>In Supabase Console: **Auth > Providers > Email** -> Enable **'Allow new users to sign up'**.</p>
                            </div>
                            <div>
                                <p className="text-indigo-400 font-black mb-1 uppercase tracking-tighter">2. Instant Handshake</p>
                                <p>Turn **OFF** **'Confirm Email'** for testing instant identity verification.</p>
                            </div>
                            <div>
                                <p className="text-indigo-400 font-black mb-2 uppercase tracking-tighter">3. Neural Profile Trigger (Run in SQL Editor)</p>
                                <pre className="bg-black/80 p-4 rounded-2xl text-[9px] font-mono overflow-x-auto text-emerald-400 border border-white/5 scrollbar-hide mb-2 leading-tight">
{`create table public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text default 'Student',
  created_at timestamp with time zone default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`}
                                </pre>
                                <p className="text-[8px] text-slate-500 italic">This trigger automatically syncs Auth users to your Profile records.</p>
                            </div>
                        </div>
                    </div>
                )}

                {!error?.isBackendRestricted && (
                  <div className="space-y-4">
                    {authMode === 'signup' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Scholarly Legal Name</label>
                                <input 
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all font-bold"
                                    placeholder="Alex Scholar"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Institutional Role</label>
                                <select 
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value as UserRole)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all font-black text-slate-700 cursor-pointer appearance-none"
                                >
                                    <option value={UserRole.STUDENT}>Student</option>
                                    <option value={UserRole.TEACHER}>Teacher</option>
                                    <option value={UserRole.ADMIN}>Administrator</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Institutional Email</label>
                        <input 
                            required
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all font-bold"
                            placeholder="j.scholar@institution.edu"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Security Key (Min 6 chars)</label>
                        <input 
                            required
                            type="password"
                            minLength={6}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-6 py-4 text-sm focus:border-indigo-500 outline-none transition-all font-bold"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        disabled={loading || (dbStatus === 'error' && authMode === 'signup')}
                        className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-base shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 mt-6"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span>{authMode === 'login' ? 'Authorize Handshake' : 'Provision Identity'}</span>
                        )}
                    </button>
                  </div>
                )}
              </form>

              <div className={`mt-8 pt-8 border-t border-slate-100 ${error ? 'animate-pulse-indigo rounded-[32px] p-6 bg-indigo-50/50' : ''}`}>
                  <p className={`text-[10px] text-center font-black uppercase tracking-[0.2em] mb-6 ${error ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {error ? '➔ Emergency Access: Sandbox Mode' : 'Instant Neural Proxy'}
                  </p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => handleDemoLogin(UserRole.STUDENT)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border active:scale-95 ${error ? 'bg-indigo-600 text-white border-indigo-700 shadow-xl' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}>
                          Scholar
                      </button>
                      <button onClick={() => handleDemoLogin(UserRole.TEACHER)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border active:scale-95 ${error ? 'bg-teal-600 text-white border-teal-700 shadow-xl' : 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100'}`}>
                          Faculty
                      </button>
                      <button onClick={() => handleDemoLogin(UserRole.ADMIN)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border active:scale-95 ${error ? 'bg-rose-600 text-white border-rose-700 shadow-xl' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}>
                          Root
                      </button>
                  </div>
              </div>

              <div className="mt-10 text-center space-y-6">
                 <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); setShowSetupHelp(false); }} className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                    {authMode === 'login' ? "Enroll new identity" : "Return to sign in"}
                 </button>

                 <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-50">
                    <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : dbStatus === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Neural Link: {dbStatus === 'connected' ? 'ACTIVE' : dbStatus === 'error' ? 'OFFLINE' : 'CALIBRATING...'}
                    </span>
                 </div>
              </div>

           </div>
        </div>
      )}

      <style>{`
        @keyframes liquid { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient-shift { animation: liquid 20s ease infinite; }
        @keyframes pop-in { 0% { opacity: 0; transform: scale(0.9) translateY(40px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-pop-in { animation: pop-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes pulse-indigo { 0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.2); } 70% { box-shadow: 0 0 0 15px rgba(79, 70, 229, 0); } 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); } }
        .animate-pulse-indigo { animation: pulse-indigo 2s infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default LoginGateway;
