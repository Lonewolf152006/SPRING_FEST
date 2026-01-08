
import React, { useState, useRef } from 'react';
import { GeminiService } from '../../services/geminiService';
import { decodeAudioData, blobToBase64 } from '../../utils/audioUtils';
import { InterviewAnalysis, ResumeFeedback } from '../../types';

const CareerCell = () => {
  const [tab, setTab] = useState<'interview' | 'resume'>('interview');
  
  // Interview State
  const [role, setRole] = useState("Software Engineer");
  const [phase, setPhase] = useState<'idle' | 'questioning' | 'recording' | 'analyzing' | 'result'>('idle');
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Resume State
  const [resumeText, setResumeText] = useState("");
  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // --- Interview Logic ---
  const startInterview = async () => {
    setPhase('questioning');
    setAnalysis(null);
    const q = await GeminiService.getInterviewQuestion(role);
    setQuestion(q);
    const audioData = await GeminiService.generateSpeech(q);
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await decodeAudioData(audioData, ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      source.onended = () => startRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    setPhase('recording');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        setPhase('analyzing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const base64 = await blobToBase64(audioBlob);
        const result = await GeminiService.analyzeInterviewResponse(base64, question);
        setAnalysis(result);
        setPhase('result');
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (e) {
      alert("Microphone access needed.");
      setPhase('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
  };

  // --- Resume Logic ---
  const handleResumeReview = async () => {
      if(!resumeText) return;
      setReviewing(true);
      const res = await GeminiService.reviewResume(resumeText);
      setFeedback(res);
      setReviewing(false);
  }

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto animate-fade-in-up">
        {/* Header & Tabs */}
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Career Cell</h2>
            <div className="flex bg-slate-800 rounded-xl p-1 border border-white/10">
                <button 
                    onClick={() => setTab('interview')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'interview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Mock Interview
                </button>
                <button 
                    onClick={() => setTab('resume')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'resume' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Resume Builder
                </button>
            </div>
        </div>

        {tab === 'interview' ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-10 relative overflow-hidden">
                {/* Interview UI Code (Simplified Reuse) */}
                 {phase === 'idle' && (
                  <div className="space-y-6 w-full max-w-md text-center">
                    <h3 className="text-xl text-white">Ready for your interview?</h3>
                    <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-center" />
                    <button onClick={startInterview} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg">Start</button>
                  </div>
                )}
                {phase === 'questioning' && <div className="animate-pulse text-white text-xl">listening to question...</div>}
                {phase === 'recording' && <button onClick={stopRecording} className="w-24 h-24 bg-red-600 rounded-full animate-pulse shadow-red-500/50 shadow-xl"></button>}
                {phase === 'analyzing' && <div className="text-white">Analyzing response...</div>}
                {phase === 'result' && analysis && (
                    <div className="w-full max-w-lg space-y-4">
                        <div className="text-4xl font-bold text-green-400 text-center">{analysis.hiringProbability}% Match</div>
                        <p className="text-slate-300 italic text-center">"{analysis.feedback}"</p>
                        <button onClick={() => setPhase('idle')} className="w-full py-3 bg-slate-700 text-white rounded-xl">Next</button>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex-1 grid grid-cols-2 gap-8">
                <div className="flex flex-col space-y-4">
                    <textarea 
                        value={resumeText}
                        onChange={e => setResumeText(e.target.value)}
                        placeholder="Paste your resume text here..."
                        className="flex-1 bg-slate-800/50 border border-white/10 rounded-2xl p-6 text-white focus:border-blue-500 outline-none resize-none"
                    />
                    <button 
                        onClick={handleResumeReview}
                        disabled={reviewing}
                        className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
                    >
                        {reviewing ? 'Analyzing...' : 'Review Resume'}
                    </button>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                    {!feedback ? (
                        <div className="h-full flex items-center justify-center text-slate-500">AI Feedback will appear here</div>
                    ) : (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold">Resume Score</h3>
                                <span className="text-3xl font-bold text-blue-400">{feedback.score}/100</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">Rewritten Summary</h4>
                                <div className="bg-white/5 p-4 rounded-xl text-slate-200 text-sm">{feedback.rewrittenSummary}</div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">Key Improvements</h4>
                                <ul className="space-y-2">
                                    {feedback.suggestions.map((s, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-slate-300">
                                            <span className="text-blue-400">➤</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  )
}

export default CareerCell;
