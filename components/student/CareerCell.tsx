
import React, { useState, useRef, useEffect, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { decodeAudioData, blobToBase64 } from '../../utils/audioUtils';
import { InterviewAnalysis, ResumeFeedback, CareerMilestone, CourseRecommendation, JobMatch } from '../../types';
import { HierarchyContext } from '../../App';

const CareerCell = () => {
  const { userProfile, subjects } = useContext(HierarchyContext);
  const [tab, setTab] = useState<'interview' | 'resume' | 'guidance' | 'courses' | 'jobs'>('interview');
  
  // Interview State
  const [role, setRole] = useState("Software Engineer");
  const [phase, setPhase] = useState<'idle' | 'questioning' | 'recording' | 'analyzing' | 'result'>('idle');
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Resume State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Features State
  const [roadmap, setRoadmap] = useState<CareerMilestone[]>([]);
  const [courses, setCourses] = useState<CourseRecommendation[]>([]);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [loadingNew, setLoadingNew] = useState(false);

  useEffect(() => {
      const loadData = async () => {
          // Prepare mastery scores from subject context
          const scores: Record<string, number> = {};
          subjects.forEach(s => {
              s.concepts.forEach(c => {
                  scores[c.name] = c.masteryScore;
              });
          });

          if (tab === 'guidance' && roadmap.length === 0) {
              setLoadingNew(true);
              const res = await GeminiService.generateCareerRoadmap(scores);
              setRoadmap(res);
              setLoadingNew(false);
          } else if (tab === 'courses' && courses.length === 0) {
              setLoadingNew(true);
              const res = await GeminiService.suggestCourses(scores);
              setCourses(res);
              setLoadingNew(false);
          } else if (tab === 'jobs' && jobs.length === 0) {
              setLoadingNew(true);
              const res = await GeminiService.findJobMatches(scores);
              setJobs(res);
              setLoadingNew(false);
          }
      };
      loadData();
  }, [tab, subjects, roadmap.length, courses.length, jobs.length]);

  // --- Interview Logic ---
  const startInterview = async () => {
    setPhase('questioning');
    setAnalysis(null);
    const q = await GeminiService.getInterviewQuestion(role);
    setQuestion(q);
    const audioData = await GeminiService.generateSpeech(q);
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await decodeAudioData(audioData, ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      source.onended = () => startRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    setPhase('recording');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        setPhase('analyzing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const base64 = await blobToBase64(audioBlob);
        const result = await GeminiService.analyzeInterviewResponse(base64, question);
        setAnalysis(result);
        setPhase('result');
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (e) {
      alert("Microphone access needed.");
      setPhase('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
  };

  // --- Resume Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") {
          setResumeFile(file);
      } else {
          alert("Please upload a PDF file.");
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
          setResumeFile(file);
      } else {
          alert("Please drop a valid PDF file.");
      }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleResumeReview = async () => {
      if(!resumeFile) return;
      setReviewing(true);
      try {
          const base64 = await blobToBase64(resumeFile);
          // Pass base64 data and indicate it is a PDF
          const res = await GeminiService.reviewResume(base64, true);
          setFeedback(res);
      } catch (error) {
          console.error("Resume analysis failed", error);
      } finally {
          setReviewing(false);
      }
  }

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto animate-fade-in-up overflow-hidden">
        {/* Header & Tabs */}
        <div className="mb-8 flex flex-col gap-6">
            <h2 className="text-3xl font-bold text-slate-800">Career Cell</h2>
            <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex overflow-x-auto no-scrollbar gap-1 ring-4 ring-slate-100/50 min-h-[56px]">
                {[
                    { id: 'interview', label: 'Mock Interview' },
                    { id: 'resume', label: 'Resume Builder' },
                    { id: 'guidance', label: 'Career Guidance' },
                    { id: 'courses', label: 'Course Suggestions' },
                    { id: 'jobs', label: 'Job Recommendations' }
                ].map(t => (
                    <button 
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {tab === 'interview' && (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-800 rounded-[40px] p-10 relative overflow-hidden shadow-2xl border border-white/10">
                    {/* Interview UI Code */}
                     {phase === 'idle' && (
                      <div className="space-y-8 w-full max-w-md text-center z-10">
                        <div className="text-6xl mb-4">🎙️</div>
                        <h3 className="text-2xl text-white font-bold">Ready for your interview?</h3>
                        <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white text-center font-bold outline-none focus:border-blue-500" placeholder="Target Role..." />
                        <button onClick={startInterview} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all">Start Session</button>
                      </div>
                    )}
                    {phase === 'questioning' && <div className="animate-pulse text-white text-xl font-bold">AI Interviewer is speaking...</div>}
                    {phase === 'recording' && <button onClick={stopRecording} className="w-24 h-24 bg-red-600 rounded-full animate-pulse shadow-red-500/50 shadow-xl border-4 border-white/20"></button>}
                    {phase === 'analyzing' && <div className="text-white font-bold animate-pulse">Analyzing tone & content...</div>}
                    {phase === 'result' && analysis && (
                        <div className="w-full max-w-lg space-y-6 z-10 text-center animate-fade-in-up">
                            <div className="text-6xl font-black text-emerald-400">{analysis.hiringProbability}%</div>
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Hiring Probability</div>
                            <p className="text-slate-200 text-lg italic leading-relaxed">"{analysis.feedback}"</p>
                            <button onClick={() => setPhase('idle')} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all">Next Question</button>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)] pointer-events-none"></div>
                </div>
            )}

            {tab === 'resume' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex flex-col space-y-6">
                        {!resumeFile ? (
                            <div 
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 min-h-[300px] border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                            >
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                    <span className="text-4xl text-slate-400 group-hover:text-indigo-500">📄</span>
                                </div>
                                <p className="text-slate-500 font-bold text-sm">Drag & Drop PDF or Click to Upload</p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                />
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-md flex items-center justify-between animate-fade-in-up">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl text-red-500">
                                        📎
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg truncate max-w-[200px]">{resumeFile.name}</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                            {(resumeFile.size / 1024).toFixed(1)} KB • PDF
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setResumeFile(null)}
                                    className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center font-bold transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={handleResumeReview}
                            disabled={!resumeFile || reviewing}
                            className="py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            {reviewing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Analyzing Document...
                                </span>
                            ) : 'Review Resume'}
                        </button>
                    </div>

                    <div className="bg-slate-900 rounded-[32px] p-8 border border-white/10 shadow-2xl overflow-y-auto custom-scrollbar">
                        {!feedback ? (
                            <div className="h-full flex items-center justify-center text-slate-500 font-bold opacity-50 flex-col gap-4">
                                <div className="text-6xl">🤖</div>
                                <p>AI Feedback will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                    <h3 className="text-white font-bold text-lg">ATS Score</h3>
                                    <span className={`text-4xl font-black ${feedback.score > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{feedback.score}/100</span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Professional Summary Rewrite</h4>
                                    <div className="bg-white/5 p-6 rounded-2xl text-slate-300 text-sm leading-relaxed border border-white/5 italic">"{feedback.rewrittenSummary}"</div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Critical Improvements</h4>
                                    <ul className="space-y-3">
                                        {(feedback.suggestions || []).map((s, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-slate-300">
                                                <span className="text-rose-400 font-bold">➤</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'guidance' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    {loadingNew ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="font-bold text-slate-400 uppercase tracking-widest">Generating Career Path...</p>
                        </div>
                    ) : (
                        <div className="relative max-w-3xl mx-auto space-y-12 py-10">
                            <div className="absolute top-0 bottom-0 left-8 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent rounded-full"></div>
                            {(roadmap || []).map((step, i) => (
                                <div key={i} className="relative pl-24 group">
                                    <div className="absolute left-0 w-16 h-16 bg-white border-4 border-indigo-100 rounded-full flex items-center justify-center text-xl shadow-lg z-10 font-black text-indigo-600 group-hover:scale-110 transition-transform">
                                        {i + 1}
                                    </div>
                                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group-hover:-translate-y-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-bold text-slate-800">{step.title}</h3>
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">{step.duration}</span>
                                        </div>
                                        <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'courses' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    {loadingNew ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                            <p className="font-bold text-slate-400 uppercase tracking-widest">Identifying Gap Skills...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(courses || []).map((course, i) => {
                                const validUrl = course.courseUrl && course.courseUrl.startsWith('http') ? course.courseUrl : '#';
                                return (
                                    <div key={i} className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-rose-50 text-rose-600 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
                                            Gap: {course.gapSkill}
                                        </div>
                                        <div className="mt-4 mb-6">
                                            <h3 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{course.title}</h3>
                                            <div className="text-xs font-medium text-slate-400">{course.provider}</div>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-4 rounded-xl italic">"{course.matchReason}"</p>
                                        <div className="flex justify-between items-center mt-auto">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${course.difficulty === 'Advanced' ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'}`}>
                                                {course.difficulty}
                                            </span>
                                            <a 
                                                href={validUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg cursor-pointer"
                                                title="Open Course Page"
                                            >
                                                <span className="text-[10px]">↗</span>
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {tab === 'jobs' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    {loadingNew ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="font-bold text-slate-400 uppercase tracking-widest">Scanning Market Data...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(jobs || []).map((job, i) => (
                                <div key={i} className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">{job.role}</h3>
                                            <p className="text-sm font-medium text-slate-500">{job.company}</p>
                                        </div>
                                        <div className="relative w-12 h-12 flex items-center justify-center">
                                            <svg className="absolute w-full h-full -rotate-90">
                                                <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                                <circle cx="24" cy="24" r="20" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray={`${job.matchScore * 1.25} 125`} strokeLinecap="round" />
                                            </svg>
                                            <span className="text-[10px] font-black text-blue-600">{job.matchScore}%</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {job.tags.map((tag, t) => (
                                            <span key={t} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{tag}</span>
                                        ))}
                                    </div>

                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                                        <span className="text-xs font-bold text-slate-400 uppercase">{job.type}</span>
                                        <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200">Apply Now</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  )
}

export default CareerCell;
