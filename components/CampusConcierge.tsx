
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { CampusMapResponse } from '../types';

const CampusConcierge = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, links?: any[]}[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(isOpen && messages.length === 0) {
            setMessages([{role: 'model', text: "Hi! I'm the Campus Concierge. Ask me for directions or campus info."}]);
        }
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [isOpen, messages]);

    const handleSend = async () => {
        if(!input.trim()) return;
        const userText = input;
        setInput("");
        setMessages(prev => [...prev, {role: 'user', text: userText}]);
        setLoading(true);

        // Get Location
        let lat, lng;
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject)
            );
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
        } catch(e) {
            // Ignore geolocation error
        }

        const res: CampusMapResponse = await GeminiService.askCampusGuide(userText, lat, lng);
        setMessages(prev => [...prev, {role: 'model', text: res.text, links: res.links}]);
        setLoading(false);
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window - Light Glass */}
            <div className={`pointer-events-auto bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl w-80 sm:w-96 mb-4 transition-all duration-300 origin-bottom-right overflow-hidden flex flex-col ${isOpen ? 'scale-100 opacity-100 h-[500px]' : 'scale-90 opacity-0 h-0'}`}>
                
                {/* Header */}
                <div className="bg-teal-500 p-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2 text-white">
                        <span className="text-xl">🗺️</span>
                        <h3 className="font-bold">Campus Concierge</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">✕</button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-teal-500 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                                <p>{m.text}</p>
                                {m.links && m.links.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                                        {m.links.map((link, idx) => (
                                            <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="block text-teal-100 hover:text-white text-xs truncate flex items-center gap-1">
                                                <span>📍</span> {link.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none flex gap-1 border border-slate-100 shadow-sm">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef}></div>
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Where is the..."
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-teal-500 outline-none"
                    />
                    <button onClick={handleSend} className="bg-teal-500 hover:bg-teal-400 text-white p-2 rounded-xl transition-colors shadow-sm">
                        ➤
                    </button>
                </div>
            </div>

            {/* FAB */}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`pointer-events-auto w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all transform hover:scale-110 ${isOpen ? 'bg-white text-slate-500 rotate-45 border border-slate-200' : 'bg-teal-500 text-white hover:bg-teal-400'}`}
            >
                {isOpen ? '＋' : '💬'}
            </button>
        </div>
    )
}

export default CampusConcierge;
