
import React, { useState } from 'react';
import { GeminiService } from '../../services/geminiService';
import { Task } from '../../types';

interface TaskMasterProps {
    tasks: Task[];
    onUpdateTasks: (tasks: Task[]) => void;
}

const TaskMaster: React.FC<TaskMasterProps> = ({ tasks, onUpdateTasks }) => {
    const [loading, setLoading] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");

    const handlePrioritize = async () => {
        setLoading(true);
        const prioritized = await GeminiService.prioritizeTasks(tasks);
        onUpdateTasks(prioritized);
        setLoading(false);
    };

    const handleSortDeadline = async () => {
        setLoading(true);
        const sorted = await GeminiService.sortTasksByDeadline(tasks);
        onUpdateTasks(sorted);
        setLoading(false);
    };

    const handleQuickAdd = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTaskTitle.trim()) {
            const newTask: Task = {
                id: Date.now().toString(),
                title: newTaskTitle,
                status: 'todo',
                priority: 'medium', // Default priority
                source: 'personal'
            };
            onUpdateTasks([...tasks, newTask]);
            setNewTaskTitle("");
        }
    };

    const columns = [
        { id: 'todo', title: 'To Do', color: 'border-slate-300', bg: 'bg-slate-50' },
        { id: 'inprogress', title: 'In Progress', color: 'border-blue-400', bg: 'bg-blue-50' },
        { id: 'done', title: 'Done', color: 'border-emerald-400', bg: 'bg-emerald-50' }
    ];

    const getPriorityStyles = (priority: string) => {
        switch(priority.toLowerCase()) {
            case 'high': return { 
                badge: 'bg-red-100 text-red-700 border border-red-200', 
                border: 'border-l-4 border-l-red-500',
                icon: '🔥' 
            };
            case 'medium': return { 
                badge: 'bg-amber-100 text-amber-700 border border-amber-200', 
                border: 'border-l-4 border-l-amber-500',
                icon: '⚡'
            };
            case 'low': return { 
                badge: 'bg-green-100 text-green-700 border border-green-200', 
                border: 'border-l-4 border-l-green-500',
                icon: '☕'
            };
            default: return { 
                badge: 'bg-slate-100 text-slate-600 border border-slate-200', 
                border: 'border-l-4 border-l-slate-400',
                icon: '📌'
            };
        }
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Task Master</h2>
                    <p className="text-slate-500">Kanban Board</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleSortDeadline}
                        disabled={loading}
                        className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm border border-slate-200"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : '📅 Sort by Deadline'}
                    </button>
                    <button 
                        onClick={handlePrioritize}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🧠 AI Prioritize'}
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
                {columns.map(col => (
                    <div key={col.id} className={`${col.bg} rounded-2xl border border-white/50 p-4 flex flex-col shadow-sm`}>
                        <h3 className={`text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 pb-2 border-b-2 ${col.color}`}>{col.title}</h3>
                        
                        {/* Quick Add for To Do Column */}
                        {col.id === 'todo' && (
                             <div className="mb-4">
                                 <input 
                                     value={newTaskTitle}
                                     onChange={(e) => setNewTaskTitle(e.target.value)}
                                     onKeyDown={handleQuickAdd}
                                     placeholder="+ Quick Add Task..."
                                     className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none shadow-sm"
                                 />
                             </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {tasks.filter(t => t.status === col.id).map(task => {
                                const styles = getPriorityStyles(task.priority);
                                return (
                                    <div key={task.id} className={`bg-white p-4 rounded-xl border border-slate-100 shadow-sm ${styles.border} hover:shadow-md transition-all hover:-translate-y-1 group`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1 ${styles.badge}`}>
                                                <span>{styles.icon}</span> {task.priority}
                                            </span>
                                            {task.source === 'classroom' && <span className="text-xs text-slate-400" title="From Classroom">🎓</span>}
                                        </div>
                                        <h4 className="text-slate-800 font-bold mb-1">{task.title}</h4>
                                        {task.deadline && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 font-medium">
                                                <span>🕒</span>
                                                <span>Due: {task.deadline}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TaskMaster;
