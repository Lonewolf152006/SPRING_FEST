
import React, { useState, useRef } from 'react';
import { GeminiService } from '../../services/geminiService';
import { ConnectMessage, ConnectChannel } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';

const ConnectApp = () => {
    const [activeChannel, setActiveChannel] = useState('general');
    const [input, setInput] = useState("");
    const [loadingAi, setLoadingAi] = useState(false);
    const [messages, setMessages] = useState<ConnectMessage[]>([
        { id: '1', sender: 'System', text: 'Welcome to Connect. Ask about locations or upload whiteboard photos.', timestamp: Date.now(), isAi: true }
    ]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const channels: ConnectChannel[] = [
        { id: 'general', name: '# general', type: 'class' },
        { id: 'ai-assistant', name: '# ai-assistant', type: 'project' },
        { id: 'math101', name: '# math-101', type: 'class' },
        { id: 'project-alpha', name: '# project-alpha', type: 'project' },
    ];

    const handleSend = async () => {
        if (!input) return;
        const currentInput = input;
        const userMsg: ConnectMessage = { id: Date.now().toString(), sender: 'Me', text: currentInput, timestamp: Date.now(), isAi: false };
        setMessages(prev => [...prev, userMsg]);
        setInput("");

        // Check for Maps Intent (Priority)
        if (currentInput.toLowerCase().includes('where') || currentInput.toLowerCase().includes('location') || currentInput.toLowerCase().includes('map')) {
            setLoadingAi(true);
            const mapRes = await GeminiService.askCampusGuide(currentInput);
            const aiMsg: ConnectMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'CampusBot',
                text: mapRes.text,
                timestamp: Date.now(),
                isAi: true,
                attachments: mapRes.links.map(l => ({ type: 'map', content: l.uri, title: l.title }))
            };
            setMessages(prev => [...prev, aiMsg]);
            setLoadingAi(false);
            return;
        }

        const isAiChannel = activeChannel === 'ai-assistant';
        const isMention = currentInput.toLowerCase().startsWith('@ai');

        if (isAiChannel || isMention) {
            setLoadingAi(true);
            const prompt = isMention ? currentInput.replace(/@ai/i, '').trim() : currentInput;
            const responseText = await GeminiService.getConnectChatResponse(prompt);
            
            const aiMsg: ConnectMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'AI Assistant',
                text: responseText,
                timestamp: Date.now(),
                isAi: true
            };
            setMessages(prev => [...prev, aiMsg]);
            setLoadingAi(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const userMsg: ConnectMessage = { 
            id: Date.now().toString(), 
            sender: 'Me', 
            text: 'Uploaded an image for analysis...', 
            timestamp: Date.now(), 
            isAi: false 
        };
        setMessages(prev => [...prev, userMsg]);

        const base64 = await blobToBase64(file);
        const text = await GeminiService.analyzeWhiteboard(base64);
        
        const aiMsg: ConnectMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'NoteBot',
            text: `Here are the notes from the image:\n\n${text}`,
            timestamp: Date.now(),
            isAi: true
        };
        setMessages(prev => [...prev, aiMsg]);
    };

    return (
        <div className="h-full flex max-w-7xl mx-auto animate-fade-in-up p-6">
            {/* Sidebar */}
            <div className="w-64 bg-white/70 backdrop-blur-xl rounded-l-2xl border border-slate-200 flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Connect</h2>
                </div>
                <div className="flex-1 p-4 space-y-2">
                    {channels.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => setActiveChannel(c.id)}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeChannel === c.id ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white/40 backdrop-blur-md rounded-r-2xl border-t border-b border-r border-slate-200 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.isAi ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${m.isAi ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none' : 'bg-violet-600 text-white rounded-tr-none'}`}>
                                <div className={`text-xs opacity-50 mb-1 ${m.isAi ? 'text-slate-400' : 'text-white'}`}>{m.sender}</div>
                                <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                                {m.attachments?.map((att, i) => (
                                    <div key={i} className="mt-3 pt-3 border-t border-black/5">
                                        {att.type === 'map' && (
                                            <a href={att.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-500 text-xs hover:underline font-bold">
                                                <span>📍</span> {att.title || 'View on Maps'}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {loadingAi && (
                        <div className="flex justify-start">
                             <div className="bg-white p-4 rounded-2xl rounded-tl-none flex gap-1 border border-slate-100 shadow-sm">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                             </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/60 border-t border-slate-200 flex gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors">
                        📷
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${channels.find(c => c.id === activeChannel)?.name}...`}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-violet-500 outline-none shadow-sm"
                    />
                    <button onClick={handleSend} disabled={loadingAi} className="bg-violet-600 hover:bg-violet-500 text-white px-6 rounded-xl font-bold disabled:opacity-50 shadow-md shadow-violet-200">Send</button>
                </div>
            </div>
        </div>
    )
}

export default ConnectApp;
