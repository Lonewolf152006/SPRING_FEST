
import React, { useState, useContext, useRef, useEffect } from 'react';
import { QuizQuestion, Concept, MultimodalResult, ConfusionAnalysis } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { CameraService } from '../../services/cameraService';
import { DatabaseService } from '../../services/databaseService';
import { HierarchyContext } from '../../App';

const TOTAL_QUESTIONS = 10;
const SNAPSHOT_INTERVAL = 10000; // Proctoring snapshot: 10 seconds
const SYNC_INTERVAL = 5000; // DB Sync/Polling Fallback: 5 seconds
const VISION_INTERVAL = 20000; // Gemini Vision Analysis: 20 seconds

const PracticeArena = () => {
  const { subjects, updateConceptScore, currentUserId, addXp } = useContext(HierarchyContext);
  const [mode, setMode] = useState<'curriculum' | 'discovery' | 'exam'>('curriculum');
  
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [sessionStep, setSessionStep] = useState(0); 
  const [sessionScore, setSessionScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingStartAction, setPendingStartAction] = useState<(() => void) | null>(null);
  
  const [confusionData, setConfusionData] = useState<ConfusionAnalysis>({
      confusionScore: 0,
      summary: "Initializing optical sync...",
      mood: 'focused'
  });
  
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const trackingIntervalRef = useRef<any>(null);
  const snapshotIntervalRef = useRef<any>(null);
  const syncIntervalRef = useRef<any>(null);

  // Helper for dynamic visuals
  const getConfusionUI = (score: number) => {
    if (score < 30) return { color: 'text-emerald-400', glow: 'shadow-emerald-500/20', bg: 'bg-emerald-500/10', pulse: '2s' };
    if (score < 60) return { color: 'text-amber-400', glow: 'shadow-amber-500/20', bg: 'bg-amber-500/10', pulse: '1.5s' };
    return { color: 'text-rose-400', glow: 'shadow-rose-500/20', bg: 'bg-rose-500/10', pulse: '0.8s' };
  };

  const ui = getConfusionUI(confusionData.confusionScore);

  // Requirement: Periodic snapshots every 10 seconds for proctoring evidence
  useEffect(() => {
      if (trackingActive && sessionStep >= 1 && sessionStep <= TOTAL_QUESTIONS && !isSubmitted) {
          snapshotIntervalRef.current = setInterval(async () => {
              if (videoRef.current) {
                  const base64 = CameraService.captureFrame(videoRef.current);
                  if (base64) {
                      await DatabaseService.saveSessionSnapshot(currentUserId, base64, mode, sessionStep);
                  }
              }
          }, SNAPSHOT_INTERVAL);
      } else {
          if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
      }
      return () => { if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current); };
  }, [trackingActive, sessionStep, isSubmitted, currentUserId, mode]);

  // Requirement: Real-time update for .student-confusion-index via WebSocket (Supabase Realtime) and Polling Fallback
  useEffect(() => {
    let unsubscribeRealtime = () => {};

    if (trackingActive && sessionStep >= 1 && sessionStep <= TOTAL_QUESTIONS && !isSubmitted) {
        // 1. Initialize WebSocket Subscription (Real-time)
        unsubscribeRealtime = DatabaseService.subscribeToStudentMetrics(currentUserId, (latest) => {
            setConfusionData(prev => ({
                ...prev,
                confusionScore: latest.confusionScore,
                mood: latest.mood,
                summary: latest.summary
            }));
            setIsRealtimeActive(true);
        });

        // 2. Initialize Polling Fallback (in case WebSockets are blocked or Realtime isn't enabled)
        syncIntervalRef.current = setInterval(async () => {
            const latest = await DatabaseService.getLatestStudentMetric(currentUserId);
            if (latest) {
                setConfusionData(prev => ({
                    ...prev,
                    confusionScore: latest.confusionScore,
                    mood: latest.mood,
                    summary: latest.summary
                }));
            }
        }, SYNC_INTERVAL);
    } else {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        unsubscribeRealtime();
        setIsRealtimeActive(false);
    }

    return () => { 
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        unsubscribeRealtime();
    };
  }, [trackingActive, sessionStep, isSubmitted, currentUserId]);

  useEffect(() => {
    const runAnalysisCycle = async () => {
        if (!videoRef.current || !trackingActive) return;
        const base64 = CameraService.captureFrame(videoRef.current);
        if (!base64) return;

        try {
            if (mode === 'exam') {
                const proctoring = await GeminiService.analyzeExamProctoring(base64);
                await GeminiService.submitSessionReport({ studentId: currentUserId, proctoring, timestamp: Date.now(), mode: 'EXAM' }, false);
            } else {
                const analysis = await GeminiService.analyzeStudentAttention(base64);
                // Report is saved; the subscription or polling will pick it up and update the UI
                await GeminiService.submitSessionReport({ 
                    studentId: currentUserId, 
                    confusionScore: analysis.confusionScore, 
                    mood: analysis.mood, 
                    summary: analysis.summary,
                    timestamp: Date.now(), 
                    mode 
                }, mode === 'discovery');
            }
        } catch (e) {
            console.warn("Vision analysis cycle interrupted.");
        }
    };

    const initTracking = async () => {
        if (!videoRef.current) return;
        try {
            const stream = await CameraService.start(videoRef.current);
            streamRef.current = stream;
            setTrackingActive(true);
            trackingIntervalRef.current = setInterval(runAnalysisCycle, VISION_INTERVAL);
            setTimeout(runAnalysisCycle, 1500);
        } catch (e) { 
            setTrackingActive(false); 
            setConsentGiven(false); 
        }
    };

    if (question && !isSubmitted && consentGiven && !trackingActive) {
        initTracking();
    } else if (!question && sessionStep === 0) {
        if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
        if (streamRef.current) {
            CameraService.stop(streamRef.current);
            streamRef.current = null;
        }
        setTrackingActive(false);
    }
    return () => { if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current); };
  }, [question, isSubmitted, mode, consentGiven, currentUserId, trackingActive]);


  const handleStartSession = (action: () => void) => {
      setError(null);
      if (consentGiven) action(); else { setPendingStartAction(() => action); setShowConsentModal(true); }
  };

  const handleConsent = (allowed: boolean) => {
      setShowConsentModal(false);
      if (allowed) { setConsentGiven(true); if (pendingStartAction) pendingStartAction(); }
      setPendingStartAction(null);
  };

  const fetchQuestion = async (contextTopic: string, difficulty: 'easy' | 'medium' | 'hard') => {
    setLoading(true);
    setError(null);
    setQuestion(null);
    setSelectedOptionIndex(null);
    setIsSubmitted(false);
    
    const q = await GeminiService.generateQuiz(contextTopic, difficulty);
    
    if (q === "QUOTA_EXCEEDED") {
        setError("AI Synapses are saturated. Please wait 60 seconds.");
        setLoading(false);
        return;
    }
    
    if (typeof q !== 'string') {
        setQuestion(q);
    } else {
        setError("Neural link failed to synthesize a challenge.");
    }
    setLoading(false);
    setIsGenerating(false);
  };

  const submitAnswer = () => {
      if (selectedOptionIndex === null || !question) return;
      setIsSubmitted(true);
      const isCorrect = selectedOptionIndex === question.correctIndex;
      
      if (isCorrect) {
          setSessionScore(s => s + 1);
          addXp(50);
      }
      
      if (mode === 'curriculum' && selectedConcept) updateConceptScore(selectedConcept.id, isCorrect ? 10 : -5);
      else if (mode === 'discovery' || mode === 'exam') GeminiService.updateMasteryScore(topic || "General", isCorrect ? 5 : -2, currentUserId);
  };

  const handleNextQuestion = () => {
      if (sessionStep >= TOTAL_QUESTIONS) { 
        setSessionStep(TOTAL_QUESTIONS + 1); 
        setQuestion(null); 
      }
      else {
          setSessionStep(s => s + 1);
          const diff = mode === 'exam' ? 'hard' : (selectedConcept ? (selectedConcept.masteryScore < 50 ? 'easy' : selectedConcept.masteryScore < 80 ? 'medium' : 'hard') : 'medium');
          fetchQuestion(selectedConcept?.name || topic, diff as any);
      }
  };

  const resetSession = () => { 
      setSessionStep(0); 
      setSessionScore(0); 
      setQuestion(null); 
      setSelectedConcept(null); 
      setTrackingActive(false); 
      setError(null); 
      setTopic(""); 
      if (streamRef.current) { CameraService.stop(streamRef.current); streamRef.current = null; }
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in-up pb-10 relative">
       <style>{`
          @keyframes neural-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 40px 10px rgba(255, 255, 255, 0.1); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          }
          .animate-neural-pulse {
            animation: neural-pulse var(--pulse-duration) ease-in-out infinite;
          }
       `}</style>

       <video ref={videoRef} className="hidden" muted playsInline />

       {showConsentModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
               <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center transform transition-all scale-100">
                   <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">👁️</div>
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">Biometric Oversight</h3>
                   <p className="text-slate-500 mb-8">Transient camera access is required for focus analysis and identity verification during this session.</p>
                   <div className="flex gap-4">
                       <button onClick={() => handleConsent(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Decline</button>
                       <button onClick={() => handleConsent(true)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">Enable Link</button>
                   </div>
               </div>
           </div>
       )}

       {sessionStep === 0 ? (
           <div className="space-y-8">
               <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                   <div>
                       <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Practice Arena</h2>
                       <p className="text-slate-500 font-medium">Calibrate your intelligence across disciplines.</p>
                   </div>
                   <div className="flex bg-white rounded-2xl p-1 border border-slate-200 shadow-sm ring-4 ring-slate-100/50">
                       <button onClick={() => setMode('curriculum')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'curriculum' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Curriculum</button>
                       <button onClick={() => setMode('discovery')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'discovery' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Discovery</button>
                       <button onClick={() => setMode('exam')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'exam' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>Lockdown</button>
                   </div>
               </div>

               {mode === 'curriculum' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {subjects.map(s => (
                           <div key={s.id} className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 border border-white/50 shadow-sm space-y-4 hover:shadow-xl transition-all group">
                               <h3 className="font-bold text-xl text-slate-800">{s.name}</h3>
                               <div className="space-y-2">
                                   {s.concepts.map(c => (
                                       <button 
                                           key={c.id} 
                                           onClick={() => { setSelectedConcept(c); handleStartSession(() => { setSessionStep(1); setSessionScore(0); fetchQuestion(c.name, 'medium'); }); }}
                                           className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex justify-between items-center group/btn"
                                       >
                                           <span className="text-sm font-bold text-slate-600 group-hover/btn:text-indigo-600">{c.name}</span>
                                           <div className="flex items-center gap-2">
                                               <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                   <div className="bg-indigo-500 h-full" style={{width: `${c.masteryScore}%`}}></div>
                                               </div>
                                               <span className="text-[10px] font-black text-indigo-400">{c.masteryScore}%</span>
                                           </div>
                                       </button>
                                   ))}
                               </div>
                           </div>
                       ))}
                   </div>
               )}

               {mode === 'discovery' && (
                   <div className="space-y-8">
                       <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-12 border border-white/50 shadow-sm text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20"></div>
                            <h3 className="text-3xl font-black text-slate-800 mb-2">On-Demand Intelligence</h3>
                            <p className="text-slate-500 mb-10 font-medium">Input any subject to generate a customized AI mastery track.</p>
                            <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4 relative z-10">
                                <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter topic..." className="flex-1 bg-white border border-slate-200 rounded-[24px] px-8 py-5 outline-none focus:border-indigo-500 shadow-inner text-lg font-medium"/>
                                <button onClick={() => handleStartSession(() => { setSessionStep(1); setSessionScore(0); fetchQuestion(topic, 'medium'); })} disabled={!topic || isGenerating} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-[24px] font-black shadow-2xl active:scale-95 transition-all disabled:opacity-50">Initialize</button>
                            </div>
                       </div>
                   </div>
               )}

               {mode === 'exam' && (
                   <div className="bg-slate-900 rounded-[40px] p-12 text-white text-center space-y-8 relative overflow-hidden shadow-2xl">
                       <div className="relative z-10 space-y-6">
                           <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto text-4xl border border-rose-500/20">🛡️</div>
                           <h3 className="text-4xl font-black tracking-tight">Lockdown Session</h3>
                           <p className="text-slate-400 max-w-md mx-auto text-lg">Continuous 10s biometric snapshots and proctoring enabled.</p>
                           <div className="max-w-sm mx-auto space-y-4 pt-6">
                               <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Examination Subject..." className="w-full bg-slate-800 border border-white/10 rounded-2xl px-6 py-5 outline-none font-bold text-lg text-white"/>
                               <button onClick={() => handleStartSession(() => { setSessionStep(1); setSessionScore(0); fetchQuestion(topic, 'hard'); })} disabled={!topic} className="w-full py-5 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black text-xl active:scale-95 transition-all">Authorize Protocol</button>
                           </div>
                       </div>
                   </div>
               )}
           </div>
       ) : sessionStep <= TOTAL_QUESTIONS ? (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[700px]">
               <div className="lg:col-span-8 bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col relative overflow-visible">
                   <div className="flex justify-between items-start mb-8 relative z-10">
                       <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full border border-indigo-100">Task {sessionStep} / {TOTAL_QUESTIONS}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">Score: {sessionScore}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 px-4 py-2 rounded-full border border-rose-100 animate-pulse">📷 PROCTORING ACTIVE</span>
                            </div>
                       </div>
                       <button onClick={resetSession} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-200">Exit Session</button>
                   </div>

                   {loading ? (
                       <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20">
                           <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                           <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-500 animate-pulse">Accelerating Neural Synthesis...</p>
                       </div>
                   ) : question ? (
                       <div className="flex-1 flex flex-col mb-10 overflow-y-auto custom-scrollbar pr-2">
                           <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-10 leading-tight italic">"{question.question}"</h2>
                           <div className="grid grid-cols-1 gap-4 mb-8">
                               {question.options.map((opt, i) => {
                                   let btnClass = "bg-slate-50 border-slate-100 text-slate-900 hover:border-indigo-300 hover:bg-white";
                                   if (selectedOptionIndex === i) btnClass = "bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-200 shadow-md";
                                   if (isSubmitted) {
                                       if (i === question.correctIndex) btnClass = "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200";
                                       else if (i === selectedOptionIndex) btnClass = "bg-rose-50 border-rose-500 text-rose-800 opacity-60 line-through";
                                       else btnClass = "bg-slate-50 border-slate-100 opacity-40";
                                   }
                                   return (
                                       <button key={i} onClick={() => !isSubmitted && setSelectedOptionIndex(i)} disabled={isSubmitted} className={`p-6 rounded-[24px] border-2 text-left font-black text-base transition-all group ${btnClass}`}>
                                           <span className="flex justify-between items-center">
                                               {opt}
                                               {isSubmitted && i === question.correctIndex && <span className="text-emerald-600">✓</span>}
                                               {isSubmitted && i === selectedOptionIndex && i !== question.correctIndex && <span className="text-rose-600">✕</span>}
                                           </span>
                                       </button>
                                   )
                               })}
                           </div>

                           {isSubmitted && (
                               <div className="animate-fade-in-up space-y-6 pt-6 border-t-2 border-slate-50">
                                   <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                                       <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl font-black pointer-events-none uppercase">Verified</div>
                                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6">Neural Solution Breakdown</h3>
                                       
                                       <div className="space-y-8">
                                           <div>
                                               <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                   <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                                   Conceptual Core
                                               </h4>
                                               <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-slate-800 pl-4">
                                                   {question.theory}
                                               </p>
                                           </div>

                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest mb-4">Solving Sequence</h4>
                                                    <div className="space-y-4">
                                                        {question.steps.map((step, idx) => (
                                                            <div key={idx} className="flex gap-4 items-start">
                                                                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[10px] font-black border border-white/10">{idx + 1}</div>
                                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">{step}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                                    <h4 className="text-xs font-extrabold text-purple-400 uppercase tracking-widest mb-3">AI Deep Analysis</h4>
                                                    <p className="text-slate-200 text-xs leading-relaxed">
                                                        {question.explanation}
                                                    </p>
                                                </div>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           )}
                       </div>
                   ) : null}

                   <div className="mt-auto pt-8 border-t border-slate-50 flex justify-end">
                       <div className="flex gap-4">
                            {!isSubmitted ? (
                                <button onClick={submitAnswer} disabled={selectedOptionIndex === null || loading} className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Submit Answer</button>
                            ) : (
                                <button onClick={handleNextQuestion} className="px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                                    Next Challenge ➔
                                </button>
                            )}
                       </div>
                   </div>
               </div>

               <div className="lg:col-span-4 space-y-8 flex flex-col h-full">
                   <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col shadow-2xl relative overflow-hidden flex-1 border border-slate-800">
                       <div className="flex justify-between items-center mb-8">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Neural Feed</h3>
                           <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isRealtimeActive ? 'Live WebSocket' : 'Syncing...'}</span>
                           </div>
                       </div>
                       
                       <div className="flex-1 flex flex-col items-center justify-center">
                           {/* Enhanced .student-confusion-index with dynamic visuals & real-time updates */}
                           <div className="student-confusion-index w-full flex flex-col items-center">
                               
                               <div 
                                 className={`relative w-48 h-48 flex items-center justify-center rounded-full transition-all duration-1000 border-2 ${ui.color.replace('text', 'border')}/20 animate-neural-pulse`}
                                 style={{ '--pulse-duration': ui.pulse } as any}
                               >
                                   {/* Background Glow */}
                                   <div className={`absolute inset-0 rounded-full blur-2xl ${ui.bg} transition-all duration-1000 opacity-60`}></div>
                                   
                                   {/* Score Display */}
                                   <div className="text-center z-10">
                                       <div className={`text-6xl font-black tracking-tighter ${ui.color} transition-all duration-700`}>
                                           {isSubmitted ? '---' : `${confusionData.confusionScore}%`}
                                       </div>
                                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">
                                           {isSubmitted ? 'SNAPSHOT' : 'Cognitive Load'}
                                       </div>
                                   </div>

                                   {/* Outer Ring Gauge */}
                                   <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                                       <circle cx="50" cy="50" r="48" fill="transparent" stroke="currentColor" strokeWidth="1" className="text-white/5" />
                                       <circle 
                                           cx="50" cy="50" r="48" 
                                           fill="transparent" 
                                           stroke="currentColor" 
                                           strokeWidth="3" 
                                           strokeDasharray="301.59" 
                                           strokeDashoffset={301.59 - (301.59 * (isSubmitted ? 0 : confusionData.confusionScore)) / 100} 
                                           strokeLinecap="round" 
                                           className={`${ui.color} transition-all duration-[1.5s] ease-out`}
                                       />
                                   </svg>
                               </div>

                               {!isSubmitted && (
                                   <div className="mt-12 w-full space-y-6 animate-fade-in text-center">
                                       <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${ui.color.replace('text', 'border')}/20 ${ui.bg} backdrop-blur-md`}>
                                           <span className={`w-2 h-2 rounded-full bg-current animate-pulse ${ui.color}`}></span>
                                           <span className={`text-[10px] font-black uppercase tracking-widest ${ui.color}`}>
                                               Status: {confusionData.mood || 'analyzing'}
                                           </span>
                                       </div>
                                       
                                       <p className="text-xs text-slate-400 italic leading-relaxed px-4 font-medium max-w-[280px] mx-auto min-h-[40px] transition-all">
                                           "{confusionData.summary || 'Synchronizing biometric gaze markers...'}"
                                       </p>
                                       
                                       <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6 border-t border-white/5 text-left px-4">
                                           <div className="space-y-1">
                                               <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                   <span>Gaze focus</span>
                                                   <span className="text-emerald-500">92%</span>
                                               </div>
                                               <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500/40" style={{width: '92%'}}></div></div>
                                           </div>
                                           <div className="space-y-1">
                                               <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                   <span>Stability</span>
                                                   <span className="text-indigo-500">84%</span>
                                               </div>
                                               <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-500/40" style={{width: '84%'}}></div></div>
                                           </div>
                                       </div>
                                   </div>
                               )}
                           </div>
                           
                           <div className="mt-auto pt-10 w-full space-y-4">
                               <div className="flex items-center justify-between text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                                   <span>Neural Link Integrity</span>
                                   <span className="text-emerald-500">OPTIMAL</span>
                               </div>
                               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500" style={{width: '98%'}}></div>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       ) : (
           <div className="bg-white rounded-[60px] p-24 text-center space-y-10 shadow-2xl border border-indigo-50 relative overflow-hidden animate-pop-in">
                <div className="text-8xl mb-4 drop-shadow-xl">🏆</div>
                <h2 className="text-6xl font-black text-slate-800 tracking-tighter">Neural Sync Complete</h2>
                <div className="flex justify-center gap-16 py-12">
                    <div className="text-center">
                        <div className="text-6xl font-black text-indigo-600">{Math.round((sessionScore/TOTAL_QUESTIONS)*100)}%</div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Precision</div>
                    </div>
                    <div className="w-px h-20 bg-slate-100" />
                    <div className="text-center">
                        <div className="text-6xl font-black text-purple-600">+{sessionScore * 50}</div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-3">XP Accretion</div>
                    </div>
                </div>
                <button onClick={resetSession} className="px-20 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all">Return to Terminal</button>
           </div>
       )}
    </div>
  );
};

export default PracticeArena;
