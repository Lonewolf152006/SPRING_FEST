
import React, { useState, useRef, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { DatabaseService } from '../../services/databaseService';
import { EventPlan, EventPost } from '../../types';
import { blobToBase64 } from '../../utils/audioUtils';
import { HierarchyContext } from '../../App';

const EventHub = () => {
    const { currentUserId } = useContext(HierarchyContext);
    const [activeTab, setActiveTab] = useState<'feed' | 'planner'>('feed');
    const [idea, setIdea] = useState("");
    const [plan, setPlan] = useState<EventPlan | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    
    // Poster Gen
    const [posterPreview, setPosterPreview] = useState<string | null>(null);
    const [postContent, setPostContent] = useState<EventPost | null>(null);
    const [loadingPost, setLoadingPost] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePlan = async () => {
        if(!idea) return;
        setLoadingPlan(true);
        const res = await GeminiService.planEvent(idea);
        setPlan(res);
        
        // Persist Plan to Supabase
        await DatabaseService.saveEventPlan(currentUserId, res, idea);
        
        setLoadingPlan(false);
    }

    const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        
        const url = URL.createObjectURL(file);
        setPosterPreview(url);
        setLoadingPost(true);
        
        const base64 = await blobToBase64(file);
        const res = await GeminiService.generateEventDescription(base64);
        setPostContent(res);
        setLoadingPost(false);
    }

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Event Hub</h2>
                    <p className="text-slate-500">Campus Life & Clubs</p>
                </div>
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveTab('feed')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'feed' ? 'bg-sky-100 text-sky-600' : 'text-slate-400'}`}>Feed</button>
                    <button onClick={() => setActiveTab('planner')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'planner' ? 'bg-sky-100 text-sky-600' : 'text-slate-400'}`}>Organizer Studio</button>
                </div>
            </div>

            {activeTab === 'feed' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                    {/* Mock Events */}
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden group hover:border-sky-200 transition-colors shadow-sm hover:shadow-md">
                            <div className="h-48 bg-gradient-to-br from-sky-200 to-blue-200 relative">
                                <div className="absolute inset-0 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">🎉</div>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800 text-lg">Tech Hackathon 2024</h3>
                                    <span className="text-xs bg-sky-50 text-sky-600 px-2 py-1 rounded font-bold">Oct 28</span>
                                </div>
                                <p className="text-slate-500 text-sm mb-4">Build the future in 24 hours. Free pizza and prizes!</p>
                                <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-bold">RSVP</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Planner Column */}
                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 p-6 flex flex-col shadow-sm">
                        <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><span className="text-xl">📋</span> Smart Event Planner</h3>
                        <div className="flex gap-2 mb-6">
                            <input 
                                value={idea}
                                onChange={e => setIdea(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handlePlan()}
                                placeholder="I want to host a chess tournament..."
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 text-slate-800 focus:border-sky-500 outline-none shadow-sm h-12"
                            />
                            <button onClick={handlePlan} disabled={loadingPlan} className="bg-sky-500 hover:bg-sky-400 text-white px-6 rounded-xl font-bold shadow-md shadow-sky-200 transition-all active:scale-95">
                                {loadingPlan ? 'Planning...' : 'Plan It'}
                            </button>
                        </div>
                        
                        {plan && (
                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sky-500 font-bold text-[10px] uppercase tracking-widest">Checklist</h4>
                                        <span className="text-[9px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded">Saved to Cloud</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {plan.checklist.map((item, i) => (
                                            <li key={i} className="text-slate-600 text-sm flex gap-2"><span>☐</span> {item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-sky-500 font-bold text-[10px] uppercase tracking-widest mb-2">Budget Estimate</h4>
                                    <p className="text-slate-800 text-xl font-bold">{plan.budgetEstimate}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-sky-500 font-bold text-[10px] uppercase tracking-widest mb-2">Email to Principal</h4>
                                    <p className="text-slate-500 text-xs whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg">{plan.emailDraft}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Social Column */}
                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 p-6 flex flex-col shadow-sm">
                        <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2"><span className="text-xl">📸</span> AI Social Studio</h3>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 rounded-2xl h-48 flex items-center justify-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors mb-6 relative overflow-hidden group shadow-inner"
                        >
                            {posterPreview ? (
                                <img src={posterPreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <div className="text-3xl mb-2">📁</div>
                                    <p className="font-bold">Upload Event Poster</p>
                                    <p className="text-[10px] uppercase tracking-widest mt-1 opacity-60">Click to browse media</p>
                                </div>
                            )}
                            {loadingPost && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center text-sky-500 font-bold animate-pulse">Vision Analysis...</div>}
                            <input type="file" ref={fileInputRef} onChange={handlePosterUpload} className="hidden" accept="image/*" />
                        </div>

                        {postContent && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 flex-1 shadow-sm animate-fade-in-up">
                                <h4 className="text-sky-500 font-bold text-[10px] uppercase tracking-widest mb-3">Generated Instagram Caption</h4>
                                <p className="text-slate-700 text-sm mb-6 leading-relaxed italic font-medium">"{postContent.caption}"</p>
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                                    {postContent.hashtags.map((tag, i) => (
                                        <span key={i} className="text-sky-600 text-xs font-bold bg-sky-50 px-2 py-1 rounded-lg">#{tag.replace('#','')}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default EventHub;
