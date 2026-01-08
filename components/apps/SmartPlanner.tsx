
import React, { useState, useContext } from 'react';
import { GeminiService } from '../../services/geminiService';
import { Task, CalendarEvent, UserRole } from '../../types';
import { HierarchyContext } from '../../App';

interface SmartPlannerProps {
    tasks: Task[];
    events: CalendarEvent[];
    onUpdateTasks: (tasks: Task[]) => void;
    onAddEvent: (event: CalendarEvent) => void;
    role: UserRole;
}

const SmartPlanner: React.FC<SmartPlannerProps> = ({ tasks, events, onUpdateTasks, onAddEvent, role }) => {
    const { subjects } = useContext(HierarchyContext);
    const [view, setView] = useState<'calendar' | 'day'>('calendar');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");

    // --- Helpers ---
    const formatDateKey = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

    const getDifficulty = (title: string): 'Easy' | 'Medium' | 'Hard' => {
        // Find subject match in title
        const subject = subjects.find(s => title.toLowerCase().includes(s.name.toLowerCase()));
        if (!subject) return 'Medium'; // Default

        // Calculate average mastery
        const avgMastery = subject.concepts.length > 0
            ? subject.concepts.reduce((acc, c) => acc + c.masteryScore, 0) / subject.concepts.length
            : 70;

        if (avgMastery < 60) return 'Hard';
        if (avgMastery < 85) return 'Medium';
        return 'Easy';
    };

    const handlePrioritize = async () => {
        setLoading(true);
        const dateKey = formatDateKey(selectedDate);
        const dayTasks = tasks.filter(t => t.deadline === dateKey);
        const otherTasks = tasks.filter(t => t.deadline !== dateKey);
        
        try {
            // Prioritize only the viewed day's tasks
            const prioritized = await GeminiService.prioritizeTasks(dayTasks);
            onUpdateTasks([...otherTasks, ...prioritized]);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleAddTask = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTaskTitle.trim()) {
            const newTask: Task = {
                id: Date.now().toString(),
                title: newTaskTitle,
                status: 'todo',
                priority: 'medium',
                deadline: formatDateKey(selectedDate),
                source: role === UserRole.STUDENT ? 'personal' : 'classroom'
            };
            onUpdateTasks([...tasks, newTask]);
            setNewTaskTitle("");
        }
    };

    const updateTaskStatus = (taskId: string, newStatus: 'todo' | 'inprogress' | 'done') => {
        onUpdateTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    // --- Render Logic ---
    const renderCalendar = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = new Date(year, month, 1).getDay();
        const todayKey = formatDateKey(new Date());

        const grid = [];
        for (let i = 0; i < startDay; i++) grid.push(<div key={`empty-${i}`} className="bg-transparent" />);

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(year, month, d);
            const dateKey = formatDateKey(currentDayDate);
            
            const dayTasks = tasks.filter(t => t.deadline === dateKey);
            const dayEvents = events.filter(e => formatDateKey(e.start) === dateKey);
            const isToday = todayKey === dateKey;
            
            // Stats for Progress Ring
            const totalItems = dayTasks.length;
            const completedItems = dayTasks.filter(t => t.status === 'done').length;
            const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
            
            // Check for high priority or assignments
            const hasAssignment = dayTasks.some(t => t.source === 'classroom');
            const hasHighPriority = dayTasks.some(t => t.priority === 'high');

            grid.push(
                <div 
                    key={d}
                    onClick={() => { setSelectedDate(currentDayDate); setView('day'); }}
                    className={`
                        relative h-32 md:h-40 rounded-2xl border p-3 cursor-pointer transition-all duration-300 group
                        hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 hover:z-10
                        ${isToday ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-100'}
                    `}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold ${isToday ? 'text-indigo-600 bg-white px-2 py-0.5 rounded-lg shadow-sm' : 'text-slate-400'}`}>
                            {d}
                        </span>
                        
                        {/* Progress Ring */}
                        {totalItems > 0 && (
                            <div className="relative w-6 h-6">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path 
                                        className={progress === 100 ? "text-emerald-500" : "text-indigo-500"}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="4" 
                                        strokeDasharray={`${progress}, 100`}
                                    />
                                </svg>
                                {progress === 100 && (
                                    <div className="absolute inset-0 flex items-center justify-center text-[8px]">✓</div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Badge Area */}
                    <div className="flex flex-wrap gap-1 mb-2">
                        {hasAssignment && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">
                                Assignment
                            </span>
                        )}
                        {dayEvents.length > 0 && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded">
                                Event
                            </span>
                        )}
                    </div>

                    {/* Mini Tasks List */}
                    <div className="space-y-1.5 overflow-hidden">
                        {dayTasks.slice(0, 3).map(task => {
                            const isDone = task.status === 'done';
                            const isClassroom = task.source === 'classroom';
                            
                            return (
                                <div key={task.id} className="flex items-center gap-1.5 text-xs truncate">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? 'bg-emerald-400' : isClassroom ? 'bg-rose-400' : 'bg-indigo-400'}`}></div>
                                    <span className={`truncate font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                        {task.title}
                                    </span>
                                    {isDone && <span className="text-[9px] text-emerald-500 ml-auto">✓</span>}
                                </div>
                            )
                        })}
                        
                        {(dayTasks.length > 3 || dayEvents.length > 2) && (
                            <div className="text-[9px] text-slate-400 font-bold pl-3">
                                + {dayTasks.length - 3 + dayEvents.length} more...
                            </div>
                        )}
                    </div>

                    {/* Hover Add Hint */}
                    <div className="absolute inset-0 bg-indigo-50/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 pointer-events-none">
                         <span className="bg-white/90 backdrop-blur text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-indigo-100">
                             Manage Tasks →
                         </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Smart Planner</h2>
                        <p className="text-slate-500 font-medium mt-1">
                            {role === UserRole.STUDENT ? 'Your Personalized Learning Arc' : 'Institutional Schedule & Milestones'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                         <button onClick={() => setSelectedDate(new Date(year, month - 1, 1))} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50">←</button>
                         <div className="text-xl font-bold text-slate-800 w-48 text-center">
                            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                         <button onClick={() => setSelectedDate(new Date(year, month + 1, 1))} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50">→</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-4 mb-4 text-center text-slate-400 font-extrabold uppercase text-xs tracking-widest">
                    <div className="text-rose-400">Sun</div>
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div>
                    <div className="text-indigo-400">Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-3 md:gap-4">
                    {grid}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const dateKey = formatDateKey(selectedDate);
        const dayTasks = tasks.filter(t => t.deadline === dateKey);
        
        const columns = [
            { id: 'todo', title: 'To Do', bg: 'bg-slate-50/50', border: 'border-slate-200', icon: '📝' },
            { id: 'inprogress', title: 'In Progress', bg: 'bg-indigo-50/50', border: 'border-indigo-200', icon: '⚡' },
            { id: 'done', title: 'Completed', bg: 'bg-emerald-50/50', border: 'border-emerald-200', icon: '✅' }
        ];

        return (
            <div className="h-full flex flex-col animate-fade-in-up pb-10">
                {/* Day Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setView('calendar')}
                            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        </button>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">
                                {selectedDate.toLocaleString('default', { weekday: 'long', day: 'numeric' })}
                            </h2>
                            <p className="text-slate-500 font-medium">{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handlePrioritize}
                        disabled={loading}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>✨ AI Prioritize Day</span>}
                    </button>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-[500px]">
                    {columns.map(col => (
                        <div key={col.id} className={`${col.bg} border ${col.border} rounded-[32px] p-6 flex flex-col h-full shadow-sm`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-extrabold text-slate-600 uppercase tracking-widest text-xs flex items-center gap-2">
                                    <span className="text-lg">{col.icon}</span> {col.title}
                                </h3>
                                <span className="text-xs font-bold bg-white px-3 py-1 rounded-full text-slate-400 shadow-sm border border-slate-100">
                                    {dayTasks.filter(t => t.status === col.id).length}
                                </span>
                            </div>

                            {col.id === 'todo' && (
                                <div className="mb-4">
                                    <input 
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={handleAddTask}
                                        placeholder="+ Add Task..."
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none shadow-sm transition-shadow focus:shadow-md font-medium"
                                    />
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                {dayTasks.filter(t => t.status === col.id).map(task => {
                                    const difficulty = getDifficulty(task.title);
                                    let diffColor = 'bg-slate-100 text-slate-500';
                                    if (difficulty === 'Hard') diffColor = 'bg-rose-100 text-rose-600 border border-rose-200';
                                    if (difficulty === 'Medium') diffColor = 'bg-amber-100 text-amber-600 border border-amber-200';
                                    if (difficulty === 'Easy') diffColor = 'bg-emerald-100 text-emerald-600 border border-emerald-200';

                                    const isClassroom = task.source === 'classroom';

                                    return (
                                        <div key={task.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                                            {isClassroom && <div className="absolute top-0 right-0 w-8 h-8 bg-rose-50 rounded-bl-2xl flex items-center justify-center text-[10px]">🎓</div>}
                                            
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[9px] px-2 py-1 rounded-lg uppercase font-extrabold tracking-wider ${diffColor}`}>
                                                    {difficulty}
                                                </span>
                                            </div>
                                            
                                            <h4 className="text-slate-800 font-bold text-sm mb-4 leading-snug pr-4">{task.title}</h4>
                                            
                                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                                <div className="flex gap-1">
                                                    {col.id !== 'todo' && (
                                                        <button onClick={() => updateTaskStatus(task.id, 'todo')} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 text-xs flex items-center justify-center transition-colors">←</button>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                     {col.id !== 'done' && (
                                                        <button 
                                                            onClick={() => updateTaskStatus(task.id, col.id === 'todo' ? 'inprogress' : 'done')} 
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${col.id === 'todo' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                        >
                                                            {col.id === 'todo' ? 'Start' : 'Done'} →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dayTasks.filter(t => t.status === col.id).length === 0 && (
                                    <div className="text-center py-12 opacity-40">
                                        <div className="text-4xl mb-3 grayscale opacity-50">{col.id === 'done' ? '🏆' : '🍃'}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">No tasks</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-7xl mx-auto">
            {view === 'calendar' ? renderCalendar() : renderDayView()}
        </div>
    );
};

export default SmartPlanner;
