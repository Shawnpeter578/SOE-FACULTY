'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RouteRefresh from '@/components/route-refresh';
import FacultyWorkspaceSwitch from '@/components/faculty-workspace-switch';
import WorkspaceTopBar from '@/components/workspace-top-bar';
import { getFacultyInitials } from '../profile/profile-fields';
import { FacultyNotifications, FacultyNotificationButton } from './FacultyNotifications';
import { 
  LayoutGrid, Calendar, FileText, Users, MessageSquare, Wallet, 
  LineChart, User, Plus, ChevronRight, ClipboardList
} from 'lucide-react';

export default function AppLayout({ children, facultyName, refreshIntervalMs }: { children: React.ReactNode; facultyName: string; refreshIntervalMs?: number }) {
  const pathname = usePathname();
  const initials = getFacultyInitials(facultyName);
  const isCoFaculty = pathname === '/faculty/co-faculty' || pathname.startsWith('/faculty/co-faculty/');
  const isCurrent = (href: string) => pathname === href || (href !== '/faculty/co-faculty' && pathname.startsWith(`${href}/`));
  const isEventsPage = /^\/faculty\/events(?:\/|$)/.test(pathname);
  const isCommitteesPage = /^\/faculty\/(?:co-faculty\/)?committees(?:\/|$)/.test(pathname);
  const isDashboard = pathname === '/faculty/dashboard';

  // Update desktopNav paths
  const coordinatorNav = [
    { href: '/faculty/co-faculty', label: 'Dashboard', icon: LayoutGrid },
    { href: '/faculty/co-faculty/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/faculty/co-faculty/committees', label: 'My Committees', icon: Users },
  ];
  const desktopNav = isCoFaculty ? coordinatorNav : [
    { href: '/faculty/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/faculty/events', label: 'My Events', icon: Calendar },
    { href: '/faculty/request', label: 'New Request', icon: FileText },
    { href: '/faculty/committees', label: 'Committees', icon: Users },
    { href: '/faculty/messages', label: 'Messages', icon: MessageSquare },
    { href: '/faculty/finance', label: 'Bills and Finance', icon: Wallet },
    { href: '/faculty/reports', label: 'Reports', icon: LineChart },
  ];

  // Update mobileNav paths
  const mobileNav = isCoFaculty ? [...coordinatorNav, { href: '/faculty/profile', label: 'Profile', icon: User }] : [
    { href: '/faculty/dashboard', label: 'Home', icon: LayoutGrid },
    { href: '/faculty/events', label: 'Events', icon: Calendar },
    { href: '/faculty/committees', label: 'Committees', icon: Users },
    { href: '/faculty/messages', label: 'Chat', icon: MessageSquare },
    { href: '/faculty/finance', label: 'Finance', icon: Wallet },
    { href: '/faculty/profile', label: 'Profile', icon: User },
  ];

  const workspace = (
    <div className="flex h-screen bg-[#F4F7F9] font-sans text-slate-900 overflow-hidden">
      {pathname !== '/faculty/request' && <RouteRefresh intervalMs={refreshIntervalMs} />}
      
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

          <nav className="space-y-1 px-3 pt-4">
            {desktopNav.map((item) => {
              const active = isCurrent(item.href);
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
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
            <div className="w-9 h-9 shrink-0 rounded-full bg-[#EEF2F6] text-[#1A2234] flex items-center justify-center font-bold text-sm" aria-hidden="true">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#1A2234]">{facultyName}</p>
              <p className="text-xs text-slate-500">{isCoFaculty ? 'Co-Faculty' : 'Faculty'}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* === MAIN CONTENT CONTAINER === */}
      <main className="flex min-w-0 flex-1 flex-col h-full relative overflow-hidden">
        
        <WorkspaceTopBar
          role={isCoFaculty ? 'Co-Faculty' : 'Faculty'}
          name={facultyName}
          initials={initials}
          searchPath={isCoFaculty ? '/faculty/co-faculty/assignments' : '/faculty/events'}
          searchLabel={isCoFaculty ? 'Search assignments' : 'Search my events'}
          showSearch={!isEventsPage && !isCommitteesPage}
          showOnMobile={isDashboard || isCoFaculty}
          notifications={<FacultyNotificationButton />}
          profileControl={<FacultyWorkspaceSwitch key={pathname} name={facultyName} initials={initials} coFaculty={isCoFaculty} />}
        />

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-8 lg:p-8 scroll-smooth">
          {children}
        </div>

        {/* Global Mobile FAB */}
        {!isCoFaculty && !isEventsPage && !isCommitteesPage && pathname !== '/faculty/profile' && <div className="fixed bottom-24 right-4 lg:hidden flex items-end gap-3 z-40 pointer-events-none">
          {/* We keep pointer-events-none on the container so we can click through it, but enable it on the button */}
          <Link href="/faculty/request" aria-label="New event request" className="w-14 h-14 bg-[#1A2234] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#111827] active:scale-95 transition-all flex-shrink-0 pointer-events-auto">
            <Plus className="w-6 h-6" />
          </Link>
        </div>}

        {/* Global Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-between px-3 py-3 pb-safe z-50 sm:px-6">
          {mobileNav.map((item) => {
            const active = isCurrent(item.href);
            return (
              <Link 
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
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
  return <FacultyNotifications>{workspace}</FacultyNotifications>;
}
