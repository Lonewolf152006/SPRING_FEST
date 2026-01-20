import React, { useState, useContext, useRef, useEffect } from 'react';
import { QuizQuestion, Concept, MultimodalResult, ConfusionAnalysis, ExplanationMode } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { CameraService } from '../../services/cameraService';
import { DatabaseService } from '../../services/databaseService';
import { HierarchyContext } from '../../App';

const SNAPSHOT_INTERVAL = 10000; // Requirement: 10 seconds

const PracticeArena = () => {
  const { subjects, updateConceptScore, currentUserId, addXp } = useContext(HierarchyContext);
  const [mode, setMode] = useState<'curriculum' | 'discovery' | 'exam'>('curriculum');
  
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Dynamic Session Length
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [sessionStep, setSessionStep] = useState(0); 
  const [sessionScore, setSessionScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // --- Multimodal State ---
  const [activeExplanation, setActiveExplanation] = useState<ExplanationMode | null>(null);
  const [multimodalContent, setMultimodalContent] = useState<MultimodalResult | null>(null);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);

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
  const trackingIntervalRef = useRef<any>(null);
  const snapshotIntervalRef = useRef<any>(null);

  // Requirement: Periodic snapshots every 10 seconds for proctoring evidence
  useEffect(() => {
      if (trackingActive && sessionStep >= 1 && sessionStep <= totalQuestions && !isSubmitted) {
          snapshotIntervalRef.current = setInterval(async () => {
              if (videoRef.current) {
                  const base64 = CameraService.captureFrame(videoRef.current);
                  if (base64) {
                      await DatabaseService.saveSessionSnapshot(currentUserId, base64, mode, sessionStep);
                      console.log(`[Proctoring] Evidence captured at step ${sessionStep}`);
                  }
              }
          }, SNAPSHOT_INTERVAL);
      } else {
          if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
      }
      return () => { if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current); };
  }, [trackingActive, sessionStep, isSubmitted, currentUserId, mode, totalQuestions]);

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
                setConfusionData(analysis);
                await GeminiService.submitSessionReport({ studentId: currentUserId, confusionScore: analysis.confusionScore, mood: analysis.mood, timestamp: Date.now(), mode }, mode === 'discovery');
            }
        } catch (e) {
            console.warn("Focus analysis cycle skipped.");
        }
    };

    const initTracking = async () => {
        if (!videoRef.current) return;
        try {
            const stream = await CameraService.start(videoRef.current);
            streamRef.current = stream;
            setTrackingActive(true);
            trackingIntervalRef.current = setInterval(runAnalysisCycle, mode === 'exam' ? 45000 : 75000);
            setTimeout(runAnalysisCycle, 2000);
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

  const handleExplanationChoice = async (explMode: ExplanationMode) => {
      if (!question || selectedOptionIndex === null) return;
      setActiveExplanation(explMode);
      setGeneratingExplanation(true);
      setMultimodalContent(null);

      const isCorrect = selectedOptionIndex === question.correctIndex;
      const studentAnswer = question.options[selectedOptionIndex];
      const result = await GeminiService.generateMultimodalSolution(
          question.theory || "General Concept", 
          explMode, 
          isCorrect, 
          studentAnswer
      );
      
      setMultimodalContent(result as MultimodalResult);
      setGeneratingExplanation(false);
  };

  const handleNextQuestion = () => {
      if (sessionStep >= totalQuestions) { 
        setSessionStep(totalQuestions + 1); 
        setQuestion(null); 
      }
      else {
          setSessionStep(s => s + 1);
          setActiveExplanation(null);
          setMultimodalContent(null);
          
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
      setActiveExplanation(null);
      setMultimodalContent(null);
      if (streamRef.current) { CameraService.stop(streamRef.current); streamRef.current = null; }
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
  };

  // Visual Helpers for Confusion Index
  const score = confusionData.confusionScore || 0;
  const getConfusionColor = () => {
    if (score < 30) return '#10b981'; // emerald
    if (score < 60) return '#f59e0b'; // amber
    return '#f43f5e'; // rose
  };

  const getConfusionTextClass = () => {
    if (score < 30) return 'text-emerald-400';
    if (score < 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getConfusionGlowClass = () => {
    if (score < 30) return 'shadow-[0_0_40px_rgba(16,185,129,0.2)]';
    if (score < 60) return 'shadow-[0_0_40px_rgba(245,158,11,0.2)]';
    return 'shadow-[0_0_40px_rgba(244,63,94,0.3)]';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in-up pb-10 relative">
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

               {/* Global Session Config (Visible for all modes) */}
               <div className="bg-white/40 backdrop-blur-md rounded-[32px] p-8 border border-white/50 shadow-sm">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex-1 w-full space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Session Depth (Questions)</label>
                                <span className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-1 rounded-xl border border-indigo-100">{totalQuestions}</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="20" 
                                value={totalQuestions} 
                                onChange={e => setTotalQuestions(Number(e.target.value))}
                                className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                                <span>Short Burst (1)</span>
                                <span>Marathon (20)</span>
                            </div>
                        </div>
                        <div className="w-full md:w-px h-px md:h-20 bg-slate-200"></div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="text-sm font-bold text-slate-700 mb-1">Adaptive Load Balancer</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {totalQuestions <= 5 ? "Ideal for rapid recall and daily reinforcement." : 
                                 totalQuestions <= 12 ? "Standard mastery session for core competency." : 
                                 "Deep immersion. Best for exam preparation and high-intensity learning."}
                            </p>
                        </div>
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
                           <div className="max-sm mx-auto space-y-4 pt-6">
                               <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Examination Subject..." className="w-full bg-slate-800 border border-white/10 rounded-2xl px-6 py-5 outline-none font-bold text-lg text-white"/>
                               <button onClick={() => handleStartSession(() => { setSessionStep(1); setSessionScore(0); fetchQuestion(topic, 'hard'); })} disabled={!topic} className="w-full py-5 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black text-xl active:scale-95 transition-all">Authorize Protocol</button>
                           </div>
                       </div>
                   </div>
               )}
           </div>
       ) : sessionStep <= totalQuestions ? (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[700px]">
               <div className="lg:col-span-8 bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col relative overflow-visible">
                   <div className="flex justify-between items-start mb-8 relative z-10">
                       <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full border border-indigo-100">Task {sessionStep} / {totalQuestions}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">Score: {sessionScore}</span>
                                {trackingActive ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 px-4 py-2 rounded-full border border-rose-100 animate-pulse">📷 PROCTORING ACTIVE</span>
                                ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-4 py-2 rounded-full border border-slate-200">📷 PROCTORING OFF</span>
                                )}
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
                                   <div className={`p-6 rounded-[32px] text-center border-2 ${selectedOptionIndex === question.correctIndex ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                       <div className="text-4xl mb-2">{selectedOptionIndex === question.correctIndex ? '✨ Correct' : '❌ Incorrect'}</div>
                                   </div>

                                   {!activeExplanation ? (
                                       <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl text-center space-y-6">
                                           <div>
                                               <h3 className="text-xl font-black text-slate-800 mb-2">How do you want to understand this?</h3>
                                               <p className="text-slate-500 text-sm">Select your preferred learning mode for a tailored explanation.</p>
                                           </div>
                                           
                                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                               <button onClick={() => handleExplanationChoice('flowchart')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all group">
                                                   <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Flowchart</span>
                                               </button>
                                               <button onClick={() => handleExplanationChoice('analogy')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-all group">
                                                   <span className="text-3xl group-hover:scale-110 transition-transform">💡</span>
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Analogy</span>
                                               </button>
                                               <button onClick={() => handleExplanationChoice('concept-map')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-100 transition-all group">
                                                   <span className="text-3xl group-hover:scale-110 transition-transform">🔗</span>
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">Concept Map</span>
                                               </button>
                                               <button onClick={() => handleExplanationChoice('theoretical')} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-all group">
                                                   <span className="text-3xl group-hover:scale-110 transition-transform">📖</span>
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Theoretical</span>
                                               </button>
                                           </div>
                                       </div>
                                   ) : (
                                       <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden animate-fade-in-up">
                                           <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl font-black pointer-events-none uppercase">Verified</div>
                                           <div className="flex justify-between items-center mb-6">
                                               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Neural Solution: {activeExplanation}</h3>
                                               <button onClick={() => setActiveExplanation(null)} className="text-xs text-slate-400 hover:text-white underline">Change Mode</button>
                                           </div>
                                           
                                           {generatingExplanation ? (
                                               <div className="py-12 flex flex-col items-center justify-center gap-4">
                                                   <div className="w-8 h-8 border-4 border-indigo-500 border-t-white rounded-full animate-spin"></div>
                                                   <p className="text-xs font-bold text-indigo-300 animate-pulse">Adapting explanation format...</p>
                                               </div>
                                           ) : multimodalContent ? (
                                               <div className="space-y-6">
                                                   {activeExplanation === 'flowchart' && multimodalContent.steps && (
                                                       <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                                                           {multimodalContent.steps.map((step, idx) => (
                                                               <div key={idx} className="flex flex-col items-center">
                                                                   <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg w-full text-center text-sm font-medium border border-indigo-400">
                                                                       {step}
                                                                   </div>
                                                                   {idx < (multimodalContent.steps?.length || 0) - 1 && (
                                                                       <div className="h-6 w-0.5 bg-white/30 my-1"></div>
                                                                   )}
                                                                   {idx < (multimodalContent.steps?.length || 0) - 1 && (
                                                                       <div className="mb-1 text-white/50">▼</div>
                                                                   )}
                                                               </div>
                                                           ))}
                                                       </div>
                                                   )}

                                                   {activeExplanation === 'analogy' && (
                                                       <div className="bg-amber-900/40 border border-amber-500/30 p-8 rounded-[32px] relative overflow-hidden">
                                                           <div className="text-6xl absolute top-4 right-4 opacity-20">💡</div>
                                                           <p className="text-amber-100 text-lg leading-relaxed font-serif italic">
                                                               "{multimodalContent.content}"
                                                           </p>
                                                       </div>
                                                   )}

                                                   {activeExplanation === 'concept-map' && multimodalContent.connections && (
                                                       <div className="bg-teal-900/30 border border-teal-500/30 p-8 rounded-[32px] flex justify-center items-center gap-4 flex-wrap">
                                                           {multimodalContent.connections.map((conn, i) => (
                                                               <div key={i} className="flex items-center gap-2">
                                                                   <div className="bg-teal-800 px-4 py-2 rounded-lg text-xs font-bold text-teal-200 border border-teal-600">{conn.from}</div>
                                                                   <div className="text-[10px] text-teal-400 font-mono">--[{conn.relation}]--></div>
                                                                   <div className="bg-teal-600 px-4 py-2 rounded-lg text-xs font-bold text-white border border-teal-400 shadow-lg shadow-teal-500/20">{conn.to}</div>
                                                               </div>
                                                           ))}
                                                       </div>
                                                   )}

                                                   {activeExplanation === 'theoretical' && (
                                                       <div className="bg-purple-900/30 border border-purple-500/30 p-8 rounded-[32px]">
                                                           <h4 className="text-purple-300 font-bold uppercase text-xs mb-3 tracking-widest">Academic Deep Dive</h4>
                                                           <p className="text-purple-100 text-sm leading-relaxed">
                                                               {multimodalContent.content}
                                                           </p>
                                                       </div>
                                                   )}
                                               </div>
                                           ) : (
                                               <div className="text-center text-slate-400">Failed to generate content.</div>
                                           )}
                                       </div>
                                   )}
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
                       <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8">Neural Feed</h3>
                       <div className="flex-1 flex flex-col items-center justify-center">
                           <div className="student-confusion-index text-center w-full flex flex-col items-center">
                               
                               {/* Enhanced Dynamic Visual Representation */}
                               <div className="relative mb-12 flex items-center justify-center">
                                   {/* Circular Progress Path */}
                                   <svg className="w-48 h-48 -rotate-90">
                                       <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                       <circle 
                                            cx="96" cy="96" r="88" 
                                            fill="none" 
                                            stroke={getConfusionColor()} 
                                            strokeWidth="8" 
                                            strokeDasharray="552.92" 
                                            strokeDashoffset={isSubmitted ? 552.92 : 552.92 - (552.92 * score) / 100} 
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                       />
                                   </svg>

                                   {/* Neural Pulse Effect */}
                                   {!isSubmitted && (
                                       <div 
                                            className={`absolute inset-0 rounded-full border-2 border-dashed opacity-20 animate-spin-slow transition-colors duration-1000`} 
                                            style={{ borderColor: getConfusionColor(), animationDuration: `${Math.max(2, 10 - (score / 10))}s` }}
                                       />
                                   )}

                                   {/* Score Display */}
                                   <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-full transition-all duration-1000 ${getConfusionGlowClass()}`}>
                                       <div className={`text-6xl font-black tracking-tighter transition-colors duration-1000 ${getConfusionTextClass()}`}>
                                           {isSubmitted ? '---' : score + '%'}
                                       </div>
                                       <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                                           Load Metric
                                       </div>
                                   </div>
                               </div>

                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">
                                   {isSubmitted ? 'FEED CAPTURED' : 'Biometric Confusion Index'}
                               </div>

                               {!isSubmitted && (
                                   <div className="space-y-6 animate-fade-in w-full">
                                       <div className="bg-white/5 border border-white/5 p-5 rounded-3xl backdrop-blur-sm">
                                           <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2 ${
                                               confusionData.mood === 'focused' || confusionData.mood === 'engaged' ? 'text-emerald-400' : 
                                               confusionData.mood === 'confused' || confusionData.mood === 'frustrated' ? 'text-rose-400' : 'text-amber-400'
                                           }`}>
                                               <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                               Mood: {confusionData.mood || 'calibrating'}
                                           </div>
                                           <p className="text-[11px] text-slate-400 italic leading-relaxed px-2">
                                               "{confusionData.summary || 'Analyzing gaze, posture, and facial tension for cognitive mapping...'}"
                                           </p>
                                       </div>
                                   </div>
                               )}
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
                        <div className="text-6xl font-black text-indigo-600">{Math.round((sessionScore/totalQuestions)*100)}%</div>
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

       <style>{`
            @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .animate-spin-slow {
                animation: spin-slow 8s linear infinite;
            }
       `}</style>
    </div>
  );
};

export default PracticeArena;