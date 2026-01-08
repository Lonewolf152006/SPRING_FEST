
import React, { useState } from 'react';
import { PeerReviewAnalysis } from '../../types';
import { GeminiService } from '../../services/geminiService';

const GradingHub = () => {
    const [review, setReview] = useState("");
    const [score, setScore] = useState<PeerReviewAnalysis | null>(null);
    const [thinking, setThinking] = useState(false);

    const handleEval = async () => {
        if(!review) return;
        setThinking(true);
        const res = await GeminiService.analyzePeerReview(review);
        setScore(res);
        setThinking(false);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-white">Grading & Feedback Hub</h2>
            
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-slate-400 text-sm font-bold uppercase">Student Peer Review</label>
                    <textarea 
                        value={review}
                        onChange={e => setReview(e.target.value)}
                        className="w-full h-64 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 focus:outline-none"
                        placeholder="Paste student review text here..."
                    />
                    <button 
                        onClick={handleEval}
                        disabled={thinking}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                    >
                        {thinking ? 'Thinking...' : '✨ AI Evaluator (Bias Check)'}
                    </button>
                </div>
                
                <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 p-8 flex flex-col justify-center">
                    {!score ? (
                        <div className="text-center text-slate-500">Result will appear here</div>
                    ) : (
                        <div className="space-y-6 animate-fade-in-up">
                            <div>
                                <div className="flex justify-between mb-1 text-white font-medium">Collaboration</div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{width: `${score.teamworkScore}%`}}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1 text-white font-medium">Creativity</div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{width: `${score.creativityScore}%`}}></div>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-sm text-slate-300 italic">"{score.feedback}"</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default GradingHub;
