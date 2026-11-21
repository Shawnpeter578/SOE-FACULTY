import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CircleX, Clock3, FileText, LockKeyhole } from "lucide-react";
import RequestLetterSteps from "@/components/request-letter-steps";
import { EVENT_DOCUMENT_BUCKET, formatApprovalTime, vcApprovalFileName } from "@/lib/event-approval";
import { requestLetterFields } from "@/lib/request-letter";
import { loadRequestLetter } from "@/lib/request-letter-server";
import { universityName } from "@/lib/university";
import AppLayout from "../../../components/AppLayout";
import DecisionForm from "./decision-form";

const panel = "min-w-0 rounded-2xl border border-brand-border bg-brand-surface p-5";
const outlineButton = "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-primary px-4 text-center text-sm font-semibold text-brand-primary hover:bg-brand-selected";

export default async function DecisionPage({ params }: PageProps<"/faculty/events/[id]/decision">) {
  const { id } = await params;
  const { profile, supabase, event, letter, back } = await loadRequestLetter(id);
  const letterHref = `/faculty/events/${id}/letter`;
  if (!event.letter_printed_at) redirect(back);

  const accepted = event.status === "OFFICIALLY_APPROVED";
  const rejected = event.status === "REJECTED_BY_VC";
  const complete = accepted || rejected;
  if (!complete && event.status !== "AWAITING_VC_DOCUMENT") redirect(back);
  const evidence = accepted ? event.vc_approval_document_path : event.vc_rejection_proof_path;
  const fileName = event.vc_recorded_file_name ?? (accepted ? vcApprovalFileName(event) : "VC rejection proof");
  const { data: attachment } = evidence
    ? await supabase.storage.from(EVENT_DOCUMENT_BUCKET).createSignedUrl(evidence, 3600)
    : { data: null };
  const recordedAt = event.vc_recorded_at ?? (accepted ? event.vc_document_uploaded_at : event.vc_decided_at);
  const recordedBy = event.vc_recorded_by_name;
  const StatusIcon = accepted ? LockKeyhole : rejected ? CircleX : Clock3;
  const statusStyle = accepted ? "bg-brand-selected text-brand-primary" : rejected ? "bg-red-50 text-red-800" : "bg-warning-bg text-amber-800";
  const fields = requestLetterFields(letter);

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className="mx-auto max-w-[80rem] px-4 py-5 sm:px-6 lg:px-0">
        <header>
          <Link href={back} className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand-primary"><ArrowLeft size={15} className="shrink-0" aria-hidden="true" /><span className="truncate">My Events / {letter.title} / VC decision</span></Link>
          <div className="mt-2.5 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-primary sm:text-3xl">VC decision</h1>
              <p className="mt-1 text-sm text-text-secondary">{complete ? recordedBy ? `Decision recorded by ${recordedBy}` : "Decision recorded" : "Record the decision given by the Vice-Chancellor."}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}><StatusIcon size={14} aria-hidden="true" />{accepted ? "Locked" : rejected ? "Closed" : "Awaiting VC"}</span>
          </div>
          <RequestLetterSteps active={2} completed={complete ? 3 : 2} />
        </header>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.95fr)_minmax(16rem,1fr)]">
          <div className="min-w-0 space-y-3">
            {complete ? <>
              <section className={`${panel} space-y-4`}>
                <h2 className="text-lg font-bold text-brand-primary">Decision record <span className="text-sm font-medium text-text-secondary">· Read-only</span></h2>
                <div className={`rounded-xl p-4 text-sm ${statusStyle}`}>
                  <h3 className="flex items-center gap-2 font-semibold"><StatusIcon size={17} aria-hidden="true" />{accepted ? "VC acceptance recorded" : "VC rejection recorded"}</h3>
                  <p className="mt-1.5">{accepted ? "The event is locked. The letter, signed copy, budget and requirements are read-only." : "The event is closed. The letter and recorded reason are read-only."}</p>
                  {accepted && evidence && <p className="mt-1.5">The signed copy is available in the Dean workspace.</p>}
                </div>
                {rejected && <div><h3 className="font-semibold text-brand-primary">Reason given by VC</h3><p className="mt-1.5 whitespace-pre-wrap text-sm text-text-primary [overflow-wrap:anywhere]">{event.vc_note || "No reason recorded."}</p></div>}
                <div>
                  <h3 className="font-semibold text-brand-primary">{accepted ? "VC-signed copy" : "Rejection proof"}</h3>
                  {evidence ? <div className="mt-2 flex items-center gap-3 rounded-xl bg-brand-canvas p-3.5">
                    <FileText size={22} className="shrink-0 text-brand-primary" aria-hidden="true" />
                    <div className="min-w-0"><p className="break-all text-sm font-semibold text-brand-primary">{fileName}</p>
                      {attachment?.signedUrl ? <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline">{accepted ? "View signed copy" : "View proof"}<ArrowUpRight size={14} aria-hidden="true" /></a> : <p className="mt-1 text-xs text-text-secondary">The attachment could not be opened. Refresh to try again.</p>}
                    </div>
                  </div> : <p className="mt-1 text-sm text-text-secondary">No file attached.</p>}
                </div>
                {recordedAt && <p className="border-t border-brand-border pt-3 text-xs text-text-secondary">Recorded {recordedBy && `by ${recordedBy} `}on <time dateTime={recordedAt}>{formatApprovalTime(recordedAt)}</time></p>}
              </section>
              <div className="flex flex-wrap gap-2">
                {accepted && evidence && <Link href={`/faculty/committees/${event.id}`} className="flex min-h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover">Manage committees</Link>}
                <Link href={back} className={outlineButton}>Back to event</Link>
              </div>
            </> : "vc_recorded_at" in event ? <DecisionForm id={id} title={letter.title} alreadyAccepted={event.vc_decision === "APPROVED"} /> : (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Recording a VC decision requires the latest EventDesk database update.</p>
            )}
          </div>

          <aside className={panel} aria-label="Final request letter">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Final request letter</p>
            <h2 className="mt-2 text-lg font-bold text-brand-primary [overflow-wrap:anywhere]">{letter.title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{letter.faculty}{letter.department && ` · ${letter.department}`}</p>
            <dl className="mt-3 rounded-xl bg-brand-canvas p-3 text-sm">
              <dt className="text-xs text-text-secondary">Letter ID</dt>
              <dd className="mt-1 font-semibold text-brand-primary [overflow-wrap:anywhere]">{letter.letterId}</dd>
              <dt className="sr-only">Print date</dt>
              <dd className="mt-1 text-xs text-text-secondary">Printed {formatApprovalTime(event.letter_printed_at)}</dd>
            </dl>
            <Link href={letterHref} aria-label="Preview the final request letter" className="mt-3 flex justify-center rounded-xl bg-brand-canvas p-3 hover:bg-brand-selected">
              <div aria-hidden="true" className="aspect-[210/297] w-28 overflow-hidden border border-brand-border bg-white p-2 text-[0.3rem] leading-tight text-text-primary shadow-sm [overflow-wrap:anywhere]">
                <p className="border-b border-brand-primary/40 pb-1 text-[0.37rem] font-bold text-brand-primary">{universityName}</p>
                <p className="my-1 font-semibold">Request for event permission</p>
                <p>To the Vice-Chancellor</p>
                <p className="my-1 font-semibold">Request for approval of {letter.title}</p>
                <p className="line-clamp-3">{letter.description}</p>
                <ul className="my-1 divide-y divide-brand-border border-y border-brand-border">
                  {fields.map(([label, value]) => <li key={label} className="line-clamp-1 py-0.5">{label} · {value}</li>)}
                </ul>
                <p className="line-clamp-2">Faculty e-sign · {letter.faculty}</p><p className="line-clamp-2">Dean approval · {letter.dean}</p>
                <p className="mt-1 line-clamp-1 border-t border-brand-border pt-1">{letter.letterId}</p>
              </div>
            </Link>
            <dl className="mt-3 space-y-1.5 text-sm [overflow-wrap:anywhere]">
              {fields.map(([label, value]) => <div key={label} className="flex justify-between gap-2"><dt className="text-text-secondary">{label}</dt><dd className="max-w-[66%] text-right font-medium text-text-primary">{value}</dd></div>)}
            </dl>
            <Link href={letterHref} className={`${outlineButton} mt-4`}>View request letter</Link>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
