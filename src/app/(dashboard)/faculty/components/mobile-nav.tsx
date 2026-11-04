"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarCheck, MessageCircle, DollarSign, User, Plus } from 'lucide-react';

const bottomNavItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, href: '/faculty/dashboard' },
  { id: 'events', label: 'Events', icon: CalendarCheck, href: '/faculty/events' },
  { id: 'messages', label: 'Chat', icon: MessageCircle, href: '/faculty/messages' },
  { id: 'finance', label: 'Finance', icon: DollarSign, href: '/faculty/finance' },
  { id: 'profile', label: 'Profile', icon: User, href: '/faculty/profile' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const isProfile = pathname.startsWith('/faculty/profile');

  return (
    <>
      {/* Floating Action Button (Hidden on Profile Tab) */}
      {!isProfile && (
        <button className="lg:hidden fixed bottom-24 right-5 w-16 h-16 bg-[#1E2B58] rounded-full shadow-[0_8px_24px_rgba(30,43,88,0.35)] flex items-center justify-center text-white z-40 active:scale-[0.92] transition-transform duration-200">
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 pt-3 pb-safe flex justify-between items-center z-50">
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.id}
              href={item.href}
              className="flex flex-col items-center gap-1.5 p-2 w-16 active:scale-95 transition-transform"
            >
              <item.icon 
                size={24} 
                className={`transition-colors duration-200 ${isActive ? 'text-[#1E2B58] stroke-[2.5]' : 'text-slate-400 stroke-2'}`} 
              />
              <span className={`text-[11px] transition-colors duration-200 ${isActive ? 'font-bold text-[#1E2B58]' : 'font-medium text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}