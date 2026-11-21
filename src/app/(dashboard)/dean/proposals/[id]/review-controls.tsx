"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleX, Send, X } from "lucide-react";
import { reviewProposal, type ReviewState } from "./actions";

type Decision = "APPROVED_BY_DEAN" | "REJECTED";
const initialState: ReviewState = { success: false, message: null };
const primary = "inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export default function ReviewControls({ proposalId, status, title, facultyName, dates }: {
  proposalId: string;
  status: string;
  title: string;
  facultyName: string;
  dates: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const canDecide = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(status);

  useEffect(() => {
    if (decision && !dialog.current?.open) dialog.current?.showModal();
  }, [decision]);

  function completed(result: ReviewState) {
    setNotice({
      title: decision === "APPROVED_BY_DEAN" ? "Request approved" : "Request rejected",
      message: result.message ?? "",
    });
    dialog.current?.close();
  }

  return (
    <>
      {notice && (
        <div role="status" className="fixed right-4 top-24 z-40 flex w-[min(24rem,calc(100%-2rem))] items-start gap-3 rounded-xl border border-emerald-200 bg-success-bg p-4 text-emerald-900 shadow-sm sm:right-8">
          <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">{notice.title}</p><p className="mt-1 text-xs">{notice.message}</p></div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss confirmation"><X size={16} /></button>
        </div>
      )}
      {canDecide && (
        <footer className="sticky bottom-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 shadow-sm lg:bottom-0">
          <p className="text-sm font-semibold text-brand-primary">Ready for your decision</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={() => setDecision("REJECTED")} className="min-h-10 rounded-lg border border-red-300 px-5 text-sm font-semibold text-red-700 hover:bg-red-50">Reject</button>
            <button type="button" onClick={() => setDecision("APPROVED_BY_DEAN")} className={`${primary} min-w-28 bg-emerald-700 hover:bg-emerald-800`}>Approve</button>
          </div>
        </footer>
      )}
      <dialog ref={dialog} aria-labelledby="dean-decision-title" onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => setDecision(null)} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[35rem] overflow-y-auto rounded-2xl border border-brand-border bg-white p-5 text-text-primary shadow-xl backdrop:bg-brand-hover/40 sm:p-6">
        {decision && <DecisionForm decision={decision} proposalId={proposalId} title={title} facultyName={facultyName} dates={dates} onComplete={completed} onPending={setPending} onCancel={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

function DecisionForm({ decision, proposalId, title, facultyName, dates, onComplete, onCancel, onPending }: {
  decision: Decision;
  proposalId: string;
  title: string;
  facultyName: string;
  dates: string;
  onComplete: (result: ReviewState) => void;
  onCancel: () => void;
  onPending: (pending: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const rejected = decision === "REJECTED";
  const maxLength = 500;

  const [state, formAction, pending] = useActionState(async (previous: ReviewState, data: FormData) => {
    onPending(true);
    try {
      const result = await reviewProposal(previous, data);
      if (result.success) onComplete(result);
      return result;
    } catch {
      return { success: false, message: "Could not confirm the decision. Check the request status before trying again." };
    } finally {
      onPending(false);
    }
  }, initialState);

  return (
    <form action={formAction} aria-busy={pending}>
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="action" value={decision} />
      <div className="flex items-start justify-between">
        <span className={`grid size-10 place-items-center rounded-xl ${rejected ? "bg-danger-bg text-red-700" : "bg-brand-selected text-brand-primary"}`}>{rejected ? <CircleX size={19} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}</span>
        <button type="button" disabled={pending} onClick={onCancel} aria-label="Close decision dialog" className="rounded-lg p-2 text-text-secondary hover:bg-brand-canvas"><X size={18} /></button>
      </div>
      <h2 id="dean-decision-title" className="mt-4 text-xl font-bold tracking-tight">{rejected ? "Reject this request?" : "Approve this request?"}</h2>
      <p className="mt-2 text-sm text-text-secondary">{rejected ? `Rejection closes the event. Your reason will be shared with ${facultyName}.` : `${facultyName} can prepare the request letter for VC review after approval.`}</p>
      <div className="mt-4 rounded-xl bg-brand-canvas px-4 py-3">
        <p className="break-words text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-text-secondary">{facultyName} · {dates}</p>
      </div>
      <label htmlFor="dean-note" className="mt-5 block text-sm font-semibold">{rejected ? "Reason for rejection (required)" : "Remark (optional)"}</label>
      <div className="mt-2 rounded-xl border border-brand-border focus-within:border-brand-primary">
        <textarea id="dean-note" name="note" value={note} onChange={(event) => setNote(event.target.value)} rows={4} required={rejected} disabled={pending} maxLength={maxLength} placeholder={rejected ? "Explain why this event cannot proceed…" : "Add a remark for the faculty…"} className="block w-full resize-y rounded-xl px-3 pt-3 text-sm outline-none" />
        <span className="block px-3 pb-2 text-right text-xs tabular-nums text-text-secondary">{note.length} / {maxLength}</span>
      </div>
      {rejected && <p className="mt-2 text-xs text-text-secondary">{note.trim() ? "This reason will be visible to the faculty." : "Enter a reason to enable confirmation."}</p>}
      {state.message && !state.success && <p role="alert" className="mt-3 text-sm text-red-700">{state.message}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={onCancel} disabled={pending} className="min-h-10 rounded-lg border border-brand-primary/40 px-4 text-sm font-semibold text-brand-primary hover:bg-brand-canvas">Cancel</button>
        <button type="submit" disabled={pending || (rejected && !note.trim())} className={`${primary} ${rejected ? "bg-red-700 hover:bg-red-800" : "bg-emerald-700 hover:bg-emerald-800"}`}>
          {pending ? "Saving…" : rejected ? "Confirm and close event" : "Confirm approval"}
        </button>
      </div>
    </form>
  );
}
