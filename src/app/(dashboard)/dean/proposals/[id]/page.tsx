import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, CircleX, ClipboardList, Clock3, FileText, Paperclip, UserRound, UsersRound, Wallet, type LucideIcon } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { signProposalAttachments } from "@/lib/supabase/proposal-attachments";
import { EVENT_DOCUMENT_BUCKET, formatApprovalTime, formatEventBudget, formatEventDateRange, formatEventTime, type ApprovalEvent } from "@/lib/event-approval";
import RouteRefresh from "@/components/route-refresh";
import ApprovalControls from "@/components/approval-controls";
import { getStatusLabel, getStatusStyle } from "../../../faculty/events/event-status";
import ReviewControls from "./review-controls";

const panel = "rounded-2xl border border-brand-border bg-brand-surface p-4 sm:p-5";

function DetailCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className={`${panel} min-w-0 text-sm leading-relaxed text-text-secondary [overflow-wrap:anywhere]`}>
      <h2 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-brand-primary sm:text-base">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-canvas text-brand-primary">
          <Icon size={16} aria-hidden="true" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-0.5 font-medium text-text-primary">{children}</dd>
    </div>
  );
}

export default async function ProposalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const dean = await requireRole(["DEAN"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: proposal, error } = await supabase.from("event_proposals").select("*").eq("id", id).maybeSingle();
  if (error || !proposal) notFound();

  const [{ data: faculty }, { data: reviews }, { data: event, error: eventError }, attachments] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", proposal.created_by).maybeSingle(),
    supabase.from("proposal_reviews").select("id,action,note,created_at").eq("proposal_id", id).order("created_at", { ascending: false }),
    supabase.from("events").select("*").eq("proposal_id", id).maybeSingle<ApprovalEvent>(),
    signProposalAttachments(supabase, proposal.attachments),
  ]);
  if (eventError) throw new Error("Unable to load the event approval journey.");

  const document = event?.vc_approval_document_path
    ? await supabase.storage.from(EVENT_DOCUMENT_BUCKET).createSignedUrl(event.vc_approval_document_path, 3600, { download: "VC approval.pdf" })
    : null;
  const facultyName = faculty?.full_name ?? "Faculty member";
  const dates = formatEventDateRange(proposal.start_date, proposal.end_date);
  const times = [proposal.start_time, proposal.end_time].filter((time): time is string => typeof time === "string").map(formatEventTime).join(" – ");
  const status = event?.status ?? proposal.status;
  const rejected = proposal.status === "REJECTED";
  const approved = proposal.status === "APPROVED_BY_DEAN";
  const decisionAt = proposal.reviewed_at ?? reviews?.[0]?.created_at;
  const decisionBy = proposal.reviewed_by === dean.id ? dean.full_name : "Dean";
  const needsLetter = approved && !event?.letter_generated_at;
  const DecisionIcon = rejected ? CircleX : CheckCircle2;
  const statusLabel = status === "SUBMITTED" ? "Pending Dean review"
    : rejected ? "Closed"
    : status === "AWAITING_VC_DOCUMENT" || status === "APPROVED_BY_DEAN" ? "Dean approved"
    : getStatusLabel(status);
  const statusColor = status === "SUBMITTED" ? "bg-warning-bg text-amber-800"
    : statusLabel === "Dean approved" ? "bg-success-bg text-emerald-800"
    : getStatusStyle(status);

  return (
    <div className="@container mx-auto max-w-[78rem] space-y-4 pb-5 pt-5 sm:space-y-5 sm:pt-7">
      <RouteRefresh />
      <Link href="/dean/proposals" className="inline-flex min-h-8 items-center gap-2 rounded-full px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-selected hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary">
        <ArrowLeft size={15} aria-hidden="true" /> Back to requests
      </Link>

      <header className="rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-brand-primary [overflow-wrap:anywhere] sm:text-3xl">{proposal.title}</h1>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusColor}`}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> {statusLabel}
          </span>
        </div>
        <dl className="mt-3 flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
          <div className="flex min-w-0 items-start gap-2">
            <UserRound size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Submitted by</dt>
            <dd className="[overflow-wrap:anywhere]"><span className="font-medium text-text-primary">{facultyName}</span>{proposal.department && ` · ${proposal.department}`}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 size={15} className="shrink-0" aria-hidden="true" />
            <dt className="sr-only">Submission date</dt>
            <dd>Submitted <time dateTime={proposal.created_at}>{formatApprovalTime(proposal.created_at)}</time></dd>
          </div>
        </dl>
      </header>

      {(rejected || approved) && (
        <section className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm sm:px-5 ${rejected ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <DecisionIcon size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-semibold">{rejected ? "Event closed" : needsLetter ? "Awaiting letter generation" : "Dean approval recorded"}</h2>
              {decisionAt && <p className="text-xs text-text-secondary">{decisionBy} · {formatApprovalTime(decisionAt)}</p>}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-text-secondary">
              {rejected ? proposal.review_note || "No reason recorded." : needsLetter ? "The faculty can prepare the request letter for VC review." : "The request letter has been prepared."}
            </p>
            {approved && proposal.review_note && <p className="mt-2 whitespace-pre-wrap text-xs text-text-secondary"><span className="font-semibold">Dean’s remark</span> · {proposal.review_note}</p>}
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:gap-4 @min-[32rem]:grid-cols-2 @min-[52rem]:grid-cols-3">
        <DetailCard title="Event information" icon={FileText}>
          <p className="whitespace-pre-wrap">{proposal.description}</p>
          {proposal.objectives && <><h3 className="mt-3 font-semibold text-text-primary">Objectives</h3><p className="mt-1 whitespace-pre-wrap">{proposal.objectives}</p></>}
          {(proposal.event_type || proposal.resource_person) && (
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-brand-border pt-3">
              {proposal.event_type && <DetailField label="Event type">{proposal.event_type}</DetailField>}
              {proposal.resource_person && <DetailField label="Resource person">{proposal.resource_person}</DetailField>}
            </dl>
          )}
        </DetailCard>
        <DetailCard title="Schedule and venue" icon={CalendarDays}>
          <dl className="grid gap-3">
            <DetailField label="Event date">{dates}</DetailField>
            {times && <DetailField label="Time (IST)">{times}</DetailField>}
            <DetailField label="Venue">{proposal.venue}</DetailField>
            {proposal.duration && <DetailField label="Expected duration">{proposal.duration}</DetailField>}
          </dl>
        </DetailCard>
        <DetailCard title="Participants" icon={UsersRound}>
          <dl className="grid gap-3">
            <DetailField label="Expected participants">{proposal.expected_participants == null ? "Not specified" : Number(proposal.expected_participants).toLocaleString("en-IN")}</DetailField>
            {proposal.target_audience && <DetailField label="Audience">{proposal.target_audience}</DetailField>}
            {proposal.department && <DetailField label="Department">{proposal.department}</DetailField>}
          </dl>
        </DetailCard>
        <DetailCard title="Budget" icon={Wallet}>
          <dl>
            <dt className="text-xs font-medium">Estimated total · INR</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-brand-primary">{proposal.estimated_budget == null ? "Not specified" : formatEventBudget(proposal.estimated_budget)}</dd>
          </dl>
          {proposal.sponsorship_expected && <p className="mt-2 text-xs">Sponsorship expected</p>}
        </DetailCard>
        <DetailCard title="Requirements" icon={ClipboardList}>
          {proposal.special_requirements ? <p className="whitespace-pre-wrap">{proposal.special_requirements}</p> : <p>No requirements specified.</p>}
        </DetailCard>
        <DetailCard title="Attachments" icon={Paperclip}>
          {attachments.length ? <>
            <p className="mb-2 text-xs">{attachments.length} {attachments.length === 1 ? "file" : "files"} · Original submission</p>
            <ul className="space-y-2">
              {attachments.map((file, index) => {
                const content = <>
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-brand-border bg-white text-brand-primary" aria-hidden="true"><FileText size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-xs font-semibold text-text-primary">{file.name}</span>
                    <span className="mt-0.5 block text-xs">{file.name.split(".").pop()?.toUpperCase()} · {Math.ceil(file.size / 1024)} KB{!file.url && " · Download unavailable"}</span>
                  </span>
                </>;
                return <li key={`${file.path}-${index}`}>
                  {file.url ? <a href={file.url} className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-canvas/50 p-2 hover:bg-brand-selected" aria-label={`Download ${file.name}`}>{content}<ArrowUpRight size={15} className="shrink-0 text-brand-primary" aria-hidden="true" /></a> : <div className="flex items-center gap-2 rounded-lg border border-brand-border p-2">{content}</div>}
                </li>;
              })}
            </ul>
          </> : <p>No attachments submitted.</p>}
        </DetailCard>
      </div>

      {event && (
        <section className={`${panel} space-y-2`}>
          <h2 className="font-bold text-brand-primary">Vice-Chancellor review</h2>
          <p className="text-sm text-text-secondary">
            {event.vc_decision === "REJECTED" ? "The Vice-Chancellor declined the request. The event is closed."
              : event.status === "OFFICIALLY_APPROVED" ? "The event is officially approved."
              : event.vc_decision === "APPROVED" ? "The Vice-Chancellor approved the request. Upload the signed PDF to finalize it."
              : event.letter_printed_at ? "The letter is awaiting the Vice-Chancellor’s decision."
              : "Waiting for faculty to prepare and print the request letter."}
          </p>
          {event.vc_decided_at && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{formatApprovalTime(event.vc_decided_at)}{event.vc_note && ` · ${event.vc_note}`}</p>}
          {event.letter_generated_at && <Link href={`/faculty/events/${id}/letter`} className="mr-4 inline-block text-sm font-semibold text-brand-primary hover:underline">View request letter</Link>}
          {document?.data?.signedUrl && <a className="inline-block text-sm font-semibold text-brand-primary hover:underline" href={document.data.signedUrl}>Download signed approval</a>}
          {event.vc_decision === "APPROVED" && event.status === "AWAITING_VC_DOCUMENT" && <ApprovalControls mode="lock" proposalId={id} />}
        </section>
      )}

      {reviews?.length ? (
        <details className={panel}>
          <summary className="cursor-pointer text-sm font-semibold text-brand-primary">Decision history</summary>
          <ul className="mt-2 divide-y divide-brand-border">
            {reviews.map((review) => <li key={review.id} className="py-2 text-sm">
              <p className="font-semibold">{getStatusLabel(review.action)}</p>
              {review.note && <p className="whitespace-pre-wrap break-words">{review.note}</p>}
              <p className="text-xs text-text-secondary">{formatApprovalTime(review.created_at)}</p>
            </li>)}
          </ul>
        </details>
      ) : null}

      <ReviewControls key={id} proposalId={id} status={proposal.status} title={proposal.title} facultyName={facultyName} dates={dates} />
    </div>
  );
}
