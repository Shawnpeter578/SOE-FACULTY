import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, Download, FileText, MessageSquare, Paperclip, UsersRound } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalTime, formatEventDateRange } from "@/lib/event-approval";
import { committeeCoordinators, committeeUpdateLabels } from "@/lib/event-committees";
import { COMMITTEE_UPDATES_PAGE_SIZE, committeeLoadError, loadCommitteeUpdates, loadEventCommittees } from "@/lib/event-committees-server";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { AssignCommitteeForm, CommitteeManagement, CommitteeUpdateForm } from "./forms";
import { CommitteeHeader, committeePage, committeePanel } from "./workspace-ui";

export default async function CommitteeDetail({ committeeId, eventId, page, filesOnly }: { committeeId: string; eventId?: string; page?: string | string[]; filesOnly: boolean }) {
  const profile = await requireRole(["FACULTY"]);
  if (!z.uuid().safeParse(committeeId).success || (eventId && !z.uuid().safeParse(eventId).success)) notFound();

  const requestedPage = typeof page === "string" && /^[1-9][0-9]{0,5}$/.test(page) ? Number(page) : 1;
  const supabase = await createClient();
  const { data: committees, error } = await loadEventCommittees(supabase, eventId, committeeId);
  if (error) return (
    <AppLayout facultyName={profile.full_name}>
      <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
    </AppLayout>
  );
  const committee = committees[0];
  if (!committee) notFound();
  const { data: updates, error: updateError, count } = await loadCommitteeUpdates(supabase, committee.id, requestedPage, filesOnly);
  const parent = eventId ? `/faculty/committees/${eventId}` : "/faculty/co-faculty/committees";
  const href = `${parent}/${committee.id}`;
  const coordinators = committeeCoordinators(committee);
  const hasOlderUpdates = (count ?? 0) > requestedPage * COMMITTEE_UPDATES_PAGE_SIZE;
  const fileHref = `${href}?view=files`;
  const tab = "inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary";
  function historyPageHref(next: number) {
    if (next === 1) return filesOnly ? fileHref : href;
    return filesOnly ? `${fileHref}&page=${next}` : `${href}?page=${next}`;
  }

  return (
    <AppLayout facultyName={profile.full_name} refreshIntervalMs={10000}>
      <div className={committeePage}>
        <Link href={parent} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"><ArrowLeft size={16} aria-hidden="true" />{eventId ? "Event committees" : "My committees"}</Link>
        <CommitteeHeader title={committee.name} context={`${committee.event_title} · ${formatEventDateRange(committee.start_date, committee.end_date)}`}>
          {eventId && <div className="flex flex-wrap gap-2">
            <Link href={`/faculty/reports?event=${eventId}&committee=${committee.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected"><Archive size={16} aria-hidden="true" />Reports</Link>
            <CommitteeManagement committeeId={committee.id} name={committee.name} responsibilities={committee.responsibilities} />
          </div>}
        </CommitteeHeader>
        <div className="@container">
        <div className="grid items-start gap-5 @min-[51rem]:grid-cols-[minmax(0,1.65fr)_minmax(17rem,1fr)]">
          <section className={`${committeePanel} overflow-hidden`}>
            <nav aria-label="Committee discussion" className="flex gap-1 border-b border-brand-border px-3 sm:px-4">
              <Link href={href} aria-current={!filesOnly ? "page" : undefined} className={`${tab} ${!filesOnly ? "border-brand-primary text-brand-primary" : "border-transparent text-text-secondary"}`}><MessageSquare size={17} aria-hidden="true" />Chat history</Link>
              <Link href={fileHref} aria-current={filesOnly ? "page" : undefined} className={`${tab} ${filesOnly ? "border-brand-primary text-brand-primary" : "border-transparent text-text-secondary"}`}><Paperclip size={17} aria-hidden="true" />Shared files</Link>
            </nav>
            {!filesOnly && <div id="committee-composer" className="border-b border-brand-border bg-brand-canvas/60 p-4 sm:p-5">
              <CommitteeUpdateForm committeeId={committee.id} href={href} />
            </div>}
            <div className="p-4 sm:p-5">
            {updateError ? <p role="status" className="mt-3 text-sm text-text-secondary">{committeeLoadError(updateError.code)}</p>
              : filesOnly ? <>
                <ul aria-label="Shared files" className="divide-y divide-brand-border">
                  {updates.map((update) => update.file_name && (
                    <li key={update.id} className="flex min-w-0 items-center gap-3 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-selected text-brand-primary"><FileText size={17} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-semibold text-brand-primary">{update.file_name}</p>
                        <p className="mt-0.5 break-words text-xs text-text-secondary">{update.submitted_by_name} · {formatApprovalTime(update.created_at)}</p>
                      </div>
                      <a href={`/faculty/committee-files/${update.id}`} aria-label={`Download ${update.file_name}`} className="grid size-10 shrink-0 place-items-center rounded-lg text-brand-primary hover:bg-brand-selected"><Download size={17} aria-hidden="true" /></a>
                    </li>
                  ))}
                </ul>
                {updates.length === 0 && <p className="text-sm text-text-secondary">{requestedPage > 1 ? "No files on this page." : "No files have been shared yet."}</p>}
                <Link href={`${href}#committee-composer`} className="mt-2 inline-block text-sm font-semibold text-brand-primary hover:underline">Share a file in chat</Link>
              </>
              : updates.length ? (
                <ul aria-label="Chat history" className="space-y-3">
                  {updates.map((update) => (
                    <li key={update.id} className={`min-w-0 rounded-lg border border-brand-border p-3.5 ${update.submitted_by === profile.id ? "bg-brand-canvas" : "bg-white"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words font-semibold text-brand-primary">{update.title === "Message" && update.kind === "MESSAGE" ? update.submitted_by_name : update.title}</h3>
                        {update.kind !== "MESSAGE" && <span className="rounded-md bg-brand-selected px-2 py-1 text-xs font-semibold text-brand-primary">{committeeUpdateLabels[update.kind]}</span>}
                      </div>
                      <p className="mt-1 break-words text-xs text-text-secondary">{!(update.title === "Message" && update.kind === "MESSAGE") && `${update.submitted_by_name} · `}<time dateTime={update.created_at}>{formatApprovalTime(update.created_at)}</time></p>
                      {update.details && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-primary">{update.details}</p>}
                      {update.file_name && <a href={`/faculty/committee-files/${update.id}`} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-brand-canvas px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-selected">
                        <Paperclip size={15} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{update.file_name}</span>
                      </a>}
                      {update.file_removed && update.details !== "Attachment removed." && <p className="mt-2 text-xs text-text-secondary">Attachment removed.</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-text-secondary">{requestedPage > 1 ? "No entries on this page." : "No messages yet. Send the first message or share a file."}</p>}
            {!updateError && (requestedPage > 1 || hasOlderUpdates) && (
              <nav aria-label="Committee history pages" className="mt-3 flex gap-4 text-sm font-semibold text-brand-primary">
                {requestedPage > 1 && <Link href={historyPageHref(requestedPage - 1)} className="hover:underline">Newer {filesOnly ? "files" : "messages"}</Link>}
                {hasOlderUpdates && <Link href={historyPageHref(requestedPage + 1)} className="hover:underline">Older {filesOnly ? "files" : "messages"}</Link>}
              </nav>
            )}
            </div>
          </section>
          <aside className={`${committeePanel} p-4 sm:p-5`}>
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-primary"><UsersRound size={18} aria-hidden="true" />Committee team</h2>
            <div className="mt-3 border-b border-brand-border pb-3 text-sm">
              <p className="font-semibold text-brand-primary">{committee.owner_name}</p>
              <p className="mt-0.5 text-xs text-text-secondary">Event lead</p>
            </div>
            {committee.responsibilities && <div className="mt-3 border-b border-brand-border pb-3">
              <h3 className="text-xs font-semibold text-text-secondary">Responsibilities</h3>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{committee.responsibilities}</p>
            </div>}
            <h3 className="mb-2 mt-4 flex items-center justify-between gap-2 text-sm font-semibold text-brand-primary">Co-faculty <span className="rounded-md bg-brand-selected px-2 py-0.5 text-xs">{coordinators.length} / 2</span></h3>
            {eventId ? <AssignCommitteeForm committeeId={committee.id} coordinators={coordinators} />
              : <ul className="space-y-1.5">{coordinators.map(({ id, name }) => <li key={id} className="break-words rounded-lg bg-brand-canvas px-3 py-2 text-sm">{name}{id === profile.id && " (you)"}</li>)}</ul>}
          </aside>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}
