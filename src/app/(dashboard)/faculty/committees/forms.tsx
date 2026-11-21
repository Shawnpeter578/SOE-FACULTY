"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, Send } from "lucide-react";
import { committeeUpdateKinds, committeeUpdateLabels } from "@/lib/event-committees";
import { VC_EVIDENCE_ACCEPT } from "@/lib/validation/vc-evidence";
import { assignCommitteeCoordinator, createCommittee, searchCommitteeCoordinators, submitCommitteeUpdate } from "./actions";
import type { AssignmentActionState, CandidateSearchState } from "../co-faculty/actions";

const initial: AssignmentActionState = { success: false, message: "" };
const initialSearch: CandidateSearchState = { matches: [], message: "" };
const field = "mt-1.5 min-h-11 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary";
const label = "block text-sm font-semibold text-brand-primary";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";

function FormMessage({ result }: { result: AssignmentActionState }) {
  if (!result.message) return null;
  return <p role={result.success ? "status" : "alert"} className={`text-sm ${result.success ? "text-emerald-800" : "text-red-700"}`}>{result.message}</p>;
}

export function StartCommitteesDialog({ eventId }: { eventId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="start-committees-heading" onClose={() => router.replace(`/faculty/committees/${eventId}`, { scroll: false })} className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-brand-border bg-white p-6 text-text-primary shadow-xl backdrop:bg-brand-hover/40">
      <span className="grid size-11 place-items-center rounded-xl bg-success-bg text-emerald-800"><Check size={22} aria-hidden="true" /></span>
      <h2 id="start-committees-heading" className="mt-4 text-xl font-bold text-brand-primary">Event approved and locked</h2>
      <p className="mt-2 text-sm text-text-secondary">The Dean can access the signed letter. You can now form committees and assign co-faculty coordinators for this event.</p>
      <form method="dialog" className="mt-5 flex justify-end">
        <button type="submit" className={primary}>Start forming committees</button>
      </form>
    </dialog>
  );
}

export function CreateCommitteeForm({ eventId }: { eventId: string }) {
  const [result, submit, pending] = useActionState(createCommittee.bind(null, eventId), initial);
  return (
    <form action={submit} className="space-y-3">
      <label className={label}>Committee name
        <input name="name" maxLength={80} required className={field} placeholder="Food, logistics, or registration" />
      </label>
      <label className={label}>Responsibilities <span className="font-normal text-text-secondary">(optional)</span>
        <textarea name="responsibilities" rows={3} maxLength={1500} className={`${field} resize-y`} />
      </label>
      <button type="submit" disabled={pending} className={primary}><Plus size={16} aria-hidden="true" />{pending ? "Creating…" : "Create committee"}</button>
      <FormMessage result={result} />
    </form>
  );
}

export function AssignCommitteeForm({ committeeId, coordinatorId }: { committeeId: string; coordinatorId: string | null }) {
  const [name, setName] = useState("");
  const [search, find, searching] = useActionState(searchCommitteeCoordinators.bind(null, committeeId), initialSearch);
  const [result, assign, assigning] = useActionState(assignCommitteeCoordinator.bind(null, committeeId), initial);
  const candidates = search.matches.filter((candidate) => candidate.id !== coordinatorId);

  return (
    <div className="space-y-3">
      <form action={find}>
        <label htmlFor="committee-coordinator-name" className={label}>Find faculty by name</label>
        <div className="mt-1.5 flex gap-2">
          <input id="committee-coordinator-name" type="search" name="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className={`${field} mt-0! min-w-0`} />
          <button type="submit" disabled={searching || assigning} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected disabled:opacity-50"><Search size={16} aria-hidden="true" />{searching ? "Searching…" : "Search"}</button>
        </div>
      </form>
      {search.message && <p role="status" className="text-sm text-text-secondary">{search.message}</p>}
      {search.matches.length === 1 && !candidates.length && <p role="status" className="text-sm text-text-secondary">This faculty member already coordinates this committee.</p>}
      {candidates.length > 0 && <form action={assign} className="space-y-3">
        <div>
          <label htmlFor="committee-faculty-member" className={label}>Faculty member</label>
          <select id="committee-faculty-member" name="facultyId" required className={field}>
            <option value="">Select a faculty member</option>
            {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.full_name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={assigning || searching} className={primary}>{assigning ? "Assigning…" : coordinatorId ? "Change coordinator" : "Assign coordinator"}</button>
      </form>}
      <FormMessage result={result} />
    </div>
  );
}

export function CommitteeUpdateForm({ committeeId }: { committeeId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [result, submit, pending] = useActionState(async (previous: AssignmentActionState, data: FormData) => {
    const response = await submitCommitteeUpdate(committeeId, previous, data);
    if (response.success) {
      form.current?.reset();
      router.replace(`/faculty/co-faculty/committees/${committeeId}`, { scroll: false });
    }
    return response;
  }, initial);
  return (
    <form ref={form} className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const attachment = data.get("file");
      if (attachment instanceof File && !attachment.name) data.delete("file");
      startTransition(() => submit(data));
    }}>
      <div>
        <label htmlFor="committee-update-kind" className={label}>Type</label>
        <select id="committee-update-kind" name="kind" className={field} defaultValue="REPORT">
          {committeeUpdateKinds.map((kind) => <option value={kind} key={kind}>{committeeUpdateLabels[kind]}</option>)}
        </select>
      </div>
      <label className={label}>Title
        <input name="title" maxLength={120} required className={field} />
      </label>
      <label className={label}>Details
        <textarea name="details" rows={4} maxLength={4000} className={`${field} resize-y`} placeholder="Describe what’s needed or share your progress." />
      </label>
      <label className={label}>Attachment
        <input type="file" name="file" accept={VC_EVIDENCE_ACCEPT} className={`${field} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-selected file:px-3 file:py-1 file:font-semibold file:text-brand-primary`} />
      </label>
      <p className="text-xs text-text-secondary">Add details, a PDF, PNG or JPG up to 10 MB, or both.</p>
      <button type="submit" disabled={pending} className={primary}><Send size={16} aria-hidden="true" />{pending ? "Posting…" : "Post to committee"}</button>
      <FormMessage result={result} />
    </form>
  );
}
