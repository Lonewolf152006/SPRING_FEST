
import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { Task, CalendarEvent, ChatMessage } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';
import { HierarchyContext } from '../../App';

interface StudentDashboardProps {
    tasks: Task[];
    events: CalendarEvent[];
}

interface SubjectNode {
    id: string;
    subject: string;
    score: number;
    color: string;
    bg: string;
    ringColor: string;
    unlocked: boolean;
    prevScore: number; 
    justUnlocked?: boolean; 
}

interface XPParticle {
    id: number;
    subjectId: string;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ tasks, events }) => {
  const { currentUserId, updateConceptScore } = useContext(HierarchyContext);
  const [goal, setGoal] = useState("");
  const [mounted, setMounted] = useState(false);
  const [currentDate] = useState(new Date());
  
  // Profile Photo State
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Particles State
  const [particles, setParticles] = useState<XPParticle[]>([]);

  // Local Subject View State (Initialized with context/defaults)
  const [subjects, setSubjects] = useState<SubjectNode[]>([
      { id: 'math', subject: 'Math', score: 85, color: 'text-indigo-600', bg: 'bg-indigo-50', ringColor: 'border-indigo-200', unlocked: false, prevScore: 85 },
      { id: 'phys', subject: 'Physics', score: 62, color: 'text-sky-600', bg: 'bg-sky-50', ringColor: 'border-sky-200', unlocked: false, prevScore: 62 },
      { id: 'hist', subject: 'History', score: 92, color: 'text-emerald-600', bg: 'bg-emerald-50', ringColor: 'border-emerald-200', unlocked: true, prevScore: 92 },
      { id: 'lit', subject: 'Lit', score: 78, color: 'text-purple-600', bg: 'bg-purple-50', ringColor: 'border-purple-200', unlocked: false, prevScore: 78 }
  ]);

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial Sync
  useEffect(() => {
     const syncMastery = async () => {
        const savedScores = await GeminiService.getMasteryScores(currentUserId);
        
        setSubjects(prev => {
            const updated = prev.map(s => {
                const savedKey = Object.keys(savedScores).find(k => s.id.includes(k.toLowerCase()) || s.subject.toLowerCase().includes(k.toLowerCase()));
                if (savedKey) {
                    const newScore = savedScores[savedKey];
                    return {
                        ...s,
                        score: newScore,
                        prevScore: s.score,
                        unlocked: newScore >= 90
                    };
                }
                return s;
            });
            
            // Find weakest subject for briefing
            const weakSubject = updated.reduce((min, p) => p.score < min.score ? p : min, updated[0]);
            GeminiService.generateStudyGoals([`${weakSubject.subject} Fundamentals`]).then(setGoal);
            
            setChatHistory([{
                id: 'init', 
                role: 'model', 
                text: `Hi! I'm Spark, your AI Study Goal Setter. 🧠\n\nI noticed your ${weakSubject.subject} mastery is at ${weakSubject.score}%. Would you like a personalized study goal for today to help boost that score?`
            }]);

            return updated;
        });
        setMounted(true);
     };

     syncMastery();
  }, [currentUserId]);

  useEffect(() => {
      if (chatOpen) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, chatOpen]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const base64 = await blobToBase64(file);
          setAvatar(`data:${file.type};base64,${base64}`);
      }
  };

  const handleStudy = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      
      const particleId = Date.now();
      setParticles(prev => [...prev, { id: particleId, subjectId: id }]);
      setTimeout(() => {
          setParticles(prev => prev.filter(p => p.id !== particleId));
      }, 1000);

      const targetSubject = subjects.find(s => s.id === id);
      if (!targetSubject) return;

      // Local update for snappiness
      setSubjects(prev => prev.map(sub => {
          if (sub.id === id) {
              const newScore = Math.min(100, sub.score + 5);
              const isNowUnlocked = newScore >= 90 && !sub.unlocked;
              return {
                  ...sub,
                  score: newScore,
                  prevScore: sub.score,
                  unlocked: newScore >= 90,
                  justUnlocked: isNowUnlocked
              };
          }
          return sub;
      }));

      // Persist to Supabase via GeminiService proxy
      await GeminiService.updateMasteryScore(targetSubject.subject, 5, currentUserId);

      setTimeout(() => {
           setSubjects(prev => prev.map(sub => (sub.id === id ? {...sub, justUnlocked: false} : sub)));
      }, 2000);
  };

  const handleChatSend = async () => {
      if (!chatInput.trim()) return;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
      const newHistory = [...chatHistory, userMsg];
      setChatHistory(newHistory);
      setChatInput("");
      setChatLoading(true);

      const weakSubjects = subjects.filter(s => s.score < 70).map(s => s.subject);
      const res = await GeminiService.getStudyCoachResponse(newHistory, weakSubjects);
      
      setChatHistory([...newHistory, { id: (Date.now() + 1).toString(), role: 'model', text: res }]);
      setChatLoading(false);
  };

  const nextDeadline = useMemo(() => {
      const futureEvents = events.filter(e => e.start > new Date()).sort((a,b) => a.start.getTime() - b.start.getTime());
      const pendingTasks = tasks.filter(t => t.status !== 'done' && t.deadline).sort((a,b) => (a.deadline || '').localeCompare(b.deadline || ''));

      const firstTask = pendingTasks[0];
      const firstEvent = futureEvents[0];
      
      if (firstTask && firstTask.priority === 'high') {
          return { title: firstTask.title, time: `Due: ${firstTask.deadline}`, type: 'Task' };
      }
      if (firstEvent) {
          return { title: firstEvent.title, time: firstEvent.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), type: 'Event' };
      }
      if (firstTask) {
           return { title: firstTask.title, time: `Due: ${firstTask.deadline}`, type: 'Task' };
      }
      return null;
  }, [tasks, events]);

  const calendarData = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay(); 
      const days: any[] = [];
      for (let i = 0; i < firstDayOfWeek; i++) {
          days.push({ type: 'empty', id: `empty-${i}` });
      }
      for (let d = 1; d <= daysInMonth; d++) {
          const isToday = d === currentDate.getDate();
          const isFuture = d > currentDate.getDate();
          const status = isFuture ? 'neutral' : isToday ? 'today' : 'present';
          days.push({ day: d, status, type: 'day', id: `day-${d}` });
      }
      return days;
  }, [currentDate]);

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in-up space-y-8 pb-12 relative">
       <style>{`
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes float-up {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
          }
          .animate-spin-slow {
            animation: spin-slow 12s linear infinite;
          }
          .animate-float-up {
            animation: float-up 0.8s ease-out forwards;
          }
       `}</style>

       {/* Welcome Header */}
       <div className="bg-gradient-to-r from-indigo-200 to-purple-200 rounded-3xl p-10 relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10 flex items-center gap-6">
             <div 
                className="w-20 h-20 rounded-full bg-white/50 backdrop-blur-md border-2 border-white flex items-center justify-center cursor-pointer overflow-hidden relative group shadow-md"
                onClick={() => fileInputRef.current?.click()}
             >
                {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-3xl">👨‍🎓</span>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Edit</span>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
             </div>

             <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome back, Alex.</h1>
                <p className="text-indigo-800 text-lg opacity-80 max-w-2xl">{goal ? `AI Suggestion: ${goal}` : "Loading daily focus..."}</p>
             </div>
          </div>
          
          {nextDeadline && (
              <div className="relative z-10 bg-white/40 backdrop-blur-md border border-white/40 p-4 rounded-xl flex items-center gap-4 min-w-[250px] animate-fade-in shadow-sm hidden md:flex">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${nextDeadline.type === 'Task' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {nextDeadline.type === 'Task' ? '⏳' : '📅'}
                  </div>
                  <div>
                      <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Up Next</div>
                      <div className="font-bold text-slate-800 text-sm">{nextDeadline.title}</div>
                      <div className="text-xs text-slate-600">{nextDeadline.time}</div>
                  </div>
              </div>
          )}

          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/20 skew-x-12 blur-2xl"></div>
       </div>

       {/* Main Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Mastery & Engagement */}
          <div className="lg:col-span-2 space-y-8">
              
              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-center mb-10 relative z-10">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="text-indigo-500">🪐</span> Skill Tree
                        </h3>
                        <p className="text-slate-500 text-sm">Click planets to study & gain XP</p>
                    </div>
                    <div className="text-xs font-bold bg-white/50 px-3 py-1.5 rounded-full border border-slate-200 text-slate-500">
                        Total Mastery: {Math.round(subjects.reduce((acc,s) => acc + s.score, 0) / subjects.length)}%
                    </div>
                 </div>

                 <div className="flex flex-wrap gap-y-12 gap-x-8 justify-around relative z-10 pb-4">
                    {subjects.map((item) => {
                       const level = Math.floor(item.score / 10);
                       const activeParticles = particles.filter(p => p.subjectId === item.id);
                       
                       return (
                           <div 
                              key={item.id} 
                              onClick={(e) => handleStudy(item.id, e)}
                              className={`flex flex-col items-center group cursor-pointer relative ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} transition-all duration-700`}
                           >
                              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-dashed ${item.ringColor} animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                              
                              <div className={`w-24 h-24 rounded-full border-4 border-white relative flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 ${item.bg}`}>
                                 <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                   <circle 
                                     cx="50" cy="50" r="46" 
                                     fill="transparent" 
                                     stroke={
                                        item.id === 'math' ? '#4f46e5' : 
                                        item.id === 'phys' ? '#0ea5e9' : 
                                        item.id === 'hist' ? '#10b981' : '#9333ea'
                                     } 
                                     strokeWidth="6" 
                                     strokeDasharray="289" 
                                     strokeDashoffset={289 - (289 * item.score) / 100} 
                                     strokeLinecap="round" 
                                     className="transition-all duration-1000 ease-out"
                                   />
                                 </svg>
                                 <div className="text-center z-10"><span className={`text-xl font-bold ${item.color}`}>{item.score}%</span></div>
                                 {item.unlocked && <div className={`absolute -top-3 -right-3 bg-amber-400 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md text-sm border-2 border-white z-20 ${item.justUnlocked ? 'animate-bounce' : ''}`}>⭐</div>}
                                 {item.justUnlocked && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs px-3 py-1 rounded-full font-bold animate-bounce shadow-lg whitespace-nowrap z-30">Level Up!</div>}
                                 {activeParticles.map(p => <div key={p.id} className="absolute top-0 left-1/2 -translate-x-1/2 text-indigo-600 font-bold text-sm animate-float-up pointer-events-none z-50">+50 XP</div>)}
                              </div>
                              <div className="mt-4 text-center">
                                  <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{item.subject}</div>
                                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-white/60 px-2 py-0.5 rounded-full mt-1 border border-slate-100">Lvl {level}</div>
                              </div>
                           </div>
                       )
                    })}
                 </div>
              </div>

              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-slate-800 font-bold mb-6 flex items-center gap-2">
                      <span className="text-purple-500">📈</span> Weekly Engagement Trend
                  </h3>
                  <div className="h-48 w-full flex items-end gap-1 relative px-2">
                      <div className="absolute inset-0 flex flex-col justify-between opacity-30 pointer-events-none">
                          <div className="w-full h-px bg-slate-200"></div>
                          <div className="w-full h-px bg-slate-200"></div>
                          <div className="w-full h-px bg-slate-200"></div>
                      </div>
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                              <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                              </linearGradient>
                          </defs>
                          <path d="M0,35 L16,22 L33,28 L50,15 L66,10 L83,12 L100,8" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
                          <path d="M0,35 L16,22 L33,28 L50,15 L66,10 L83,12 L100,8 V100 H0 Z" fill="url(#gradient)" className="opacity-50"/>
                      </svg>
                  </div>
                  <div className="flex justify-between mt-4 text-xs text-slate-400 uppercase tracking-widest font-bold">
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
              </div>
          </div>

          <div className="space-y-8 flex flex-col">
              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-slate-800 font-bold mb-4">Today's Schedule</h3>
                  <div className="space-y-3">
                      {[
                        { time: "09:00 AM", subject: "Calculus II", room: "Rm 304" },
                        { time: "10:30 AM", subject: "Physics Lab", room: "Lab B" },
                        { time: "01:00 PM", subject: "World History", room: "Rm 102" },
                      ].map((cls, i) => (
                          <div key={i} className="flex gap-4 items-start group">
                              <div className="w-16 pt-1 text-right">
                                  <span className="block text-sm font-bold text-slate-700">{cls.time.split(' ')[0]}</span>
                                  <span className="block text-[10px] text-slate-400 uppercase">{cls.time.split(' ')[1]}</span>
                              </div>
                              <div className="relative pl-4 pb-4 border-l-2 border-slate-200 group-last:border-transparent">
                                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                                      <h4 className="text-sm font-bold text-slate-800">{cls.subject}</h4>
                                      <p className="text-xs text-slate-500">{cls.room}</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-slate-800 font-bold flex items-center gap-2"><span>📅</span> Attendance</h3>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{monthLabel}</span>
                  </div>
                  <div className="flex-1">
                      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                          {['S','M','T','W','T','F','S'].map(d => (<div key={d} className="text-[10px] text-slate-400 font-bold uppercase">{d}</div>))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                          {calendarData.map((data, i) => {
                              if (data.type === 'empty') return <div key={data.id} className="aspect-square"></div>
                              let bgClass = "bg-slate-100 text-slate-400";
                              if (data.status === 'present') bgClass = "bg-green-100 text-green-600 border border-green-200";
                              if (data.status === 'today') bgClass = "bg-indigo-600 text-white font-bold ring-2 ring-indigo-200";
                              return (<div key={data.id} className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-all hover:scale-110 cursor-default ${bgClass}`}>{data.day}</div>)
                          })}
                      </div>
                  </div>
              </div>

              <div className="mt-auto">
                 <div className={`bg-white rounded-2xl shadow-xl border border-indigo-100 transition-all duration-300 overflow-hidden flex flex-col ${chatOpen ? 'fixed bottom-4 right-4 w-80 h-[500px] z-50' : 'relative h-16'}`}>
                     <div className="bg-indigo-600 p-4 text-white flex justify-between items-center cursor-pointer hover:bg-indigo-500 transition-colors" onClick={() => setChatOpen(!chatOpen)}>
                         <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">✨</div><div><div className="text-sm font-bold">Spark: Study Coach</div><div className="text-[10px] opacity-80">AI Coach Active</div></div></div>
                         <div className="text-xs bg-indigo-700 px-2 py-1 rounded">{chatOpen ? 'Min' : 'Open'}</div>
                     </div>
                     {chatOpen && (
                         <>
                            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-3">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 text-sm rounded-2xl shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}><p className="whitespace-pre-wrap">{msg.text}</p></div>
                                    </div>
                                ))}
                                {chatLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1 items-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div></div></div>}
                                <div ref={chatEndRef}></div>
                            </div>
                            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                                <input className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition-colors" placeholder="Set a goal..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()}/>
                                <button onClick={handleChatSend} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 font-bold transition-colors shadow-sm">↑</button>
                            </div>
                         </>
                     )}
                 </div>
              </div>
          </div>
       </div>
    </div>
  )
}

export default StudentDashboard;
