'use client';

import React, { useState } from 'react';
import AppLayout from '../components/AppLayout'; // Ensure this path matches your structure
import { 
  Pencil, Mail, Phone, ArrowLeft, ChevronUp, 
  Clock, CheckCircle2, Lock, ChevronRight 
} from 'lucide-react';

export default function ProfilePage() {
  // --- FORM LOGIC & STATE ---
  const [isEditing, setIsEditing] = useState(true); 
  
  const [formData, setFormData] = useState({
    fullName: 'Dr. Aisha Khan',
    employeeId: 'WB-FAC-0248',
    designation: 'Associate Professor',
    department: 'Computer Science',
    email: 'aisha.khan@westbridge.edu',
    phone: '+1 (415) 555-0128',
    officeRoom: 'B-204, Academic Block'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    console.log('Saved profile data:', formData);
  };

  return (
    <AppLayout>
      {/* 1. INCREASED CONTAINER WIDTH: max-w-5xl -> max-w-6xl */}
      <div className="max-w-6xl mx-auto lg:p-4">
        
        {/* === MOBILE HEADER === */}
        <div className="lg:hidden flex items-center justify-center relative mb-8">
          <button className="absolute left-0 p-1 text-[#1A2234]">
            <ArrowLeft className="w-7 h-7" />
          </button>
          <h1 className="text-2xl font-bold text-[#1A2234]">Profile</h1>
        </div>

        {/* === DESKTOP HEADER === */}
        <div className="hidden lg:block mb-10">
          <h1 className="text-3xl font-bold text-[#1A2234] mb-2">Profile</h1>
          <p className="text-slate-500 text-lg">Manage your faculty details, signature and notifications.</p>
        </div>

        {/* === TOP PROFILE SUMMARY CARD === */}
        {/* 2. INCREASED PADDING: p-6 lg:p-8 -> p-8 lg:p-10 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 lg:p-10 mb-8 lg:mb-10 flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left relative">
          
          {/* Avatar (INCREASED SIZE) */}
          <div className="relative mb-5 lg:mb-0 lg:mr-8">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-[#EEF2F6] text-[#1A2234] flex items-center justify-center font-bold text-3xl lg:text-4xl">
              AK
            </div>
            <button className="absolute bottom-0 right-0 lg:bottom-1 lg:right-1 w-8 h-8 lg:w-9 lg:h-9 bg-[#1A2234] text-white rounded-full flex items-center justify-center border-4 border-white shadow-sm hover:scale-105 transition-transform">
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1 mt-2">
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-[#1A2234]">{formData.fullName}</h2>
              <span className="bg-[#EEF2F6] text-[#475569] text-xs font-bold px-3 py-1.5 rounded-full">Faculty</span>
            </div>
            
            <p className="text-base text-slate-500 mb-5">
              <span className="block lg:inline">{formData.designation}</span>
              <span className="hidden lg:inline"> - </span>
              <span className="lg:hidden text-slate-300 mx-1">•</span>
              <span className="block lg:inline">{formData.department}</span>
              <span className="hidden lg:inline text-slate-300 mx-2">|</span>
              <span className="hidden lg:inline">Westbridge College</span>
              <span className="lg:hidden text-slate-300 mx-1">·</span>
              <span className="lg:hidden">Westbridge College</span>
            </p>

            <div className="flex flex-col lg:flex-row items-center gap-3 lg:gap-8 text-base text-slate-500">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-slate-400" />
                {formData.email}
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-5 h-5 text-slate-400" />
                {formData.phone}
              </div>
            </div>
          </div>

          {/* Desktop Edit Button */}
          <div className="hidden lg:block absolute top-10 right-10">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-[#1A2234] hover:bg-slate-50 transition-colors"
            >
              Edit profile
            </button>
          </div>
        </div>

        {/* === MAIN CONTENT GRID === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 pb-24 lg:pb-0">
          
          {/* LEFT COLUMN: Personal Details Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 lg:p-10">
              <form onSubmit={handleSave}>
                
                {/* Form Header */}
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-[#1A2234]">Personal details</h3>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="hidden lg:block text-sm font-semibold text-[#1A2234] hover:underline"
                  >
                    {isEditing ? 'Editing' : 'Edit'}
                  </button>
                  <ChevronUp className="w-6 h-6 text-slate-400 lg:hidden" />
                </div>

                {/* Form Grid (INCREASED INPUT SIZE) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">Full name</label>
                    <input 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      className={`w-full px-5 py-3.5 rounded-xl text-base text-[#1A2234] font-medium outline-none transition-all ${
                        isEditing 
                          ? 'border-2 border-[#1A2234] bg-white' 
                          : 'border border-slate-200 bg-slate-50'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">Employee ID</label>
                    <input 
                      name="employeeId"
                      value={formData.employeeId}
                      readOnly
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-xl text-base text-slate-500 font-medium bg-slate-50 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">Designation</label>
                    <input 
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-xl text-base text-[#1A2234] font-medium bg-white focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">Department</label>
                    <input 
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-xl text-base text-[#1A2234] font-medium bg-white focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">College email</label>
                    <input 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-xl text-base text-[#1A2234] font-medium bg-white focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">Phone</label>
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-xl text-base text-[#1A2234] font-medium bg-white focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-500">Office room</label>
                    <input 
                      name="officeRoom"
                      value={formData.officeRoom}
                      onChange={handleInputChange}
                      readOnly={!isEditing}
                      className="w-full px-5 py-3.5 border border-slate-200 rounded-xl text-base text-[#1A2234] font-medium bg-white focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="hidden lg:flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
                  <p className="text-sm text-slate-400">Visible to your campus team.</p>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-[#1A2234] text-white rounded-xl text-sm font-bold hover:bg-[#111827] transition-colors shadow-md"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Signature & Events */}
          <div className="hidden lg:flex flex-col gap-8">
            
            {/* E-Signature Card (INCREASED BOX HEIGHT) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1A2234]">E-signature</h3>
                <Pencil className="w-5 h-5 text-slate-400 cursor-pointer hover:text-[#1A2234] transition-colors" />
              </div>
              
              <div className="h-32 w-full border-2 border-dashed border-slate-300 rounded-xl mb-6 flex items-center justify-center bg-slate-50">
                <span className="font-[cursive] text-4xl text-[#1A2234] opacity-80" style={{ fontFamily: "'Cedarville Cursive', 'Dancing Script', cursive" }}>Aisha Khan</span>
              </div>
              
              <div className="flex justify-center gap-4 mb-6">
                <button className="px-5 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-[#1A2234] hover:bg-slate-50 transition-colors">
                  Draw new
                </button>
                <button className="px-5 py-2 text-sm font-semibold text-[#1A2234] hover:underline transition-colors">
                  Upload
                </button>
              </div>
              <p className="text-xs text-slate-400 text-left">Used on request letters sent to the Dean and VC.</p>
            </div>

            {/* Events Coordinated Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-[#1A2234]">Events coordinated</h3>
                <button className="text-xs font-bold text-[#1A2234] flex items-center hover:underline">
                  View all <ChevronRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>

              <div className="space-y-5">
                <EventListRow 
                  title="Autumn Cultural Night"
                  date="Nov 12, 2026"
                  status="Pending"
                  statusColor="text-amber-700 bg-amber-50"
                  icon={Clock}
                />
                <div className="h-[1px] w-full bg-slate-100"></div>
                <EventListRow 
                  title="Campus Innovation Fair"
                  date="Nov 6, 2026"
                  status="Approved"
                  statusColor="text-emerald-700 bg-emerald-50"
                  icon={CheckCircle2}
                />
                <div className="h-[1px] w-full bg-slate-100"></div>
                <EventListRow 
                  title="Faculty Research Forum"
                  date="Oct 29, 2026"
                  status="Locked"
                  statusColor="text-slate-600 bg-slate-100"
                  icon={Lock}
                />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* === MOBILE STICKY SAVE BUTTON === */}
      <div className="lg:hidden fixed bottom-[68px] left-0 w-full bg-white px-4 py-3 border-t border-slate-100 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-[#1A2234] text-white rounded-xl text-base font-bold shadow-lg hover:bg-[#111827] active:scale-[0.98] transition-all"
        >
          Save changes
        </button>
      </div>

    </AppLayout>
  );
}

function EventListRow({ title, date, status, statusColor, icon: Icon }: any) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="text-base font-semibold text-[#1A2234] mb-1">{title}</p>
        <p className="text-sm text-slate-500">{date}</p>
      </div>
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${statusColor}`}>
        <Icon className="w-3.5 h-3.5 mr-1.5" />
        {status}
      </span>
    </div>
  );
}