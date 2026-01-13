
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../../services/geminiService';
import { ConnectMessage, ConnectChannel } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';

const ConnectApp = () => {
    const channels: ConnectChannel[] = [
        { id: 'general', name: '# general', type: 'class' },
        { id: 'ai-assistant', name: '# ai-assistant', type: 'project' },
        { id: 'math101', name: '# math-101', type: 'class' },
        { id: 'project-alpha', name: '# project-alpha', type: 'project' },
    ];

    const [activeChannel, setActiveChannel] = useState('general');
    const [input, setInput] = useState("");
    const [loadingAi, setLoadingAi] = useState(false);
    
    // Zone-specific message storage
    const [channelMessages, setChannelMessages] = useState<Record<string, ConnectMessage[]>>({
        'general': [
            { id: 'g1', sender: 'System', text: 'Welcome to the #general zone. Connect with your peers here.', timestamp: Date.now(), isAi: true }
        ],
        'ai-assistant': [
            { id: 'a1', sender: 'AI Assistant', text: 'Hello! How can I help you today? I can answer questions or analyze images you upload.', timestamp: Date.now(), isAi: true }
        ],
        'math101': [
            { id: 'm1', sender: 'System', text: 'Welcome to #math-101. Discuss assignments and concepts.', timestamp: Date.now(), isAi: true }
        ],
        'project-alpha': [
            { id: 'p1', sender: 'System', text: 'Project Alpha workspace initialized. Coordinate your research here.', timestamp: Date.now(), isAi: true }
        ]
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages or channel switch
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages, activeChannel]);

    const addMessageToActiveChannel = (msg: ConnectMessage) => {
        setChannelMessages(prev => ({
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), msg]
        }));
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const currentInput = input;
        const userMsg: ConnectMessage = { id: Date.now().toString(), sender: 'Me', text: currentInput, timestamp: Date.now(), isAi: false };
        addMessageToActiveChannel(userMsg);
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
            addMessageToActiveChannel(aiMsg);
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
            addMessageToActiveChannel(aiMsg);
            setLoadingAi(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const userMsg: ConnectMessage = { 
            id: Date.now().toString(), 
            sender: 'Me', 
            text: `Uploaded: ${file.name}`, 
            timestamp: Date.now(), 
            isAi: false 
        };
        addMessageToActiveChannel(userMsg);

        setLoadingAi(true);
        const base64 = await blobToBase64(file);
        const text = await GeminiService.analyzeWhiteboard(base64);
        
        const aiMsg: ConnectMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'NoteBot',
            text: `I've analyzed that whiteboard. Here is the summary:\n\n${text}`,
            timestamp: Date.now(),
            isAi: true
        };
        addMessageToActiveChannel(aiMsg);
        setLoadingAi(false);
    };

    const currentMessages = channelMessages[activeChannel] || [];

    return (
        <div className="h-full flex max-w-7xl mx-auto animate-fade-in-up p-6 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white/70 backdrop-blur-xl rounded-l-2xl border border-slate-200 flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Connect</h2>
                </div>
                <div className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Communication Zones</div>
                    {channels.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => setActiveChannel(c.id)}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeChannel === c.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white/40 backdrop-blur-md rounded-r-2xl border-t border-b border-r border-slate-200 flex flex-col overflow-hidden">
                {/* Zone Header */}
                <div className="px-6 py-4 bg-white/40 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">
                            {channels.find(c => c.id === activeChannel)?.name || 'General'}
                        </h3>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Secure Link Active</div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {currentMessages.map(m => (
                        <div key={m.id} className={`flex ${m.isAi ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm relative group ${m.isAi ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100'}`}>
                                <div className={`text-[10px] font-black uppercase mb-1.5 tracking-wider ${m.isAi ? 'text-indigo-500' : 'text-indigo-100'}`}>
                                    {m.sender}
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                                {m.attachments?.map((att, i) => (
                                    <div key={i} className="mt-3 pt-3 border-t border-black/5">
                                        {att.type === 'map' && (
                                            <a href={att.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-500 text-xs hover:underline font-bold bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100">
                                                <span>📍</span> {att.title || 'Institutional Map Link'}
                                            </a>
                                        )}
                                    </div>
                                ))}
                                <div className={`text-[8px] mt-2 font-bold uppercase opacity-0 group-hover:opacity-60 transition-opacity ${m.isAi ? 'text-slate-400' : 'text-white'}`}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loadingAi && (
                        <div className="flex justify-start">
                             <div className="bg-white p-4 rounded-2xl rounded-tl-none flex gap-1 border border-slate-100 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef}></div>
                </div>

                <div className="p-4 bg-white/60 border-t border-slate-200 flex gap-3">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        title="Upload Whiteboard Photo"
                        className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                        📷
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={`Message ${channels.find(c => c.id === activeChannel)?.name}...`}
                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-3 text-sm text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none shadow-sm transition-all font-medium"
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={loadingAi || !input.trim()} 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:grayscale shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConnectApp;
