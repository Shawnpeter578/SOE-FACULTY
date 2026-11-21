"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Download, FileText, Minus, Plus, Printer } from "lucide-react";
import { updateRequestLetter } from "@/app/(dashboard)/request-letter-actions";
import { formatApprovalDate, formatApprovalTime } from "@/lib/event-approval";
import { universityName } from "@/lib/university";
import { defaultLetterBody, defaultLetterClosing, letterArrangementRows, LETTER_BODY_LIMIT, LETTER_CLOSING_LIMIT, requestLetterFields, type RequestLetter } from "@/lib/request-letter";
import type { SavedSignature, SignatureMark } from "@/lib/profile-signature";
import RequestLetterSteps from "./request-letter-steps";
import SignaturePreview from "./signature-mark";

type LetterProps = RequestLetter & {
  back: string; qr?: string; detailsAt?: string | null; printedAt?: string | null;
  status: string; ready: boolean; canUpdate: boolean; signingAvailable: boolean; textEditingAvailable: boolean;
  savedSignature?: SavedSignature | null;
};

const panel = "rounded-2xl border border-brand-border bg-brand-surface p-5";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-selected";

export default function LetterPreview(props: LetterProps) {
  const { id, back, title, faculty, dean, ready, printedAt, canUpdate } = props;
  const [zoom, setZoom] = useState(85);
  const paper = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<{ body: string; closing: string; detailsAt?: string | null } | null>(null);
  const savedText = { body: props.body ?? defaultLetterBody(props), closing: props.closing ?? defaultLetterClosing };
  const text = draft ?? savedText;
  const canEditText = canUpdate && props.textEditingAvailable;
  const hasUnsavedText = canEditText && (text.body !== savedText.body || text.closing !== savedText.closing || (draft !== null && props.usesLegacyLetterFormat));
  const canPrint = (ready && !hasUnsavedText) || Boolean(printedAt);
  const showLegacyLayout = props.usesLegacyLetterFormat && !hasUnsavedText;
  const [state, submit, pending] = useActionState(async (previous: { message: string; success: boolean }, form: FormData) => {
    const result = await updateRequestLetter(id, previous, form);
    if (result.success) setDraft(null);
    return result;
  }, { message: "", success: false });
  const final = props.status === "OFFICIALLY_APPROVED" || props.status === "REJECTED_BY_VC";
  const statusLabel = final ? (props.status === "OFFICIALLY_APPROVED" ? "Locked" : "Closed") : printedAt ? "Awaiting VC" : canPrint ? "Print-ready" : "Dean approved";
  const fields = requestLetterFields(props);

  function fitPreview() {
    if (!paper.current) return;
    const rect = paper.current.getBoundingClientRect();
    const available = window.innerHeight - rect.top - 36;
    const fit = Math.floor(available * zoom / rect.height);
    setZoom(Math.max(60, Math.min(100, fit)));
  }

  function editText(field: "body" | "closing", value: string) {
    setDraft((current) => ({ ...(current ?? { ...savedText, detailsAt: props.detailsAt }), [field]: value }));
  }

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-5 sm:px-6 lg:px-0 print:m-0 print:max-w-none print:p-0">
      <div className="print:hidden">
        <Link href={back} className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand-primary"><ArrowLeft size={15} aria-hidden="true" /> Back to request</Link>
        <div className="mt-2.5 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary sm:text-3xl">{canPrint ? "Print Request Letter" : "Generate Request Letter"}</h1>
            <p className="mt-1 text-sm text-text-secondary">{final ? "View or reprint the letter kept with the VC decision." : printedAt ? "The letter has been printed for VC review." : canPrint ? "Print a copy to submit to the Vice-Chancellor." : "Review the letter and e-sign it before printing."}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusLabel === "Closed" ? "bg-red-100 text-red-800" : statusLabel === "Locked" ? "bg-brand-selected text-brand-primary" : printedAt ? "bg-warning-bg text-amber-800" : "bg-success-bg text-emerald-800"}`}>{printedAt && !final ? <Clock3 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {statusLabel}</span>
        </div>
        <RequestLetterSteps active={canPrint ? 1 : 0} completed={final ? 3 : printedAt ? 2 : canPrint ? 1 : 0} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(17rem,1fr)] print:mt-0 print:block">
        <section className="min-w-0 print:m-0" aria-label="Letter preview">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-sm text-text-secondary print:hidden">
            <span className="flex items-center gap-1.5"><FileText size={15} aria-hidden="true" /> A4 document</span>
            <div className="flex items-center gap-2" aria-label="Preview zoom">
              <button type="button" onClick={() => setZoom(Math.max(60, zoom - 10))} disabled={zoom <= 60} aria-label="Zoom out" className="rounded-lg p-2 text-brand-primary hover:bg-brand-selected disabled:opacity-40"><Minus size={16} /></button>
              <span className="w-11 text-center tabular-nums">{zoom}%</span>
              <button type="button" onClick={() => setZoom(Math.min(130, zoom + 10))} disabled={zoom >= 130} aria-label="Zoom in" className="rounded-lg p-2 text-brand-primary hover:bg-brand-selected disabled:opacity-40"><Plus size={16} /></button>
              <button type="button" onClick={fitPreview} className="rounded-lg px-2 py-1 font-semibold text-brand-primary hover:bg-brand-selected">Fit</button>
            </div>
          </div>
          <div className="overflow-auto rounded-2xl border border-brand-border bg-brand-selected/50 p-3 sm:p-5 print:overflow-visible print:border-0 print:bg-white print:p-0">
            <article ref={paper} className="request-letter mx-auto w-full max-w-[42rem] bg-white p-5 text-sm leading-relaxed text-text-primary shadow-sm [overflow-wrap:anywhere] sm:p-10 print:max-w-none print:p-0 print:shadow-none" style={{ zoom: zoom / 100 }}>
              {showLegacyLayout ? <>
                <header className="border-b border-brand-primary/30 pb-2">
                  <p className="text-xl font-bold tracking-tight text-brand-primary">{universityName}</p>
                  {props.department && <p className="text-sm text-text-secondary">{props.department}</p>}
                </header>
                <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-text-secondary">
                  <span className="font-semibold uppercase tracking-wide">Request for event permission</span>
                  <span>{props.createdAt ? formatApprovalDate(props.createdAt) : "Date set on generation"}</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  <p>To the Vice-Chancellor</p>
                  <p className="font-semibold">Subject: Request for approval of {title}</p>
                  <p>We request permission to conduct {title}.</p>
                  <p className="whitespace-pre-wrap">{props.description}</p>
                  {props.objectives && <p className="whitespace-pre-wrap"><strong>Objectives: </strong>{props.objectives}</p>}
                  <dl className="divide-y divide-brand-border border-y border-brand-border">
                    {fields.map(([label, value]) => <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 py-1.5"><dt className="text-text-secondary">{label}</dt><dd className="font-medium">{value}</dd></div>)}
                  </dl>
                  {props.requirements && <p className="whitespace-pre-wrap"><strong>Requirements: </strong>{props.requirements}</p>}
                  <p>The Dean has approved this request for submission to your office.</p>
                </div>
              </> : <PermissionLetterContent letter={props} body={text.body} closing={text.closing} />}
              <div className="mt-7 grid grid-cols-2 gap-5 border-t border-brand-border pt-4 [break-inside:avoid]">
                <Signature label={showLegacyLayout ? "Faculty e-sign" : "Faculty endorsement"} name={faculty} signedAt={hasUnsavedText ? null : props.facultySignedAt} mark={hasUnsavedText ? null : props.facultySignature} />
                {props.deanSignedAt ? <Signature label="Dean e-sign" name={dean} signedAt={props.deanSignedAt} /> : (
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-secondary">Dean approval</p>
                    {props.deanApprovalSignature && <SignaturePreview signature={props.deanApprovalSignature} className="mt-1.5 max-w-40" />}
                    <p className="mt-2 text-sm font-medium text-brand-primary">{dean}</p>
                    <p className="mt-1 text-xs text-text-secondary">{props.deanApprovedAt ? formatApprovalTime(props.deanApprovedAt) : "Approved in EventDesk"}</p>
                  </div>
                )}
              </div>
              {!canPrint && <p className="mt-3 text-xs font-semibold text-text-secondary">Draft · Awaiting faculty signature</p>}
              {canPrint && props.qr && <footer className="mt-3 flex items-center justify-between gap-3 [break-inside:avoid]">
                <p className="rounded-md border border-brand-border px-3 py-2 text-xs text-brand-primary"><span className="mr-2 text-text-secondary">Letter ID</span><strong>{props.letterId}</strong></p>
                <Image src={props.qr} width={64} height={64} alt="QR code to look up this letter in EventDesk" unoptimized className="shrink-0" />
              </footer>}
            </article>
          </div>
        </section>

        <aside className="flex flex-col gap-3 print:hidden">
          <section className={panel}>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{canPrint ? "Final request letter" : "Faculty request"}</p>
            <h2 className="mt-1 break-words text-lg font-bold text-brand-primary">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{faculty}{props.department && ` · ${props.department}`}</p>
            {canPrint ? <>
              <dl className="mt-3 rounded-xl bg-brand-canvas p-3 text-sm"><dt className="text-xs text-text-secondary">Letter ID</dt><dd className="mt-1 font-semibold text-brand-primary [overflow-wrap:anywhere]">{props.letterId}</dd></dl>
              {printedAt && <p className="mt-3 text-xs text-text-secondary">Printed {formatApprovalTime(printedAt)}</p>}
            </> : <dl className="mt-3 space-y-2 border-t border-brand-border pt-3 text-sm">
              {fields.map(([label, value]) => <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2"><dt className="text-text-secondary">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
            </dl>}
          </section>
          <section className={`${panel} ${printedAt ? "bg-success-bg!" : ""}`}>
            <h2 className="font-bold text-brand-primary">{printedAt ? "Letter printed" : canPrint ? "Ready to print" : "Letter checklist"}</h2>
            {printedAt ? <p className="mt-1 text-sm text-text-secondary">{final ? "The final letter is available for reprint and download." : "Record the outcome here when you hear back from the Vice-Chancellor."}</p> :
            <ul className="mt-3 space-y-3 text-sm">
              {canPrint ? <>
                <ChecklistRow done title="Letter ID and QR code added">Use A4 portrait and actual size when printing.</ChecklistRow>
                <ChecklistRow done title="Faculty e-signature included">{faculty}</ChecklistRow>
              </> : <>
                <ChecklistRow done title="Request details filled">Taken from the event request.</ChecklistRow>
                <ChecklistRow done={Boolean(props.facultySignedAt) && !hasUnsavedText} title="Faculty e-sign">{faculty}{(!props.facultySignedAt || hasUnsavedText) && " · Awaiting signature"}</ChecklistRow>
                <ChecklistRow done title="Dean approval recorded">{props.deanApprovedAt ? formatApprovalTime(props.deanApprovedAt) : dean}</ChecklistRow>
              </>}
            </ul>}
          </section>
          {!printedAt && !props.signingAvailable && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Letter signing will be available after the database update is applied.</p>}
          {canEditText ? (
            <form action={submit} className={`${panel} -order-1 space-y-3`}>
              <h2 className="font-bold text-brand-primary">Letter wording</h2>
              <input type="hidden" name="detailsAt" value={(draft ? draft.detailsAt : props.detailsAt) ?? ""} />
              <label className="block text-sm font-semibold" htmlFor="letter-body">Letter body</label>
              <textarea id="letter-body" name="body" value={text.body} onChange={(event) => editText("body", event.target.value)}
                className="w-full resize-y rounded-lg border border-brand-border px-3 py-2 text-sm font-normal" rows={8} maxLength={LETTER_BODY_LIMIT} required disabled={pending} />
              <label className="block text-sm font-semibold" htmlFor="letter-closing">Closing and sign-off</label>
              <textarea id="letter-closing" name="closing" value={text.closing} onChange={(event) => editText("closing", event.target.value)}
                className="w-full resize-y rounded-lg border border-brand-border px-3 py-2 text-sm font-normal" rows={3} maxLength={LETTER_CLOSING_LIMIT} disabled={pending} />
              {hasUnsavedText && <p className="text-xs text-text-secondary">{ready ? "Changes require a new signature before printing." : "Unsaved changes"}</p>}
              <button name="action" value="save_draft" type="submit" className={`${secondaryButton} w-full disabled:opacity-50`} disabled={pending || !hasUnsavedText || !text.body.trim()}>Save draft</button>
              {(!ready || hasUnsavedText) && <>
                <SignatureConsent name={faculty} saved={props.savedSignature} pending={pending} />
                <button name="action" value="sign_letter" type="submit" disabled={pending || !text.body.trim()} className={`${button} w-full`}>{props.createdAt ? "Apply my e-signature" : "Generate and e-sign"}</button>
              </>}
            </form>
          ) : canUpdate && !props.facultySignedAt && (
            <form action={submit} className={`${panel} space-y-3`}>
              <input type="hidden" name="action" value="sign_letter" />
              <input type="hidden" name="detailsAt" value={props.detailsAt ?? ""} />
              <SignatureConsent name={faculty} saved={props.savedSignature} pending={pending} required />
              <button type="submit" disabled={pending} className={`${button} w-full`}>{pending ? "Recording signature…" : props.createdAt ? "Apply my e-signature" : "Generate and e-sign"}</button>
            </form>
          )}
          {canPrint && <>
            <button type="button" onClick={() => window.print()} className={`${button} w-full`}><Printer size={17} aria-hidden="true" />Print letter</button>
            <a href={`/faculty/events/${id}/letter/pdf`} download className={`${secondaryButton} w-full`}><Download size={17} aria-hidden="true" />Download PDF</a>
          </>}
          {canUpdate && canPrint && !printedAt && (
            <form action={submit} className={`${panel} space-y-3`}>
              <input type="hidden" name="action" value="confirm_printed" />
              <input type="hidden" name="detailsAt" value={props.detailsAt ?? ""} />
              <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="consent" value="yes" required disabled={pending} className="mt-0.5 size-4 shrink-0 accent-brand-primary" />I have printed the letter and it is ready for VC review.</label>
              <button type="submit" disabled={pending} className={`${button} w-full`}>Confirm printed</button>
            </form>
          )}
          {printedAt && <Link href={`/faculty/events/${id}/decision`} className={`${button} w-full`}>{final ? "View VC decision" : "Record VC decision"}</Link>}
          {canPrint && <Link href="/faculty/dashboard" className="block rounded-lg py-2 text-center text-sm font-semibold text-brand-primary hover:bg-brand-selected">Back to dashboard</Link>}
          {state.message && <p role={state.success ? "status" : "alert"} className={`text-sm ${state.success ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p>}
        </aside>
      </div>
    </div>
  );
}

function PermissionLetterContent({ letter, body, closing }: { letter: RequestLetter; body: string; closing: string }) {
  const department = letter.department && (letter.department.startsWith("Department of ") ? letter.department : `Department of ${letter.department}`);
  return (
    <>
      <header className="border-b border-brand-primary pb-4">
        <p className="font-serif text-2xl font-bold leading-tight text-brand-primary">{universityName}</p>
        {department && <p className="mt-1 text-text-secondary">{department}</p>}
      </header>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div><p className="font-bold text-brand-primary">To</p><p className="font-semibold">The Vice-Chancellor</p><p>{universityName}</p></div>
        <p className="text-right text-sm text-text-secondary">{letter.createdAt ? formatApprovalDate(letter.createdAt) : "Date set on generation"}</p>
      </div>
      <h2 className="mt-5 font-serif text-xl font-bold leading-tight text-brand-primary">Request for permission to conduct {letter.title}</h2>
      <p className="mt-4 whitespace-pre-wrap">{body}</p>
      <table className="mt-4 w-full table-fixed text-sm">
        <thead className="bg-brand-selected text-left text-brand-primary print:[print-color-adjust:exact]"><tr><th className="w-[30%] px-2.5 py-2">Event details</th><th className="px-2.5 py-2">Proposed arrangements</th></tr></thead>
        <tbody>{letterArrangementRows(letter).map(([label, value]) => (
          <tr key={label} className="border-b border-brand-border"><th scope="row" className="px-2.5 py-1.5 text-left align-top font-normal text-text-secondary">{label}</th><td className="whitespace-pre-wrap px-2.5 py-1.5 align-top">{value}</td></tr>
        ))}</tbody>
      </table>
      {closing && <p className="mt-4 whitespace-pre-wrap">{closing}</p>}
      <div className="mt-2 [break-inside:avoid]"><p className="font-semibold">{letter.faculty}</p>{department && <p>{department}</p>}</div>
    </>
  );
}

function SignatureConsent({ name, saved, pending, required }: { name: string; saved?: SavedSignature | null; pending: boolean; required?: boolean }) {
  return (
    <>
      {saved && <div className="rounded-lg bg-brand-canvas p-2.5">
        <input type="hidden" name="signatureRevision" value={saved.revision} />
        <SignaturePreview signature={saved} className="max-w-40" />
      </div>}
      <label className="flex items-start gap-2.5 text-sm font-medium">
        <input type="checkbox" name="consent" value="yes" required={required} disabled={pending} className="mt-0.5 size-4 shrink-0 accent-brand-primary" />
        {saved ? "I confirm that my saved e-signature may be applied to this letter." : `I confirm that my typed name, ${name}, is my e-signature on this request letter.`}
      </label>
    </>
  );
}

function Signature({ label, name, signedAt, mark }: { label: string; name: string; signedAt?: string | null; mark?: SignatureMark | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      {mark && signedAt && <SignaturePreview signature={mark} className="mt-1.5 max-w-40" />}
      <p className={`mt-2 text-brand-primary ${signedAt && !mark ? "text-base italic font-medium" : "text-xs"}`}>{signedAt ? name : "Signature unavailable"}</p>
      <p className="mt-1 text-xs text-text-secondary">{signedAt ? formatApprovalTime(signedAt) : name}</p>
    </div>
  );
}

function ChecklistRow({ done, title, children }: { done: boolean; title: string; children: ReactNode }) {
  const Icon = done ? Check : Clock3;
  return <li className="flex items-start gap-2.5"><span className={`grid size-6 shrink-0 place-items-center rounded-full ${done ? "bg-success-bg text-emerald-800" : "bg-brand-canvas text-text-secondary"}`}><Icon size={15} aria-hidden="true" /></span><div><p className="font-semibold">{title}</p><p className="mt-0.5 text-xs text-text-secondary">{children}</p></div></li>;
}
