
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onEnter: () => void;
}

// --- Interactive 3D Tilt Card ---
// Fix: Made children optional to prevent TS error when passed as JSX content (line 355, 523, 541, 561, 606, 624)
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
  const words = ["Intelligence", "Potential", "Innovators", "Learning"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex items-center justify-center h-[1.1em] overflow-visible align-top text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 min-w-[120px] md:min-w-[180px]">
      <AnimatePresence mode='popLayout'>
        <motion.span
          key={words[index]}
          initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-100%", opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 py-1 text-center w-full"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

// --- Visual Mockups ---

const MockSkillTree = () => (
  <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
    <div className="flex gap-6 items-end scale-90 origin-bottom">
        {/* Node 1 */}
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
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md opacity-0 group-hover/node:opacity-100 transition-opacity"></div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100">Math</span>
        </div>
        {/* Node 2 */}
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
    {/* Connector */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
        <motion.path 
            d="M110 130 Q 140 130 155 100" 
            fill="none" 
            stroke="#cbd5e1" 
            strokeWidth="2" 
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
        />
    </svg>
  </div>
);

const MockCalendar = () => (
  <div className="w-full h-full bg-white p-6 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2 relative z-10">
          <div className="text-[10px] font-bold text-slate-400 uppercase">My Schedule</div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
      </div>
      <div className="space-y-2 relative z-10">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex items-center gap-3"
          >
              <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
              <div>
                  <div className="h-1.5 w-16 bg-indigo-200 rounded mb-1"></div>
                  <div className="h-1 w-10 bg-indigo-100 rounded"></div>
              </div>
          </motion.div>
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center gap-3 opacity-60"
          >
              <div className="w-1 h-6 bg-slate-300 rounded-full"></div>
              <div>
                  <div className="h-1.5 w-12 bg-slate-200 rounded mb-1"></div>
                  <div className="h-1 w-8 bg-slate-100 rounded"></div>
              </div>
          </motion.div>
      </div>
      {/* Decorative Blur */}
      <div className="absolute bottom-2 right-2 w-16 h-16 bg-teal-100/50 rounded-full blur-xl pointer-events-none"></div>
  </div>
);

const MockDashboard = () => (
    <div className="w-full bg-white rounded-[24px] p-8 border border-slate-200 shadow-xl relative overflow-hidden group">
        {/* Scanning Line Effect */}
        <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent z-20 opacity-30 pointer-events-none"
        />
        
        <div className="flex justify-between items-center mb-8">
            <div>
                <div className="text-xl font-bold text-slate-800">Welcome back, Alex</div>
                <div className="text-xs text-slate-400 font-medium">Scholar Level 4</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg border-2 border-white"></div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
            {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-slate-50 rounded-2xl border border-slate-100 flex items-end justify-center pb-2 px-3 overflow-hidden relative">
                    <motion.div 
                        initial={{ height: '20%' }}
                        whileInView={{ height: `${30 + Math.random() * 50}%` }}
                        transition={{ duration: 1.5, delay: i * 0.2 }}
                        className="w-full bg-indigo-200 rounded-t-md opacity-60"
                    ></motion.div>
                </div>
            ))}
        </div>

        {/* AI Suggestion */}
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-indigo-600 text-white p-5 rounded-2xl shadow-lg shadow-indigo-200 relative overflow-hidden cursor-pointer"
        >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> AI Suggestion
            </div>
            <div className="text-sm font-bold">Review Calculus II Derivatives</div>
        </motion.div>
    </div>
);

const MockCareer = () => (
    <div className="relative w-full max-w-sm mx-auto pb-10 pr-2">
        {/* Resume Doc */}
        <motion.div 
            className="bg-white p-8 rounded-[24px] shadow-xl border border-slate-200 relative z-10"
            whileHover={{ y: -5 }}
        >
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xl">📄</div>
                    <div>
                        <div className="text-sm font-bold text-slate-800">Resume_v4.pdf</div>
                        <div className="text-[10px] text-slate-400">Processed just now</div>
                    </div>
                </div>
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                    <span>✨</span> 94% Match
                </div>
            </div>
            <div className="space-y-3 opacity-50">
                <div className="h-2 bg-slate-200 rounded w-full"></div>
                <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                <div className="h-2 bg-slate-200 rounded w-4/6"></div>
                <div className="h-2 bg-slate-200 rounded w-3/4"></div>
            </div>
            
            {/* Scan Beam */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-[10px] w-full animate-scan pointer-events-none"></div>
        </motion.div>

        {/* Pathfinder Badge */}
        <motion.div 
            className="absolute bottom-6 right-4 z-20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border border-white/20"
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
            <div className="text-2xl">🚀</div>
            <div>
                <div className="text-[10px] font-bold uppercase opacity-80">Pathfinder</div>
                <div className="text-sm font-bold">Mock Interview Ready</div>
            </div>
        </motion.div>
        
        <style>{`
            @keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
            .animate-scan { animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        `}</style>
    </div>
);

// --- Role Switcher Component ---
const RolePreview = () => {
    const [activeRole, setActiveRole] = useState<'student' | 'teacher' | 'admin'>('student');

    const content = {
        student: {
            title: "Own Your Growth Arc",
            desc: "Zync isn't just a gradebook. It's a personal AI mentor that adapts coursework to your learning speed, helps you build a resume based on actual project skills, and manages your mental wellness.",
            stats: [
                { val: "100%", label: "Adaptive" },
                { val: "24/7", label: "AI Tutor" },
                { val: "3D", label: "Skill Trees" }
            ],
            color: "indigo"
        },
        teacher: {
            title: "See The Invisible",
            desc: "Move beyond attendance sheets. Zync's 'Confusion Index' uses computer vision to tell you exactly when the class is lost, while the AI Grading Hub detects bias in peer reviews instantly.",
            stats: [
                { val: "Live", label: "Heatmaps" },
                { val: "< 1s", label: "Feedback" },
                { val: "Auto", label: "Grading" }
            ],
            color: "teal"
        },
        admin: {
            title: "Pulse of the Campus",
            desc: "A God-mode view of institutional health. Predict dropout risks before they happen, allocate scholarships with equity algorithms, and monitor campus safety in real-time.",
            stats: [
                { val: "360°", label: "Oversight" },
                { val: "Predictive", label: "Retention" },
                { val: "Secure", label: "Vault" }
            ],
            color: "rose"
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-24">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">The <span className="text-indigo-600">Zync</span> Experience</h2>
                <div className="flex justify-center gap-4">
                    {(['student', 'teacher', 'admin'] as const).map(role => (
                        <button
                            key={role}
                            onClick={() => setActiveRole(role)}
                            className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${
                                activeRole === role 
                                    ? `bg-slate-900 text-white shadow-xl scale-105` 
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div 
                    key={activeRole}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8"
                >
                    <div className={`inline-block px-4 py-1.5 rounded-full bg-${content[activeRole].color}-50 text-${content[activeRole].color}-600 font-black text-[10px] uppercase tracking-widest border border-${content[activeRole].color}-100`}>
                        {activeRole === 'student' ? 'For Scholars' : activeRole === 'teacher' ? 'For Faculty' : 'For Operations'}
                    </div>
                    <h3 className="text-5xl font-black text-slate-900 leading-tight">{content[activeRole].title}</h3>
                    <p className="text-xl text-slate-500 leading-relaxed font-medium">{content[activeRole].desc}</p>
                    
                    <div className="grid grid-cols-3 gap-6 pt-4">
                        {content[activeRole].stats.map((stat, i) => (
                            <div key={i} className="border-l-4 border-slate-100 pl-4">
                                <div className={`text-2xl font-black text-${content[activeRole].color}-600`}>{stat.val}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div className="relative">
                    <div className={`absolute inset-0 bg-${content[activeRole].color}-500/10 rounded-[40px] blur-3xl transform rotate-3 scale-95 transition-colors duration-500`}></div>
                    <TiltCard className="p-2 bg-white/50 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                        {activeRole === 'student' && <MockDashboard />}
                        {activeRole === 'teacher' && (
                            <div className="bg-white p-8 rounded-[24px] shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-slate-800">Classroom Pulse</h4>
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold animate-pulse">Live</span>
                                </div>
                                <div className="grid grid-cols-5 gap-2 h-32 mb-4">
                                    {[...Array(15)].map((_, i) => (
                                        <div key={i} className={`rounded-lg ${Math.random() > 0.7 ? 'bg-red-200' : 'bg-emerald-200'} opacity-80`}></div>
                                    ))}
                                </div>
                                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Real-time Confusion Index</div>
                            </div>
                        )}
                        {activeRole === 'admin' && (
                            <div className="bg-slate-900 p-8 rounded-[24px] text-white shadow-xl">
                                <div className="flex justify-between mb-8">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Status</div>
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                </div>
                                <div className="text-5xl font-black mb-2">98.4%</div>
                                <div className="text-sm text-slate-400 mb-8">Retention Rate Prediction</div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[98%]"></div>
                                </div>
                            </div>
                        )}
                    </TiltCard>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="min-h-screen bg-[#F8F9FE] text-slate-800 font-sans selection:bg-indigo-200 overflow-x-hidden">
      
      {/* Neural Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_50%,rgba(99,102,241,0.05),transparent)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-60"></div>
          
          <motion.div style={{ y: yParallax }} className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/20 rounded-full blur-[120px] animate-pulse"></motion.div>
          <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-rose-200/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-teal-200/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-6 flex justify-between items-center transition-all duration-500">
        <div className="flex items-center gap-3 backdrop-blur-md bg-white/30 px-4 py-2 rounded-2xl border border-white/40 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold shadow-lg">Z</div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">ZYNC</span>
        </div>
        <div className="flex gap-4">
            <button onClick={onEnter} className="px-5 py-2.5 bg-white/60 hover:bg-white border border-white/50 text-slate-600 rounded-full font-bold text-xs uppercase tracking-widest backdrop-blur-md transition-all shadow-sm">Faculty Login</button>
            <button onClick={onEnter} className="px-5 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 hover:shadow-indigo-500/20">Portal Access</button>
        </div>
      </nav>

      {/* --- 1. Hero Section --- */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-slate-200 text-indigo-900 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-sm"
        >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Zync Adaptive Intelligence OS
        </motion.div>
        
        <h1 className="text-7xl md:text-9xl font-black text-slate-900 mb-2 tracking-tighter leading-none py-2">
            ZYNC
        </h1>
        <div className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 mb-8 tracking-tight pb-2">
            Adaptive Mastery
        </div>

        <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto mb-12"
        >
            The operating system for future <TextCycler />.<br/>
            Autonomous mastery tracking, neural proctoring, and project-based growth.
        </motion.p>

        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row justify-center gap-4 relative z-20"
        >
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnter}
                className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-black text-lg shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 backdrop-blur-sm"></div>
                <span className="relative z-10">✨ Initialize Identity</span>
            </motion.button>
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnter}
                className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-700 rounded-full font-black text-lg hover:bg-slate-50 transition-all shadow-xl"
            >
                Network Sign In
            </motion.button>
        </motion.div>

        {/* Abstract Particles */}
        <motion.div style={{ opacity: opacityFade }} className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div 
                animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[25%] left-[10%] w-24 h-24 bg-white/40 backdrop-blur-xl rounded-[20px] border border-white/60 shadow-lg hidden lg:block"
            />
            <motion.div 
                animate={{ y: [0, 40, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[20%] right-[10%] w-32 h-32 bg-white/40 backdrop-blur-xl rounded-full border border-white/60 shadow-lg hidden lg:block"
            />
        </motion.div>
      </section>

      {/* --- 2. Interactive Role Preview --- */}
      <section className="relative z-20 bg-white/80 backdrop-blur-xl border-t border-white/60">
          <RolePreview />
      </section>

      {/* --- 3. Feature Showcase --- */}
      <section className="relative z-10 py-32 px-4 lg:px-12">
          <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight"
                  >
                      Holistic Growth, Powered by Zync
                  </motion.h2>
                  <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                      The Zync Ecosystem adapts to your pace, ensuring no skill gap goes unnoticed and no potential remains untapped.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Block A */}
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="h-full"
                  >
                      <TiltCard className="h-full p-8 flex flex-col">
                          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl mb-6 text-indigo-600 shadow-inner">📊</div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-3">Total Mastery Visibility</h3>
                          <p className="text-slate-500 mb-8 leading-relaxed text-sm">Visualize skill gaps with real-time mastery trees and progress graphs.</p>
                          <div className="mt-auto h-48 rounded-2xl border border-slate-100 bg-slate-50/50">
                              <MockSkillTree />
                          </div>
                      </TiltCard>
                  </motion.div>

                  {/* Block B */}
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="h-full"
                  >
                      <TiltCard className="h-full p-8 flex flex-col">
                          <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center text-2xl mb-6 text-teal-600 shadow-inner">🗓️</div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-3">Intelligent Scheduling</h3>
                          <p className="text-slate-500 mb-8 leading-relaxed text-sm">The Smart Planner balances assignments and study time for optimal learning arcs.</p>
                          <div className="mt-auto h-48 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/50 p-6 flex items-center justify-center">
                              <div className="w-full h-full shadow-sm rounded-xl overflow-hidden">
                                  <MockCalendar />
                              </div>
                          </div>
                      </TiltCard>
                  </motion.div>

                  {/* Block C */}
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="h-full"
                  >
                      <TiltCard className="h-full p-8 flex flex-col">
                          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-2xl mb-6 text-rose-600 shadow-inner">🚀</div>
                          <h3 className="text-2xl font-bold text-slate-800 mb-3">Career Launchpad</h3>
                          <p className="text-slate-500 mb-8 leading-relaxed text-sm">AI-driven resume building and personalized career pathfinding.</p>
                          <div className="mt-auto h-48 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-3 relative">
                              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
                              <div className="bg-white px-5 py-3 rounded-xl shadow-sm text-xs font-bold text-slate-600 border border-slate-100 w-3/4 text-center relative z-10">Resume Builder</div>
                              <div className="bg-indigo-600 px-5 py-3 rounded-xl shadow-lg text-xs font-bold text-white w-3/4 text-center relative z-10">AI Career Pathfinder</div>
                          </div>
                      </TiltCard>
                  </motion.div>
              </div>
          </div>
      </section>

      {/* --- 4. Deep Dive Sections --- */}
      <section className="py-32 px-4 lg:px-12 space-y-32">
          
          {/* Row 1: Mastery */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                  <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-6 border border-indigo-100">Neural Tracking</div>
                  <h2 className="text-5xl font-black text-slate-900 mb-6 leading-tight">Autonomous Mastery Tracking.</h2>
                  <p className="text-xl text-slate-500 leading-relaxed mb-8 font-medium">
                      Forget static grades. Zync's AI engine constantly analyzes your performance across quizzes, projects, and classroom participation to provide tailored suggestions like the "AI Suggestion" widget.
                  </p>
                  <button onClick={onEnter} className="group flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-sm hover:text-indigo-700">
                      Explore Dashboard 
                      <span className="group-hover:translate-x-1 transition-transform">➔</span>
                  </button>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative perspective-1000"
              >
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-[40px] blur-3xl transform rotate-6 scale-90"></div>
                  <TiltCard className="p-2 transform -rotate-y-6 rotate-x-6 hover:rotate-0 transition-transform duration-700 origin-center">
                      <div className="aspect-[4/3] w-full">
                          <MockDashboard />
                      </div>
                  </TiltCard>
              </motion.div>
          </div>

          {/* Row 2: Career */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative order-2 lg:order-1 perspective-1000"
              >
                  <div className="absolute inset-0 bg-purple-500/20 rounded-[40px] blur-3xl transform -rotate-6 scale-90"></div>
                  <TiltCard className="p-8 transform rotate-y-6 rotate-x-6 hover:rotate-0 transition-transform duration-700 bg-white/80 origin-center">
                      <MockCareer />
                  </TiltCard>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="order-1 lg:order-2"
              >
                  <div className="inline-block px-4 py-1.5 rounded-full bg-purple-50 text-purple-600 font-black text-[10px] uppercase tracking-widest mb-6 border border-purple-100">Future-Proofing</div>
                  <h2 className="text-5xl font-black text-slate-900 mb-6 leading-tight">Neural Career Guidance.</h2>
                  <p className="text-xl text-slate-500 leading-relaxed mb-8 font-medium">
                      Generate instant feedback on resumes and receive personalized 4-step career roadmaps based on your unique mastery scores. The system aligns your academic achievements directly with market demands.
                  </p>
                  <button onClick={onEnter} className="group flex items-center gap-2 text-purple-600 font-bold uppercase tracking-widest text-sm hover:text-purple-700">
                      Launch Career Cell 
                      <span className="group-hover:translate-x-1 transition-transform">➔</span>
                  </button>
              </motion.div>
          </div>

      </section>

      {/* --- 5. Footer / CTA --- */}
      <footer className="relative bg-slate-900 text-white py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-black tracking-tight mb-10"
              >
                  Ready to Initialize <br/> Your Potential?
              </motion.h2>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6 mb-20">
                  <button onClick={onEnter} className="px-10 py-5 bg-white text-slate-900 rounded-full font-black text-lg hover:scale-105 transition-transform shadow-2xl hover:shadow-white/20">
                      Initialize Identity
                  </button>
                  <button onClick={onEnter} className="px-10 py-5 bg-transparent border-2 border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-colors">
                      Network Sign In
                  </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-white/10 text-sm font-medium text-slate-400">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white text-xs">Z</div>
                      <span className="font-bold text-white tracking-widest">ZYNC AMEP</span>
                  </div>
                  <div className="flex gap-8">
                      <a href="#" className="hover:text-white transition-colors">Privacy Protocol</a>
                      <a href="#" className="hover:text-white transition-colors">System Terms</a>
                      <a href="#" className="hover:text-white transition-colors">Contact Ops</a>
                  </div>
                  <div className="mt-4 md:mt-0 text-[10px] font-bold bg-white/10 px-4 py-2 rounded-full text-indigo-300 border border-white/5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                      Powered by Gemini 3 Flash
                  </div>
              </div>
          </div>
      </footer>

      <style>{`
        @keyframes liquid { 
            0% { background-position: 0% 50%; } 
            50% { background-position: 100% 50%; } 
            100% { background-position: 0% 50%; } 
        }
        .animate-gradient-shift { 
            animation: liquid 8s ease infinite; 
        }
        .perspective-1000 { perspective: 1000px; }
      `}</style>
    </div>
  );
};

export default LandingPage;
