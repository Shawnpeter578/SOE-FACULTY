"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckSquare, Users, MessageSquare, DollarSign, BarChart2, 
  User, Search, Bell, Plus, ChevronRight, Clock, CheckCircle2, 
  AlertCircle, LayoutDashboard, ChevronDown, CalendarCheck, Receipt, MessageCircle, X, Check
} from 'lucide-react';

// --- Subcomponents ---

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

const PipelineBar = ({ stages }: { stages: { label: string, status: 'completed' | 'current' | 'upcoming' }[] }) => (
  <div className="flex gap-1.5 w-full mt-5">
    {stages.map((stage, idx) => (
      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
        <div className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
          stage.status === 'completed' ? 'bg-[#10B981]' :
          stage.status === 'current' ? 'bg-[#1E2B58]' :
          'bg-slate-200'
        }`} />
        <span className={`text-[11px] md:text-xs font-bold transition-colors duration-300 ${
          stage.status === 'current' ? 'text-[#1E2B58]' : 'text-slate-400 group-hover:text-slate-600'
        }`}>
          {stage.label}
        </span>
      </div>
    ))}
  </div>
);

// --- Main Page Component ---

export default function EventDeskDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'My Events', icon: Calendar },
    { id: 'request', label: 'New Request', icon: CheckSquare },
    { id: 'committees', label: 'Committees', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'finance', label: 'Bills and Finance', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  const bottomNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: CalendarCheck },
    { id: 'messages', label: 'Chat', icon: MessageCircle },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-blue-100 overscroll-y-none">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-[260px] flex-col bg-white border-r border-slate-100 h-screen sticky top-0 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 cursor-pointer group">
            <div className="bg-[#1E2B58] text-white p-1.5 rounded-lg transition-transform group-hover:scale-105 duration-300">
              <Calendar size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-[#1E2B58] transition-colors">EventDesk</span>
          </div>

          <div className="relative mb-6">
            <button 
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className="w-full flex items-center justify-between bg-[#F8FAFC] hover:bg-slate-100 active:bg-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 transition-all duration-200"
            >
              Westbridge College
              <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            <div className={`absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden transition-all duration-200 origin-top z-50 ${isWorkspaceOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
              <button className="w-full text-left px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between">
                Westbridge College <Check size={16} className="text-[#1E2B58]" />
              </button>
              <button className="w-full text-left px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50">
                St. Aloysius University
              </button>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 text-sm font-medium text-slate-500">
            <div className="uppercase text-[11px] font-bold text-slate-400 tracking-wider mb-2 mt-2 px-3">Workspace</div>
            
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left ${
                  activeTab === item.id 
                    ? 'bg-blue-50/70 text-[#1E2B58] font-bold' 
                    : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-[#1E2B58]' : ''} />
                {item.label}
              </button>
            ))}
            
            <div className="h-px bg-slate-100 my-3 mx-3"></div>
            
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left ${
                activeTab === 'profile' ? 'bg-blue-50/70 text-[#1E2B58] font-bold' : 'hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <User size={20} />
              Profile
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-[#F8FAFC] hover:bg-blue-50/50 transition-colors duration-300 rounded-2xl p-5 mb-5 group cursor-pointer border border-slate-50 hover:border-blue-100">
            <h4 className="text-sm font-bold text-slate-900 mb-1.5 group-hover:text-[#1E2B58] transition-colors">A little help?</h4>
            <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">Your campus guide is one click away.</p>
            <span className="text-[13px] font-bold text-[#1E2B58] flex items-center gap-1 group-hover:gap-2 transition-all">
              Visit help center <ChevronRight size={16} />
            </span>
          </div>
          
          <div className="flex items-center gap-3 cursor-pointer group p-2 -ml-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] group-hover:bg-blue-100 transition-colors flex items-center justify-center text-sm font-bold text-[#475569] group-hover:text-[#1E2B58]">
              AK
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-[#1E2B58] transition-colors">Dr. Aisha Khan</p>
              <p className="text-xs text-slate-500">Faculty coordinator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto scroll-smooth pb-safe">
        
        {/* Top Header (Desktop) */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-10 transition-all duration-300">
          <div className="relative w-96 group">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchQuery ? 'text-[#1E2B58]' : 'text-slate-400 group-focus-within:text-[#1E2B58]'}`} size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, committees, people..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-transparent hover:border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-200 transition-all duration-300"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-5">
            <span className="text-sm font-medium text-slate-500">Faculty workspace</span>
            <button 
              onClick={() => setHasNewNotifications(false)}
              className="relative text-slate-500 hover:text-[#1E2B58] transition-colors hover:scale-110 active:scale-95 duration-200"
            >
              <Bell size={22} />
              {hasNewNotifications && (
                <span className="absolute -top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer text-[#1E2B58] font-bold flex items-center justify-center text-sm shadow-sm border border-blue-100">
              AK
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
          
          {/* Mobile Header (Image 2 Accurate) */}
          <div className="flex items-start justify-between lg:hidden mb-8 mt-2 md:mt-0">
            <div>
              <h1 className="text-[28px] font-extrabold text-[#0F172A] tracking-tight mb-1">Good morning, Dr. Aisha</h1>
              <p className="text-[15px] font-medium text-[#64748B]">Thursday, October 29, 2026</p>
            </div>
            <button 
              onClick={() => setHasNewNotifications(false)}
              className="relative text-[#1E2B58] p-1 active:scale-90 transition-transform duration-200"
            >
              <Bell size={26} strokeWidth={2} />
              {hasNewNotifications && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-[#F8FAFC]"></span>
              )}
            </button>
          </div>
          
          {/* Desktop Greeting & Action Button */}
          <div className="hidden lg:flex items-end justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">Good morning, Dr. Aisha</h1>
              <p className="text-sm text-slate-500">Thursday, October 29, 2026</p>
            </div>
            
            <button className="flex items-center gap-2 bg-[#1E2B58] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162044] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200">
              <Plus size={18} strokeWidth={2.5} />
              New event request
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 md:gap-5 mb-8 pb-4 -mx-5 px-5 lg:mx-0 lg:px-0 hide-scrollbar snap-x snap-mandatory">
            <StatCard title="Pending approval" count="2" subtitle="Awaiting Dean or VC" icon={Clock} />
            <StatCard title="Approved events" count="4" subtitle="Ready for coordination" icon={CalendarCheck} />
            <StatCard title="Ongoing events" count="1" subtitle="Happening on campus" icon={Calendar} />
            <StatCard title="Bills pending" count="3" subtitle="Awaiting settlement" icon={Receipt} />
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-28 md:pb-0">
            
            {/* Left Column (Events) */}
            <div className="lg:col-span-2 flex flex-col gap-4 md:gap-5">
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">My events</h2>
                <button className="text-[15px] font-bold text-[#1E2B58] flex items-center gap-1 active:opacity-70 transition-opacity">
                  View all 7
                </button>
              </div>

              {/* Event Card 1 */}
              <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] cursor-pointer active:scale-[0.98] lg:hover:-translate-y-1 transition-transform duration-200">
                <div className="flex gap-4 md:gap-5 items-start mb-6">
                  <div className="bg-[#F8FAFC] p-3 md:p-4 rounded-[18px] min-w-[72px] md:min-w-[80px] text-center">
                    <div className="text-[13px] font-bold text-[#1E2B58] uppercase tracking-wider">Nov</div>
                    <div className="text-[28px] md:text-3xl font-bold text-slate-900 leading-none mt-1">12</div>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 text-lg md:text-xl tracking-tight">Autumn Cultural Night</h3>
                      <ChevronRight size={22} className="text-slate-400" />
                    </div>
                    <p className="text-[15px] text-slate-500 mt-1 mb-3.5 leading-relaxed">Nov 12, 2026 • 6:00 PM<br/>Main Auditorium</p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFBEB] text-[#D97706] text-[13px] font-bold">
                      <Clock size={14} strokeWidth={2.5} /> Pending
                    </span>
                  </div>
                </div>
                <PipelineBar stages={[
                  { label: 'Dean', status: 'completed' },
                  { label: 'VC', status: 'current' },
                  { label: 'Committees', status: 'upcoming' },
                  { label: 'Event', status: 'upcoming' },
                  { label: 'Reports', status: 'upcoming' }
                ]} />
              </div>

              {/* Event Card 2 */}
              <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] cursor-pointer active:scale-[0.98] lg:hover:-translate-y-1 transition-transform duration-200">
                <div className="flex gap-4 md:gap-5 items-start mb-6">
                  <div className="bg-[#F8FAFC] p-3 md:p-4 rounded-[18px] min-w-[72px] md:min-w-[80px] text-center">
                    <div className="text-[13px] font-bold text-[#1E2B58] uppercase tracking-wider">Nov</div>
                    <div className="text-[28px] md:text-3xl font-bold text-slate-900 leading-none mt-1">06</div>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 text-lg md:text-xl tracking-tight">Campus Innovation Fair</h3>
                      <ChevronRight size={22} className="text-slate-400" />
                    </div>
                    <p className="text-[15px] text-slate-500 mt-1 mb-3.5 leading-relaxed">Nov 6, 2026 • 10:00 AM<br/>Innovation Hall</p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[13px] font-bold">
                      <Check size={16} strokeWidth={3} /> Approved
                    </span>
                  </div>
                </div>
                <PipelineBar stages={[
                  { label: 'Dean', status: 'completed' },
                  { label: 'VC', status: 'completed' },
                  { label: 'Committees', status: 'current' },
                  { label: 'Event', status: 'upcoming' },
                  { label: 'Reports', status: 'upcoming' }
                ]} />
              </div>
              
              {/* Mobile Only - Inline Alert from Image 2 */}
              <div className="lg:hidden flex items-start gap-4 px-2 mt-4">
                <AlertCircle size={24} className="text-[#DC2626] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                <div>
                  <p className="text-[15px] font-bold text-[#DC2626]">Finance · 1 day overdue</p>
                  <p className="text-[15px] text-[#475569] font-medium mt-0.5">Upload vendor invoices</p>
                </div>
              </div>
            </div>

            {/* Right Column (Deadlines & Notifications) - Desktop Only */}
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
                    <p className="text-[15px] font-semibold text-[#334155]">Upload vendor invoices</p>
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
                  <span className="text-[13px] font-bold text-[#1E2B58] bg-blue-50/80 px-2.5 py-1 rounded-md">2 new</span>
                </div>
                
                <div className="space-y-5">
                  <div className="flex gap-4 cursor-pointer group">
                    <div className="mt-0.5 bg-[#F8FAFC] group-hover:bg-[#ECFDF5] p-2 rounded-full text-slate-600 group-hover:text-[#059669] transition-colors flex-shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#334155] group-hover:text-slate-900 transition-colors">VC approved Campus Innovation Fair.</p>
                      <p className="text-[13px] text-slate-500 mt-1">Today • 9:15 AM</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 cursor-pointer group">
                    <div className="mt-0.5 bg-[#F8FAFC] group-hover:bg-blue-50 p-2 rounded-full text-slate-600 group-hover:text-[#1E2B58] transition-colors flex-shrink-0">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#334155] group-hover:text-slate-900 transition-colors">Cultural Committee shared a revised budget.</p>
                      <p className="text-[13px] text-slate-500 mt-1">Today • 8:40 AM</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button className="lg:hidden fixed bottom-24 right-5 w-16 h-16 bg-[#1E2B58] rounded-full shadow-[0_8px_24px_rgba(30,43,88,0.35)] flex items-center justify-center text-white z-40 active:scale-[0.92] transition-transform duration-200">
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 pt-3 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex justify-between items-center z-50">
        {bottomNavItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center gap-1.5 p-2 w-16 active:scale-95 transition-transform"
          >
            <item.icon 
              size={24} 
              className={`transition-colors duration-200 ${
                activeTab === item.id ? 'text-[#1E2B58] stroke-[2.5]' : 'text-slate-400 stroke-2'
              }`} 
            />
            <span className={`text-[11px] transition-colors duration-200 ${
              activeTab === item.id ? 'font-bold text-[#1E2B58]' : 'font-medium text-slate-500'
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom));
        }
        @supports (-webkit-touch-callout: none) {
          .h-\[100dvh\] {
            height: -webkit-fill-available;
          }
        }
      `}</style>
    </div>
  );
}