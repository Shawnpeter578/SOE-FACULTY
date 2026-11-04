import React from 'react';
import Sidebar from './components/sidebar';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    // This wrapper forces light mode and layout structure for ALL pages in /faculty
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 selection:bg-blue-100 overscroll-y-none w-full">
      
      {/* Persistent Desktop Sidebar */}
      <Sidebar />

      {/* Dynamic Page Content (Dashboard or Profile will load here) */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto scroll-smooth pb-safe relative">
        {children}
      </main>

      {/* Global Utility Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
      `}} />
    </div>
  );
}