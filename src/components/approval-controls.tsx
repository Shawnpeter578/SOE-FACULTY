"use client";

import { useActionState } from "react";
import Link from "next/link";
import { advanceApproval } from "@/app/(dashboard)/approval-actions";

const button = "inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60";
const field = "mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-text-primary";
const initialState = { message: "", success: false };

export default function ApprovalControls({ proposalId, mode, budget, requirements }: {
  proposalId: string;
  mode: "details" | "print" | "vc" | "lock";
  budget?: number | null;
  requirements?: string | null;
}) {
  const [state, submit, pending] = useActionState(advanceApproval.bind(null, proposalId), initialState);
  return (
    <form action={submit} className="space-y-3">
      {mode === "details" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Budget (INR)<input name="budget" inputMode="decimal" required defaultValue={budget ?? ""} className={field} /></label>
            <label className="text-sm font-semibold">Requirements<textarea name="requirements" required rows={2} maxLength={3000} defaultValue={requirements ?? ""} className={field} /></label>
          </div>
          <button name="action" value="save_details" disabled={pending} className={button}>Save budget and requirements</button>
        </>
      )}
      {mode === "print" && (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/faculty/events/${proposalId}/letter`} className="text-sm font-semibold text-brand-primary hover:underline">Open printable request letter</Link>
          <button name="action" value="mark_printed" disabled={pending} className={button}>Confirm letter printed</button>
        </div>
      )}
      {mode === "vc" && (
        <>
          <label className="block text-sm font-semibold">Remarks<textarea name="note" rows={2} maxLength={3000} className={field} placeholder="Required when declining the event" /></label>
          <div className="flex flex-wrap gap-2">
            <button name="action" value="vc_approve" disabled={pending} className={button}>Approve</button>
            <button name="action" value="vc_reject" disabled={pending} className="min-h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60">Decline</button>
          </div>
        </>
      )}
      {mode === "lock" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">Signed VC approval (PDF)<input type="file" name="document" required accept="application/pdf" className={field} /></label>
          <button name="action" value="lock_document" disabled={pending} className={button}>Upload and lock approval</button>
        </div>
      )}
      {pending && <p role="status" className="text-sm text-text-secondary">Saving…</p>}
      {state.message && !pending && <p role={state.success ? "status" : "alert"} className={`text-sm ${state.success ? "text-emerald-800" : "text-red-800"}`}>{state.message}</p>}
    </form>
  );
}
