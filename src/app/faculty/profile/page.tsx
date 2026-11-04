"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, Bell, ArrowLeft, Edit2, Mail, Phone, 
  ChevronUp, PenLine, ChevronRight, Clock, Check, Lock, X,
  LayoutDashboard, CalendarCheck, MessageCircle, DollarSign, User
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ProfilePage() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPersonalDetailsOpen, setIsPersonalDetailsOpen] = useState(true);
  
  const [profileData, setProfileData] = useState({
    fullName: 'Dr. Aisha Khan',
    employeeId: 'WB-FAC-0248',
    designation: 'Associate Professor',
    department: 'Computer Science',
    email: 'aisha.khan@staloysius.edu.in',
    phone: '+1 (415) 555-0128',
    officeRoom: 'B-204, Academic Block'
  });

  const handleProfileUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const bottomNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, href: '/faculty/dashboard' },
    { id: 'events', label: 'Events', icon: CalendarCheck, href: '/faculty/events' },
    { id: 'messages', label: 'Chat', icon: MessageCircle, href: '/faculty/messages' },
    { id: 'finance', label: 'Finance', icon: DollarSign, href: '/faculty/finance' },
    { id: 'profile', label: 'Profile', icon: User, href: '/faculty/profile' },
  ];

  return (
    <>
      <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white sticky top-0 z-10 border-b border-slate-100 transition-all duration-300">
        <div className="relative w-[480px] group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, committees, people..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full"><X size={14} /></button>
          )}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-medium text-slate-500">Faculty workspace</span>
          <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
            <Bell size={20} />
            <span className="absolute top-0 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-[34px] h-[34px] rounded-full bg-[#F1F5F9] cursor-pointer text-[#1E2B58] font-bold flex items-center justify-center text-xs hover:bg-blue-50 transition-colors">
            AK
          </div>
        </div>
      </header>

      <div className="p-0 lg:px-10 lg:py-8 max-w-[1100px] w-full mx-auto pb-28 lg:pb-0 bg-white lg:bg-transparent">
        <div className="lg:hidden flex items-center gap-3 px-5 py-5 bg-white sticky top-0 z-10 border-b border-slate-50">
          <Link href="/faculty/dashboard" className="p-1 -ml-1 text-slate-800">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Profile</h1>
        </div>

        <div className="hidden lg:block mb-8 mt-2">
          <h1 className="text-[28px] font-bold text-slate-900 mb-2">Profile</h1>
          <p className="text-[15px] text-slate-500">Manage your faculty details, signature and notifications.</p>
        </div>

        <div className="lg:hidden flex flex-col items-center mt-6 mb-8 text-center px-5">
          <div className="relative mb-5">
            <div className="w-[88px] h-[88px] bg-[#F1F5F9] rounded-full flex items-center justify-center text-[28px] font-bold text-[#1E2B58]">
              AK
            </div>
            <div className="absolute bottom-0 right-0 bg-[#1E2B58] text-white p-1.5 rounded-full border-2 border-white shadow-sm cursor-pointer active:scale-95 transition-transform">
              <Edit2 size={12} strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-[22px] font-bold text-slate-900 mb-1.5">{profileData.fullName}</h2>
          <p className="text-[13px] text-slate-500 mb-1">{profileData.designation}</p>
          <p className="text-[13px] text-slate-500 mb-4">{profileData.department} - St. Aloysius School of Engineering</p>
          <span className="bg-[#F1F5F9] text-[#1E2B58] text-[11px] font-bold px-3 py-1 rounded-full mb-5">
            Faculty
          </span>
          <div className="flex flex-col items-center gap-2.5 text-[13px] text-slate-500 font-medium">
            <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {profileData.email}</div>
            <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {profileData.phone}</div>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-6 mb-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-[84px] h-[84px] bg-[#F1F5F9] rounded-full flex items-center justify-center text-[26px] font-bold text-[#1E2B58]">
                AK
              </div>
              <div className="absolute bottom-0 right-0 bg-[#1E2B58] text-white p-1.5 rounded-full border-2 border-white cursor-pointer hover:scale-105 transition-transform shadow-sm">
                <Edit2 size={12} strokeWidth={3} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">{profileData.fullName}</h2>
                <span className="bg-[#F1F5F9] text-[#1E2B58] text-[11px] font-bold px-2.5 py-1 rounded-full">Faculty</span>
              </div>
              <p className="text-[13px] text-slate-500 mb-1">{profileData.designation} - {profileData.department}</p>
              <p className="text-[13px] text-slate-500 mb-3 font-medium">St. Aloysius School of Engineering</p>
              <div className="flex items-center gap-6 text-[13px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {profileData.email}</div>
                <div className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {profileData.phone}</div>
              </div>
            </div>
          </div>
          <button className="border border-slate-200 text-[#1E2B58] font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-95">
            Edit profile
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-5 lg:px-0">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl lg:border lg:border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.04)] lg:shadow-sm overflow-hidden">
              <div className="px-5 py-5 lg:px-6 flex justify-between items-center cursor-pointer lg:cursor-default border-b border-slate-50 lg:border-none" onClick={() => setIsPersonalDetailsOpen(!isPersonalDetailsOpen)}>
                <h3 className="font-bold text-[17px] text-slate-900 tracking-tight">Personal details</h3>
                <span className="hidden lg:block text-xs font-bold text-[#1E2B58]">Editing</span>
                <ChevronUp size={20} className={`lg:hidden text-slate-400 transition-transform duration-300 ${!isPersonalDetailsOpen ? 'rotate-180' : ''}`} />
              </div>

              <div className={`px-5 lg:px-6 pb-6 lg:pb-7 transition-all duration-300 ${isPersonalDetailsOpen ? 'block' : 'hidden lg:block'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mt-2 lg:mt-0">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">Full name</label>
                    <input type="text" name="fullName" value={profileData.fullName} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-white border-2 border-[#1E2B58] rounded-xl text-[14px] text-slate-900 font-semibold focus:outline-none" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">Employee ID</label>
                    <input type="text" name="employeeId" value={profileData.employeeId} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-[#F8FAFC] lg:bg-white border border-slate-200 rounded-xl text-[14px] text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors" />
                  </div>
                  
                  <div className="hidden lg:flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">Designation</label>
                    <input type="text" name="designation" value={profileData.designation} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors" />
                  </div>

                  <div className="hidden lg:flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">Department</label>
                    <input type="text" name="department" value={profileData.department} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors" />
                  </div>

                  <div className="hidden lg:flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">College email</label>
                    <input type="email" name="email" value={profileData.email} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors" />
                  </div>

                  <div className="hidden lg:flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">Phone</label>
                    <input type="tel" name="phone" value={profileData.phone} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors" />
                  </div>

                  <div className="hidden lg:flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-slate-500 ml-1">Office room</label>
                    <input type="text" name="officeRoom" value={profileData.officeRoom} onChange={handleProfileUpdate} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors" />
                  </div>
                </div>

                <div className="lg:hidden mt-6">
                   <button className="w-full bg-[#1E2B58] text-white font-bold text-[14px] py-3.5 rounded-xl hover:bg-[#162044] active:scale-[0.98] transition-all shadow-md">
                     Save changes
                   </button>
                </div>

                <div className="hidden lg:flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
                  <span className="text-[13px] text-slate-400 font-medium">Visible to your campus team.</span>
                  <button className="bg-[#1E2B58] text-white font-bold text-sm px-7 py-3 rounded-xl hover:bg-[#162044] active:scale-95 transition-all shadow-sm">
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-[17px] text-slate-900 tracking-tight">E-signature</h3>
                <PenLine size={16} className="text-slate-400" />
              </div>
              <div className="border border-dashed border-slate-200 rounded-xl h-[100px] flex items-center justify-center bg-white mb-5 group hover:border-[#1E2B58] transition-colors cursor-pointer">
                <span className="font-[cursive] text-3xl text-[#1E2B58] transform -rotate-2 opacity-90 group-hover:opacity-100">Aisha Khan</span>
              </div>
              <div className="flex gap-3 mb-4">
                <button className="flex-1 border border-[#1E2B58] text-[#1E2B58] font-bold text-[13px] py-2.5 rounded-xl hover:bg-slate-50 transition-colors active:scale-95">Draw new</button>
                <button className="flex-1 text-[#1E2B58] font-bold text-[13px] py-2.5 rounded-xl hover:bg-slate-50 transition-colors active:scale-95">Upload</button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Used on request letters sent to the Dean and VC.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[17px] text-slate-900 tracking-tight">Events coordinated</h3>
                <button className="text-[12px] font-bold text-[#1E2B58] flex items-center gap-1 hover:underline">
                  View all <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900">Autumn Cultural Night</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Nov 12, 2026</p>
                  </div>
                  <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#FFFBEB] text-[#D97706] w-[85px]">
                    <Clock size={12} strokeWidth={3} /> Pending
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900">Campus Innovation Fair</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Nov 6, 2026</p>
                  </div>
                  <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#ECFDF5] text-[#059669] w-[85px]">
                    <Check size={12} strokeWidth={3} /> Approved
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900">Faculty Research Forum</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Oct 29, 2026</p>
                  </div>
                  <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#F8FAFC] text-slate-500 w-[85px]">
                    <Lock size={12} strokeWidth={2.5} /> Locked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 pt-3 pb-safe flex justify-between items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
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