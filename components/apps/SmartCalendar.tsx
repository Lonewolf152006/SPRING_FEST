
import React, { useState } from 'react';
import { GeminiService } from '../../services/geminiService';
import { CalendarEvent } from '../../types';

interface SmartCalendarProps {
    events: CalendarEvent[];
    onAddEvent: (event: CalendarEvent) => void;
}

const SmartCalendar: React.FC<SmartCalendarProps> = ({ events, onAddEvent }) => {
    const [taskInput, setTaskInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAutoSchedule = async () => {
        if (!taskInput) return;
        setLoading(true);
        const suggestion = await GeminiService.autoSchedule(taskInput, events);
        
        if (suggestion.startTime) {
            const start = new Date(suggestion.startTime);
            const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hr default
            
            const newEvent: CalendarEvent = {
                id: Date.now().toString(),
                title: taskInput,
                start: start,
                end: end,
                type: 'study',
                color: 'bg-green-500'
            };
            onAddEvent(newEvent);
            setTaskInput("");
            alert(`Auto-Scheduled for ${start.toLocaleTimeString()} (${suggestion.reason})`);
        }
        setLoading(false);
    };

    const days = Array.from({length: 35}, (_, i) => i + 1);

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Smart Calendar</h2>
                    <p className="text-slate-500">AI-Optimized Schedule</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        value={taskInput} 
                        onChange={e => setTaskInput(e.target.value)}
                        placeholder="e.g., Study History"
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 focus:border-green-500 outline-none w-64 shadow-sm"
                    />
                    <button 
                        onClick={handleAutoSchedule}
                        disabled={loading}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md shadow-emerald-200"
                    >
                        {loading ? 'Thinking...' : '✨ Auto-Schedule'}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 p-6 overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 gap-4 mb-4 text-center text-slate-400 font-bold uppercase text-sm">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 grid-rows-5 gap-4 h-full">
                    {days.map((day, i) => {
                        const dayEvents = events.filter(e => e.start.getDate() === (i % 30) + 1);
                        return (
                            <div key={i} className="bg-white/60 rounded-xl p-2 border border-slate-100 relative group hover:border-emerald-200 transition-colors shadow-sm">
                                <span className="text-slate-400 text-sm font-bold absolute top-2 right-2">{i < 30 ? i + 1 : i - 29}</span>
                                <div className="mt-6 space-y-1">
                                    {dayEvents.map(ev => (
                                        <div key={ev.id} className={`${ev.color} text-white text-[10px] px-2 py-1 rounded truncate shadow-sm`}>
                                            {ev.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default SmartCalendar;
