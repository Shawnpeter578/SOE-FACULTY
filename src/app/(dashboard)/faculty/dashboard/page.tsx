"use client";

import React, { useState } from 'react';
import { 
  Calendar, Clock, CalendarCheck, Receipt, ChevronRight, 
  Check, AlertCircle, Plus, Search, Bell, X, CheckCircle2, MessageCircle 
} from 'lucide-react';

type StageStatus = 'completed' | 'current' | 'upcoming';
interface Stage { label: string; status: StageStatus; }
interface EventItem {
  id: number; month: string; day: string; title: string;
  dateStr: string; location: string; status: string; stages: Stage[];
}

const StatCard = ({ title, count, subtitle, icon: Icon }: { title: string, count: string | number, subtitle: string, icon: React.ElementType }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col w-[240px] md:w-auto md:min-w-[200px] flex-shrink-0 md:flex-shrink snap-start hover:shadow-md md:hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-[15px] font-medium text-slate-500">{title}</h3>
      <div className="p-2 bg-[#F8FAFC] rounded-full text-[#1E2B58] transition-colors group-hover:bg-blue-50">
        <Icon size={18} />
      </div>
    </div>
    <div className="text-[32px] font-bold text-slate-900 mb-1 leading-none">{count}</div>
    <p className="text-[13px] text-slate-500">{subtitle}</p>
  </div>
);

const PipelineBar = ({ stages, onStageUpdate }: { stages: Stage[], onStageUpdate?: (index: number) => void }) => (
  <div className="flex gap-1.5 w-full mt-5">
    {stages.map((stage, idx) => (
      <div key={idx} onClick={() => onStageUpdate && onStageUpdate(idx)} className={`flex-1 flex flex-col items-center gap-1.5 group ${onStageUpdate ? 'cursor-pointer' : ''}`}>
        <div className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
          stage.status === 'completed' ? 'bg-[#10B981]' : stage.status === 'current' ? 'bg-[#1E2B58]' : 'bg-slate-200 group-hover:bg-slate-300'
        }`} />
        <span className={`text-[11px] md:text-xs font-bold transition-colors duration-300 ${
          stage.status === 'current' ? 'text-[#1E2B58]' : 'text-slate-400 group-hover:text-slate-600'
        }`}>{stage.label}</span>
      </div>
    ))}
  </div>
);

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'VC approved Campus Innovation Fair.', time: 'Today • 9:15 AM', type: 'success' },
    { id: 2, title: 'Cultural Committee shared a revised budget.', time: 'Today • 8:40 AM', type: 'message' }
  ]);
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 1, month: 'Nov', day: '12', title: 'Autumn Cultural Night',
      dateStr: 'Nov 12, 2026 • 6:00 PM', location: 'Main Auditorium', status: 'Pending',
      stages: [
        { label: 'Dean', status: 'completed' }, { label: 'VC', status: 'current' },
        { label: 'Committees', status: 'upcoming' }, { label: 'Event', status: 'upcoming' }, { label: 'Reports', status: 'upcoming' }
      ]
    },
    {
      id: 2, month: 'Nov', day: '06', title: 'Campus Innovation Fair',
      dateStr: 'Nov 6, 2026 • 10:00 AM', location: 'Innovation Hall', status: 'Approved',
      stages: [
        { label: 'Dean', status: 'completed' }, { label: 'VC', status: 'completed' },
        { label: 'Committees', status: 'current' }, { label: 'Event', status: 'upcoming' }, { label: 'Reports', status: 'upcoming' }
      ]
    }
  ]);

  const handleStageUpdate = (eventId: number, clickedIndex: number) => {
    setEvents(prev => prev.map(event => {
      if (event.id === eventId) {
        const newStages: Stage[] = event.stages.map((stage, idx) => ({
          ...stage, status: idx < clickedIndex ? 'completed' : idx === clickedIndex ? 'current' : 'upcoming'
        }));
        let newStatus = 'Pending';
        if (clickedIndex >= 2) newStatus = 'Approved';
        if (clickedIndex === 4) newStatus = 'Completed';
        return { ...event, stages: newStages, status: newStatus };
      }
      return event;
    }));
  };

  const removeNotification = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));
  const filteredEvents = events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.location.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white sticky top-0 z-10 transition-all duration-300">
        <div className="relative w-[480px] group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, committees, people..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full"><X size={14} /></button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-medium text-slate-500">Faculty workspace</span>
          <button onClick={() => setNotifications([])} className="relative text-slate-500 hover:text-slate-700 transition-colors">
            <Bell size={20} />
            {notifications.length > 0 && <span className="absolute 1 top-0 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
          <div className="w-[34px] h-[34px] rounded-full bg-[#F1F5F9] cursor-pointer text-[#1E2B58] font-bold flex items-center justify-center text-xs">AK</div>
        </div>
      </header>

      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="flex items-start justify-between lg:hidden mb-8 mt-2 md:mt-0">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#0F172A] tracking-tight mb-1">Good morning, Dr. Aisha</h1>
            <p className="text-[15px] font-medium text-[#64748B]">Thursday, October 29, 2026</p>
          </div>
          <button onClick={() => setNotifications([])} className="relative text-[#1E2B58] p-1 active:scale-90 transition-transform duration-200">
            <Bell size={26} strokeWidth={2} />
            {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-[#F8FAFC]"></span>}
          </button>
        </div>
        
        <div className="hidden lg:flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Good morning, Dr. Aisha</h1>
            <p className="text-sm text-slate-500">Thursday, October 29, 2026</p>
          </div>
          <button className="flex items-center gap-2 bg-[#1E2B58] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162044] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200">
            <Plus size={18} strokeWidth={2.5} /> New event request
          </button>
        </div>

        <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 md:gap-5 mb-8 pb-4 -mx-5 px-5 lg:mx-0 lg:px-0 hide-scrollbar snap-x snap-mandatory">
          <StatCard title="Pending approval" count="2" subtitle="Awaiting Dean or VC" icon={Clock} />
          <StatCard title="Approved events" count="4" subtitle="Ready for coordination" icon={CalendarCheck} />
          <StatCard title="Ongoing events" count="1" subtitle="Happening on campus" icon={Calendar} />
          <StatCard title="Bills pending" count="₹ 45k" subtitle="3 invoices awaiting settlement" icon={Receipt} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-28 md:pb-0">
          <div className="lg:col-span-2 flex flex-col gap-4 md:gap-5">
            <div className="flex justify-between items-center mb-1 md:mb-2">
              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">{searchQuery ? 'Search Results' : 'My events'}</h2>
              <button className="text-[15px] font-bold text-[#1E2B58] flex items-center gap-1 active:opacity-70 transition-opacity">
                View all {events.length}
              </button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100">
                <p className="text-slate-500 font-medium">No events found matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] lg:hover:-translate-y-1 transition-transform duration-200">
                  <div className="flex gap-4 md:gap-5 items-start mb-6">
                    <div className="bg-[#F8FAFC] p-3 md:p-4 rounded-[18px] min-w-[72px] md:min-w-[80px] text-center">
                      <div className="text-[13px] font-bold text-[#1E2B58] uppercase tracking-wider">{event.month}</div>
                      <div className="text-[28px] md:text-3xl font-bold text-slate-900 leading-none mt-1">{event.day}</div>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 text-lg md:text-xl tracking-tight">{event.title}</h3>
                        <ChevronRight size={22} className="text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" />
                      </div>
                      <p className="text-[15px] text-slate-500 mt-1 mb-3.5 leading-relaxed">{event.dateStr}<br/>{event.location}</p>
                      
                      {event.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFBEB] text-[#D97706] text-[13px] font-bold">
                          <Clock size={14} strokeWidth={2.5} /> Pending
                        </span>
                      ) : event.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[13px] font-bold">
                          <Check size={16} strokeWidth={3} /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[13px] font-bold">
                          <Check size={16} strokeWidth={3} /> Approved
                        </span>
                      )}
                    </div>
                  </div>
                  <PipelineBar stages={event.stages} onStageUpdate={(idx) => handleStageUpdate(event.id, idx)} />
                </div>
              ))
            )}
            
            <div className="lg:hidden flex items-start gap-4 px-2 mt-4">
              <AlertCircle size={24} className="text-[#DC2626] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <div>
                <p className="text-[15px] font-bold text-[#DC2626]">Finance · 1 day overdue</p>
                <p className="text-[15px] text-[#475569] font-medium mt-0.5">Upload vendor invoices for ₹ 12,000</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-300">
              <div className="flex justify-between items-center mb-7">
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">Upcoming deadlines</h3>
                <Clock size={20} className="text-[#1E2B58]" />
              </div>
              
              <div className="space-y-6">
                <div className="group cursor-pointer">
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="text-[15px] font-bold text-slate-900 group-hover:text-[#DC2626] transition-colors">Finance Committee</h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626]">
                      <AlertCircle size={12} strokeWidth={3} /> 1 day overdue
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-[#334155]">Upload vendor invoices (₹ 12,000)</p>
                  <p className="text-[13px] text-slate-500 mt-1">Faculty Research Forum • Due Oct 28</p>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div className="group cursor-pointer">
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="text-[15px] font-bold text-slate-900 group-hover:text-[#D97706] transition-colors">Cultural Committee</h4>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FFFBEB] text-[#D97706]">
                      1 day left
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-[#334155]">Confirm performers & schedule</p>
                  <p className="text-[13px] text-slate-500 mt-1">Autumn Cultural Night • Due Oct 30</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-300">
              <div className="flex justify-between items-center mb-7">
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">Recent notifications</h3>
                {notifications.length > 0 ? (
                  <span className="text-[13px] font-bold text-[#1E2B58] bg-blue-50/80 px-2.5 py-1 rounded-md">{notifications.length} new</span>
                ) : (
                  <span className="text-[13px] font-medium text-slate-400">All caught up</span>
                )}
              </div>
              
              <div className="space-y-5">
                {notifications.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No new notifications.</p>
                )}
                {notifications.map(notif => (
                  <div key={notif.id} onClick={() => removeNotification(notif.id)} className="flex gap-4 cursor-pointer group">
                    <div className={`mt-0.5 bg-[#F8FAFC] p-2 rounded-full transition-colors flex-shrink-0 ${notif.type === 'success' ? 'group-hover:bg-[#ECFDF5] text-slate-600 group-hover:text-[#059669]' : 'group-hover:bg-blue-50 text-slate-600 group-hover:text-[#1E2B58]'}`}>
                      {notif.type === 'success' ? <CheckCircle2 size={18} /> : <MessageCircle size={18} />}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#334155] group-hover:text-slate-900 transition-colors">{notif.title}</p>
                      <p className="text-[13px] text-slate-500 mt-1">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}