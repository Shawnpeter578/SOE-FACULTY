"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, CheckSquare, Users, MessageSquare, DollarSign, BarChart2, 
  User, ChevronDown, ChevronRight, LayoutDashboard 
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/faculty/dashboard' },
  { id: 'events', label: 'My Events', icon: Calendar, href: '/faculty/events' },
  { id: 'request', label: 'New Request', icon: CheckSquare, href: '/faculty/request' },
  { id: 'committees', label: 'Committees', icon: Users, href: '/faculty/committees' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/faculty/messages' },
  { id: 'finance', label: 'Bills and Finance', icon: DollarSign, href: '/faculty/finance' },
  { id: 'reports', label: 'Reports', icon: BarChart2, href: '/faculty/reports' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  return (
    <aside className="hidden lg:flex w-[260px] flex-col bg-white border-r border-slate-100 h-screen sticky top-0 transition-all duration-300 z-20">
      <div className="p-6">
        <Link href="/faculty/dashboard" className="flex items-center gap-3 mb-8 group">
          <div className="bg-[#1E2B58] text-white p-1.5 rounded-lg transition-transform group-hover:scale-105 duration-300">
            <Calendar size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-[#1E2B58] transition-colors">EventDesk</span>
        </Link>

        <div className="relative mb-6">
          <button 
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            className="w-full flex items-center justify-between bg-[#F8FAFC] hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 transition-colors"
          >
            <span className="truncate pr-2">St. Aloysius School of Engineering</span>
            <ChevronDown size={16} className={`text-slate-500 flex-shrink-0 transition-transform duration-300 ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 text-sm font-medium text-slate-500">
          <div className="uppercase text-[11px] font-bold text-slate-400 tracking-wider mb-2 mt-2 px-3">Workspace</div>
          
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left ${
                  isActive ? 'bg-slate-100 text-slate-900 font-bold' : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                {item.label}
              </Link>
            );
          })}
          
          <div className="h-px bg-slate-100 my-3 mx-3"></div>
          
          <Link 
            href="/faculty/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left ${
              pathname.startsWith('/faculty/profile') ? 'bg-slate-100 text-slate-900 font-bold' : 'hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User size={20} className={pathname.startsWith('/faculty/profile') ? 'text-slate-900' : 'text-slate-400'} />
            Profile
          </Link>
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div className="bg-[#F8FAFC] hover:bg-slate-50 transition-colors duration-300 rounded-2xl p-5 mb-5 cursor-pointer border border-slate-50">
          <h4 className="text-sm font-bold text-slate-900 mb-1.5">A little help?</h4>
          <p className="text-[13px] text-slate-500 mb-3.5 leading-relaxed">Your campus guide is one click away.</p>
          <span className="text-[13px] font-bold text-[#1E2B58] flex items-center gap-1 hover:gap-2 transition-all">
            Visit help center <ChevronRight size={14} strokeWidth={2.5} />
          </span>
        </div>
        
        <Link href="/faculty/profile" className="flex items-center gap-3 cursor-pointer p-2 -ml-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center text-sm font-bold text-[#1E2B58]">
            AK
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Dr. Aisha Khan</p>
            <p className="text-xs text-slate-500">Faculty coordinator</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}