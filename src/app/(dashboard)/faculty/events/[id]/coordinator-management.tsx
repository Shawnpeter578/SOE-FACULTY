"use client";

import { useActionState, useState } from "react";
import { Search, UserRoundPlus, UsersRound } from "lucide-react";
import { formatEventDateRange } from "@/lib/event-approval";
import { progressLabels, type CoordinatorAssignment } from "@/lib/event-coordinators";
import { assignCoordinator, findCoordinatorCandidates, removeCoordinator, type AssignmentActionState, type CandidateSearchState } from "../../co-faculty/actions";
import { facultyCardClass } from "../../components/workspace-styles";

const emptySearch: CandidateSearchState = { matches: [], message: "" };
const initial: AssignmentActionState = { success: false, message: "" };
const inputClass = "min-h-11 w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-primary";
const buttonClass = "min-h-11 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";

export default function CoordinatorManagement({ eventId, assignments, message }: {
  eventId: string;
  assignments: CoordinatorAssignment[];
  message: string | null;
}) {
  const [name, setName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [search, submitSearch, searching] = useActionState(async (previous: CandidateSearchState, data: FormData) => {
    setFacultyId("");
    return findCoordinatorCandidates(eventId, previous, data);
  }, emptySearch);
  const [result, submitAssignment, assigning] = useActionState(async (previous: AssignmentActionState, data: FormData) => {
    const response = await assignCoordinator(eventId, previous, data);
    if (response.success) {
      setFacultyId("");
      setResponsibilities("");
      setDueDate("");
    }
    return response;
  }, initial);
  const assigned = new Set(assignments.map((assignment) => assignment.faculty_id));
  const candidates = search.matches.filter((candidate) => !assigned.has(candidate.id));

  return (
    <section className={`${facultyCardClass} min-w-0 p-4 sm:p-6`} aria-labelledby="event-coordinator-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-selected text-brand-primary"><UsersRound size={19} aria-hidden="true" /></span>
        <div>
          <h2 id="event-coordinator-title" className="text-lg font-bold text-brand-primary">Co-Faculty coordinators</h2>
          <p className="text-sm text-text-secondary">Assign faculty to help with this event and track their progress.</p>
        </div>
      </div>
      {message ? <p role="status" className="mt-4 text-sm text-text-secondary">{message}</p> : (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <form action={submitSearch} className="space-y-1.5">
              <label htmlFor="coordinator-search" className="text-sm font-semibold text-text-primary">Find faculty by name</label>
              <div className="flex gap-2">
                <input id="coordinator-search" name="name" className={`${inputClass} min-w-0`} type="search" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required />
                <button type="submit" disabled={searching || assigning} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected disabled:opacity-50"><Search size={16} aria-hidden="true" /> Search</button>
              </div>
              {searching && <p role="status" className="text-sm text-text-secondary">Searching…</p>}
              {!searching && search.message && <p role="status" className="text-sm text-text-secondary">{search.message}</p>}
            </form>
            {candidates.length > 0 && <form action={submitAssignment} className="space-y-3">
              <label className="block text-sm font-semibold text-text-primary">Faculty member
                <select name="facultyId" value={facultyId} onChange={(event) => setFacultyId(event.target.value)} required disabled={assigning || searching} className={`${inputClass} mt-1.5 bg-white`}>
                  <option value="">Select a faculty member</option>
                  {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.full_name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-text-primary">Responsibilities
                <textarea name="responsibilities" value={responsibilities} onChange={(event) => setResponsibilities(event.target.value)} rows={3} maxLength={1000} required disabled={assigning} className={`${inputClass} mt-1.5 resize-y`} placeholder="For example, coordinate the registration desk." />
              </label>
              <label className="block text-sm font-semibold text-text-primary">Due date (optional)
                <input name="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={assigning} className={`${inputClass} mt-1.5`} />
              </label>
              <button type="submit" className={buttonClass} disabled={!facultyId || !responsibilities.trim() || assigning || searching}><span className="inline-flex items-center gap-2"><UserRoundPlus size={17} aria-hidden="true" />{assigning ? "Assigning…" : "Assign co-coordinator"}</span></button>
            </form>}
            {result.message && <p role={result.success ? "status" : "alert"} className={`text-sm ${result.success ? "text-emerald-800" : "text-red-700"}`}>{result.message}</p>}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-brand-primary">Assigned coordinators</h3>
            {assignments.length === 0 ? <p className="mt-2 rounded-xl bg-brand-canvas p-3 text-sm text-text-secondary">No co-coordinators assigned yet.</p>
              : <ul className="mt-2 space-y-2">{assignments.map((assignment) => <CoordinatorRow key={assignment.id} assignment={assignment} />)}</ul>}
          </div>
        </div>
      )}
    </section>
  );
}

function CoordinatorRow({ assignment }: { assignment: CoordinatorAssignment }) {
  const [result, submit, pending] = useActionState(removeCoordinator.bind(null, assignment.id), initial);
  return (
    <li className="min-w-0 space-y-1 rounded-xl border border-brand-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="break-words text-sm font-bold text-brand-primary">{assignment.coordinator_name}</p>
        <span className="rounded-full bg-brand-selected px-2.5 py-1 text-xs font-semibold text-brand-primary">{progressLabels[assignment.progress]}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{assignment.responsibilities}</p>
      {assignment.due_date && <p className="text-xs text-text-secondary">Due {formatEventDateRange(assignment.due_date, assignment.due_date)}</p>}
      <form action={submit} className="pt-1">
        <button type="submit" aria-label={`Remove ${assignment.coordinator_name}`} disabled={pending} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{pending ? "Removing…" : "Remove"}</button>
        {!result.success && result.message && <p role="alert" className="mt-1 text-xs text-red-700">{result.message}</p>}
      </form>
    </li>
  );
}
