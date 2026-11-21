"use client";

import { useActionState, useState } from "react";
import { coordinatorProgress, progressLabels, type CoordinatorProgress } from "@/lib/event-coordinators";
import { saveCoordinatorProgress, type AssignmentActionState } from "./actions";

const initial: AssignmentActionState = { success: false, message: "" };

export default function CoordinatorProgressForm({ id, progress, title }: { id: string; progress: CoordinatorProgress; title: string }) {
  const [draft, setDraft] = useState<CoordinatorProgress | null>(null);
  const [result, submit, pending] = useActionState(async (previous: AssignmentActionState, data: FormData) => {
    const response = await saveCoordinatorProgress(id, previous, data);
    if (response.success) setDraft(null);
    return response;
  }, initial);

  return (
    <form action={submit} className="space-y-2">
      <label htmlFor={`progress-${id}`} className="block text-xs font-semibold text-text-secondary">Assignment progress<span className="sr-only"> for {title}</span></label>
      <div className="flex flex-wrap items-center gap-2">
        <select id={`progress-${id}`} name="progress" className="min-h-10 rounded-xl border border-brand-border bg-white px-3 text-sm font-medium text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary" value={draft ?? progress} onChange={(event) => setDraft(event.target.value as CoordinatorProgress)} disabled={pending}>
          {coordinatorProgress.map((status) => <option key={status} value={status}>{progressLabels[status]}</option>)}
        </select>
        <button type="submit" disabled={pending || draft === null || draft === progress} className="min-h-10 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{pending ? "Saving…" : "Save progress"}</button>
      </div>
      {result.message && <p role={result.success ? "status" : "alert"} className={`text-sm ${result.success ? "text-emerald-800" : "text-red-700"}`}>{result.message}</p>}
    </form>
  );
}
