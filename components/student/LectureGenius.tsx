
import React, { useState, useRef } from 'react';
import { GeminiService } from '../../services/geminiService';
import { LectureSummary } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';

const LectureGenius = () => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [summary, setSummary] = useState<LectureSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Personal Notes State
    const [notes, setNotes] = useState("");
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        setSummary(null);
        setLoading(true);

        // Limit for demo: Warn if too large, but proceed to try processing first few mb or error handle
        // For production, we'd use File API chunks. Here we rely on Gemini 1.5/2.5 flash handling moderate base64.
        try {
            const base64 = await blobToBase64(file);
            const res = await GeminiService.analyzeLectureVideo(base64, file.type);
            setSummary(res);
        } catch (err) {
            console.error(err);
            alert("Error analyzing video. Ensure it's a short clip for this demo.");
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
                // Detect supported mime type
                let mimeType = 'audio/webm';
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                }
                
                const recorder = new MediaRecorder(stream, { mimeType });
                audioChunksRef.current = [];
                recorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };
                
                recorder.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: mimeType });
                    const base64 = await blobToBase64(blob);
                    // Pass the correct mime type to GeminiService
                    const text = await GeminiService.transcribeAudio(base64, mimeType);
                    setNotes(prev => prev + (prev ? "\n" : "") + text);
                    stream.getTracks().forEach(t => t.stop());
                };
                
                mediaRecorderRef.current = recorder;
                recorder.start();
                setRecording(true);
            } catch (e) {
                console.error(e);
                alert("Microphone access needed or format not supported.");
            }
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Video Player Area */}
            <div className="lg:col-span-2 flex flex-col space-y-6">
                <div className="bg-black rounded-3xl overflow-hidden aspect-video relative border border-slate-700 shadow-2xl flex items-center justify-center bg-slate-900">
                    {videoUrl ? (
                        <video src={videoUrl} controls className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-center p-10">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📹</span>
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">Upload Lecture Recording</h3>
                            <p className="text-slate-400 mb-6 text-sm">AI will generate notes, chapters, and flashcards.</p>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                            >
                                Select Video
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="video/*" />
                        </div>
                    )}
                    
                    {loading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 flex-col">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-blue-400 font-bold animate-pulse">Vision AI is watching & summarizing...</p>
                        </div>
                    )}
                </div>

                {/* Timeline Visualization (Mock/Static if no data, Dynamic if data) */}
                {summary && (
                    <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h3 className="text-slate-400 uppercase font-bold text-xs mb-4">Smart Timeline</h3>
                        <div className="relative pt-6 pb-2">
                             <div className="h-1 bg-slate-700 rounded-full w-full absolute top-8 left-0"></div>
                             <div className="flex justify-between relative z-10">
                                 {summary.chapters.map((chap, i) => (
                                     <div key={i} className="flex flex-col items-center group cursor-pointer" style={{width: `${100 / summary.chapters.length}%`}}>
                                         <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-slate-800 group-hover:scale-125 transition-transform"></div>
                                         <span className="mt-2 text-[10px] text-slate-400 font-mono bg-slate-900 px-1 rounded border border-white/5">{chap.timestamp}</span>
                                         <span className="text-[10px] text-slate-300 mt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity absolute top-10 w-32 bg-black p-2 rounded border border-white/10 z-20 pointer-events-none">
                                            {chap.title}
                                         </span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Smart Notes Sidebar */}
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col h-full overflow-hidden">
                {!summary ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-center text-sm px-8 opacity-50">
                        Content will appear here after analysis.
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-white mb-1">{summary.title || "Lecture Notes"}</h2>
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-6">AI Generated Summary</span>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                            {/* Chapters Section */}
                            <div className="space-y-4">
                                {summary.chapters.map((chap, i) => (
                                    <div key={i} className="group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-blue-400 text-xs font-mono">{chap.timestamp}</span>
                                            <h4 className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">{chap.title}</h4>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-relaxed pl-1 border-l border-slate-700 ml-1">
                                            {chap.summary}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Flashcards Deck */}
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Flashcards Deck ({summary.flashcards.length})</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                {summary.flashcards.map((card, i) => (
                                    <div key={i} className="min-w-[200px] h-32 bg-slate-700/50 rounded-xl p-4 border border-white/5 relative group perspective snap-center cursor-pointer">
                                        <div className="absolute inset-0 backface-hidden flex items-center justify-center p-4 text-center text-sm text-white font-medium">
                                            {card.front}
                                        </div>
                                        <div className="absolute inset-0 backface-hidden bg-blue-600 rounded-xl flex items-center justify-center p-4 text-center text-sm text-white rotate-y-180 opacity-0 group-hover:opacity-100 group-hover:rotate-y-0 transition-all duration-500">
                                            {card.back}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* Personal Notes Section */}
                         <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase">My Notes</h3>
                                <button 
                                    onClick={toggleDictation}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                >
                                    {recording ? '■ Stop' : '🎤 Dictate'}
                                </button>
                            </div>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Type or dictate additional notes here..."
                                className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default LectureGenius;
