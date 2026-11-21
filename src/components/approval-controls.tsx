"use client";

import { useActionState } from "react";
import { advanceApproval } from "@/app/(dashboard)/approval-actions";

const button = "inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60";
const field = "mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-text-primary";
const initialState = { message: "", success: false };

export default function ApprovalControls({ proposalId, budget, requirements }: {
  proposalId: string;
  budget?: number | null;
  requirements?: string | null;
}) {
  const [state, submit, pending] = useActionState(advanceApproval.bind(null, proposalId), initialState);
  return (
    <form action={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Budget (INR)<input name="budget" inputMode="decimal" required defaultValue={budget ?? ""} className={field} /></label>
        <label className="text-sm font-semibold">Requirements<textarea name="requirements" required rows={2} maxLength={3000} defaultValue={requirements ?? ""} className={field} /></label>
      </div>
      <button name="action" value="save_details" disabled={pending} className={button}>Save budget and requirements</button>
      {pending && <p role="status" className="text-sm text-text-secondary">Saving…</p>}
      {state.message && !pending && <p role={state.success ? "status" : "alert"} className={`text-sm ${state.success ? "text-emerald-800" : "text-red-800"}`}>{state.message}</p>}
    </form>
  );
}
