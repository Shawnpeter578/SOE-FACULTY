"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Send, Trash2, UserRound, X } from "lucide-react";
import { COMMITTEE_FILE_ACCEPT } from "@/lib/validation/committee-attachments";
import { assignCommitteeCoordinator, createCommittee, deleteCommittee, deleteCommitteeFile, editCommittee, removeCommitteeCoordinator, searchCommitteeCoordinators, submitCommitteeUpdate, type CommitteeSearchState } from "./actions";
import type { AssignmentActionState } from "../co-faculty/actions";

const initial: AssignmentActionState = { success: false, message: "" };
const initialSearch: CommitteeSearchState = { matches: [], message: "" };
const field = "mt-1.5 min-h-11 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm font-normal text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary";
const label = "block text-sm font-semibold text-brand-primary";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";
const secondary = "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected disabled:opacity-50";
const dialogClass = "m-auto w-[min(28rem,calc(100%-2rem))] rounded-dialog border border-brand-border bg-white p-5 shadow-xl backdrop:bg-brand-hover/35 sm:p-6";

function FormMessage({ result }: { result: AssignmentActionState }) {
  if (!result.message) return null;
  return <p role={result.success ? "status" : "alert"} className={`text-sm ${result.success ? "text-emerald-800" : "text-red-700"}`}>{result.message}</p>;
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

export function CommitteeManagement({ committeeId, name, responsibilities }: { committeeId: string; name: string; responsibilities: string }) {
  const editDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ name, responsibilities });
  const [edited, edit, editing] = useActionState(async (previous: AssignmentActionState, data: FormData) => {
    const result = await editCommittee(committeeId, previous, data);
    if (result.success) editDialog.current?.close();
    return result;
  }, initial);
  const [removed, remove, removing] = useActionState(() => deleteCommittee(committeeId), initial);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondary} onClick={() => {
          setDraft({ name, responsibilities });
          editDialog.current?.showModal();
        }}><Pencil size={15} aria-hidden="true" />Edit committee</button>
        <button type="button" onClick={() => deleteDialog.current?.showModal()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-danger-bg"><Trash2 size={15} aria-hidden="true" />Delete committee</button>
      </div>

      <dialog ref={editDialog} aria-labelledby="edit-committee-title" onCancel={(event) => { if (editing) event.preventDefault(); }} className={dialogClass}>
        <h2 id="edit-committee-title" className="text-lg font-bold text-brand-primary">Edit committee</h2>
        <form action={edit} className="mt-4 space-y-3">
          <label className={label}>Committee name
            <input className={field} name="name" required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className={label}>Responsibilities
            <textarea className={`${field} resize-y`} rows={3} maxLength={1500} name="responsibilities" value={draft.responsibilities} onChange={(event) => setDraft({ ...draft, responsibilities: event.target.value })} />
          </label>
          {!edited.success && <FormMessage result={edited} />}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={editing} onClick={() => editDialog.current?.close()} className={secondary}>Cancel</button>
            <button type="submit" disabled={editing} className={primary}>{editing ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </dialog>

      <dialog ref={deleteDialog} aria-labelledby="delete-committee-title" onCancel={(event) => { if (removing) event.preventDefault(); }} className={dialogClass}>
        <h2 id="delete-committee-title" className="text-lg font-bold text-brand-primary">Delete committee?</h2>
        <p className="mt-2 break-words text-sm text-text-secondary"><strong>{name}</strong> will be removed from active workspaces along with its chat and files. The Dean can still download any files already submitted.</p>
        <form action={remove} className="mt-4 space-y-3">
          <FormMessage result={removed} />
          <div className="flex justify-end gap-2">
            <button type="button" autoFocus disabled={removing} onClick={() => deleteDialog.current?.close()} className={secondary}>Cancel</button>
            <button type="submit" disabled={removing} className="min-h-10 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{removing ? "Deleting…" : "Delete committee"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function AssignCommitteeForm({ committeeId, coordinators }: { committeeId: string; coordinators: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [searching, setSearching] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) return;
      setSearching(true);
      const data = new FormData();
      data.set("name", query);
      try {
        const response = await searchCommitteeCoordinators(committeeId, initialSearch, data);
        if (!cancelled) setSearch(response);
      } catch {
        if (!cancelled) setSearch({ matches: [], message: "Search failed. Check your connection and try again." });
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [committeeId, query, retry]);
  const [result, assign, assigning] = useActionState(assignCommitteeCoordinator.bind(null, committeeId), initial);
  const [removed, remove, removing] = useActionState(async (_previous: AssignmentActionState, data: FormData) =>
    removeCommitteeCoordinator(committeeId, String(data.get("facultyId"))), initial);
  const candidates = search.matches.filter((candidate) => !coordinators.some(({ id }) => id === candidate.id));
  const full = coordinators.length >= 2;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {coordinators.map(({ id, name }) => (
          <form key={id} action={remove} className="flex min-w-0 items-center gap-2 rounded-lg bg-brand-canvas px-3 py-2">
            <UserRound size={16} className="shrink-0 text-brand-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words text-sm font-medium">{name}</span>
            <button name="facultyId" value={id} type="submit" disabled={removing || assigning} aria-label={`Remove ${name}`} className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-brand-selected hover:text-red-700"><X size={16} aria-hidden="true" /></button>
          </form>
        ))}
        {coordinators.length === 0 && <p className="text-sm text-text-secondary">No co-faculty assigned yet.</p>}
      </div>
      {!full && <>
        <form onSubmit={(event) => { event.preventDefault(); setRetry((value) => value + 1); }}>
          <label htmlFor="committee-coordinator-name" className={label}>Find faculty by name or email</label>
          <div className="mt-1.5 flex gap-2">
            <input id="committee-coordinator-name" type="search" name="name" required minLength={2} maxLength={254} value={query} onChange={(event) => { setQuery(event.target.value); setSearch(initialSearch); setSearching(event.target.value.trim().length >= 2); }} placeholder="Type a name or full sign-in email" className={`${field} mt-0! min-w-0`} />
            <button type="submit" disabled={searching || assigning} className="grid size-11 shrink-0 place-items-center rounded-lg border border-brand-border text-brand-primary hover:bg-brand-selected" aria-label="Search faculty"><Search size={17} aria-hidden="true" /></button>
          </div>
        </form>
        <p className="text-xs text-text-secondary">Search registered faculty accounts using at least 2 characters. Your own account is excluded.</p>
        {searching && <p role="status" className="text-sm text-text-secondary">Searching…</p>}
        {search.message && <p role="status" className="text-sm text-text-secondary">{search.message}</p>}
        {search.matches.length > 0 && candidates.length === 0 && <p className="text-sm text-text-secondary">All matches are already on this committee.</p>}
        {candidates.length > 0 && <form action={assign} className="divide-y divide-brand-border rounded-lg border border-brand-border">
          {candidates.map((person) => <div key={person.id} className="flex items-center gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-brand-primary">{person.full_name}</p>
              {person.email && <p className="break-all text-xs text-text-secondary">{person.email}</p>}
            </div>
            <button type="submit" name="facultyId" value={person.id} disabled={assigning || removing || searching} aria-label={`Add ${person.full_name}`} className="inline-flex min-h-9 items-center gap-1 rounded-md bg-brand-selected px-2 text-xs font-semibold text-brand-primary hover:bg-brand-border disabled:opacity-50"><Plus size={14} aria-hidden="true" />Add</button>
          </div>)}
        </form>}
      </>}
      <FormMessage result={result} />
      <FormMessage result={removed} />
    </div>
  );
}

export function DeleteCommitteeFileForm({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [result, remove, pending] = useActionState(async () => {
    const response = await deleteCommitteeFile(id);
    if (response.success) dialog.current?.close();
    return response;
  }, initial);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-danger-bg">Delete</button>
      <dialog ref={dialog} aria-label="Delete committee file" onCancel={(event) => { if (pending) event.preventDefault(); }} className="m-auto w-[min(25rem,calc(100%-2rem))] rounded-dialog border border-brand-border bg-white p-5 shadow-xl backdrop:bg-brand-hover/35">
        <h3 className="font-bold text-brand-primary">Delete this file?</h3>
        <p className="mt-2 break-all text-sm text-text-secondary">{name} will be removed from Reports and the conversation.</p>
        <form action={remove} className="mt-4 space-y-3">
          {!result.success && <FormMessage result={result} />}
          <div className="flex justify-end gap-2">
            <button type="button" autoFocus disabled={pending} onClick={() => dialog.current?.close()} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected">Cancel</button>
            <button type="submit" disabled={pending} className="min-h-10 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Deleting…" : "Delete file"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function CommitteeUpdateForm({ committeeId, href, confirmFileSent }: { committeeId: string; href: string; confirmFileSent: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const sentDialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [result, submit, pending] = useActionState(async (previous: AssignmentActionState, data: FormData) => {
    const response = await submitCommitteeUpdate(committeeId, previous, data);
    if (response.success) {
      form.current?.reset();
      router.replace(href, { scroll: false });
      if (confirmFileSent && data.has("file")) sentDialog.current?.showModal();
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
      {confirmFileSent && <dialog ref={sentDialog} aria-labelledby="committee-file-sent-title" className={dialogClass}>
        <h2 id="committee-file-sent-title" className="text-lg font-bold text-brand-primary">File sent</h2>
        <p className="mt-2 text-sm text-text-secondary">Your event lead can see the file in this committee’s Shared files and in Reports.</p>
        <button type="button" onClick={() => sentDialog.current?.close()} className={`${primary} mt-5`}>Done</button>
      </dialog>}
      <input type="hidden" name="kind" value="MESSAGE" />
      <label className={label}>Message
        <textarea name="details" rows={3} maxLength={4000} className={`${field} resize-y`} placeholder="Write to your committee…" />
      </label>
      <label className={label}>Attachment
        <input type="file" name="file" accept={COMMITTEE_FILE_ACCEPT} className={`${field} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-selected file:px-3 file:py-1 file:font-semibold file:text-brand-primary`} />
      </label>
      <p className="text-xs text-text-secondary">PDF, Word, Excel, PowerPoint, OpenDocument, text files and images · Up to 10 MB</p>
      <button type="submit" disabled={pending} className={primary}><Send size={16} aria-hidden="true" />{pending ? "Sending…" : "Send to committee"}</button>
      <FormMessage result={result} />
    </form>
  );
}
