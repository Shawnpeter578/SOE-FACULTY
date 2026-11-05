'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { 
  ArrowLeft, Check, Calendar, MapPin, Users, Wallet, 
  FileText, AlertCircle, Upload, File, CheckCircle2 
} from 'lucide-react';

interface EventFormData {
  title: string; type: string; description: string; objectives: string; guest: string;
  startDate: string; endDate: string; startTime: string; endTime: string; venue: string; duration: string; department: string;
  participants: string; audience: string; budget: string; sponsorship: boolean; requirements: string;
}

const DEFAULT_FORM_DATA: EventFormData = {
  title: '', type: 'Workshop', description: '', objectives: '', guest: '',
  startDate: '', endDate: '', startTime: '', endTime: '', venue: 'Innovation Hall', duration: '4 hours', department: 'Computer Science',
  participants: '', audience: 'Computer Science students', budget: '', sponsorship: false, requirements: ''
};

export default function NewRequestPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM_DATA);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedData = localStorage.getItem('eventDeskDraft');
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse saved draft");
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      localStorage.setItem('eventDeskDraft', JSON.stringify(newData));
      return newData;
    });
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('eventDeskDraft', JSON.stringify(formData));
    alert("Draft saved locally!");
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    if (step === 3) {
      const partNum = parseInt(formData.participants);
      if (isNaN(partNum) || partNum < 1) newErrors.participants = 'Enter at least 1 participant.';
      const budgetNum = parseFloat(formData.budget.replace(/,/g, ''));
      if (isNaN(budgetNum) || budgetNum < 0) newErrors.budget = 'Enter a budget of $0 or more.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    setShowSuccessModal(true);
    
    localStorage.removeItem('eventDeskDraft');

    let eventMonth = 'TBD';
    let eventDay = '--';
    if (formData.startDate) {
      const d = new Date(formData.startDate);
      eventMonth = d.toLocaleString('default', { month: 'short' }).toUpperCase();
      eventDay = d.getDate().toString().padStart(2, '0');
    }

    const newEvent = {
      id: Date.now(),
      month: eventMonth,
      day: eventDay,
      title: formData.title || 'Untitled Event',
      datetime: `${formData.startDate || 'TBD'} · ${formData.startTime || 'TBD'}`,
      location: formData.venue,
      status: 'Pending',
      statusColor: 'text-warning bg-warning-bg',
      statusIcon: 'Clock', 
      steps: [
        { name: 'Dean', state: 'active' }, 
        { name: 'VC', state: 'upcoming' },
        { name: 'Committees', state: 'upcoming' },
        { name: 'Event', state: 'upcoming' },
        { name: 'Reports', state: 'upcoming' },
      ]
    };

    const existing = JSON.parse(localStorage.getItem('eventDesk_submitted') || '[]');
    localStorage.setItem('eventDesk_submitted', JSON.stringify([newEvent, ...existing]));
  };

  if (!isClient) return null;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto lg:p-4 font-sans text-text-primary relative">
        
        {/* === SUCCESS MODAL OVERLAY === */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-brand-surface w-full max-w-[420px] rounded-dialog p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-success-bg rounded-full flex items-center justify-center mb-6">
                <Check className="w-6 h-6 text-success" />
              </div>
              <h2 className="text-[22px] font-bold text-text-primary mb-3">Request sent to Dean</h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-8">
                {formData.title || 'Responsible AI Workshop'} is now awaiting the Dean's review. We'll notify you at aisha.khan@westbridge.edu when there's an update.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => router.push('/faculty/events')}
                  className="px-5 py-2.5 border border-brand-border rounded-xl text-sm font-bold text-brand-primary hover:bg-brand-canvas transition-colors"
                >
                  My Events
                </button>
                <button 
                  onClick={() => router.push('/faculty/dashboard')}
                  className="px-5 py-2.5 bg-brand-primary text-brand-surface rounded-xl text-sm font-bold hover:bg-brand-hover transition-colors shadow-sm"
                >
                  View request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Container (pointer-events-none when modal is open) */}
        <div className={showSuccessModal ? 'pointer-events-none' : ''}>
          
          <div className="hidden lg:flex justify-between items-start mb-8">
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1">My Events / New request</p>
              <h1 className="text-3xl font-bold text-text-primary mb-2">New Event Request</h1>
              <p className="text-text-secondary">Bring your next campus event to life. Start with the details.</p>
            </div>
            <button onClick={handleSaveDraft} className="px-5 py-2.5 border border-brand-border rounded-lg text-sm font-semibold text-brand-primary hover:bg-brand-canvas transition-colors shadow-sm bg-brand-surface">
              Save draft
            </button>
          </div>

          <div className="hidden lg:flex items-center justify-between mb-10 px-2">
            {[{id:1, label:'Basics'}, {id:2, label:'Schedule and venue'}, {id:3, label:'Participants and budget estimate'}, {id:4, label:'Review and send'}].map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    currentStep > step.id 
                      ? 'bg-brand-primary text-brand-surface' 
                      : currentStep === step.id 
                        ? 'bg-brand-primary text-brand-surface' 
                        : 'bg-brand-selected text-text-disabled'
                  }`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className={`text-sm font-bold ${currentStep >= step.id ? 'text-text-primary' : 'text-text-disabled'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className="flex-1 h-[1px] bg-brand-border mx-4"></div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="lg:hidden flex items-center justify-center relative mb-6">
            <button className="absolute left-0 p-1 text-text-primary">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">New Event Request</h1>
          </div>

          <div className="lg:hidden mb-6">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-text-primary">Step {currentStep} of 4</span>
              <span className="text-text-disabled">{currentStep * 25}%</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-3">
              {currentStep === 1 ? 'Basics' : currentStep === 2 ? 'Schedule and venue' : currentStep === 3 ? 'Participants and budget estimate' : 'Review and send'}
            </h2>
            <div className="w-full h-1 bg-brand-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-primary transition-all duration-300"
                style={{ width: `${currentStep * 25}%` }}
              ></div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 pb-32 lg:pb-0 items-start">
            
            <div className="flex-1 w-full bg-brand-surface lg:rounded-card lg:border border-brand-border lg:shadow-card lg:p-10">
              
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">Tell us about your event</h2>
                    <p className="text-text-secondary text-sm">A clear purpose helps the Dean review your request.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormInput label="Event title *" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Responsible AI Workshop" />
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Event type *</label>
                      <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-4 py-3.5 border border-brand-border rounded-xl text-sm font-medium bg-brand-surface focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none">
                        <option>Workshop</option>
                        <option>Technical</option>
                        <option>Cultural</option>
                        <option>Sports</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-text-disabled mt-1">Event types: Technical, Cultural, Sports, Workshop, Other</p>

                  <FormTextarea label="Description *" name="description" value={formData.description} onChange={handleInputChange} placeholder="A hands-on introduction to..." />
                  <FormTextarea label="Objectives *" name="objectives" value={formData.objectives} onChange={handleInputChange} placeholder="Evaluate model bias and..." />
                  <FormInput label="Chief guest or resource person" name="guest" value={formData.guest} onChange={handleInputChange} placeholder="Dr. Maya Patel - AI Researcher" />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">Set the time and place</h2>
                    <p className="text-text-secondary text-sm">Choose a future date and the space your event needs.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormInput label="Start date *" name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} />
                    <FormInput label="End date *" name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} />
                    <FormInput label="Start time *" name="startTime" type="time" value={formData.startTime} onChange={handleInputChange} />
                    <FormInput label="End time *" name="endTime" type="time" value={formData.endTime} onChange={handleInputChange} />
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Venue *</label>
                      <select name="venue" value={formData.venue} onChange={handleInputChange} className="w-full px-4 py-3.5 border border-brand-border rounded-xl text-sm font-medium bg-brand-surface focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none">
                        <option>Innovation Hall</option>
                        <option>Main Auditorium</option>
                        <option>Seminar Room A</option>
                      </select>
                    </div>
                    <FormInput label="Expected duration" name="duration" value={formData.duration} onChange={handleInputChange} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">Department *</label>
                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-3.5 border border-brand-border rounded-xl text-sm font-medium bg-brand-surface focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none">
                      <option>Computer Science</option>
                      <option>Electronics</option>
                      <option>Mechanical</option>
                    </select>
                  </div>

                  <div className="bg-brand-selected p-4 rounded-xl flex gap-3 text-sm text-text-secondary mt-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-text-secondary" />
                    <p>All times are campus local time. Venue booking is confirmed after approval.</p>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">
                      {Object.keys(errors).length > 0 ? 'Check your estimates' : 'Plan your people and resources'}
                    </h2>
                    <p className="text-text-secondary text-sm">
                      {Object.keys(errors).length > 0 ? 'Your other event details and attachments are kept.' : 'Share an estimate. Final costs can be confirmed after approval.'}
                    </p>
                  </div>

                  {Object.keys(errors).length > 0 && (
                    <div className="bg-danger-bg border border-danger/20 text-danger p-4 rounded-xl flex items-center gap-3 mb-6 text-sm font-semibold">
                      <AlertCircle className="w-5 h-5 text-danger" />
                      Fix the {Object.keys(errors).length} highlighted fields to continue.
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormInput 
                      label="Expected participants *" 
                      name="participants" 
                      value={formData.participants} 
                      onChange={handleInputChange} 
                      error={errors.participants}
                    />
                    <FormInput 
                      label="Estimated budget (USD) *" 
                      name="budget" 
                      value={formData.budget} 
                      onChange={handleInputChange} 
                      error={errors.budget}
                    />
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-text-primary">Target audience *</label>
                      <select name="audience" value={formData.audience} onChange={handleInputChange} className="w-full px-4 py-3.5 border border-brand-border rounded-xl text-sm font-medium bg-brand-surface focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none">
                        <option>Computer Science students</option>
                        <option>All Engineering</option>
                        <option>Faculty Only</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between lg:mt-8">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Sponsorship expected</p>
                        <p className="text-xs text-text-secondary mt-0.5">Yes - Not yet confirmed</p>
                      </div>
                      <div 
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors flex ${formData.sponsorship ? 'bg-brand-primary justify-end' : 'bg-slate-300 justify-start'}`}
                        onClick={() => setFormData(prev => ({ ...prev, sponsorship: !prev.sponsorship }))}
                      >
                        <div className="w-4 h-4 bg-brand-surface rounded-full shadow-sm"></div>
                      </div>
                    </div>
                  </div>

                  <FormTextarea label="Special requirements" name="requirements" value={formData.requirements} onChange={handleInputChange} placeholder="Projector, Wi-Fi and 20 laptops; step-free access." />

                  {Object.keys(errors).length === 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-text-primary">Attachments</p>
                        <div className="border-2 border-dashed border-brand-border rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-brand-canvas transition-colors">
                          <Upload className="w-6 h-6 text-text-disabled mb-2" />
                          <p className="text-sm font-bold text-text-primary">Upload or drop files</p>
                          <p className="text-xs text-text-disabled mb-2">PDF, PNG or JPG · Up to 10 MB</p>
                          <span className="text-sm font-semibold text-brand-primary">Browse files</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-text-primary">2 files attached</p>
                        <div className="space-y-3">
                          <div className="flex items-center p-3 border border-brand-border rounded-xl bg-brand-canvas">
                            <FileText className="w-5 h-5 text-text-disabled mr-3" />
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-text-primary truncate">workshop-proposal.pdf</p>
                              <p className="text-xs text-text-secondary">PDF · 1.8 MB · Uploaded</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-success ml-2" />
                          </div>
                          <div className="flex items-center p-3 border border-brand-border rounded-xl bg-brand-canvas">
                            <File className="w-5 h-5 text-text-disabled mr-3" />
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-text-primary truncate">room-layout.png</p>
                              <p className="text-xs text-text-secondary">PNG · 420 KB · Uploaded</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-success ml-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm font-bold text-text-primary">2 files attached - Uploads kept</p>
                      <p className="text-xs text-text-secondary">workshop-proposal.pdf · room-layout.png</p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">Review your request</h2>
                    <p className="text-text-secondary text-sm">Check every detail before sending it to the Dean.</p>
                  </div>

                  <ReviewSection 
                    title="Basics"
                    onEdit={() => setCurrentStep(1)}
                    items={[
                      { label: 'Event', value: `${formData.title || 'Responsible AI Workshop'} - ${formData.type}` },
                      { label: 'Description', value: formData.description || 'A hands-on introduction to building fair, transparent AI systems.' },
                      { label: 'Objectives', value: formData.objectives || 'Evaluate model bias and build a responsible AI checklist.' },
                      { label: 'Resource person', value: formData.guest || 'Dr. Maya Patel - AI Researcher' },
                    ]}
                  />

                  <ReviewSection 
                    title="Schedule and venue"
                    onEdit={() => setCurrentStep(2)}
                    items={[
                      { label: 'Start / end date', value: 'Nov 20, 2026 / Nov 20, 2026' },
                      { label: 'Time', value: '10:00 AM – 2:00 PM', colSpan: 1 },
                      { label: 'Duration', value: '4 hours', colSpan: 1 },
                      { label: 'Venue', value: 'Innovation Hall', colSpan: 1 },
                      { label: 'Department', value: 'Computer Science', colSpan: 1 },
                    ]}
                    grid
                  />

                  <ReviewSection 
                    title="Participants and budget estimate"
                    onEdit={() => setCurrentStep(3)}
                    items={[
                      { label: 'Participants / audience', value: `${formData.participants || '80'} - Computer Science students` },
                      { label: 'Estimated budget', value: `$${formData.budget || '2,400'} USD`, colSpan: 1 },
                      { label: 'Sponsorship', value: 'Yes - Not yet confirmed', colSpan: 1 },
                      { label: 'Special requirements', value: formData.requirements || 'Projector, Wi-Fi and 20 laptops; step-free access.' },
                      { label: 'Attachments', value: 'workshop-proposal.pdf · room-layout.png' },
                    ]}
                    grid
                  />
                </div>
              )}

              <div className="hidden lg:flex items-center justify-between mt-12 pt-6 border-t border-brand-border">
                {currentStep > 1 ? (
                  <button onClick={handleBack} className="text-sm font-semibold text-text-secondary hover:text-brand-primary transition-colors">
                    Back
                  </button>
                ) : (
                  <span className="text-sm text-text-disabled">Back</span>
                )}
                
                {currentStep < 4 ? (
                  <div className="flex items-center gap-6">
                    <span className="text-xs text-text-disabled">* Required fields</span>
                    <button onClick={handleNext} className="px-8 py-3 bg-brand-primary text-brand-surface rounded-xl text-sm font-bold hover:bg-brand-hover active:scale-95 transition-all shadow-md">
                      Next
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <button className="text-sm font-bold text-brand-primary hover:underline">Save draft</button>
                    <button onClick={handleSubmit} className="px-8 py-3 bg-brand-primary text-brand-surface rounded-xl text-sm font-bold hover:bg-brand-hover active:scale-95 transition-all shadow-md">
                      Send to Dean
                    </button>
                  </div>
                )}
              </div>

            </div>

            <div className="hidden lg:block w-80 flex-shrink-0 sticky top-8">
              <div className="bg-brand-selected rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-text-primary">Live summary</h3>
                  <FileText className="w-4 h-4 text-text-secondary" />
                </div>

                <div className="mb-6">
                  <p className="text-lg font-bold text-text-primary">{formData.title || 'Responsible AI Workshop'}</p>
                  <p className="text-xs text-text-secondary">{formData.type} - Dr. Aisha Khan</p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-3">
                    <Calendar className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">Schedule</p>
                      <p className="text-xs text-text-secondary">{currentStep > 1 ? 'Nov 20, 2026 · 10 AM – 2 PM' : 'Add dates and time in step 2'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">Venue</p>
                      <p className="text-xs text-text-secondary">{currentStep > 1 ? formData.venue : 'Choose a venue in step 2'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Users className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">Participants</p>
                      <p className={`text-xs ${errors.participants ? 'text-danger font-medium' : 'text-text-secondary'}`}>
                        {currentStep > 2 ? (errors.participants ? 'Needs a valid participant count' : `${formData.participants || '80'} students`) : 'Add participants in step 3'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Wallet className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">Budget estimate</p>
                      <p className={`text-xs ${errors.budget ? 'text-danger font-medium' : 'text-text-secondary'}`}>
                        {currentStep > 2 ? (errors.budget ? 'Needs a valid budget estimate' : `$${formData.budget || '2,400'} USD`) : 'Add an estimate in step 3'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 px-2">
                <p className="text-sm font-bold text-text-primary">Prepared by Dr. Aisha Khan</p>
                <p className="text-xs text-text-secondary mb-4">Computer Science - Westbridge College</p>
                <p className="text-xs text-text-disabled">Your request goes to the Dean first. You can follow its progress in My Events.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <div className="lg:hidden fixed bottom-[68px] left-0 w-full bg-brand-surface px-4 py-3 border-t border-brand-border z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between">
        {currentStep > 1 ? (
          <button onClick={handleBack} className="text-sm font-semibold text-text-secondary p-2">Back</button>
        ) : (
          <span className="text-sm text-text-disabled p-2">Back</span>
        )}
        
        {currentStep < 4 ? (
          <button onClick={handleNext} className="w-32 py-3.5 bg-brand-primary text-brand-surface rounded-xl text-sm font-bold shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all">
            Next
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button className="text-sm font-bold text-brand-primary">Save draft</button>
            <button onClick={handleSubmit} className="px-6 py-3.5 bg-brand-primary text-brand-surface rounded-xl text-sm font-bold shadow-lg active:scale-[0.98] transition-all">
              Send to Dean
            </button>
          </div>
        )}
      </div>

    </AppLayout>
  );
}

function FormInput({ label, name, type = 'text', value, onChange, placeholder, error }: any) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3.5 border rounded-xl text-sm text-text-primary font-medium bg-brand-surface outline-none transition-all ${
          error ? 'border-danger focus:ring-1 focus:ring-danger text-danger bg-danger-bg/50' : 'border-brand-border focus:border-brand-primary focus:ring-1 focus:ring-brand-primary'
        }`}
      />
      {error && <p className="text-xs font-semibold text-danger mt-1">{error}</p>}
    </div>
  );
}

function FormTextarea({ label, name, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      <textarea 
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3.5 border border-brand-border rounded-xl text-sm text-text-primary font-medium bg-brand-surface focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all resize-none"
      />
    </div>
  );
}

function ReviewSection({ title, items, grid, onEdit }: any) {
  return (
    <div className="border border-brand-border rounded-2xl p-6 bg-brand-surface">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        <button onClick={onEdit} className="text-sm font-bold text-brand-primary hover:underline">Edit</button>
      </div>
      <div className={grid ? "grid grid-cols-1 lg:grid-cols-2 gap-y-4 gap-x-6" : "space-y-4"}>
        {items.map((item: any, idx: number) => (
          <div key={idx} className={item.colSpan ? 'col-span-1' : 'col-span-full'}>
            <p className="text-sm text-text-primary leading-relaxed">
              <span className="font-bold mr-1">{item.label}:</span>
              <span className={item.value.includes('Yes') ? 'font-medium' : 'text-text-secondary'}>{item.value}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}