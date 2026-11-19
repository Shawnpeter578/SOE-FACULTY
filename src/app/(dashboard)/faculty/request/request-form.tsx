"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Calendar, Check, FileText, MapPin, Upload, Users, Wallet, X } from "lucide-react";
import { eventRequestSchema } from "@/lib/validation/event-proposal";
import { validateAttachments } from "@/lib/validation/proposal-attachments";
import { submitEventProposal } from "../events/new/actions";

const DEFAULT_VALUES = {
  title: "", event_type: "Workshop", description: "", objectives: "", resource_person: "",
  start_date: "", end_date: "", start_time: "", end_time: "", venue: "Innovation Hall",
  duration: "", department: "Computer Science", expected_participants: "",
  target_audience: "Computer Science students", estimated_budget: "", sponsorship_expected: false,
  special_requirements: "",
};
type Values = typeof DEFAULT_VALUES;
type FieldName = keyof Values;
type FieldErrors = Record<string, string>;
type InputChange = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

const STEPS = ["Basics", "Schedule and venue", "Participants and budget estimate", "Review and send"];
const STEP_FIELDS: FieldName[][] = [
  ["title", "event_type", "description", "objectives", "resource_person"],
  ["start_date", "end_date", "start_time", "end_time", "venue", "duration", "department"],
  ["expected_participants", "target_audience", "estimated_budget", "sponsorship_expected", "special_requirements"],
];
const inputClass = "w-full rounded-xl border border-brand-border bg-white px-4 py-3.5 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary disabled:opacity-60";

export default function RequestForm({ profile }: { profile: { id: string; fullName: string } }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(DEFAULT_VALUES);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const dashboardButton = useRef<HTMLButtonElement>(null);
  const draftKey = `eventdesk:draft:${profile.id}`;

  useEffect(() => {
    if (!sent) return;
    dashboardButton.current?.focus();
    const timeout = window.setTimeout(() => router.replace("/faculty/dashboard"), 5000);
    return () => window.clearTimeout(timeout);
  }, [router, sent]);

  function loadDraft() {
    try {
      const draft: unknown = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
        setMessage("There is no saved draft on this device.");
        return;
      }

      const restored = { ...DEFAULT_VALUES };
      for (const key of Object.keys(DEFAULT_VALUES) as FieldName[]) {
        const value = (draft as Record<string, unknown>)[key];
        if (key === "sponsorship_expected") {
          if (typeof value === "boolean") restored[key] = value;
        } else if (typeof value === "string") {
          restored[key] = value;
        }
      }
      setValues(restored);
      setFiles([]);
      goTo(1);
      setMessage("Saved draft loaded. Reattach any files before sending.");
    } catch {
      setMessage("Your browser could not load the saved draft.");
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
      setMessage("Draft saved on this device. Use Load saved draft to pick up where you left off.");
    } catch {
      setMessage("Your browser could not save this draft. Keep this page open to retain your inputs.");
    }
  }

  function change(event: InputChange) {
    const name = event.target.name as FieldName;
    const value = event.target instanceof HTMLInputElement && event.target.type === "checkbox"
      ? event.target.checked : event.target.value;
    const next = { ...values, [name]: value };
    setValues(next);
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setMessage("");
  }

  function goTo(nextStep: number) {
    setStep(nextStep);
    setErrors({});
    heading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    heading.current?.focus({ preventScroll: true });
  }

  function getErrors() {
    const parsed = eventRequestSchema.safeParse(values);
    const nextErrors: FieldErrors = {};
    if (!parsed.success) for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      nextErrors[key] ??= issue.message;
    }
    // Check the schedule at step 2, even before required estimates in step 3 exist.
    if (values.start_date && values.end_date && values.end_date < values.start_date) {
      nextErrors.end_date = "End date must be on or after the start date.";
    }
    if (values.start_date && values.start_date === values.end_date && values.start_time && values.end_time && values.end_time <= values.start_time) {
      nextErrors.end_time = "End time must be after the start time for a single-day event.";
    }
    const attachmentError = validateAttachments(files);
    if (attachmentError) nextErrors.attachments = attachmentError;
    return nextErrors;
  }

  function next() {
    const allErrors = getErrors();
    const currentErrors = Object.fromEntries(Object.entries(allErrors).filter(([key]) =>
      STEP_FIELDS[step - 1].includes(key as FieldName) || (step === 3 && key === "attachments"),
    ));
    setErrors(currentErrors);
    if (!Object.keys(currentErrors).length) goTo(step + 1);
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = [...files, ...Array.from(event.target.files ?? [])];
    const error = validateAttachments(nextFiles);
    if (error) setErrors((previous) => ({ ...previous, attachments: error }));
    else {
      setFiles(nextFiles);
      setErrors((previous) => ({ ...previous, attachments: "" }));
    }
    event.target.value = "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) { next(); return; }
    if (submitting.current || sent) return;
    const allErrors = getErrors();
    if (Object.keys(allErrors).length) {
      const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((key) => allErrors[key]));
      setStep(firstStep < 0 ? 3 : firstStep + 1);
      setErrors(allErrors);
      return;
    }
    confirmation.current?.showModal();
  }

  function send() {
    if (submitting.current || sent) return;
    const payload = new FormData();
    for (const [key, value] of Object.entries(values)) payload.set(key, String(value));
    for (const file of files) payload.append("attachments", file);
    submitting.current = true;
    setMessage("");
    startTransition(async () => {
      try {
        const response = await submitEventProposal({ success: false, message: null }, payload);
        if (response.success) {
          try { localStorage.removeItem(draftKey); } catch { /* Submission is already saved on the server. */ }
          setSent(true);
        } else {
          confirmation.current?.close();
          setMessage(response.message ?? "Unable to submit your request.");
          heading.current?.scrollIntoView({ block: "start" });
          if (response.errors) {
            const fieldErrors = Object.fromEntries(Object.entries(response.errors).map(([key, messages]) => [key, messages[0]]));
            const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((key) => fieldErrors[key]));
            setStep(firstStep < 0 ? 3 : firstStep + 1);
            setErrors(fieldErrors);
          }
        }
      } catch {
        confirmation.current?.close();
        setMessage("We could not confirm your submission. Check My Events before retrying. Your inputs are kept here.");
        heading.current?.scrollIntoView({ block: "start" });
      } finally { submitting.current = false; }
    });
  }

  const schedule = values.start_date
    ? `${values.start_date}${values.end_date !== values.start_date ? ` to ${values.end_date || "…"}` : ""} · ${values.start_time || "…"}–${values.end_time || "…"}`
    : "Add dates and time in step 2";
  const budget = values.estimated_budget === "" ? "Not entered" : new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(values.estimated_budget) || 0);

  function field(name: Exclude<FieldName, "sponsorship_expected">, label: string, type = "text", placeholder?: string) {
    return <Field key={name} name={name} label={label} error={errors[name]}>
      <input id={name} name={name} type={type} value={values[name]} onChange={change} placeholder={placeholder}
        aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined}
        min={type === "number" ? (name === "estimated_budget" ? 0 : 1) : undefined}
        step={type === "number" ? (name === "estimated_budget" ? "0.01" : "1") : undefined}
        className={inputClass} />
    </Field>;
  }
  function textarea(name: "description" | "objectives" | "special_requirements", label: string, placeholder?: string) {
    return <Field name={name} label={label} error={errors[name]}>
      <textarea id={name} name={name} value={values[name]} onChange={change} rows={3} placeholder={placeholder}
        aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} className={`${inputClass} resize-y`} />
    </Field>;
  }
  function select(name: "event_type" | "venue" | "department" | "target_audience", label: string, options: string[]) {
    return <Field name={name} label={label} error={errors[name]}>
      <select id={name} name={name} value={values[name]} onChange={change} className={inputClass} aria-invalid={!!errors[name]}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </Field>;
  }

  return (
    <div className="mx-auto max-w-6xl font-sans text-text-primary lg:p-4">
      <dialog
        ref={confirmation}
        aria-labelledby="send-request-title"
        aria-describedby="send-request-description"
        onCancel={(event) => {
          if (submitting.current || sent) event.preventDefault();
          if (sent) router.replace("/faculty/dashboard");
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-brand-border bg-white p-6 text-text-primary shadow-xl backdrop:bg-slate-900/50"
      >
        {sent ? (
          <>
            <div role="status">
              <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-success-bg text-success">
                <Check aria-hidden="true" size={22} />
              </span>
              <h2 id="send-request-title" className="text-xl font-bold">Request sent</h2>
              <p id="send-request-description" className="mt-2 break-words text-sm text-text-secondary">
                {values.title} was sent to the Dean. Returning to your dashboard…
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button ref={dashboardButton} type="button" onClick={() => router.replace("/faculty/dashboard")} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white">
                Go to dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="send-request-title" className="text-xl font-bold">Send request to the Dean?</h2>
            <p id="send-request-description" className="mt-2 break-words text-sm text-text-secondary">
              The Dean will receive {values.title} for review.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={pending} onClick={() => !submitting.current && confirmation.current?.close()} className="rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
                Cancel
              </button>
              <button type="button" disabled={pending} onClick={send} className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {pending ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </dialog>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/faculty/events" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-text-secondary"><ArrowLeft size={14} /> My Events</Link>
          <h1 ref={heading} tabIndex={-1} className="mb-2 text-2xl font-bold outline-none lg:text-3xl">New Event Request</h1>
          <p className="text-sm text-text-secondary">Bring your next campus event to life. Start with the details.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadDraft} disabled={pending} className="rounded-lg border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-primary">
            Load saved draft
          </button>
          <button type="button" onClick={saveDraft} disabled={pending} className="rounded-lg border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-primary">
            Save draft
          </button>
        </div>
      </div>

      <ol className="mb-8 grid grid-cols-4 gap-2 lg:gap-4" aria-label="Request progress">
        {STEPS.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={`flex items-center gap-2 rounded-xl p-2 text-xs font-semibold lg:text-sm ${step >= index + 1 ? "text-brand-primary" : "text-text-secondary"}`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step >= index + 1 ? "bg-brand-primary text-white" : "bg-brand-selected"}`}>{step > index + 1 ? <Check size={16} /> : index + 1}</span>
          <span className="hidden sm:inline">{label}</span>
        </li>)}
      </ol>
      {message && <p role="status" className="mb-5 rounded-xl border border-brand-border bg-white p-4 text-sm">{message}</p>}

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <form onSubmit={submit} noValidate className="w-full flex-1 rounded-2xl border border-brand-border bg-white p-5 shadow-card lg:p-9" aria-busy={pending}>
          <fieldset disabled={pending} className="min-w-0 space-y-6">
            <legend className="sr-only">{STEPS[step - 1]}</legend>
            <div>
              <p className="mb-1 text-xs font-semibold text-text-secondary">Step {step} of 4</p>
              <h2 className="text-2xl font-bold">{["Tell us about your event", "Set the time and place", "Plan your people and resources", "Review your request"][step - 1]}</h2>
              <p className="mt-2 text-sm text-text-secondary">{step === 4 ? "Check every detail before sending it to the Dean." : "Fields marked * are required."}</p>
            </div>
            {Object.values(errors).some(Boolean) && <div role="alert" className="flex gap-3 rounded-xl bg-danger-bg p-4 text-sm text-danger"><AlertCircle className="shrink-0" size={20} /> Please correct the highlighted fields to continue.</div>}

            {step === 1 && <>
              <div className="grid gap-6 sm:grid-cols-2">
                {field("title", "Event title *", "text", "e.g. Responsible AI Workshop")}
                {select("event_type", "Event type *", ["Workshop", "Technical", "Cultural", "Sports", "Other"])}
              </div>
              {textarea("description", "Description *", "Describe your event in at least 20 characters.")}
              {textarea("objectives", "Objectives *", "What should participants learn or achieve?")}
              {field("resource_person", "Chief guest or resource person", "text", "Name and designation, if known")}
            </>}

            {step === 2 && <>
              <div className="grid gap-6 sm:grid-cols-2">
                {field("start_date", "Start date *", "date")}{field("end_date", "End date *", "date")}
                {field("start_time", "Start time *", "time")}{field("end_time", "End time *", "time")}
                {select("venue", "Venue *", ["Innovation Hall", "Main Auditorium", "Seminar Room A"])}
                {field("duration", "Expected duration", "text", "e.g. 4 hours")}
              </div>
              {select("department", "Department *", ["Computer Science", "Electronics", "Mechanical"])}
              <p className="rounded-xl bg-brand-selected p-4 text-sm text-text-secondary">All times are campus local time (IST). Venue booking is confirmed after approval.</p>
            </>}

            {step === 3 && <>
              <div className="grid gap-6 sm:grid-cols-2">
                {field("expected_participants", "Expected participants *", "number")}
                {field("estimated_budget", "Estimated budget (INR) *", "number")}
                {select("target_audience", "Target audience *", ["Computer Science students", "All Engineering", "Faculty Only"])}
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                  <input type="checkbox" name="sponsorship_expected" checked={values.sponsorship_expected} onChange={change} className="h-5 w-5 accent-brand-primary" /> Sponsorship expected
                </label>
              </div>
              {textarea("special_requirements", "Special requirements", "Equipment, accessibility or other requirements")}
              <div>
                <label htmlFor="attachments" className="mb-2 block text-sm font-semibold">Attachments (optional)</label>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-border p-6 text-center text-sm text-text-secondary">
                  <Upload size={24} /><span>Choose PDF, JPG or PNG files</span><span className="text-xs">Up to 3 files, 5 MB each. Files upload when you send your request.</span>
                  <input id="attachments" type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={addFiles} className="mt-2 block w-full max-w-sm text-xs" aria-describedby="attachments-error" />
                </label>
                {errors.attachments && <p id="attachments-error" role="alert" className="mt-2 text-xs text-danger">{errors.attachments}</p>}
                <ul className="mt-3 space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-brand-border p-3">
                  <FileText size={20} className="shrink-0 text-text-secondary" /><span className="min-w-0 flex-1 truncate text-sm">{file.name} <span className="text-xs text-text-secondary">({Math.ceil(file.size / 1024)} KB)</span></span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => { setFiles((previous) => previous.filter((_, i) => i !== index)); setErrors((previous) => ({ ...previous, attachments: "" })); }} className="p-1"><X size={16} /></button>
                </li>)}</ul>
              </div>
            </>}

            {step === 4 && <>
              <Review title="Basics" onEdit={() => goTo(1)} items={[
                ["Event", `${values.title} · ${values.event_type}`], ["Description", values.description],
                ["Objectives", values.objectives], ["Resource person", values.resource_person || "Not specified"],
              ]} />
              <Review title="Schedule and venue" onEdit={() => goTo(2)} items={[
                ["Start / end date", `${values.start_date} / ${values.end_date}`], ["Time (IST)", `${values.start_time}–${values.end_time}`],
                ["Duration", values.duration || "Not specified"], ["Venue", values.venue], ["Department", values.department],
              ]} />
              <Review title="Participants and budget estimate" onEdit={() => goTo(3)} items={[
                ["Participants / audience", `${values.expected_participants} · ${values.target_audience}`], ["Estimated budget", budget],
                ["Sponsorship", values.sponsorship_expected ? "Expected, not yet confirmed" : "Not expected"],
                ["Special requirements", values.special_requirements || "None"], ["Attachments", files.map((file) => file.name).join(", ") || "None"],
              ]} />
            </>}
            <div className="flex items-center justify-between gap-4 border-t border-brand-border pt-6">
              <button type="button" onClick={() => goTo(step - 1)} disabled={step === 1} className="text-sm font-semibold text-text-secondary disabled:opacity-40">Back</button>
              <button type="submit" className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-60">{pending ? "Sending…" : step < 4 ? "Next" : "Send to Dean"}</button>
            </div>
          </fieldset>
        </form>

        <aside className="hidden w-72 shrink-0 space-y-5 lg:block">
          <div className="rounded-2xl bg-brand-selected p-6">
            <h3 className="mb-6 font-bold">Live summary</h3>
            <p className="text-lg font-bold break-words">{values.title || "Your event title"}</p>
            <p className="mb-6 text-xs text-text-secondary">{values.event_type} · {profile.fullName}</p>
            <div className="space-y-5">{[
              { icon: Calendar, title: "Schedule", value: schedule }, { icon: MapPin, title: "Venue", value: values.venue },
              { icon: Users, title: "Participants", value: values.expected_participants || "Add participants in step 3" },
              { icon: Wallet, title: "Budget estimate", value: budget },
            ].map((item) => <div key={item.title} className="flex gap-3"><item.icon size={20} className="shrink-0 text-text-secondary" /><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-text-secondary">{item.value}</p></div></div>)}</div>
          </div>
          <p className="px-2 text-sm font-semibold">Prepared by {profile.fullName}</p>
          <p className="px-2 text-xs leading-relaxed text-text-secondary">Your request goes to the Dean first. Follow its progress and review feedback in My Events.</p>
        </aside>
      </div>
    </div>
  );
}

function Field({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label htmlFor={name} className="block text-sm font-semibold">{label}</label>{children}{error && <p id={`${name}-error`} className="text-xs font-semibold text-danger">{error}</p>}</div>;
}

function Review({ title, items, onEdit }: { title: string; items: [string, string][]; onEdit: () => void }) {
  return <section className="rounded-2xl border border-brand-border p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold">{title}</h3><button type="button" onClick={onEdit} className="text-sm font-semibold text-brand-primary hover:underline">Edit</button></div><dl className="space-y-3">{items.map(([label, value]) => <div key={label}><dt className="text-sm font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-text-secondary">{value}</dd></div>)}</dl></section>;
}
