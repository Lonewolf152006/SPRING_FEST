
import React, { useState, useRef, useEffect } from 'react';
import { ConfusionAnalysis, Poll } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { DatabaseService } from '../../services/databaseService';

const LiveClassroom = () => {
   const [analysis, setAnalysis] = useState<ConfusionAnalysis | null>(null);
   const [loading, setLoading] = useState(false);
   const fileRef = useRef<HTMLInputElement>(null);
   const [activeTab, setActiveTab] = useState<'camera' | 'polls'>('camera');
   
   // Poll State
   const [pollQuestion, setPollQuestion] = useState("");
   const [activePoll, setActivePoll] = useState<Poll | null>(null);

   useEffect(() => {
       const syncPoll = async () => {
           const currentPoll = await DatabaseService.getActivePoll();
           if (currentPoll) setActivePoll(currentPoll);
       };
       syncPoll();
       const interval = setInterval(syncPoll, 5000);
       return () => clearInterval(interval);
   }, []);

   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(!e.target.files?.[0]) return;
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
          const res = await GeminiService.analyzeClassroomImage(reader.result as string);
          setAnalysis(res);
          // Persist confusion snapshot for long-term tracking
          await DatabaseService.logSession('CLASSROOM_T1', 'CONFUSION_SNAPSHOT', res);
          setLoading(false);
      }
      reader.readAsDataURL(e.target.files[0]);
   }

   const startPoll = async () => {
       if(!pollQuestion) return;
       const newPoll: Poll = {
           id: Date.now().toString(),
           question: pollQuestion,
           options: [
               { label: "Clear / Ready", votes: 0 },
               { label: "Need Review", votes: 0 },
               { label: "Stuck", votes: 0 }
           ],
           totalVotes: 0,
           isActive: true
       };
       setActivePoll(newPoll);
       await DatabaseService.createPoll(newPoll);
       setPollQuestion("");
   };

   // Gauge Logic
   const score = analysis?.confusionScore || 0;

   return (
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
           <div className="lg:col-span-2 flex justify-center mb-4">
               <div className="bg-white rounded-xl p-1 border border-slate-200 shadow-sm inline-flex">
                   <button 
                        onClick={() => setActiveTab('camera')} 
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'camera' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                       🎥 Confusion Index
                    </button>
                   <button 
                        onClick={() => setActiveTab('polls')} 
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'polls' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                       📊 Inclusive Polls
                    </button>
               </div>
           </div>

           {activeTab === 'camera' ? (
               <>
                <div className="bg-black rounded-[40px] overflow-hidden relative group border border-slate-800 shadow-2xl min-h-[400px]">
                    <div className="absolute inset-0 flex items-center justify-center flex-col opacity-50">
                        <p className="text-slate-400 mb-4 font-mono">FACULTY_EYE_INITIATED</p>
                        <div className="text-6xl animate-pulse">📡</div>
                    </div>
                    {/* Overlay Controls */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-10">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest mb-2">Manual Surveillance Trigger</div>
                        <button onClick={() => fileRef.current?.click()} className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-3xl font-black shadow-2xl shadow-red-500/30 transition-all flex items-center justify-center gap-3">
                            <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
                            {loading ? "PROCESSING..." : "CAPTURE CLASSROOM STATE"}
                        </button>
                        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-800/90 backdrop-blur-md rounded-[40px] border border-white/10 p-10 text-center flex flex-col items-center shadow-xl">
                        <h3 className="text-slate-400 uppercase tracking-[0.2em] text-xs font-black mb-10">Real-Time Insight Engine</h3>
                        
                        <div className="relative w-72 h-36 overflow-hidden mb-8">
                            <div className="absolute w-72 h-72 rounded-full border-[24px] border-slate-700/30" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'}}></div>
                            <div className="absolute w-72 h-72 rounded-full" 
                                style={{
                                    background: 'conic-gradient(from 270deg, #10b981 0deg 60deg, #f59e0b 60deg 120deg, #ef4444 120deg 180deg, transparent 180deg)',
                                    clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
                                    mask: 'radial-gradient(transparent 55%, black 56%)',
                                    WebkitMask: 'radial-gradient(transparent 55%, black 56%)'
                                }}>
                            </div>
                            <div 
                                className="absolute bottom-0 left-1/2 w-1 h-36 bg-white origin-bottom transition-transform duration-[1.5s] cubic-bezier(0.16, 1, 0.3, 1)"
                                style={{ transform: `translateX(-50%) rotate(${(score / 100) * 180 - 90}deg)` }}
                            >
                                <div className="w-5 h-5 bg-white rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 shadow-2xl ring-4 ring-slate-800"></div>
                            </div>
                        </div>

                        <div className="text-7xl font-black text-white mb-2 tracking-tighter">{score}%</div>
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-indigo-400 mb-8">Class-Wide Confusion</div>
                        
                        <div className="w-full bg-white/5 p-6 rounded-3xl border border-white/5 relative group">
                            <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Pedagogical Context</div>
                            <p className="text-slate-300 italic text-sm leading-relaxed">
                                "{analysis?.summary || "Awaiting surveillance data to interpret student comprehension patterns..."}"
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-800/90 backdrop-blur-md rounded-[40px] border border-white/10 p-8 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-slate-400 uppercase tracking-widest text-[10px] font-black">Engagement Distribution</h3>
                            <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Live Heatmap</span>
                        </div>
                        <div className="grid grid-cols-10 gap-2 h-32">
                            {Array.from({length: 40}).map((_, i) => {
                                const level = Math.random();
                                return (
                                    <div key={i} className={`rounded-lg transition-all duration-1000 ${level > 0.7 ? 'bg-emerald-500/20' : level > 0.3 ? 'bg-indigo-500/20' : 'bg-rose-500/20'} hover:scale-110 border border-white/5`}></div>
                                )
                            })}
                        </div>
                    </div>
                </div>
               </>
           ) : (
               <>
                    <div className="bg-white/60 backdrop-blur-md border border-white/50 rounded-[40px] p-10 flex flex-col shadow-sm">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-slate-800">Launch Interaction</h3>
                            <p className="text-slate-500 text-sm mt-1">Broadcast questions instantly to all students via the AMEP OS.</p>
                        </div>
                        
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3 ml-2">Question or Topic</label>
                                <textarea 
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    placeholder="e.g. Did the explanation of Quantum Entanglement make sense?"
                                    className="w-full bg-white border border-slate-200 rounded-[32px] p-8 text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none h-48 resize-none shadow-inner font-medium"
                                />
                            </div>
                            <button 
                                onClick={startPoll}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[32px] shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <span className="text-xl">📢</span> BROADCAST TO CLASSROOM
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[40px] p-10 text-white border border-slate-800 flex flex-col shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <div className="text-[150px] font-black">POLL</div>
                        </div>

                        <div className="relative z-10 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="font-bold text-xl flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                    Response Metrics
                                </h3>
                                {activePoll?.isActive && <span className="text-[10px] font-black bg-rose-600 px-3 py-1 rounded-full uppercase tracking-tighter">Live Session</span>}
                            </div>

                            {!activePoll ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center space-y-4">
                                    <div className="text-6xl opacity-20">📊</div>
                                    <p className="text-lg font-medium">Awaiting poll initialization...</p>
                                </div>
                            ) : (
                                <div className="space-y-8 flex-1 flex flex-col">
                                    <div className="bg-white/5 border border-white/10 p-8 rounded-[32px]">
                                        <h4 className="text-2xl font-bold text-center leading-tight">"{activePoll.question}"</h4>
                                    </div>
                                    
                                    <div className="space-y-6 flex-1">
                                        {activePoll.options.map((opt, i) => {
                                            const percent = activePoll.totalVotes > 0 ? Math.round((opt.votes / activePoll.totalVotes) * 100) : 0;
                                            return (
                                                <div key={i} className="group">
                                                    <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-3 text-slate-400 group-hover:text-white transition-colors">
                                                        <span>{opt.label}</span>
                                                        <span className="text-indigo-400">{percent}%</span>
                                                    </div>
                                                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                                        <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-[2s] shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: `${percent}%`}}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="mt-auto pt-10 border-t border-white/5 text-center">
                                        <div className="text-5xl font-black mb-1">{activePoll.totalVotes} / 24</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">Anonymous Submissions</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
               </>
           )}
       </div>
   )
}

export default LiveClassroom;
