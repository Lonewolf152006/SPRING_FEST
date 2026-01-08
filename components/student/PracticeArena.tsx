
import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { QuizQuestion, Subject, Concept, ExplanationMode, MultimodalResult, ConfusionAnalysis, ExamProctoringAnalysis } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { CameraService } from '../../services/cameraService';
import { decodeAudioData } from '../../utils/audioUtils';
import { HierarchyContext } from '../../App';

const PracticeArena = () => {
  const { subjects, updateConceptScore, currentUserId } = useContext(HierarchyContext);
  const [mode, setMode] = useState<'curriculum' | 'discovery' | 'exam'>('curriculum');
  
  // Selection State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [topic, setTopic] = useState("");
  
  // Quiz State
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Multimodal Feedback State
  const [activeExplanation, setActiveExplanation] = useState<MultimodalResult | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Camera & Privacy State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingStartAction, setPendingStartAction] = useState<(() => void) | null>(null);
  
  const [confusionIndex, setConfusionIndex] = useState(0);
  const [confusionNudge, setConfusionNudge] = useState(false);
  const trackingIntervalRef = useRef<any>(null);

  // Derived Data
  const filteredSubjects = useMemo(() => subjects, [subjects]);
  const activeSubject = filteredSubjects.find(s => s.id === selectedSubjectId);

  // --- Live Camera Tracking Logic ---
  useEffect(() => {
    let stream: MediaStream | null = null;

    const runAnalysisCycle = async () => {
        if (!videoRef.current || !trackingActive) return;

        const base64 = CameraService.captureFrame(videoRef.current);
        if (!base64) return;

        if (mode === 'exam') {
            // Exam proctoring analysis - restricted to teachers/admins
            const proctoring: ExamProctoringAnalysis = await GeminiService.analyzeExamProctoring(base64);
            await GeminiService.submitSessionReport({
                studentId: currentUserId,
                proctoring,
                timestamp: Date.now(),
                mode: 'EXAM'
            }, false);
            // In exam mode, we don't nudge the student with confusion alerts to minimize distraction
            setConfusionNudge(false);
        } else {
            // Standard practice analysis
            const analysis: ConfusionAnalysis = await GeminiService.analyzeStudentAttention(base64);
            setConfusionIndex(analysis.confusionScore);

            const isPrivate = mode === 'discovery'; 
            await GeminiService.submitSessionReport({
                studentId: currentUserId,
                confusionScore: analysis.confusionScore,
                mood: analysis.mood,
                timestamp: Date.now(),
                mode: mode
            }, isPrivate);

            if (analysis.confusionScore > 60 && !activeExplanation && !isSubmitted) {
                setConfusionNudge(true);
                setTimeout(() => setConfusionNudge(false), 8000); 
            } else {
                setConfusionNudge(false);
            }
        }
    };

    const initTracking = async () => {
        if (!videoRef.current) return;
        try {
            stream = await CameraService.start(videoRef.current);
            setTrackingActive(true);
            trackingIntervalRef.current = setInterval(runAnalysisCycle, mode === 'exam' ? 30000 : 60000);
            setTimeout(runAnalysisCycle, 3000);
        } catch (e) {
            console.error("Tracking failed:", e);
            setTrackingActive(false);
            setConsentGiven(false);
        }
    };

    if (question && !isSubmitted && consentGiven) {
        initTracking();
    } else {
        if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
        CameraService.stop(stream);
        setTrackingActive(false);
        setConfusionNudge(false);
    }

    return () => {
        if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
        CameraService.stop(stream);
    };
  }, [question, isSubmitted, mode, consentGiven, currentUserId]);


  // --- Quiz Logic ---
  const handleStartSession = (action: () => void) => {
      if (consentGiven) {
          action();
      } else {
          setPendingStartAction(() => action);
          setShowConsentModal(true);
      }
  };

  const handleConsent = (allowed: boolean) => {
      setShowConsentModal(false);
      if (allowed) {
          setConsentGiven(true);
          if (pendingStartAction) pendingStartAction();
      }
      setPendingStartAction(null);
  };

  const fetchQuestion = async (contextTopic: string, difficulty: 'easy' | 'medium' | 'hard') => {
    setLoading(true);
    setQuestion(null);
    setSelectedOptionIndex(null);
    setIsSubmitted(false);
    setLastResult(null);
    setActiveExplanation(null);
    
    const q = await GeminiService.generateQuiz(contextTopic, difficulty);
    setQuestion(q);
    setLoading(false);
  };

  const handleFetchExplanation = async (mode: ExplanationMode) => {
      if (!question) return;
      setExplaining(true);
      const studentAnswer = question.options[selectedOptionIndex ?? 0];
      const res = await GeminiService.generateMultimodalSolution(
          selectedConcept?.name || topic, 
          mode, 
          lastResult === 'correct', 
          studentAnswer
      );
      setActiveExplanation(res);
      setExplaining(false);
  };

  const handleReadAloud = async () => {
    if (!question || playing) return;
    setPlaying(true);
    const audioData = await GeminiService.generateSpeech(question.question);
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await decodeAudioData(audioData, ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      source.onended = () => setPlaying(false);
    } else {
      setPlaying(false);
    }
  };

  const handleOptionClick = (index: number) => {
      if (isSubmitted || !question) return;
      setSelectedOptionIndex(index);
      setIsSubmitted(true);
      
      const isCorrect = index === question.correctIndex;
      setLastResult(isCorrect ? 'correct' : 'incorrect');

      if (mode === 'curriculum' && selectedConcept) {
          updateConceptScore(selectedConcept.id, isCorrect ? 10 : -5);
      } else if (mode === 'discovery') {
          GeminiService.updateMasteryScore(topic || "General", isCorrect ? 5 : -2);
      }
  };

  const isLocked = (concept: Concept) => {
    if (!activeSubject) return false;
    return concept.prerequisites.some(preId => {
        const pre = activeSubject.concepts.find(c => c.id === preId);
        return pre ? pre.masteryScore < 80 : false;
    });
  };

  const startCurriculumQuiz = (concept: Concept) => {
    if (isLocked(concept)) return;
    handleStartSession(() => {
        setSelectedConcept(concept);
        const diff = concept.masteryScore < 50 ? 'easy' : concept.masteryScore < 80 ? 'medium' : 'hard';
        fetchQuestion(concept.name, diff);
    });
  };

  const startDiscoveryQuiz = () => {
      if (!topic) return;
      handleStartSession(() => {
          fetchQuestion(topic, 'medium');
      });
  };

  const startExam = () => {
    if (!selectedSubjectId) return;
    handleStartSession(() => {
      fetchQuestion(activeSubject?.name || "General Exam", 'hard');
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in-up pb-10 relative">
       <video ref={videoRef} className="hidden" muted playsInline />

       {showConsentModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
               <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center transform transition-all scale-100">
                   <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm">
                       👁️
                   </div>
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">Secure Proctoring Consent</h3>
                   <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                       To ensure institutional integrity, AMEP analyzes gaze patterns, stress cues, and cognitive load. 
                       <br/><br/>
                       <strong>Access Control:</strong>
                       <ul className="text-left list-disc pl-6 mt-2 space-y-1 text-xs text-slate-500">
                           <li>Proctoring data is encrypted and sent to Faculty dashboards.</li>
                           <li><strong>Exam Mode:</strong> Real-time attention and stress metrics are visible only to Admins/Teachers.</li>
                           <li>Vision AI detects if the face leaves the frame or if additional aids are used.</li>
                       </ul>
                   </p>
                   <div className="flex gap-3">
                       <button onClick={() => handleConsent(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Decline</button>
                       <button onClick={() => handleConsent(true)} className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">Activate Secure Mode</button>
                   </div>
               </div>
           </div>
       )}

       {/* Header & Controls */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Practice Arena</h2>
            <div className="flex items-center gap-3">
                <p className="text-slate-500 font-medium">Adaptive Mastery & Examination</p>
                {trackingActive && (
                    <div className="flex items-center gap-2 bg-slate-800 text-white pl-2 pr-3 py-1 rounded-full shadow-md animate-pulse">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">{mode === 'exam' ? 'PROCTORING ACTIVE' : 'REC'}</span>
                    </div>
                )}
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center ring-4 ring-slate-100/50">
            <button 
                onClick={() => { setMode('curriculum'); setQuestion(null); }}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'curriculum' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100/50'}`}
            >
                📚 Curriculum
            </button>
            <button 
                onClick={() => { setMode('discovery'); setQuestion(null); }}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'discovery' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100/50'}`}
            >
                🚀 Discovery
            </button>
            <button 
                onClick={() => { setMode('exam'); setQuestion(null); }}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'exam' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100/50'}`}
            >
                🛡️ Secure Exam
            </button>
          </div>
       </div>

       {/* Selection Views */}
       {!question && !loading && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
               {mode === 'curriculum' || mode === 'exam' ? (
                   <>
                    <div className="lg:col-span-4 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4">Available Courses</h3>
                        <div className="space-y-3">
                            {filteredSubjects.map(sub => (
                                <button 
                                    key={sub.id}
                                    onClick={() => { setSelectedSubjectId(sub.id); setSelectedConcept(null); }}
                                    className={`w-full text-left p-5 rounded-3xl border-2 transition-all group ${selectedSubjectId === sub.id ? 'bg-indigo-50 border-indigo-500 shadow-md ring-4 ring-indigo-500/10' : 'bg-white border-transparent hover:border-indigo-100 shadow-sm'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${selectedSubjectId === sub.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-500'}`}>
                                                {sub.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-lg">{sub.name}</div>
                                                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">{sub.concepts.length} Tracks</div>
                                            </div>
                                        </div>
                                        {selectedSubjectId === sub.id && <span className="text-indigo-500 animate-pulse text-xl">→</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        {selectedSubjectId ? (
                            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-10 shadow-sm h-full flex flex-col">
                                <div className="mb-10 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800">{activeSubject?.name} {mode === 'exam' ? 'Final Examination' : 'Roadmap'}</h3>
                                        <p className="text-sm text-slate-500 mt-1">{mode === 'exam' ? 'Strict proctoring active. No assistance allowed.' : 'Master concepts sequentially to unlock advanced material.'}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold ${mode === 'exam' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'} px-3 py-1.5 rounded-full border uppercase tracking-widest`}>
                                        {mode === 'exam' ? 'PROCTORED SESSION' : 'ACTIVE ROADMAP'}
                                    </span>
                                </div>
                                
                                {mode === 'exam' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-5xl shadow-inner border border-rose-100">🛡️</div>
                                        <div className="max-w-md">
                                            <h4 className="text-xl font-bold text-slate-800">Start Comprehensive Exam</h4>
                                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">This session will be analyzed for attention stability, cognitive load, and integrity cues. Data is strictly for Faculty review.</p>
                                        </div>
                                        <button onClick={startExam} className="px-12 py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-3xl font-extrabold shadow-xl shadow-rose-200 transition-all active:scale-95">Enter Secure Exam Area</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {activeSubject?.concepts.map(con => {
                                            const locked = isLocked(con);
                                            return (
                                                <div 
                                                    key={con.id}
                                                    onClick={() => !locked && startCurriculumQuiz(con)}
                                                    className={`relative p-8 rounded-3xl border-2 transition-all flex flex-col justify-between min-h-[160px] group ${locked ? 'bg-slate-50/80 border-slate-100 opacity-60 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-indigo-500 cursor-pointer hover:shadow-xl hover:-translate-y-1'}`}
                                                >
                                                    {locked && <div className="absolute top-6 right-6 text-xl text-slate-400">🔒</div>}
                                                    <div className="z-10">
                                                        <h4 className={`text-lg font-bold ${locked ? 'text-slate-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>{con.name}</h4>
                                                        {con.prerequisites.length > 0 && (
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-2 bg-slate-100 px-2 py-0.5 rounded inline-block">
                                                                Requires: {activeSubject.concepts.find(c => c.id === con.prerequisites[0])?.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="mt-6">
                                                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-tight">
                                                            <span>Mastery</span>
                                                            <span>{con.masteryScore}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                                                            <div className="h-full transition-all duration-1000 bg-indigo-500" style={{width: `${con.masteryScore}%`}}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-20 bg-white/40 border border-dashed border-slate-200 rounded-[40px] text-center shadow-inner">
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm ring-8 ring-slate-100">🎯</div>
                                <h3 className="text-2xl font-bold text-slate-800">Select a subject to begin</h3>
                                <p className="text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">Institutional analytics tracks all roadmap sessions.</p>
                            </div>
                        )}
                    </div>
                   </>
               ) : (
                   <div className="lg:col-span-12 flex flex-col items-center justify-center p-20 bg-white/60 backdrop-blur-xl rounded-[40px] border border-slate-200 text-center shadow-sm relative overflow-hidden">
                       <div className="text-7xl mb-8 relative z-10">🌋</div>
                       <h3 className="text-4xl font-extrabold text-slate-800 mb-4 relative z-10">Discovery Mode</h3>
                       <p className="text-slate-500 max-w-lg mx-auto mb-12 text-lg leading-relaxed relative z-10">Private practice session. AI metrics are stored only in your local journal.</p>
                       <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl relative z-10">
                            <input 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && startDiscoveryQuiz()}
                                placeholder="Quantum Computing, Origami, Roman Empire..."
                                className="flex-1 bg-white border-2 border-slate-100 text-slate-800 px-8 py-5 rounded-3xl focus:border-purple-500 outline-none shadow-xl text-lg"
                            />
                            <button onClick={startDiscoveryQuiz} className="px-10 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-3xl font-bold shadow-xl">Explore</button>
                       </div>
                   </div>
               )}
           </div>
       )}

       {/* Loading State */}
       {loading && (
           <div className="bg-white/60 backdrop-blur-xl rounded-[40px] border border-slate-200 p-24 text-center shadow-sm max-w-4xl mx-auto flex flex-col items-center">
               <div className="relative w-20 h-20 mb-10">
                   <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
                   <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <h3 className="text-3xl font-bold text-slate-800">Initializing Secure Session...</h3>
               <p className="text-slate-400 mt-2 font-medium">Calibrating AI proctoring parameters</p>
           </div>
       )}

       {/* Question View */}
       {question && (
         <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-slate-900/5 max-w-5xl mx-auto animate-fade-in relative">
            
            {confusionNudge && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-bounce shadow-amber-500/40">
                    <span className="text-xl">🤔</span>
                    <span className="font-bold text-sm">Need a hint? Try an Analogy below!</span>
                </div>
            )}
            
            <div className="px-10 py-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    <span className={`
                        px-2 py-1 rounded 
                        ${mode === 'curriculum' ? 'text-indigo-600 bg-indigo-50' : 
                          mode === 'exam' ? 'text-rose-600 bg-rose-50' : 'text-purple-600 bg-purple-50'}
                    `}>
                        {mode === 'curriculum' ? '📚 Curriculum' : mode === 'exam' ? '🛡️ Secure Exam' : '🚀 Discovery'}
                    </span>
                    <span className="opacity-30">/</span>
                    <span className="text-slate-800">{selectedConcept ? selectedConcept.name : topic}</span>
                 </div>
                 <button onClick={() => setQuestion(null)} className="text-xs text-slate-400 hover:text-red-500 font-bold transition-all px-3 py-1.5 hover:bg-red-50 rounded-lg">Exit Session</button>
            </div>

            <div className="p-10 md:p-16">
               <div className="flex justify-between items-start mb-10">
                 <span className={`px-5 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-widest border ${
                     question.difficulty === 'hard' ? 'bg-red-50 text-red-600 border-red-100' :
                     question.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                     'bg-green-50 text-green-600 border-green-100'
                 }`}>
                    {question.difficulty} Intensity
                 </span>
                 <div className="flex items-center gap-3">
                    {mode === 'exam' ? (
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide border border-rose-100 bg-rose-50 px-3 py-1 rounded-full flex items-center gap-2">
                            <span>🛡️</span> Institutional Monitoring Active
                        </span>
                    ) : mode === 'curriculum' ? (
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide border border-indigo-100 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-2">
                            <span>📡</span> Shared with Teacher
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wide border border-purple-100 bg-purple-50 px-3 py-1 rounded-full flex items-center gap-2">
                            <span>🔒</span> Private Journaling
                        </span>
                    )}
                    <button onClick={handleReadAloud} disabled={playing} className={`flex items-center gap-3 px-5 py-2 rounded-full text-[11px] font-extrabold transition-all border ${playing ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                    {playing ? '🔊 Speaking...' : '🔊 Read Question'}
                    </button>
                 </div>
               </div>
               
               <h3 className="text-4xl text-slate-800 font-bold leading-[1.2] mb-16 max-w-4xl">{question.question}</h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {question.options.map((opt, i) => {
                    let btnClass = "border-slate-100 bg-white text-slate-700 hover:bg-slate-50 hover:border-indigo-300 shadow-sm";
                    if (isSubmitted) {
                        if (i === question.correctIndex) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-500/10 shadow-lg";
                        else if (i === selectedOptionIndex) btnClass = "border-red-500 bg-red-50 text-red-800 ring-4 ring-red-500/10 shadow-lg";
                        else btnClass = "border-slate-50 bg-slate-50/50 text-slate-300 opacity-60";
                    }

                    return (
                        <button 
                            key={i} 
                            onClick={() => handleOptionClick(i)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-8 rounded-[32px] border-2 transition-all duration-300 relative group flex gap-6 items-center ${btnClass} active:scale-[0.98]`}
                        >
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-colors ${
                                isSubmitted && i === question.correctIndex ? 'bg-emerald-500 text-white' : 'bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white'
                            }`}>
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span className="font-bold text-lg">{opt}</span>
                        </button>
                    )
                })}
               </div>
            </div>

            {isSubmitted && (
                <div className={`border-t-4 ${mode === 'exam' ? 'border-rose-50' : 'border-indigo-50'} bg-slate-50/30 p-10 md:p-16 animate-fade-in-up`}>
                    {mode !== 'exam' ? (
                        <>
                            <div className="mb-10 text-center">
                                <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-4">Post-Analysis Feedback Paths</h4>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {[
                                        { id: 'flowchart', label: 'Visual Logic', icon: '🧬', color: 'hover:bg-indigo-500' },
                                        { id: 'analogy', label: 'Visual Analogy', icon: '💡', color: 'hover:bg-purple-500' },
                                        { id: 'concept-map', label: 'Subject Map', icon: '🗺️', color: 'hover:bg-emerald-500' },
                                        { id: 'theoretical', label: 'Theoretical', icon: '📖', color: 'hover:bg-slate-800' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleFetchExplanation(item.id as ExplanationMode)}
                                            disabled={explaining}
                                            className={`flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm transition-all shadow-sm ${item.color} hover:text-white hover:border-transparent active:scale-95 disabled:opacity-50 ${confusionNudge && item.id === 'analogy' ? 'ring-4 ring-amber-400 animate-pulse' : ''}`}
                                        >
                                            <span>{item.icon}</span> {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="min-h-[200px] flex items-center justify-center">
                                {explaining ? (
                                    <div className="text-center animate-pulse">
                                        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Generating pedagogical intervention...</p>
                                    </div>
                                ) : activeExplanation ? (
                                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-3">
                                                <span className="p-2 bg-indigo-100 rounded-lg">✨</span> 
                                                {activeExplanation.mode.replace('-', ' ')} Summary
                                            </h4>
                                            <p className="text-slate-700 text-lg leading-relaxed bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                                                {activeExplanation.content}
                                            </p>
                                        </div>
                                        {activeExplanation.steps && (
                                            <div className="space-y-6">
                                                <h4 className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest flex items-center gap-3">
                                                    <span className="p-2 bg-emerald-100 rounded-lg">🧬</span> Logic Flow
                                                </h4>
                                                <div className="space-y-4">
                                                    {activeExplanation.steps.map((step, idx) => (
                                                        <div key={idx} className="flex gap-6 items-start group">
                                                            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0 mt-1">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="text-slate-600 pt-1 font-medium">{step}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-slate-400 italic text-center text-sm bg-white/40 p-10 rounded-[32px] border border-dashed border-slate-200 w-full">
                                        Select a multimodal path above to help reinforce this concept.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <div className="text-emerald-500 text-5xl mb-4">✓</div>
                            <h4 className="text-2xl font-bold text-slate-800">Exam Question Submitted</h4>
                            <p className="text-slate-500 mt-2">Integrity metrics successfully logged to institutional proctoring dashboard.</p>
                        </div>
                    )}

                    <div className="mt-16 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-200/50 pt-10">
                        <div className={`px-6 py-3 rounded-2xl text-sm font-extrabold uppercase tracking-widest shadow-sm ${lastResult === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {lastResult === 'correct' ? '✓ Mastery Logged' : '✗ Concept Review Flagged'}
                        </div>
                        <button 
                            onClick={() => {
                                if (mode === 'exam') startExam();
                                else if (mode === 'curriculum') startCurriculumQuiz(selectedConcept!);
                                else startDiscoveryQuiz();
                            }} 
                            className={`w-full sm:w-auto px-12 py-5 ${mode === 'exam' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-[32px] font-extrabold shadow-2xl transition-all flex items-center justify-center gap-4 text-lg active:scale-95`}
                        >
                           {mode === 'exam' ? 'Next Exam Task' : 'Next Challenge'} <span className="text-2xl">→</span>
                        </button>
                    </div>
                </div>
            )}
         </div>
       )}
    </div>
  )
}

export default PracticeArena;
