
import React, { useState, useRef } from 'react';
import { GeminiService } from '../../services/geminiService';
import { LectureSummary } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';

const LectureGenius = () => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [summary, setSummary] = useState<LectureSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'quiz' | 'flashcards'>('overview');
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({}); // Store selected answer strings
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Personal Notes State
    const [notes, setNotes] = useState("");
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        processVideo(file);
    };

    const processVideo = async (file: File) => {
        setSummary(null);
        setLoading(true);
        try {
            const base64 = await blobToBase64(file);
            const res = await GeminiService.analyzeLectureVideo(base64, file.type);
            // Service now guarantees a result (real or mock)
            setSummary(res);
        } catch (err) {
            console.error(err);
            // Even if service fails completely, UI won't crash, but this block is redundant with service fallback
        } finally {
            setLoading(false);
        }
    };

    const toggleDictation = async () => {
        if (recording) {
            mediaRecorderRef.current?.stop();
            setRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                let mimeType = 'audio/webm';
                if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                
                const recorder = new MediaRecorder(stream, { mimeType });
                audioChunksRef.current = [];
                recorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };
                
                recorder.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: mimeType });
                    const base64 = await blobToBase64(blob);
                    const text = await GeminiService.transcribeAudio(base64, mimeType);
                    setNotes(prev => prev + (prev ? "\n" : "") + text);
                    stream.getTracks().forEach(t => t.stop());
                };
                
                mediaRecorderRef.current = recorder;
                recorder.start();
                setRecording(true);
            } catch (e) {
                alert("Microphone access needed.");
            }
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] grid grid-cols-1 lg:grid-cols-3 gap-8 pb-4">
            {/* Left: Video Player Area */}
            <div className="lg:col-span-2 flex flex-col space-y-6">
                {/* 1. Cinema Layout Video Player */}
                <div className="bg-black rounded-[32px] overflow-hidden aspect-video relative border border-slate-800 shadow-2xl shadow-indigo-500/20 flex items-center justify-center z-10 group">
                    {videoUrl ? (
                        <video src={videoUrl} controls className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-center p-10">
                            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-4xl">📹</span>
                            </div>
                            <h3 className="text-white text-2xl font-black mb-3 tracking-tight">Upload Lecture Recording</h3>
                            <p className="text-slate-400 mb-8 text-base font-medium max-w-md mx-auto leading-relaxed">
                                Our Vision AI will watch the lecture for you, generating structured notes, chapters, and study flashcards instantly.
                            </p>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-900/50 hover:shadow-indigo-500/40 active:scale-95"
                            >
                                Select Video File
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="video/*" />
                        </div>
                    )}
                    
                    {loading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 flex-col backdrop-blur-sm">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
                            </div>
                            <p className="text-white font-black text-lg tracking-wider animate-pulse">Analyzing Visual Data...</p>
                            <p className="text-indigo-400 text-xs font-bold uppercase mt-2 tracking-widest">Generating Flashcards</p>
                        </div>
                    )}
                </div>

                {/* 4. Timeline Visualization */}
                {summary && (
                    <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-[24px] p-8 shadow-sm">
                        <h3 className="text-slate-400 uppercase font-extrabold text-[10px] tracking-[0.2em] mb-6">Semantic Timeline</h3>
                        <div className="relative pt-4 pb-2">
                             {/* Track */}
                             <div className="h-1.5 bg-slate-100 rounded-full w-full absolute top-[22px] left-0 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-full opacity-20"></div>
                             </div>
                             
                             <div className="flex justify-between relative z-10">
                                 {(summary.keyMoments || []).map((moment, i) => (
                                     <div key={i} className="flex flex-col items-center group cursor-pointer w-full relative">
                                         {/* Node */}
                                         <div className="w-5 h-5 rounded-full bg-white border-[3px] border-indigo-500 shadow-md group-hover:scale-125 transition-transform z-10 relative">
                                             <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 animate-ping"></div>
                                         </div>
                                         
                                         {/* Time & Title */}
                                         <div className="mt-3 flex flex-col items-center">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mb-1">{moment.time}</span>
                                            <span className="text-[10px] font-bold text-slate-600 text-center opacity-0 group-hover:opacity-100 transition-opacity absolute top-10 w-32 bg-white p-2 rounded-lg border border-slate-200 shadow-xl z-20 pointer-events-none -translate-y-2 group-hover:translate-y-0">
                                                {moment.label}
                                            </span>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Right: Smart Notes Sidebar (Solid Glass Card) */}
            <div className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-[32px] p-8 flex flex-col h-full overflow-hidden shadow-xl ring-1 ring-slate-900/5 relative">
                {!summary && !loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 opacity-40 space-y-4">
                        <div className="text-6xl grayscale opacity-50">📝</div>
                        <p className="text-slate-500 font-bold text-sm">Upload a video to generate<br/>an AI summary, notes, and quiz.</p>
                    </div>
                ) : summary ? (
                    <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-indigo-900 mb-2 leading-tight line-clamp-2">Lecture Summary</h2>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">{summary.summary}</p>
                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                                {['overview', 'notes', 'quiz', 'flashcards'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                            
                            {/* Overview Tab (Timeline Key Moments) */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    {(summary.keyMoments || []).map((moment, i) => (
                                        <div key={i} className="group relative pl-4 border-l-2 border-slate-100 hover:border-indigo-500 transition-colors">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{moment.time}</span>
                                            </div>
                                            <h4 className="text-slate-800 font-bold text-sm leading-snug group-hover:text-indigo-700 transition-colors">{moment.label}</h4>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Smart Notes Tab */}
                            {activeTab === 'notes' && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Key Concepts & Formulas</h3>
                                    <ul className="space-y-3">
                                        {(summary.smartNotes || []).map((note, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-indigo-500 font-bold">•</span>
                                                {note}
                                            </li>
                                        ))}
                                        {(!summary.smartNotes || summary.smartNotes.length === 0) && <p className="text-slate-400 text-xs italic">No specific notes extracted.</p>}
                                    </ul>
                                </div>
                            )}

                            {/* Quiz Tab */}
                            {activeTab === 'quiz' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    {(summary.quiz || []).map((q, i) => {
                                        const answered = quizAnswers[i] !== undefined;
                                        const isCorrect = quizAnswers[i] === q.answer;
                                        
                                        return (
                                            <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                                <h4 className="text-sm font-bold text-slate-800 mb-4 leading-snug">{i+1}. {q.question}</h4>
                                                <div className="space-y-2">
                                                    {q.options.map((opt, idx) => {
                                                        let btnClass = "bg-white border-slate-200 text-slate-600 hover:border-indigo-300";
                                                        if (answered) {
                                                            if (opt === q.answer) btnClass = "bg-emerald-100 border-emerald-300 text-emerald-800 font-bold";
                                                            else if (opt === quizAnswers[i]) btnClass = "bg-rose-100 border-rose-300 text-rose-800 opacity-60";
                                                            else btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                                                        }
                                                        
                                                        return (
                                                            <button 
                                                                key={idx}
                                                                onClick={() => !answered && setQuizAnswers(prev => ({...prev, [i]: opt}))}
                                                                disabled={answered}
                                                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${btnClass}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                {answered && (
                                                    <div className={`mt-3 text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {isCorrect ? "Correct Answer" : "Incorrect"}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {(!summary.quiz || summary.quiz.length === 0) && <p className="text-slate-400 text-xs italic">No quiz generated.</p>}
                                </div>
                            )}

                            {/* Flashcards Tab */}
                            {activeTab === 'flashcards' && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x pr-2">
                                        {(summary.flashcards || []).map((card, i) => (
                                            <div key={i} className="min-w-[220px] h-36 bg-white rounded-2xl p-5 border border-slate-100 border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-all relative group perspective snap-center cursor-pointer flex items-center justify-center">
                                                <div className="absolute inset-0 backface-hidden flex items-center justify-center p-4 text-center">
                                                    <p className="text-sm font-bold text-slate-800 leading-snug">{card.front}</p>
                                                </div>
                                                <div className="absolute inset-0 backface-hidden bg-purple-600 rounded-xl rounded-l-none flex items-center justify-center p-4 text-center rotate-y-180 opacity-0 group-hover:opacity-100 group-hover:rotate-y-0 transition-all duration-500">
                                                    <p className="text-sm font-bold text-white leading-snug">{card.back}</p>
                                                </div>
                                                <div className="absolute bottom-2 right-2 text-[10px] font-bold text-purple-200 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity delay-100">Flip</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                         {/* 4. Notes Section (Always visible at bottom) */}
                         <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">My Notes</h3>
                                <button 
                                    onClick={toggleDictation}
                                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-sm ${recording ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <span className={recording ? 'animate-spin' : ''}>{recording ? '■' : '🎙️'}</span>
                                    {recording ? 'Recording...' : 'Dictate'}
                                </button>
                            </div>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Type or dictate additional notes here..."
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    )
}

export default LectureGenius;
