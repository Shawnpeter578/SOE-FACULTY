"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Download, FileText, Minus, Plus, Printer } from "lucide-react";
import { updateRequestLetter } from "@/app/(dashboard)/request-letter-actions";
import { formatApprovalDate, formatApprovalTime } from "@/lib/event-approval";
import { universityName } from "@/lib/university";
import { requestLetterFields, type RequestLetter } from "@/lib/request-letter";
import RequestLetterSteps from "./request-letter-steps";

type LetterProps = RequestLetter & {
  role: string; back: string; qr?: string; detailsAt?: string | null; printedAt?: string | null;
  status: string; vcDecision?: string | null; ready: boolean; canUpdate: boolean; signingAvailable: boolean;
};

const panel = "rounded-2xl border border-brand-border bg-brand-surface p-5";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";
const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-selected";

export default function LetterPreview(props: LetterProps) {
  const { id, role, back, title, faculty, dean, ready, printedAt, canUpdate } = props;
  const [zoom, setZoom] = useState(85);
  const paper = useRef<HTMLElement>(null);
  const [state, submit, pending] = useActionState(updateRequestLetter.bind(null, id), { message: "", success: false });
  const signed = role === "DEAN" ? props.deanSignedAt : props.facultySignedAt;
  const canPrint = ready || Boolean(printedAt);
  const final = props.status === "OFFICIALLY_APPROVED" || props.status === "REJECTED_BY_VC";
  const statusLabel = final ? (props.status === "OFFICIALLY_APPROVED" ? "Locked" : "Closed") : printedAt ? "Awaiting VC" : ready ? "Print-ready" : "Dean approved";
  const fields = requestLetterFields(props);

  function fitPreview() {
    if (!paper.current) return;
    const rect = paper.current.getBoundingClientRect();
    const available = window.innerHeight - rect.top - 36;
    const fit = Math.floor(available * zoom / rect.height);
    setZoom(Math.max(60, Math.min(100, fit)));
  }

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-5 sm:px-6 lg:px-0 print:m-0 print:max-w-none print:p-0">
      <div className="print:hidden">
        <Link href={back} className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand-primary"><ArrowLeft size={15} aria-hidden="true" /> Back to request</Link>
        <div className="mt-2.5 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-brand-primary sm:text-3xl">{canPrint ? "Print Request Letter" : "Generate Request Letter"}</h1>
            <p className="mt-1 text-sm text-text-secondary">{final ? "View or reprint the letter kept with the VC decision." : printedAt ? "The letter has been printed for VC review." : ready ? "Print a copy to submit to the Vice-Chancellor." : "Review the request and confirm your e-signature before printing."}</p>
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
            <article ref={paper} className="request-letter mx-auto w-full max-w-[36rem] bg-white p-5 text-sm leading-snug text-text-primary shadow-sm [overflow-wrap:anywhere] sm:p-8 print:max-w-none print:p-0 print:shadow-none" style={{ zoom: zoom / 100 }}>
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
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-brand-border pt-3 [break-inside:avoid]">
                <Signature label="Faculty e-sign" name={faculty} signedAt={props.facultySignedAt} />
                <Signature label="Dean e-sign" name={dean} signedAt={props.deanSignedAt} />
              </div>
              {!canPrint && <p className="mt-3 text-xs font-semibold text-text-secondary">Draft · Awaiting signatures</p>}
              {props.qr && <footer className="mt-3 flex items-center justify-between gap-3 [break-inside:avoid]">
                <p className="rounded-md border border-brand-border px-3 py-2 text-xs text-brand-primary"><span className="mr-2 text-text-secondary">Letter ID</span><strong>{props.letterId}</strong></p>
                <Image src={props.qr} width={64} height={64} alt="QR code to look up this letter in EventDesk" unoptimized className="shrink-0" />
              </footer>}
            </article>
          </div>
        </section>

        <aside className="space-y-3 print:hidden">
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
            <h2 className="font-bold text-brand-primary">{printedAt ? "Letter printed" : ready ? "Ready to print" : "Letter checklist"}</h2>
            {printedAt ? <p className="mt-1 text-sm text-text-secondary">{final ? "The final letter is available for reprint and download." : "The faculty member can see the print update in EventDesk. The VC decision is pending."}</p> :
            <ul className="mt-3 space-y-3 text-sm">
              {ready ? <>
                <ChecklistRow done title="Letter ID and QR code added">Use A4 portrait and actual size when printing.</ChecklistRow>
                <ChecklistRow done title="Faculty and Dean e-signatures included">{faculty} · {dean}</ChecklistRow>
              </> : <>
                <ChecklistRow done title="Request details filled">Taken from the event request.</ChecklistRow>
                <ChecklistRow done={Boolean(props.facultySignedAt)} title="Faculty e-sign">{faculty}{!props.facultySignedAt && " · Awaiting signature"}</ChecklistRow>
                <ChecklistRow done={Boolean(props.deanSignedAt)} title="Dean e-sign">{dean}{!props.deanSignedAt && " · Awaiting signature"}</ChecklistRow>
              </>}
            </ul>}
          </section>
          {!printedAt && !props.signingAvailable && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Letter signing will be available after the database update is applied.</p>}
          {!printedAt && props.signingAvailable && role === "DEAN" && !canUpdate && !props.deanSignedAt && <p className="text-sm text-text-secondary">The dean who approved this request must apply the dean e-signature.</p>}
          {canUpdate && !signed && (
            <form action={submit} className={`${panel} space-y-3`}>
              <input type="hidden" name="action" value="sign_letter" />
              <input type="hidden" name="detailsAt" value={props.detailsAt ?? ""} />
              <label className="flex items-start gap-2.5 text-sm font-medium">
                <input type="checkbox" name="consent" value="yes" required disabled={pending} className="mt-0.5 size-4 shrink-0 accent-brand-primary" />
                I confirm that my typed name, {role === "DEAN" ? dean : faculty}, is my e-signature on this request letter.
              </label>
              <button type="submit" disabled={pending} className={`${button} w-full`}>{pending ? "Recording signature…" : props.createdAt ? "Apply my e-signature" : "Generate and e-sign"}</button>
            </form>
          )}
          {canPrint && <>
            <button type="button" onClick={() => window.print()} className={`${button} w-full`}><Printer size={17} aria-hidden="true" />Print letter</button>
            <a href={`/faculty/events/${id}/letter/pdf`} download className={`${secondaryButton} w-full`}><Download size={17} aria-hidden="true" />Download PDF</a>
          </>}
          {canUpdate && ready && !printedAt && (
            <form action={submit} className={`${panel} space-y-3`}>
              <input type="hidden" name="action" value="confirm_printed" />
              <input type="hidden" name="detailsAt" value={props.detailsAt ?? ""} />
              <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="consent" value="yes" required disabled={pending} className="mt-0.5 size-4 shrink-0 accent-brand-primary" />I have printed the letter and it is ready for VC review.</label>
              <button type="submit" disabled={pending} className={`${button} w-full`}>Confirm printed</button>
            </form>
          )}
          {printedAt && role === "DEAN" && <Link href={`/dean/proposals/${id}/decision`} className={`${button} w-full`}>{final ? "View VC decision" : "Record VC decision"}</Link>}
          {printedAt && role !== "DEAN" && <p className="text-sm text-text-secondary">{props.vcDecision === "APPROVED" ? "VC approved" : props.vcDecision === "REJECTED" ? "VC declined" : "VC decision pending"}</p>}
          {canPrint && <Link href={role === "DEAN" ? "/dean/dashboard" : role === "FACULTY" ? "/faculty/dashboard" : "/vc/dashboard"} className="block rounded-lg py-2 text-center text-sm font-semibold text-brand-primary hover:bg-brand-selected">Back to dashboard</Link>}
          {state.message && <p role={state.success ? "status" : "alert"} className={`text-sm ${state.success ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p>}
        </aside>
      </div>
    </div>
  );
}

function Signature({ label, name, signedAt }: { label: string; name: string; signedAt?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      <p className={`mt-2 text-brand-primary ${signedAt ? "text-base italic font-medium" : "text-xs"}`}>{signedAt ? name : "Signature unavailable"}</p>
      <p className="mt-1 text-xs text-text-secondary">{signedAt ? formatApprovalTime(signedAt) : name}</p>
    </div>
  );
}

function ChecklistRow({ done, title, children }: { done: boolean; title: string; children: ReactNode }) {
  const Icon = done ? Check : Clock3;
  return <li className="flex items-start gap-2.5"><span className={`grid size-6 shrink-0 place-items-center rounded-full ${done ? "bg-success-bg text-emerald-800" : "bg-brand-canvas text-text-secondary"}`}><Icon size={15} aria-hidden="true" /></span><div><p className="font-semibold">{title}</p><p className="mt-0.5 text-xs text-text-secondary">{children}</p></div></li>;
}
