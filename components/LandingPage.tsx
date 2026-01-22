import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onEnter: () => void;
}

// --- Interactive 3D Tilt Card ---
const TiltCard = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        const xPct = (clientX - left) / width - 0.5;
        const yPct = (clientY - top) / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);
    const sheenGradient = useMotionTemplate`radial-gradient(400px circle at ${useTransform(mouseX, [-0.5, 0.5], ['0%', '100%'])} ${useTransform(mouseY, [-0.5, 0.5], ['0%', '100%'])}, rgba(255,255,255,0.5), transparent 80%)`;

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: "preserve-3d", rotateX, rotateY }}
            className={`relative transition-all duration-200 ease-out group ${className}`}
        >
            <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl rounded-[32px] overflow-hidden h-full relative z-10 transform-gpu flex flex-col">
                <motion.div 
                    style={{ background: sheenGradient }} 
                    className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay" 
                />
                {children}
            </div>
            {/* Depth Shadow */}
            <div className="absolute inset-4 z-0 bg-indigo-500/10 blur-2xl rounded-[32px] translate-y-6 group-hover:translate-y-8 transition-transform duration-500" />
        </motion.div>
    );
};

// --- Dynamic Text Component ---
const TextCycler = () => {
  const words = ["Potential", "Intelligence", "Innovators", "Learning"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex items-center align-baseline h-[1.1em] px-2">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 font-black"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
      {/* Spacer to reserve maximum expected width */}
      <span className="opacity-0 pointer-events-none font-black select-none px-2 invisible">Intelligence</span>
    </span>
  );
};

// --- Visual Mockups ---

const MockSkillTree = () => (
  <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
    <div className="flex gap-6 items-end scale-90 origin-bottom">
        <div className="flex flex-col items-center gap-2 group/node cursor-default">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-indigo-100 relative flex items-center justify-center shadow-lg transition-transform group-hover/node:scale-110 duration-300">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e7ff" strokeWidth="8" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 0.85 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="283" strokeLinecap="round" 
                    />
                </svg>
                <span className="text-xl font-black text-indigo-600">85%</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100">Math</span>
        </div>
        <div className="flex flex-col items-center gap-2 mb-8 group/node cursor-default">
            <div className="w-16 h-16 rounded-full bg-white border-4 border-purple-100 relative flex items-center justify-center shadow-lg transition-transform group-hover/node:scale-110 duration-300 delay-100">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f3e8ff" strokeWidth="8" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 0.65 }}
                        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                        cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="8" strokeDasharray="283" strokeLinecap="round" 
                    />
                </svg>
                <span className="text-lg font-black text-purple-600">65%</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100">Physics</span>
        </div>
    </div>
  </div>
);

const MockCalendar = () => (
  <div className="w-full h-full bg-white p-6 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 relative z-10">
          <div className="text-[10px] font-bold text-slate-400 uppercase">My Schedule</div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
      </div>
      <div className="space-y-2 relative z-10">
          <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex items-center gap-3">
              <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
              <div>
                  <div className="h-1.5 w-16 bg-indigo-200 rounded mb-1"></div>
                  <div className="h-1 w-10 bg-indigo-100 rounded"></div>
              </div>
          </div>
      </div>
  </div>
);

const MockDashboard = () => (
    <div className="w-full bg-white rounded-[24px] p-8 border border-slate-200 shadow-xl relative overflow-hidden group">
        <div className="flex justify-between items-center mb-8">
            <div>
                <div className="text-xl font-bold text-slate-800">Welcome back, Scholar</div>
                <div className="text-xs text-slate-400 font-medium">Neural Status: Active</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg border-2 border-white"></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
            {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-slate-50 rounded-2xl border border-slate-100 flex items-end justify-center pb-2 px-3 overflow-hidden relative">
                    <motion.div initial={{ height: '20%' }} whileInView={{ height: `${30 + Math.random() * 50}%` }} transition={{ duration: 1.5, delay: i * 0.2 }} className="w-full bg-indigo-200 rounded-t-md opacity-60"></motion.div>
                </div>
            ))}
        </div>
        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">AI Suggestion</div>
            <div className="text-sm font-bold">Review Linear Algebra Foundations</div>
        </div>
    </div>
);

const MockCareer = () => (
    <div className="relative w-full max-w-sm mx-auto pb-10 pr-2">
        <div className="bg-white p-8 rounded-[24px] shadow-xl border border-slate-200 relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl">📄</div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">Resume_Neural.pdf</div>
                        <div className="text-[10px] text-slate-400">Sync Complete</div>
                    </div>
                </div>
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">✨ 98% Match</div>
            </div>
            <div className="space-y-3 opacity-50">
                <div className="h-2 bg-slate-200 rounded w-full"></div>
                <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                <div className="h-2 bg-slate-200 rounded w-4/6"></div>
            </div>
        </div>
        <div className="absolute bottom-6 right-4 z-20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="text-2xl">🚀</div>
            <div>
                <div className="text-[10px] font-bold uppercase opacity-80">Career Cell</div>
                <div className="text-sm font-bold">Market Ready</div>
            </div>
        </div>
    </div>
);

const RolePreview = () => {
    const [activeRole, setActiveRole] = useState<'student' | 'teacher' | 'admin'>('student');
    const content = {
        student: { title: "Own Your Growth Arc", desc: "Zync adapts to your pace, manages your mental wellness, and builds your career path from day one.", color: "indigo" },
        teacher: { title: "See The Invisible", desc: "Use the Confusion Index to see when your class is lost. Automate grading and focus on mentorship.", color: "teal" },
        admin: { title: "Pulse of the Campus", desc: "Unified institutional health metrics. Predict risks and manage resources with surgical precision.", color: "rose" }
    };
    return (
        <div className="max-w-7xl mx-auto px-4 py-24">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">The <span className="text-indigo-600">Zync</span> Experience</h2>
                <div className="flex justify-center gap-4">
                    {(['student', 'teacher', 'admin'] as const).map(role => (
                        <button key={role} onClick={() => setActiveRole(role)} className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${activeRole === role ? `bg-slate-900 text-white shadow-xl scale-105` : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>{role}</button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div key={activeRole} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                    <h3 className="text-5xl font-black text-slate-900 leading-tight">{content[activeRole].title}</h3>
                    <p className="text-xl text-slate-500 leading-relaxed font-medium">{content[activeRole].desc}</p>
                    <button className={`px-8 py-4 bg-${content[activeRole].color}-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs`}>Explore {activeRole} features</button>
                </motion.div>
                <div className="relative">
                    <TiltCard className="p-2 bg-white/50">
                        {activeRole === 'student' && <MockDashboard />}
                        {activeRole === 'teacher' && <div className="p-12 text-center text-4xl">👨‍🏫 Confusion Dashboard</div>}
                        {activeRole === 'admin' && <div className="p-12 text-center text-4xl">🛡️ Admin Central</div>}
                    </TiltCard>
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FE] text-slate-800 font-sans selection:bg-indigo-200 overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3 backdrop-blur-md bg-white/30 px-4 py-2 rounded-2xl border border-white/40 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold shadow-lg">Z</div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg uppercase">ZYNC</span>
        </div>
        <div className="flex gap-4">
            <button onClick={onEnter} className="px-5 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95">Enter Terminal</button>
        </div>
      </nav>

      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-slate-200 text-indigo-900 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> ZYNC AMEP.OS v1.0
        </motion.div>
        
        <h1 className="text-7xl md:text-9xl font-black text-slate-900 mb-2 tracking-tighter leading-none py-2 uppercase">ZYNC</h1>
        <div className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 mb-8 tracking-tight pb-2">Adaptive Mastery</div>

        <div className="text-xl md:text-3xl text-slate-500 font-medium leading-relaxed max-w-5xl mx-auto mb-12 flex flex-wrap justify-center items-baseline">
            The operating system for future <TextCycler />.
        </div>

        <div className="text-sm md:text-lg text-slate-400 font-bold uppercase tracking-[0.2em] mb-12 max-w-2xl mx-auto">
            Autonomous mastery tracking, neural proctoring, and project-based growth.
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-col sm:flex-row justify-center gap-4 relative z-20">
            <button onClick={onEnter} className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-black text-lg shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
                ✨ Initialize Identity
            </button>
            <button onClick={onEnter} className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-700 rounded-full font-black text-lg hover:bg-slate-50 transition-all shadow-xl">
                Network Sign In
            </button>
        </motion.div>
      </section>

      <section className="relative z-20 bg-white/80 backdrop-blur-xl border-t border-white/60">
          <RolePreview />
      </section>

      <section className="relative z-10 py-32 px-4 lg:px-12">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <TiltCard className="p-8"><div className="text-3xl mb-4">📊</div><h3 className="text-2xl font-bold mb-3">Mastery Visibility</h3><p className="text-slate-500 text-sm">Real-time mastery trees and progress graphs.</p><div className="mt-8 h-48"><MockSkillTree /></div></TiltCard>
                  <TiltCard className="p-8"><div className="text-3xl mb-4">🗓️</div><h3 className="text-2xl font-bold mb-3">Smart Planner</h3><p className="text-slate-500 text-sm">AI-driven scheduling and task prioritization.</p><div className="mt-8 h-48"><MockCalendar /></div></TiltCard>
                  <TiltCard className="p-8"><div className="text-3xl mb-4">🚀</div><h3 className="text-2xl font-bold mb-3">Career Cell</h3><p className="text-slate-500 text-sm">Neural resume building and interview prep.</p><div className="mt-8 h-48"><MockCareer /></div></TiltCard>
              </div>
          </div>
      </section>

      <footer className="relative bg-slate-900 text-white py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-10">Initialize Your Potential.</h2>
          <button onClick={onEnter} className="px-10 py-5 bg-white text-slate-900 rounded-full font-black text-lg hover:scale-105 transition-transform shadow-2xl">Start Now</button>
          <div className="mt-20 pt-12 border-t border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
              ©ZYNC AMEP.OS • Powered by Gemini 3 Flash
          </div>
      </footer>
    </div>
  );
};

export default LandingPage;
