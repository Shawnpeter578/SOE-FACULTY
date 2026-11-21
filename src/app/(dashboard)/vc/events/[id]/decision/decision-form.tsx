"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, FileText, ShieldCheck, Upload, X } from "lucide-react";
import { VC_EVIDENCE_ACCEPT, VC_REASON_MAX_LENGTH, vcEvidenceError } from "@/lib/validation/vc-evidence";
import { recordDecision } from "./actions";

type Outcome = "APPROVED" | "REJECTED";

export default function DecisionForm({ id, title, alreadyAccepted }: { id: string; title: string; alreadyAccepted: boolean }) {
  const [outcome, setOutcome] = useState<Outcome | null>(alreadyAccepted ? "APPROVED" : null);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, submit, pending] = useActionState(async (_state: string, formData: FormData) => {
    if (file) formData.set("document", file);
    return recordDecision(id, formData);
  }, "");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const accepted = outcome === "APPROVED";
  const valid = Boolean(outcome && !fileError && (accepted ? file : reason.trim()));
  const confirmLabel = accepted ? "Confirm and lock event" : "Confirm and close event";
  const confirmStyle = accepted ? "bg-brand-primary hover:bg-brand-hover" : "bg-red-700 hover:bg-red-800";
  const button = "min-h-11 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-brand-canvas disabled:text-text-secondary";

  function choose(next: Outcome) {
    if (outcome === next) return;
    setOutcome(next);
    setFile(null);
    setPreview(null);
    setFileError(null);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <h2 className="text-lg font-bold text-brand-primary">What was the VC’s decision?</h2>
      <p className="mt-1.5 text-sm text-text-secondary">{alreadyAccepted ? "The VC has accepted this request. Attach the signed copy to lock the event." : "Choose an outcome, then review it before confirming."}</p>
      <div role="group" aria-label="VC decision" className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" aria-pressed={accepted} onClick={() => choose("APPROVED")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-700 p-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 ${accepted ? "bg-success-bg ring-1 ring-emerald-700" : ""}`}><Check size={17} aria-hidden="true" /> VC accepted</button>
        <button type="button" aria-pressed={outcome === "REJECTED"} disabled={alreadyAccepted} onClick={() => choose("REJECTED")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-600 p-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-45 ${outcome === "REJECTED" ? "bg-red-50 ring-1 ring-red-600" : ""}`}><X size={17} aria-hidden="true" /> VC rejected</button>
      </div>

      {!outcome ? (
        <div className="mt-4 rounded-xl bg-brand-canvas p-4 text-sm text-text-secondary">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-brand-primary"><ShieldCheck size={17} aria-hidden="true" /> Confirm the decision after reviewing the details</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="font-semibold text-text-primary">If accepted</dt><dd className="mt-1">Attach the VC-signed letter to lock the event.</dd></div>
            <div><dt className="font-semibold text-text-primary">If rejected</dt><dd className="mt-1">Enter the VC’s reason to close the event. You can attach proof.</dd></div>
          </dl>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {!accepted && <label className="block text-sm font-semibold text-text-primary">
            Reason given by VC <span className="text-red-700">*</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={VC_REASON_MAX_LENGTH} aria-required="true" className="mt-2 block min-h-24 w-full resize-y rounded-xl border border-brand-border bg-brand-surface p-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-brand-primary" placeholder="Enter the reason provided by the Vice-Chancellor…" />
          </label>}
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-brand-border px-4 py-4 text-center text-brand-primary hover:bg-brand-canvas focus-within:outline-2 focus-within:outline-brand-primary">
            <Upload size={20} aria-hidden="true" />
            <span className="text-sm font-semibold">{accepted ? "Upload the VC-signed copy" : "Upload proof (optional)"}</span>
            <span className="text-xs text-text-secondary">PDF, PNG or JPG · Maximum 10 MB</span>
            <span className="mt-0.5 text-xs font-semibold">{file ? "Replace file" : "Browse files"}</span>
            <input key={outcome} type="file" accept={VC_EVIDENCE_ACCEPT} className="sr-only" aria-label={accepted ? "VC-signed copy" : "Rejection proof"} onChange={(event) => {
              const next = event.target.files?.[0];
              if (!next) return;
              const error = vcEvidenceError(next);
              setFileError(error);
              setPreview(error ? null : URL.createObjectURL(next));
              setFile(error ? null : next);
              event.target.value = "";
            }} />
          </label>
          {fileError && <p role="alert" className="text-sm text-red-800">{fileError} <button type="button" className="ml-2 font-semibold underline" onClick={() => setFileError(null)}>Clear file selection</button></p>}
          {file && <div className="flex items-center gap-3 rounded-xl bg-brand-canvas p-3.5">
            <FileText size={22} className="shrink-0 text-brand-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold text-brand-primary">{file.name}</p><p className="mt-0.5 text-xs text-text-secondary">{Math.ceil(file.size / 1024).toLocaleString("en-IN")} KB</p>
              {preview && <a href={preview} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-semibold text-brand-primary hover:underline">{accepted ? "View signed copy" : "View proof"}</a>}
            </div>
            <button type="button" aria-label="Remove attachment" className="rounded-md p-2 text-brand-primary hover:bg-brand-selected" onClick={() => { setFile(null); setPreview(null); }}><X size={16} /></button>
          </div>}
          <p className="text-xs text-text-secondary">{accepted ? file ? "Review the signed copy before confirming." : "A VC-signed copy is required before you can confirm." : "The rejection reason is saved in the permanent record."}</p>
          <button type="button" disabled={!valid || pending} className={`${button} ${confirmStyle} w-full text-white`} onClick={() => dialog.current?.showModal()}>{confirmLabel}</button>
          {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
        </div>
      )}

      <dialog ref={dialog} aria-labelledby="vc-confirm-title" onCancel={(event) => { if (pending) event.preventDefault(); }} className="m-auto w-[min(29rem,calc(100%-2rem))] rounded-2xl border border-brand-border bg-brand-surface p-5 text-text-primary shadow-xl backdrop:bg-brand-hover/40 sm:p-6">
        <h2 id="vc-confirm-title" className="text-xl font-bold text-brand-primary">{accepted ? "Lock this event?" : "Close this event?"}</h2>
        <p className="mt-2 text-sm text-text-secondary">{accepted ? `Confirming records VC acceptance and locks ${title}. The letter, signed copy, budget and requirements become read-only.` : `Confirming records the VC’s rejection and permanently closes ${title}. The reason becomes read-only.`}</p>
        {message && <p role="alert" className="mt-3 text-sm text-red-800">{message}</p>}
        <form action={submit} className="mt-5 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="decision" value={outcome ?? ""} />
          <input type="hidden" name="reason" value={reason} />
          <button type="button" autoFocus disabled={pending} onClick={() => dialog.current?.close()} className={`${button} border border-brand-primary text-brand-primary hover:bg-brand-selected`}>Cancel</button>
          <button type="submit" disabled={!valid || pending} className={`${button} ${confirmStyle} text-white`}>{pending ? "Recording decision…" : confirmLabel}</button>
        </form>
      </dialog>
    </section>
  );
}
