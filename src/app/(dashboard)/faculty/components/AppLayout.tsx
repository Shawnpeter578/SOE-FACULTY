'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, Calendar, FileText, Users, MessageSquare, Wallet, 
  LineChart, User, ChevronDown, Search, Bell, Plus, ChevronRight
} from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Update desktopNav paths
  const desktopNav = [
    { href: '/faculty/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/faculty/events', label: 'My Events', icon: Calendar },
    { href: '/faculty/request', label: 'New Request', icon: FileText },
    { href: '/faculty/committees', label: 'Committees', icon: Users },
    { href: '/faculty/messages', label: 'Messages', icon: MessageSquare },
    { href: '/faculty/finance', label: 'Bills and Finance', icon: Wallet },
    { href: '/faculty/reports', label: 'Reports', icon: LineChart },
  ];

  // Update mobileNav paths
  const mobileNav = [
    { href: '/faculty/dashboard', label: 'Home', icon: LayoutGrid },
    { href: '/faculty/events', label: 'Events', icon: Calendar },
    { href: '/faculty/messages', label: 'Chat', icon: MessageSquare },
    { href: '/faculty/finance', label: 'Finance', icon: Wallet },
    { href: '/faculty/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex h-screen bg-[#F4F7F9] font-sans text-slate-900 overflow-hidden">
      
      {/* === DESKTOP SIDEBAR === */}
      <aside className="hidden lg:flex w-[260px] bg-white border-r border-slate-200 flex-col justify-between h-full flex-shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xl font-bold text-[#1A2234]">
              <div className="w-6 h-6 bg-[#1A2234] rounded-md flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              EventDesk
            </div>
          </div>

          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Workspace</p>
            <button className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100 transition-colors">
              <span className="truncate mr-2">St. Aloysius School of Engineering</span>
              <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </button>
          </div>

          <nav className="px-3 space-y-1">
            {desktopNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-[#EEF2F6] text-[#1A2234] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#1A2234]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${active ? 'text-[#1A2234]' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 space-y-4">
          <Link 
            href="/faculty/profile"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/faculty/profile' ? 'bg-[#EEF2F6] text-[#1A2234] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-[#1A2234]'
            }`}
          >
            <User className={`w-5 h-5 ${pathname === '/faculty/profile' ? 'text-[#1A2234]' : 'text-slate-400'}`} />
            Profile
          </Link>
          
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100">
            <p className="font-semibold text-sm text-[#1A2234]">A little help?</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">Your campus guide is one click away.</p>
            <button className="text-sm font-semibold text-[#1A2234] hover:underline flex items-center">
              Visit help center <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <Link href="/faculty/profile" className="flex items-center gap-3 pt-2">
            <div className="w-9 h-9 rounded-full bg-[#EEF2F6] text-[#1A2234] flex items-center justify-center font-bold text-sm">
              AK
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A2234]">Dr. Aisha Khan</p>
              <p className="text-xs text-slate-500">Faculty coordinator</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* === MAIN CONTENT CONTAINER === */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Global Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 flex-shrink-0">
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search events, committees, people..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234] transition-all"
            />
          </div>
          <div className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <span>Faculty workspace</span>
            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
            </div>
            <Link href="/profile" className="w-8 h-8 rounded-full bg-[#EEF2F6] text-[#1A2234] flex items-center justify-center font-bold text-xs">
              AK
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-8 lg:p-8 scroll-smooth">
          {children}
        </div>

        {/* Global Mobile FAB */}
        <div className="fixed bottom-24 right-4 lg:hidden flex items-end gap-3 z-40 pointer-events-none">
          {/* We keep pointer-events-none on the container so we can click through it, but enable it on the button */}
          <button className="w-14 h-14 bg-[#1A2234] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#111827] active:scale-95 transition-all flex-shrink-0 pointer-events-auto">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Global Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-between px-6 py-3 pb-safe z-50">
          {mobileNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 ${active ? 'text-[#1A2234]' : 'text-slate-400'}`}
              >
                <item.icon className="w-6 h-6" />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </main>
    </div>
  );
}