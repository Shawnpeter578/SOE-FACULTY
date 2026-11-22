import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, CircleAlert, MapPin, X } from "lucide-react";
import ApprovalControls from "@/components/approval-controls";
import type { Proposal } from "@/components/proposal-details";
import { formatApprovalDate, formatApprovalTime, formatEventBudget, formatEventDateRange, formatEventTime, getFacultyApprovalAction, type ApprovalEvent } from "@/lib/event-approval";
import { universityName } from "@/lib/university";
import type { ProposalAttachment } from "@/lib/validation/proposal-attachments";
import AppLayout from "../../components/AppLayout";
import { facultyCardClass, facultyPageClass } from "../../components/workspace-styles";
import { getStatusLabel, getStatusStyle } from "../event-status";

type Request = Proposal & { id: string; status: string; review_note: string | null; created_at: string; reviewed_at: string | null };
const panel = `${facultyCardClass} min-w-0 p-4 sm:p-7`;
const panelHeading = "text-lg font-bold tracking-tight text-slate-900";

export default function EventDetail({ proposal, event, facultyName, attachments, approvalUrl }: {
  proposal: Request;
  event: ApprovalEvent | null;
  facultyName: string;
  attachments: (ProposalAttachment & { url?: string })[];
  approvalUrl?: string;
}) {
  const vcRejected = event?.status === "REJECTED_BY_VC";
  const deanRejected = proposal.status === "REJECTED";
  const closed = deanRejected || vcRejected;
  const approved = event?.status === "OFFICIALLY_APPROVED";
  const deanApproved = proposal.status === "APPROVED_BY_DEAN";
  const showDecision = deanApproved && event?.letter_printed_at && (approved || vcRejected || event.status === "AWAITING_VC_DOCUMENT");
  const changesRequested = proposal.status === "CHANGES_REQUESTED";
  const action = getFacultyApprovalAction(event);
  const status = closed ? (vcRejected ? "VC disapproved" : "Dean disapproved")
    : approved ? "Officially approved" : event?.vc_decision === "APPROVED" ? "VC approved" : deanApproved ? "Dean approved" : getStatusLabel(proposal.status);
  const tone = closed ? "bg-red-50 text-red-800" : deanApproved ? "bg-emerald-50 text-emerald-800" : getStatusStyle(proposal.status);
  const decisionAt = vcRejected ? event.vc_decided_at : proposal.reviewed_at;
  const closureNote = vcRejected ? event.vc_note : proposal.review_note;
  const dates = formatEventDateRange(proposal.start_date, proposal.end_date);
  const times = [proposal.start_time, proposal.end_time].filter((value): value is string => Boolean(value)).map(formatEventTime).join(" – ");
  const budget = event?.review_budget ?? proposal.estimated_budget;
  const journey = [
    { label: "Sent to Dean", date: proposal.status === "DRAFT" ? null : proposal.created_at, detail: `Submitted by ${facultyName}.` },
    { label: "Dean decision", date: deanApproved || deanRejected || changesRequested ? proposal.reviewed_at : null, done: deanApproved, denied: deanRejected, detail: deanRejected ? "Dean disapproved · Event closed." : changesRequested ? "Dean requested changes." : "Approved by the Dean." },
    { label: "Request letter generated", date: event?.letter_generated_at, detail: "Request letter created." },
    { label: "Budget and requirements added", date: event?.review_details_at, detail: "Budget and requirements recorded." },
    { label: "Letter printed", date: event?.letter_printed_at, detail: "Printed for VC review." },
    { label: "VC decision", date: event?.vc_decided_at, done: event?.vc_decision === "APPROVED", denied: vcRejected, detail: vcRejected ? "VC disapproved · Event closed." : "Approved by the Vice-Chancellor." },
    { label: "Soft copy uploaded and locked", date: event?.vc_document_uploaded_at, done: Boolean(approved && event?.vc_approval_document_path), detail: "Signed approval stored and locked." },
  ];
  const currentStep = closed || approved ? -1 : action === "generate" || action === "sign" ? 2 : action === "details" ? 3 : action === "print" ? 4
    : event?.vc_decision === "APPROVED" ? 6 : event?.letter_printed_at ? 5 : proposal.status === "DRAFT" ? 0 : deanApproved ? -1 : 1;

  return (
    <AppLayout facultyName={facultyName} refreshIntervalMs={10000}>
      <div className={`${facultyPageClass} @container`}>
        <header>
          <Link href="/faculty/events" className="flex w-fit items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"><ArrowLeft size={16} aria-hidden="true" /> Back to My Events</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{proposal.title}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
              {closed ? <CircleAlert size={14} aria-hidden="true" /> : deanApproved ? <Check size={14} aria-hidden="true" /> : null}{status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-start gap-2"><CalendarDays size={17} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" /><span>{dates}{times && ` · ${times} IST`}</span></span>
            {proposal.venue && <span className="inline-flex min-w-0 items-start gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" /><span className="min-w-0 break-words">{proposal.venue}</span></span>}
          </div>
        </header>

        {(closed || deanApproved || changesRequested) && (
          <section className={`rounded-3xl border border-current/15 p-4 sm:p-6 ${tone}`} aria-label="Current decision">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {closed || changesRequested ? <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <div>
                  <h2 className="text-base font-bold">{closed ? "Event closed" : approved ? "Event officially approved" : changesRequested ? "Changes requested by the Dean" : event?.vc_decision === "APPROVED" ? "Vice-Chancellor approved your request" : "Dean approved your request"}</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {closed ? `${status}${decisionAt ? ` · ${formatApprovalTime(decisionAt)}` : ""}. No further actions.`
                      : approved ? "The approval journey is complete."
                      : changesRequested ? "Review the remarks, edit the request, and resubmit it."
                      : action === "generate" ? "Next, generate your request letter for VC review."
                      : action === "sign" ? "Apply your e-signature to prepare the letter for printing."
                      : action === "details" ? "Next, record your budget and event requirements."
                      : action === "print" ? "Next, print the request letter and confirm that it was printed."
                      : event?.vc_decision === "APPROVED" ? "Upload the VC-signed letter to lock the event."
                      : event?.letter_printed_at ? "Record the Vice-Chancellor’s decision when you receive it."
                      : "The letter workflow will appear when it is available."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {approved && event.vc_approval_document_path && <Link href={`/faculty/committees/${event.id}`} className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Manage committees</Link>}
                {showDecision && <Link href={`/faculty/events/${proposal.id}/decision`} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${approved && event.vc_approval_document_path ? "border border-brand-primary text-brand-primary hover:bg-brand-selected" : "bg-brand-primary text-white hover:bg-brand-hover"}`}>{approved || vcRejected ? "View VC decision" : "Record VC decision"}</Link>}
                {deanApproved && event && <Link href={`/faculty/events/${proposal.id}/letter`} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${showDecision ? "border border-brand-primary text-brand-primary hover:bg-brand-selected" : "bg-brand-primary text-white hover:bg-brand-hover"}`}>{action === "print" ? "Print request letter" : event.letter_generated_at ? "Open request letter" : "Generate request letter"}</Link>}
                {changesRequested && <Link href={`/faculty/events/${proposal.id}/edit`} className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Edit and resubmit</Link>}
                {approved && approvalUrl && <a href={approvalUrl} className="rounded-xl border border-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-primary hover:bg-brand-selected">Download signed approval</a>}
              </div>
            </div>
            {closed && closureNote && <blockquote className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-text-primary"><p className="whitespace-pre-wrap break-words">{closureNote}</p><footer className="mt-1 text-xs text-text-secondary">— {vcRejected ? "Vice-Chancellor" : "Dean"}</footer></blockquote>}
          </section>
        )}

        <div className="grid items-start gap-5 @min-[42rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className={panelHeading}>Approval journey</h2><span className="text-sm text-slate-600">{closed ? "Closed" : approved ? "Complete" : action || changesRequested ? "Action needed" : "In progress"}</span></div>
            <ol className="mt-4">
              {journey.map((step, index) => {
                const done = Boolean(step.done || (step.date && !step.denied && !(index === 1 && changesRequested)));
                const active = currentStep === index;
                const indicator = step.denied ? "border-red-300 bg-red-50 text-red-800" : done ? "border-brand-primary bg-brand-primary text-white" : active ? "border-brand-primary bg-white text-brand-primary" : "border-brand-border bg-brand-canvas text-text-secondary";
                return (
                  <li key={step.label} aria-current={active ? "step" : undefined} className="relative flex gap-3 pb-4 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[15px] [&:not(:last-child)]:before:top-7 [&:not(:last-child)]:before:border-l [&:not(:last-child)]:before:border-brand-border">
                    <span aria-hidden="true" className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${indicator}`}>{step.denied ? <X size={16} /> : done ? <Check size={16} /> : index + 1}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${step.denied ? "text-red-800" : done || active ? "text-brand-primary" : "text-text-secondary"}`}>{step.label}</p>
                      <p className="text-[13px] leading-snug text-text-secondary">{step.date ? formatApprovalTime(step.date) : done || step.denied ? "Date unavailable" : active ? action || changesRequested ? "Awaiting action" : "In progress" : "Not reached"}</p>
                      <p className="text-[13px] leading-snug text-text-secondary">{done || step.denied || (index === 1 && changesRequested) ? step.detail : closed ? "Blocked · Event is closed." : active ? "Waiting for this step to be completed." : "Previous stage required."}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="min-w-0 space-y-5 sm:space-y-6">
            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className={panelHeading}>Event information</h2>{proposal.event_type && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{proposal.event_type}</span>}</div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-secondary">{proposal.description}</p>
              <Info label="Objectives" value={proposal.objectives} />
              <Info label="Resource person" value={proposal.resource_person} />
              <div className="my-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div className="min-w-0"><p className="text-[13px] text-text-secondary">Faculty coordinator</p><p className="mt-1 break-words text-sm font-semibold text-brand-primary">{facultyName}</p><p className="mt-1 text-[13px] text-text-secondary">{[proposal.department, universityName].filter(Boolean).join(" · ")}</p></div>
                <div className="min-w-0"><p className="break-words text-[13px] text-text-secondary">{[proposal.expected_participants != null && `${proposal.expected_participants} participants`, proposal.target_audience].filter(Boolean).join(" · ") || "Participants unspecified"}</p><p className="mt-1 text-sm font-semibold text-brand-primary">{budget == null ? "Budget unspecified" : `${formatEventBudget(budget)} ${event?.review_budget == null ? "estimated" : "budget"}`}</p><p className="mt-1 text-[13px] text-text-secondary">Sponsorship {proposal.sponsorship_expected ? "expected" : "not expected"}</p></div>
              </div>
              <Info label="Duration" value={proposal.duration} />
              <Info label="Special requirements" value={event?.review_requirements ?? proposal.special_requirements} />
              {action === "details" && <div className="mt-4 border-t border-brand-border pt-4"><ApprovalControls proposalId={proposal.id} budget={budget} requirements={event?.review_requirements ?? proposal.special_requirements} /></div>}
              {(action === "sign" || action === "print") && <details className="mt-3 text-sm text-brand-primary"><summary className="cursor-pointer font-semibold">Edit budget and requirements</summary><p className="mt-2 text-xs text-text-secondary">Changes require you to sign the letter again.</p><div className="mt-3"><ApprovalControls proposalId={proposal.id} budget={budget} requirements={event?.review_requirements} /></div></details>}
            </section>

            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className={panelHeading}>Attachments</h2>{attachments.length > 0 && <span className="text-[13px] text-text-secondary">{attachments.length} {attachments.length === 1 ? "file" : "files"} · Original submission</span>}</div>
              {attachments.length > 0 ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{attachments.map((file) => (
                <li key={file.path} className="min-w-0 text-center">
                  {file.url ? <a href={file.url} className="block rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"><span className="block break-words text-sm font-semibold text-brand-primary">{file.name}</span><span className="mt-1 block text-xs text-text-secondary">{file.name.split(".").at(-1)?.toUpperCase()} · Submitted {formatApprovalDate(proposal.created_at)}</span></a>
                    : <p className="rounded-xl border border-slate-200 p-4 break-words text-sm text-text-secondary">{file.name} · Download unavailable</p>}
                </li>
              ))}</ul> : <p className="mt-2 text-sm text-text-secondary">No files attached.</p>}
            </section>

            <section className={panel}>
              <h2 className={panelHeading}>Remarks</h2>
              {closed ? <p className="mt-2 text-sm text-text-secondary">The {vcRejected ? "Vice-Chancellor’s" : "Dean’s"} decision is recorded above. The remaining approval stages will not proceed.</p>
                : proposal.review_note || event?.vc_note ? <div className="mt-2 space-y-3">
                  {proposal.review_note && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary"><strong>Dean</strong>{proposal.reviewed_at && ` · ${formatApprovalTime(proposal.reviewed_at)}`} — {proposal.review_note}</p>}
                  {event?.vc_note && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary"><strong>Vice-Chancellor</strong>{event.vc_decided_at && ` · ${formatApprovalTime(event.vc_decided_at)}`} — {event.vc_note}</p>}
                </div> : <p className="mt-2 text-sm text-text-secondary">No remarks recorded yet.</p>}
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-secondary"><strong className="font-semibold text-brand-primary">{label}.</strong> {value}</p>;
}
