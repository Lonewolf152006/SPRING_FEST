
import React, { useContext, useMemo } from 'react';
import { HierarchyContext } from '../../App';

const Reports = () => {
  const { teams, students, peerReviews, currentUserId } = useContext(HierarchyContext);

  const teamStats = useMemo(() => {
    return teams.map(team => {
      const teamReviews = peerReviews.filter(r => r.teamId === team.id);
      const avgTeamwork = teamReviews.length ? Math.round(teamReviews.reduce((acc, r) => acc + r.teamworkScore, 0) / teamReviews.length) : 0;
      const avgCreativity = teamReviews.length ? Math.round(teamReviews.reduce((acc, r) => acc + r.creativityScore, 0) / teamReviews.length) : 0;
      const avgCommunication = teamReviews.length ? Math.round(teamReviews.reduce((acc, r) => acc + r.communicationScore, 0) / teamReviews.length) : 0;
      
      return { ...team, avgTeamwork, avgCreativity, avgCommunication, reviewCount: teamReviews.length };
    });
  }, [teams, peerReviews]);

  return (
    <div className="space-y-10 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Class Performance Reports</h2>
          <p className="text-slate-500 font-medium">Objective Soft-Skill Oversight & Peer Dynamics Analytics</p>
        </div>
        <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</span>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]"></span>
                <span className="text-xs font-extrabold text-slate-700">Oversight Mode Active</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Soft Skills Pulse Grid */}
        <div className="lg:col-span-7 bg-white/60 backdrop-blur-xl border border-white/50 rounded-[40px] p-10 shadow-sm">
          <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">📊</span>
                  Soft-Skill Pulse
              </h3>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">Project Totals: {teams.length}</span>
          </div>
          
          <div className="space-y-10">
            {teamStats.map(team => (
              <div key={team.id} className="bg-white/40 p-6 rounded-[32px] border border-white/60 hover:border-indigo-100 transition-all group">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="font-black text-slate-800 text-lg block">{team.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{team.projectTitle}</span>
                  </div>
                  <span className="text-[10px] text-indigo-500 font-extrabold uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{team.reviewCount} Responses Collected</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-indigo-500 mb-1">
                        <span>Teamwork</span>
                        <span>{team.avgTeamwork}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all duration-1000" style={{width: `${team.avgTeamwork}%`}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-purple-500 mb-1">
                        <span>Creativity</span>
                        <span>{team.avgCreativity}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-1000" style={{width: `${team.avgCreativity}%`}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-blue-500 mb-1">
                        <span>Communication</span>
                        <span>{team.avgCommunication}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000" style={{width: `${team.avgCommunication}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparent Raw Log for Oversight */}
        <div className="lg:col-span-5 bg-slate-900 rounded-[40px] border border-slate-800 p-10 shadow-2xl flex flex-col h-[700px]">
           <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
              <h3 className="text-white font-bold flex items-center gap-3">
                 <span className="w-2 h-2 rounded-full bg-red-500"></span>
                 Raw Review Transparency Log
              </h3>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-[0.2em]">Faculty Restricted Access</span>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
              {peerReviews.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 text-slate-500 space-y-4">
                  <div className="text-6xl">🌑</div>
                  <p className="text-lg">No peer dynamics data recorded in the current cycle.</p>
                </div>
              ) : (
                [...peerReviews].reverse().map(review => {
                  const from = students.find(s => s.id === review.fromStudentId)?.name;
                  const to = students.find(s => s.id === review.toStudentId)?.name;
                  const teamName = teams.find(t => t.id === review.teamId)?.name;
                  
                  return (
                    <div key={review.id} className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4 hover:bg-white/10 transition-colors group">
                      <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest mb-1">{from} ➔ {to}</div>
                            <div className="text-[11px] text-slate-500 font-bold">{teamName}</div>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">{new Date(review.timestamp).toLocaleTimeString()}</div>
                      </div>
                      
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5 relative">
                        <p className="text-slate-300 text-sm leading-relaxed italic">"{review.comment}"</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <div className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg border border-indigo-500/20 font-bold uppercase tracking-tight">T: {review.teamworkScore}%</div>
                        <div className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg border border-purple-500/20 font-bold uppercase tracking-tight">C: {review.creativityScore}%</div>
                        <div className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20 font-bold uppercase tracking-tight">Com: {review.communicationScore}%</div>
                      </div>
                    </div>
                  );
                })
              )}
           </div>
           
           <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center gap-4 text-slate-500 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    Teachers should monitor these raw logs for signs of bias or friction.
                </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
