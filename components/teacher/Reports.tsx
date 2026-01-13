
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { HierarchyContext } from '../../App';
import { DatabaseService } from '../../services/databaseService';

const Reports = () => {
  const { teams, students, peerReviews, currentUserId } = useContext(HierarchyContext);
  const [activeTab, setActiveTab] = useState<'teams' | 'ledger'>('ledger');
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
      if (activeTab === 'ledger') {
          fetchLedger();
      }
  }, [activeTab, currentUserId]);

  const fetchLedger = async () => {
      setLoadingLedger(true);
      // Requirement: Pass currentUserId as teacherId to only fetch assigned students
      const data = await DatabaseService.getDetailedStudentAnalytics(currentUserId);
      setLedgerData(data);
      setLoadingLedger(false);
  }

  const teamStats = useMemo(() => {
    return teams.map(team => {
      const teamReviews = peerReviews.filter(r => r.teamId === team.id);
      const avgTeamwork = teamReviews.length ? Math.round(teamReviews.reduce((acc, r) => acc + r.teamworkScore, 0) / teamReviews.length) : 0;
      const avgCreativity = teamReviews.length ? Math.round(teamReviews.reduce((acc, r) => acc + r.creativityScore, 0) / teamReviews.length) : 0;
      const avgCommunication = teamReviews.length ? Math.round(teamReviews.reduce((acc, r) => acc + r.communicationScore, 0) / teamReviews.length) : 0;
      
      return { ...team, avgTeamwork, avgCreativity, avgCommunication, reviewCount: teamReviews.length };
    });
  }, [teams, peerReviews]);

  const filteredLedger = useMemo(() => {
      return ledgerData.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.email.toLowerCase().includes(search.toLowerCase())
      );
  }, [ledgerData, search]);

  return (
    <div className="space-y-10 animate-fade-in-up pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Analytics Oversight</h2>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.2em] font-mono">Faculty Access Partition</p>
        </div>
        
        <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 ring-4 ring-slate-100/50">
            <button 
                onClick={() => setActiveTab('ledger')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                📇 Student Ledger
            </button>
            <button 
                onClick={() => setActiveTab('teams')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                👥 Team Dynamics
            </button>
        </div>
      </div>

      {activeTab === 'ledger' ? (
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                      <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search assigned students..."
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:border-teal-500 outline-none shadow-inner font-medium"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">🔍</span>
                  </div>
                  <button 
                    onClick={fetchLedger}
                    className="px-6 py-4 bg-teal-50 text-teal-600 border border-teal-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-teal-100 transition-all flex items-center gap-2"
                  >
                      {loadingLedger ? '🔄 SYNCING...' : '🔄 REFRESH FEED'}
                  </button>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-white border-b border-slate-100">
                          <tr>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Profile</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Confusion Index</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cognitive State</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Mastery</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Sync</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {loadingLedger ? (
                              <tr>
                                  <td colSpan={5} className="px-8 py-20 text-center">
                                      <div className="flex flex-col items-center gap-4">
                                          <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
                                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Pulling Neural Data Streams...</span>
                                      </div>
                                  </td>
                              </tr>
                          ) : filteredLedger.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="px-8 py-20 text-center opacity-30">
                                      <div className="text-6xl mb-4">📭</div>
                                      <p className="font-bold">No assigned students found in your roster.</p>
                                      <p className="text-sm">Contact an Administrator to initialize your student links.</p>
                                  </td>
                              </tr>
                          ) : (
                              filteredLedger.map((row) => (
                                  <tr key={row.id} className="hover:bg-teal-50/30 transition-all group">
                                      <td className="px-8 py-6">
                                          <div className="flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center font-black text-teal-600 shadow-sm border border-teal-200 transition-transform group-hover:scale-110">
                                                  {row.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-slate-800 text-base">{row.name}</div>
                                                  <div className="text-[11px] text-slate-400 font-medium lowercase tracking-tighter">{row.email}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-8 py-6 text-center">
                                          <div className={`inline-block px-4 py-2 rounded-2xl font-black text-xl shadow-sm border-2 ${
                                              row.confusionIndex > 60 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                              row.confusionIndex > 30 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                              'bg-emerald-50 text-emerald-600 border-emerald-200'
                                          }`}>
                                              {row.confusionIndex}%
                                          </div>
                                      </td>
                                      <td className="px-8 py-6">
                                          <div className="flex items-center gap-2">
                                              <span className={`w-2 h-2 rounded-full animate-pulse ${
                                                  row.confusionIndex > 60 ? 'bg-rose-500 shadow-[0_0_8px_red]' :
                                                  row.confusionIndex > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                              }`}></span>
                                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{row.mood}</span>
                                          </div>
                                      </td>
                                      <td className="px-8 py-6">
                                          <div className="flex flex-wrap gap-2 max-w-[300px]">
                                              {row.mastery.map((m: any, i: number) => (
                                                  <div key={i} className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex flex-col items-center min-w-[70px]">
                                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{m.subjectId}</span>
                                                      <span className="text-xs font-black text-indigo-600">{m.score}%</span>
                                                  </div>
                                              ))}
                                              {row.mastery.length === 0 && <span className="text-[10px] text-slate-300 font-bold italic">No data yet</span>}
                                          </div>
                                      </td>
                                      <td className="px-8 py-6 text-right">
                                          <div className="text-[10px] font-mono text-slate-400 uppercase leading-none">
                                              {new Date(row.lastActive).toLocaleDateString()}<br/>
                                              <span className="text-[8px] opacity-60">{new Date(row.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <span className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">🛡️</span>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Roster Isolation Active: You are only viewing students assigned to your faculty partition.</p>
                  </div>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            <div className="lg:col-span-7 bg-white/60 backdrop-blur-xl border border-white/50 rounded-[40px] p-10 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                      <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">📊</span>
                      Soft-Skill Pulse
                  </h3>
              </div>
              <div className="space-y-10">
                {teamStats.map(team => (
                  <div key={team.id} className="bg-white/40 p-6 rounded-[32px] border border-white/60 hover:border-indigo-100 transition-all group">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <span className="font-black text-slate-800 text-lg block">{team.name}</span>
                        <span className="text-xs text-slate-400 font-medium">{team.projectTitle}</span>
                      </div>
                      <span className="text-[10px] text-indigo-500 font-extrabold uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{team.reviewCount} Responses</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-indigo-500 mb-1">
                            <span>Teamwork</span>
                            <span>{team.avgTeamwork}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{width: `${team.avgTeamwork}%`}}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-purple-500 mb-1">
                            <span>Creativity</span>
                            <span>{team.avgCreativity}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-purple-500 transition-all duration-1000" style={{width: `${team.avgCreativity}%`}}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight text-blue-500 mb-1">
                            <span>Communication</span>
                            <span>{team.avgCommunication}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${team.avgCommunication}%`}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900 rounded-[40px] border border-slate-800 p-10 shadow-2xl flex flex-col h-[700px]">
               <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                  <h3 className="text-white font-bold flex items-center gap-3">
                     <span className="w-2 h-2 rounded-full bg-red-500"></span>
                     Transparency Log
                  </h3>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                  {peerReviews.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 text-slate-500 space-y-4">
                      <div className="text-6xl">🌑</div>
                      <p className="text-lg">No peer dynamics data recorded.</p>
                    </div>
                  ) : (
                    [...peerReviews].reverse().map(review => {
                      const from = students.find(s => s.id === review.fromStudentId)?.name;
                      const to = students.find(s => s.id === review.toStudentId)?.name;
                      return (
                        <div key={review.id} className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4 hover:bg-white/10 transition-colors">
                          <div className="flex justify-between items-start">
                            <div><div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest mb-1">{from} ➔ {to}</div></div>
                            <div className="text-[10px] text-slate-600 font-mono">{new Date(review.timestamp).toLocaleTimeString()}</div>
                          </div>
                          <p className="text-slate-300 text-sm italic">"{review.comment}"</p>
                        </div>
                      );
                    })
                  )}
               </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Reports;
