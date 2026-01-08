
import React, { useState, useRef, useEffect, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { DatabaseService } from '../../services/databaseService';
import { ChatMessage, MoodEntry } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';
import { HierarchyContext } from '../../App';

const WellnessWing = () => {
    const { currentUserId } = useContext(HierarchyContext);
    const [activeTab, setActiveTab] = useState<'chat' | 'journal'>('chat');
    
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Journal State
    const [recording, setRecording] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [entry, setEntry] = useState<MoodEntry | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (activeTab === 'journal') {
            loadJournalHistory();
        }
    }, [activeTab]);

    const loadJournalHistory = async () => {
        const data = await DatabaseService.getWellnessEntries(currentUserId);
        setHistory(data);
    };

    const handleSend = async () => {
        if(!input.trim()) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInput("");
        setTyping(true);

        const aiText = await GeminiService.getWellnessChatResponse(newHistory);
        const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: aiText };
        setMessages([...newHistory, aiMsg]);
        setTyping(false);
    }

    const toggleRecord = async () => {
        if (recording) {
            mediaRecorderRef.current?.stop();
            setRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                audioChunksRef.current = [];
                recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
                recorder.onstop = async () => {
                    setAnalyzing(true);
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    const base64 = await blobToBase64(blob);
                    const res = await GeminiService.analyzeMoodEntry(base64);
                    
                    setEntry(res);
                    // Persist to Supabase
                    await DatabaseService.saveWellnessEntry(currentUserId, res);
                    loadJournalHistory();
                    
                    setAnalyzing(false);
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorderRef.current = recorder;
                recorder.start();
                setRecording(true);
            } catch (e) {
                alert("Microphone access needed.");
            }
        }
    }

    return (
        <div className="h-full flex flex-col p-6 max-w-5xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Wellness Wing</h2>
                    <p className="text-emerald-600/60">Your Safe Space</p>
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>Chat with Lumi</button>
                    <button onClick={() => setActiveTab('journal')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'journal' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>Voice Journal</button>
                </div>
            </div>

            {activeTab === 'chat' ? (
                <div className="flex-1 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-center">
                        <span className="text-xs text-emerald-600 font-medium">Lumi is an AI companion here to listen. Not a replacement for professional help.</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 mt-20">
                                <div className="text-4xl mb-4">🌱</div>
                                <p>Hi, I'm Lumi. How are you feeling today?</p>
                            </div>
                        )}
                        {messages.map(m => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-white text-slate-600 border border-slate-100 rounded-tl-none'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {typing && (
                             <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none flex gap-1 border border-slate-100 shadow-sm">
                                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                                </div>
                           </div>
                        )}
                        <div ref={chatEndRef}></div>
                    </div>
                    <div className="p-4 bg-white/80 border-t border-slate-100 flex gap-2">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Type your feelings..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm"
                        />
                        <button onClick={handleSend} className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 rounded-xl font-bold shadow-md shadow-emerald-200">Send</button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 p-10 shadow-sm flex flex-col items-center justify-center">
                        {!entry ? (
                            <div className="text-center space-y-8">
                                <h3 className="text-2xl text-slate-700 font-medium">How was your day?</h3>
                                <div className={`w-40 h-40 rounded-full flex items-center justify-center cursor-pointer transition-all ${recording ? 'bg-red-500/10 animate-pulse scale-110' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                                    <button onClick={toggleRecord} className={`w-20 h-20 rounded-full shadow-xl transition-all ${recording ? 'bg-red-500' : 'bg-emerald-500 text-white text-3xl'}`}>
                                        {recording ? '⬛' : '🎙️'}
                                    </button>
                                </div>
                                <p className="text-slate-500">{recording ? "Listening..." : "Tap to Record Entry"}</p>
                                {analyzing && <div className="text-emerald-500 animate-pulse font-bold">Analyzing tone and sentiment...</div>}
                            </div>
                        ) : (
                            <div className="w-full space-y-6 animate-fade-in-up overflow-y-auto custom-scrollbar pr-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-slate-800 text-xl font-bold">Latest Entry</h3>
                                    <button onClick={() => setEntry(null)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full text-slate-500 font-bold transition-all">New Entry</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Wellness</div>
                                        <div className={`text-3xl font-bold ${entry.score > 70 ? 'text-emerald-500' : entry.score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>{entry.score}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center shadow-sm">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Sentiment</div>
                                        <div className="text-xl font-bold text-slate-700">{entry.sentiment}</div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-2">Voice Transcription</div>
                                    <p className="text-slate-600 italic text-sm leading-relaxed">"{entry.transcription}"</p>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                                    <div className="flex gap-2 items-center text-emerald-600 font-bold mb-2 text-sm">
                                        <span>💡</span> AI Suggestion
                                    </div>
                                    <p className="text-emerald-800 text-sm leading-relaxed">{entry.advice}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-8 flex flex-col overflow-hidden shadow-xl border border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                Journal History
                            </h3>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{history.length} Entries</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                    <div className="text-5xl mb-4">📓</div>
                                    <p className="text-white text-sm">Your reflections will appear here.</p>
                                </div>
                            ) : (
                                history.map((h, i) => (
                                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">{new Date(h.created_at).toLocaleDateString()}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${h.sentiment === 'Happy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{h.sentiment}</span>
                                        </div>
                                        <p className="text-slate-300 text-xs line-clamp-2 italic mb-3">"{h.transcription}"</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-white/10 h-1 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full" style={{width: `${h.score}%`}}></div>
                                            </div>
                                            <span className="text-[9px] text-slate-500 font-bold">{h.score}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WellnessWing;
