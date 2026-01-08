
import React, { useState } from 'react';
import { GeminiService } from '../../services/geminiService';
import { ProjectTemplate } from '../../types';

const ProjectLibrary = () => {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);

    const handleSearch = async () => {
        if (!search) return;
        setLoading(true);
        // Simulate library search or generate new ones if not found
        const results = await GeminiService.generateProjectTemplates(search);
        setTemplates(results);
        setLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Project Library</h2>
                    <p className="text-slate-500">Searchable repository of curriculum-aligned PBL templates.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex gap-3">
                <input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search for 'Physics Rube Goldberg' or 'History Civil War Debate'..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-8 rounded-xl font-bold shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                    {loading ? 'Searching...' : 'Search Library'}
                </button>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {templates.length === 0 && !loading && (
                    <div className="col-span-2 text-center py-20 opacity-50">
                        <div className="text-6xl mb-4">📂</div>
                        <p>Enter a topic to find instantly deployable project templates.</p>
                    </div>
                )}

                {templates.map((tpl, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                        <div className="h-2 bg-gradient-to-r from-teal-400 to-blue-500"></div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{tpl.title}</h3>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tpl.subject} • {tpl.duration}</span>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tpl.difficulty === 'Hard' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {tpl.difficulty}
                                </span>
                            </div>
                            
                            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                {tpl.description}
                            </p>

                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Milestones</h4>
                                <ul className="space-y-1">
                                    {tpl.milestones.map((m, idx) => (
                                        <li key={idx} className="flex gap-2 text-sm text-slate-700">
                                            <span className="text-teal-500">✓</span> {m}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                             <div className="mb-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Soft Skills Targeted</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tpl.skillsTargeted.map((s, idx) => (
                                        <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{s}</span>
                                    ))}
                                </div>
                            </div>

                            <button className="w-full py-3 bg-slate-800 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                                <span>🚀</span> Deploy to Class
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectLibrary;
