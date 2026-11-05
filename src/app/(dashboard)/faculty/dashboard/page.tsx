'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { 
  Calendar, Clock, Receipt, ChevronRight, 
  CheckCircle2, AlertCircle, Plus, Info, X
} from 'lucide-react';

const stats = [
  { id: 1, title: 'Pending approval', value: '2', subtitle: 'Awaiting Dean or VC', icon: Clock },
  { id: 2, title: 'Approved events', value: '4', subtitle: 'Ready for coordination', icon: Calendar },
  { id: 3, title: 'Ongoing events', value: '1', subtitle: 'Happening on campus', icon: Calendar, desktopOnly: true },
  { id: 4, title: 'Bills pending', value: '3', subtitle: 'Awaiting settlement', icon: Receipt, desktopOnly: true },
];

const MOCK_EVENTS = [
  {
    id: 1, month: 'NOV', day: '12', title: 'Autumn Cultural Night', datetime: 'Nov 12, 2026 · 6:00 PM', location: 'Main Auditorium',
    status: 'Pending', statusColor: 'text-warning bg-warning-bg', statusIcon: 'Clock',
    steps: [{ name: 'Dean', state: 'completed' }, { name: 'VC', state: 'active' }, { name: 'Committees', state: 'upcoming' }, { name: 'Event', state: 'upcoming' }, { name: 'Reports', state: 'upcoming' }]
  },
  {
    id: 2, month: 'NOV', day: '06', title: 'Campus Innovation Fair', datetime: 'Nov 6, 2026 · 10:00 AM', location: 'Innovation Hall',
    status: 'Approved', statusColor: 'text-success bg-success-bg', statusIcon: 'CheckCircle2',
    steps: [{ name: 'Dean', state: 'completed' }, { name: 'VC', state: 'completed' }, { name: 'Committees', state: 'active' }, { name: 'Event', state: 'upcoming' }, { name: 'Reports', state: 'upcoming' }]
  }
];

export default function DashboardPage() {
  const router = useRouter();
  
  // Hydration and State
  const [isClient, setIsClient] = useState(false);
  const [events, setEvents] = useState<any[]>(MOCK_EVENTS);
  const [savedDataString, setSavedDataString] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // LOGIC: Lightweight polling to bypass Next.js Client Cache
  // This constantly checks localStorage for changes without reloading the page
  useEffect(() => {
    setIsClient(true);
    
    const checkStorage = () => {
      const currentStr = localStorage.getItem('eventDesk_submitted');
      
      // Only trigger a re-render if the storage actually changed
      if (currentStr !== savedDataString) {
        setSavedDataString(currentStr);
        if (currentStr) {
          try {
            const parsed = JSON.parse(currentStr);
            setEvents([...parsed, ...MOCK_EVENTS]);
          } catch (e) {
            setEvents(MOCK_EVENTS);
          }
        } else {
          setEvents(MOCK_EVENTS);
        }
      }
    };

    checkStorage(); // Check immediately on mount
    const interval = setInterval(checkStorage, 500); // Check every half-second
    return () => clearInterval(interval);
  }, [savedDataString]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getIcon = (iconName: string) => {
    if (iconName === 'CheckCircle2') return CheckCircle2;
    return Clock;
  };

  const handleStepClick = (eventId: number, clickedStepIndex: number) => {
    setEvents(currentEvents => {
      const updatedEvents = currentEvents.map(event => {
        if (event.id !== eventId) return event;

        const updatedSteps = event.steps.map((step: any, idx: number) => {
          if (idx < clickedStepIndex) return { ...step, state: 'completed' };
          if (idx === clickedStepIndex) return { ...step, state: 'active' };
          return { ...step, state: 'upcoming' };
        });

        let newStatus = event.status;
        let newStatusColor = event.statusColor;
        let newStatusIcon = event.statusIcon;

        if (clickedStepIndex <= 1) { 
          newStatus = 'Pending';
          newStatusColor = 'text-warning bg-warning-bg';
          newStatusIcon = 'Clock';
        } else if (clickedStepIndex <= 3) { 
          newStatus = 'Approved';
          newStatusColor = 'text-success bg-success-bg';
          newStatusIcon = 'CheckCircle2';
        } else { 
          newStatus = 'Completed';
          newStatusColor = 'text-brand-primary bg-brand-selected';
          newStatusIcon = 'CheckCircle2';
        }

        return { ...event, steps: updatedSteps, status: newStatus, statusColor: newStatusColor, statusIcon: newStatusIcon };
      });

      // Save custom events tracker updates back to local storage
      const submittedEvents = updatedEvents.filter(e => e.id > 1000);
      if (submittedEvents.length > 0) {
        localStorage.setItem('eventDesk_submitted', JSON.stringify(submittedEvents));
        // Force the interval checker to know we just made a deliberate update
        setSavedDataString(JSON.stringify(submittedEvents)); 
      }

      return updatedEvents;
    });
  };

  // Prevents hydration UI mismatch bugs
  if (!isClient) return null;

  return (
    <AppLayout>
      
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-brand-primary text-brand-surface px-5 py-3 rounded-full shadow-xl flex items-center gap-3 text-sm font-semibold">
            <Info className="w-4 h-4 text-brand-surface opacity-80" />
            {toastMessage}
            <button onClick={() => setToastMessage(null)} className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start lg:items-center mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-text-primary mb-1">Good morning, Dr. Aisha</h1>
          <p className="text-text-secondary text-sm lg:text-base">Thursday, October 29, 2026</p>
        </div>
        
        <button 
          onClick={() => router.push('/faculty/request')}
          className="hidden lg:flex items-center bg-brand-primary text-brand-surface px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-hover active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          New event request
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div 
            key={stat.id} 
            onClick={() => showToast(`Opening metric: ${stat.title}`)}
            className={`bg-brand-surface p-5 rounded-card border border-brand-border shadow-card hover:border-brand-primary hover:shadow-md transition-all cursor-pointer ${stat.desktopOnly ? 'hidden lg:block' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
              <stat.icon className="w-5 h-5 text-brand-primary" />
            </div>
            <h3 className="text-3xl font-bold text-text-primary mb-1">{stat.value}</h3>
            <p className="text-xs text-text-secondary">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column: My Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-text-primary">My events</h2>
            <button 
              onClick={() => router.push('/faculty/events')}
              className="text-sm font-semibold text-brand-primary flex items-center hover:underline px-2 py-1 rounded-md hover:bg-brand-canvas transition-colors"
            >
              <span className="hidden lg:inline">View all {events.length} events</span>
              <span className="lg:hidden">View all {events.length}</span>
              <ChevronRight className="w-4 h-4 ml-1 hidden lg:block" />
            </button>
          </div>

          {events.map((event) => {
            const StatusIcon = getIcon(event.statusIcon);
            return (
              <div key={event.id} className="bg-brand-surface p-5 rounded-card border border-brand-border shadow-card transition-all hover:shadow-md group">
                <div className="flex gap-4 lg:gap-5 mb-5">
                  <div className="w-[60px] h-[72px] bg-brand-selected rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-text-primary">{event.month}</span>
                    <span className="text-2xl font-bold text-text-primary leading-tight">{event.day}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 
                        onClick={() => showToast(`Opening details for ${event.title}`)}
                        className="text-lg font-bold text-text-primary mb-1 cursor-pointer hover:text-brand-primary transition-colors"
                      >
                        {event.title}
                      </h3>
                      <button 
                        onClick={() => showToast(`Opening details for ${event.title}`)}
                        className="p-1 hover:bg-brand-canvas rounded-full transition-colors text-text-disabled group-hover:text-brand-primary"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-text-secondary mb-3">{event.datetime} <br className="lg:hidden"/> <span className="hidden lg:inline">·</span> {event.location}</p>
                    
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ${event.statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                      {event.status}
                    </div>
                  </div>
                </div>

                {/* Progress Tracking Bar */}
                <div className="flex gap-2 w-full mt-2">
                  {event.steps.map((step: any, idx: number) => (
                    <div key={idx} onClick={() => handleStepClick(event.id, idx)} className="flex-1 flex flex-col gap-2 cursor-pointer group/step">
                      <div className={`h-1.5 rounded-full w-full transition-all duration-300 ${
                        step.state === 'completed' ? 'bg-success' : 
                        step.state === 'active' ? 'bg-brand-primary' : 'bg-brand-border group-hover/step:bg-brand-selected'
                      }`} />
                      <span className={`text-[10px] lg:text-xs text-center truncate transition-colors duration-300 ${
                        step.state === 'active' ? 'font-bold text-text-primary' : 'text-text-secondary font-medium group-hover/step:text-text-primary'
                      }`}>
                        {step.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Deadlines */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="bg-brand-surface p-6 rounded-card border border-brand-border shadow-card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-text-primary">Upcoming deadlines</h2>
              <Clock className="w-5 h-5 text-text-disabled" />
            </div>
            
            <div className="space-y-4">
              <DeadlineItem 
                committee="Finance Committee"
                task="Upload vendor invoices"
                context="Faculty Research Forum · Due Oct 28"
                tagText="1 day overdue"
                tagColor="text-danger bg-danger-bg border border-danger/20"
                icon={AlertCircle}
                onClick={() => showToast("Opening invoice upload portal")}
              />
              <div className="h-[1px] w-full bg-brand-border"></div>
              <DeadlineItem 
                committee="Cultural Committee"
                task="Confirm performers & schedule"
                context="Autumn Cultural Night · Due Oct 30"
                tagText="1 day left"
                tagColor="text-warning bg-warning-bg border border-warning/20"
                onClick={() => showToast("Opening cultural night schedule")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard-specific Mobile Overdue Alert & Mobile FAB */}
      <div className="fixed bottom-24 right-4 lg:hidden flex items-end gap-3 z-40 pointer-events-none">
        <div 
          onClick={() => showToast("Opening overdue invoice tasks")}
          className="bg-brand-surface px-4 py-3 rounded-dialog shadow-2xl border border-brand-border flex items-start gap-2 mb-1 pointer-events-auto cursor-pointer active:scale-95 transition-transform"
        >
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-danger">Finance · 1 day overdue</p>
            <p className="text-sm text-text-secondary">Upload vendor invoices</p>
          </div>
        </div>

        <button 
          onClick={() => router.push('/faculty/request')}
          className="w-14 h-14 bg-brand-primary text-brand-surface rounded-full flex items-center justify-center shadow-lg hover:bg-brand-hover active:scale-95 transition-all flex-shrink-0 pointer-events-auto"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

    </AppLayout>
  );
}

function DeadlineItem({ committee, task, context, tagText, tagColor, icon: Icon, onClick }: any) {
  return (
    <div 
      onClick={onClick} 
      className="group cursor-pointer hover:bg-brand-canvas p-2 -mx-2 rounded-xl transition-colors"
    >
      <div className="flex justify-between items-start mb-1.5">
        <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">{committee}</p>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold transition-all ${tagColor}`}>
          {Icon && <Icon className="w-3 h-3 mr-1" />}
          {tagText}
        </span>
      </div>
      <p className="text-sm font-bold text-text-primary mb-0.5">{task}</p>
      <p className="text-xs text-text-secondary">{context}</p>
    </div>
  );
}