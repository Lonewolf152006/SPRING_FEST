
import React, { useState, useContext, useMemo } from 'react';
import { ChatMessage, PeerReviewAnalysis, Team, PeerReview } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { HierarchyContext } from '../../App';

const ProjectLab = () => {
  const { currentUserId, teams, students, peerReviews, addPeerReview } = useContext(HierarchyContext);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<'research' | 'eval' | 'growth'>('research');
  
  // Research State
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Peer Review State
  const [targetStudentId, setTargetStudentId] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<PeerReviewAnalysis | null>(null);
  
  // Peer Scores
  const [teamwork, setTeamwork] = useState(70);
  const [creativity, setCreativity] = useState(70);
  const [communication, setCommunication] = useState(70);

  // Growth State
  const [anonymizedSummary, setAnonymizedSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Filtered Teammates for selection
  const teammates = useMemo(() => {
    return selectedTeam 
      ? students.filter(s => selectedTeam.studentIds.includes(s.id) && s.id !== currentUserId)
      : [];
  }, [selectedTeam, students, currentUserId]);

  const handleSearch = async () => {
    if(!query) return;
    setLoading(true);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: query };
    setChat(prev => [...prev, userMsg]);
    const res = await GeminiService.getProjectHelp(query);
    setChat(prev => [...prev, res]);
    setQuery("");
    setLoading(false);
  }

  const handleEvalSubmit = async () => {
      if(!reviewText || !targetStudentId || !selectedTeam) return;
      setEvaluating(true);
      
      const analysis = await GeminiService.analyzePeerReview(reviewText);
      setEvalResult(analysis);

      // Create raw review for hierarchy (oversight)
      const newReview: PeerReview = {
          id: Date.now().toString(),
          teamId: selectedTeam.id,
          fromStudentId: currentUserId,
          toStudentId: targetStudentId,
          teamworkScore: teamwork,
          creativityScore: creativity,
          communicationScore: communication,
          comment: reviewText,
          timestamp: Date.now()
      };
      
      addPeerReview(newReview);
      setEvaluating(false);
      // Reset form fields after 2s
      setTimeout(() => {
          setReviewText("");
          setTargetStudentId("");
          setEvalResult(null);
      }, 5000);
  }

  const handleFetchGrowthSummary = async () => {
      if (!selectedTeam) return;
      setLoadingSummary(true);
      const myReviews = peerReviews.filter(r => r.toStudentId === currentUserId && r.teamId === selectedTeam.id);
      const summary = await GeminiService.generateAnonymousSummary(myReviews);
      setAnonymizedSummary(summary);
      setLoadingSummary(false);
  }

  // --- Entry Layer: Team Selection ---
  if (!selectedTeam) {
    return (
      <div className="space-y-10 animate-fade-in-up pb-10">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Project Lab</h2>
          <p className="text-slate-500 font-medium">Select your active team to enter the collaboration workspace.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teams.filter(t => t.studentIds.includes(currentUserId)).map(team => (
            <div 
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className="bg-white/60 backdrop-blur-xl border-2 border-white/50 rounded-[40px] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-100 transition-colors"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-16 h-16 rounded-[24px] bg-indigo-600 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                  🚀
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border border-emerald-100">Live Workspace</span>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{team.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">{team.projectTitle}</p>
                
                <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                        {team.studentIds.map(sid => (
                        <div key={sid} className="inline-block h-10 w-10 rounded-full ring-4 ring-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                            {students.find(s => s.id === sid)?.name.charAt(0)}
                        </div>
                        ))}
                    </div>
                    <span className="text-indigo-600 font-bold text-sm group-hover:translate-x-2 transition-transform">Enter Lab →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Active Layer: Project Workspace ---
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-fade-in pb-4">
      {/* Workspace Header */}
      <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-6 rounded-[32px] border border-white/50 shadow-sm">
          <div className="flex items-center gap-6">
              <button 
                onClick={() => setSelectedTeam(null)} 
                className="w-12 h-12 flex items-center justify-center bg-white hover:bg-slate-50 rounded-2xl text-slate-400 border border-slate-100 shadow-sm transition-all active:scale-95"
              >
                ←
              </button>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">{selectedTeam.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    {selectedTeam.projectTitle}
                  </div>
              </div>
          </div>
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex gap-1 ring-4 ring-slate-100/50">
              <button onClick={() => setActiveTab('research')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'research' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>🔍 Research Assistant</button>
              <button onClick={() => setActiveTab('eval')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'eval' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>👥 Peer Evaluation</button>
              <button onClick={() => { setActiveTab('growth'); handleFetchGrowthSummary(); }} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'growth' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>🌱 My Growth Path</button>
          </div>
      </div>

      {activeTab === 'research' && (
        <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
          {/* Main Chat Area */}
          <div className="col-span-12 lg:col-span-9 flex flex-col bg-slate-900 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl relative">
             <div className="p-6 bg-slate-800/50 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-400">✨</span>
                    </div>
                    <h3 className="text-white font-bold tracking-tight">Gemini Research Engine</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">Grounded: Google Search</span>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {chat.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                        <div className="text-8xl mb-6">🛰️</div>
                        <h4 className="text-white text-xl font-bold">Awaiting Exploration Query</h4>
                        <p className="text-slate-400 max-w-xs mt-2">Ask complex questions to help your team navigate project obstacles.</p>
                    </div>
                )}
                {chat.map(m => (
                   <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-6 rounded-[32px] shadow-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'}`}>
                         <p className="text-sm md:text-base whitespace-pre-wrap">{m.text}</p>
                         {m.sources && m.sources.length > 0 && (
                           <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                             <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Knowledge Sources</div>
                             {m.sources.map((s, i) => (
                               <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="block text-xs text-blue-300 hover:text-blue-200 truncate transition-colors">🔗 {s.title}</a>
                             ))}
                           </div>
                         )}
                      </div>
                   </div>
                ))}
                {loading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-800 p-6 rounded-[32px] rounded-tl-none border border-white/5 flex gap-2 items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
             </div>

             <div className="p-6 bg-slate-800/80 backdrop-blur-xl border-t border-white/5 flex gap-4">
                <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                    placeholder="Ask research questions to accelerate your team..." 
                    className="flex-1 bg-slate-900 border border-white/10 text-white rounded-2xl px-6 outline-none focus:border-blue-500 transition-colors shadow-inner py-4" 
                />
                <button 
                    onClick={handleSearch} 
                    className="px-8 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl text-white font-bold shadow-lg shadow-blue-600/20"
                >
                    Inquiry
                </button>
             </div>
          </div>

          {/* Side Info */}
          <div className="hidden lg:block lg:col-span-3 space-y-6 overflow-y-auto">
             <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-slate-800 font-extrabold mb-6 uppercase text-[10px] tracking-[0.2em] border-b border-slate-100 pb-4">Sprint Milestones</h3>
                <div className="space-y-6">
                  <div className="flex gap-4 items-start text-emerald-600">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">✓</div>
                    <div className="text-sm font-bold">Research Proposal Approved</div>
                  </div>
                  <div className="flex gap-4 items-start text-indigo-600">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 animate-pulse font-bold text-[10px]">!</div>
                    <div className="text-sm font-bold">Live Data Synthesis</div>
                  </div>
                  <div className="flex gap-4 items-start text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">○</div>
                    <div className="text-sm font-bold">Primary Draft Review</div>
                  </div>
                </div>
             </div>

             <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h3 className="font-bold mb-2 relative z-10">Team Performance</h3>
                <div className="text-4xl font-extrabold mb-4 relative z-10">88.4</div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
                    <div className="h-full bg-white shadow-[0_0_10px_white]" style={{width: '88%'}}></div>
                </div>
                <p className="text-[10px] uppercase font-bold mt-4 opacity-70 relative z-10">Velocity Tracker Active</p>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'eval' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
            {/* Submission Form */}
            <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm flex flex-col">
                <div className="mb-10">
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="p-3 bg-indigo-50 rounded-2xl text-xl">📝</span> 
                        Submit Team Evaluation
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm">Contribute to the objective soft-skill assessment of your team.</p>
                </div>

                <div className="space-y-8 flex-1">
                    <div>
                        <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Target Teammate</label>
                        <select 
                            value={targetStudentId} 
                            onChange={e => setTargetStudentId(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                        >
                            <option value="">Select a teammate...</option>
                            {teammates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase text-center">Teamwork</label>
                            <input type="range" value={teamwork} onChange={e => setTeamwork(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                            <div className="text-center font-bold text-indigo-600 text-xs">{teamwork}%</div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase text-center">Creativity</label>
                            <input type="range" value={creativity} onChange={e => setCreativity(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                            <div className="text-center font-bold text-purple-600 text-xs">{creativity}%</div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase text-center">Communication</label>
                            <input type="range" value={communication} onChange={e => setCommunication(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="text-center font-bold text-blue-600 text-xs">{communication}%</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">Qualitative Reflection</label>
                        <textarea 
                            value={reviewText}
                            onChange={e => setReviewText(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm focus:border-indigo-500 outline-none h-40 resize-none transition-all"
                            placeholder="Describe their contribution. Did they communicate well? Were they creative? (Reviews are sent to teacher for oversight, but synthesized anonymously for students)"
                        />
                    </div>
                    
                    <button 
                        onClick={handleEvalSubmit} 
                        disabled={evaluating} 
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                        {evaluating ? (
                            <>
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Running Bias Check...
                            </>
                        ) : 'Submit Anonymized Reflection'}
                    </button>
                </div>
            </div>

            {/* AI Real-time Feedback for submitter */}
            <div className="bg-slate-900 rounded-[40px] border border-white/10 p-10 shadow-2xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <div className="text-[200px] font-black text-white">AI</div>
                </div>
                
                <div className="relative z-10 h-full flex flex-col">
                    <div className="mb-10">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></span> 
                            AI Thinking Mode
                        </h3>
                        <p className="text-slate-400 mt-2 text-sm">Real-time analysis for submission integrity and objectivity.</p>
                    </div>

                    {!evalResult ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                            <div className="text-8xl">🤖</div>
                            <p className="text-white text-lg font-medium max-w-xs">Awaiting evaluation submission to begin objectivity analysis.</p>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-fade-in-up">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[32px]">
                                <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-[0.2em] mb-6">Bias-Check Profile</h4>
                                <div className="space-y-8">
                                    <div>
                                        <div className="flex justify-between text-sm text-white font-bold mb-2 uppercase tracking-tighter">
                                            <span>Tone Consistency</span>
                                            <span className="text-indigo-400">{evalResult.teamworkScore}% Objective</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{width: `${evalResult.teamworkScore}%`}}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm text-white font-bold mb-2 uppercase tracking-tighter">
                                            <span>Insight Density</span>
                                            <span className="text-purple-400">{evalResult.creativityScore}% Relevant</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000" style={{width: `${evalResult.creativityScore}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest ml-4">Pedagogical Recommendation</h4>
                                <div className="bg-indigo-600/20 border border-indigo-500/30 p-8 rounded-[32px] italic text-indigo-100 leading-relaxed">
                                    "{evalResult.feedback}"
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white/60 backdrop-blur-xl rounded-[40px] border border-slate-200 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
            
            <div className="mb-10 bg-indigo-50 w-24 h-24 rounded-[32px] flex items-center justify-center text-5xl shadow-inner relative">
                💡
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full border-4 border-white animate-bounce"></div>
            </div>
            
            <h3 className="text-3xl font-extrabold text-slate-800 mb-2">My Collective Growth Synthesis</h3>
            <p className="text-slate-500 mb-12 max-w-lg text-lg leading-relaxed font-medium">To protect student privacy and ensure objectivity, Gemini distillates all peer reflections into a constructive growth roadmap. You see the trends; your teammates remain anonymous.</p>
            
            <div className="w-full max-w-3xl bg-white p-12 rounded-[48px] border border-slate-100 shadow-2xl relative min-h-[250px] flex items-center justify-center group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent)]"></div>
                {loadingSummary ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-indigo-600 font-extrabold uppercase tracking-widest text-xs">Synthesizing peer perspective...</p>
                    </div>
                ) : (
                    <div className="relative z-10 text-left">
                        <div className="mb-6 flex justify-between items-center">
                            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1.5 rounded-full">Active Insights</span>
                            <span className="text-slate-300 text-[10px] font-bold">Auto-Anonymized Engine v2.5</span>
                        </div>
                        <p className="text-slate-700 text-xl leading-[1.6] italic font-serif">
                            {anonymizedSummary || "The team has not yet submitted sufficient data for a synthesis. Check back after the next sprint milestone!"}
                        </p>
                    </div>
                )}
            </div>
            
            <div className="mt-12 flex gap-8">
                <div className="text-center">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Collaboration</div>
                    <div className="text-2xl font-black text-indigo-600">High</div>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Innovation</div>
                    <div className="text-2xl font-black text-purple-600">Peak</div>
                </div>
                <div className="w-px h-10 bg-slate-200"></div>
                <div className="text-center">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Reliability</div>
                    <div className="text-2xl font-black text-blue-600">92%</div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}

export default ProjectLab;
