"use client";

import { useActionState, useRef } from "react";
import { Send } from "lucide-react";
import { sendEventReport } from "./actions";

export default function SendReport({ eventId, eventTitle, deanName, revision, fileCount, committeeCount }: {
  eventId: string; eventTitle: string; deanName: string; revision: string; fileCount: number; committeeCount: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [result, submit, pending] = useActionState(async () => {
    const result = await sendEventReport(eventId, revision);
    if (result.success) dialog.current?.close();
    return result;
  }, { success: false, message: "" });
  const primary = "inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={primary}><Send size={16} aria-hidden="true" />Send reports to Dean</button>
      <dialog ref={dialog} aria-labelledby="send-report-title" onCancel={(event) => { if (pending) event.preventDefault(); }} className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-dialog border border-brand-border bg-white p-5 shadow-xl backdrop:bg-brand-hover/35 sm:p-6">
        <h2 id="send-report-title" className="text-lg font-bold text-brand-primary">Send this report package?</h2>
        <dl className="mt-4 space-y-2 rounded-lg bg-brand-canvas p-3.5 text-sm">
          <div><dt className="text-xs text-text-secondary">Event</dt><dd className="break-words font-semibold">{eventTitle}</dd></div>
          <div><dt className="text-xs text-text-secondary">Recipient</dt><dd className="break-words font-semibold">{deanName}</dd></div>
          <div><dt className="text-xs text-text-secondary">Included</dt><dd>{fileCount} {fileCount === 1 ? "file" : "files"} from {committeeCount} {committeeCount === 1 ? "committee" : "committees"}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-text-secondary">The Dean can download the included files. Sent files are kept with the submission.</p>
        {result.message && !result.success && <p role="alert" className="mt-3 text-sm text-red-700">{result.message}</p>}
        <form action={submit} className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus disabled={pending} onClick={() => dialog.current?.close()} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected">Cancel</button>
          <button type="submit" disabled={pending} className={primary}>{pending ? "Sending…" : "Confirm send"}</button>
        </form>
      </dialog>
    </>
  );
}
