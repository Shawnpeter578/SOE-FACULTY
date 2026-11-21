import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalTime, formatEventDateRange } from "@/lib/event-approval";
import { committeeUpdateLabels } from "@/lib/event-committees";
import { COMMITTEE_UPDATES_PAGE_SIZE, committeeLoadError, loadCommitteeUpdates, loadEventCommittees } from "@/lib/event-committees-server";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { facultyCardClass, facultyPageClass } from "../components/workspace-styles";
import { AssignCommitteeForm, CommitteeUpdateForm } from "./forms";

export default async function CommitteeDetail({ committeeId, eventId, page }: { committeeId: string; eventId?: string; page?: string | string[] }) {
  const profile = await requireRole(["FACULTY"]);
  if (!z.uuid().safeParse(committeeId).success || (eventId && !z.uuid().safeParse(eventId).success)) notFound();

  const requestedPage = typeof page === "string" && /^[1-9][0-9]{0,5}$/.test(page) ? Number(page) : 1;
  const supabase = await createClient();
  const { data: committees, error } = await loadEventCommittees(supabase, eventId, committeeId);
  if (error) return (
    <AppLayout facultyName={profile.full_name}>
      <p role="status" className={`${facultyCardClass} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
    </AppLayout>
  );
  const committee = committees[0];
  if (!committee) notFound();
  const { data: updates, error: updateError, count } = await loadCommitteeUpdates(supabase, committee.id, requestedPage);
  const parent = eventId ? `/faculty/committees/${eventId}` : "/faculty/co-faculty/committees";
  const href = `${parent}/${committee.id}`;
  const hasOlderUpdates = (count ?? 0) > requestedPage * COMMITTEE_UPDATES_PAGE_SIZE;

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={facultyPageClass}>
        <header>
          <Link href={parent} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"><ArrowLeft size={16} aria-hidden="true" />{eventId ? "Event committees" : "My committees"}</Link>
          <p className="mt-3 break-words text-sm font-semibold text-text-secondary">{committee.event_title}</p>
          <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-brand-primary">{committee.name}</h1>
          <p className="mt-2 break-words text-sm text-text-secondary">{formatEventDateRange(committee.start_date, committee.end_date)}{committee.venue && ` · ${committee.venue}`}</p>
          {committee.responsibilities && <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm text-text-primary">{committee.responsibilities}</p>}
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <section className={`${facultyCardClass} min-w-0 p-5 sm:p-6`}>
            {eventId ? <>
              <h2 className="text-lg font-bold text-brand-primary">Co-faculty coordinator</h2>
              <p className="mb-4 mt-1 break-words text-sm text-text-secondary">{committee.coordinator_name ?? "Coordinator unassigned"}</p>
              <AssignCommitteeForm committeeId={committee.id} coordinatorId={committee.coordinator_id} />
            </> : <>
              <h2 className="mb-4 text-lg font-bold text-brand-primary">Post to committee</h2>
              <CommitteeUpdateForm committeeId={committee.id} />
            </>}
          </section>

          <section className={`${facultyCardClass} min-w-0 p-5 sm:p-6`}>
            <h2 className="text-lg font-bold text-brand-primary">Reports, needs and updates</h2>
            {updateError ? <p role="status" className="mt-3 text-sm text-text-secondary">{committeeLoadError(updateError.code)}</p>
              : updates.length ? (
                <ul className="mt-4 divide-y divide-brand-border">
                  {updates.map((update) => (
                    <li key={update.id} className="min-w-0 py-4 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words font-bold text-brand-primary">{update.title}</h3>
                        <span className="rounded-full bg-brand-selected px-2.5 py-1 text-xs font-semibold text-brand-primary">{committeeUpdateLabels[update.kind]}</span>
                      </div>
                      <p className="mt-1 break-words text-xs text-text-secondary">{update.submitted_by_name} · <time dateTime={update.created_at}>{formatApprovalTime(update.created_at)}</time></p>
                      {update.details && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-primary">{update.details}</p>}
                      {update.file_name && <a href={`/faculty/committee-files/${update.id}`} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-brand-canvas px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-selected">
                        <Paperclip size={15} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{update.file_name}</span>
                      </a>}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 rounded-xl bg-brand-canvas p-3 text-sm text-text-secondary">{requestedPage > 1 ? "No entries on this page." : "No updates have been posted yet."}</p>}
            {!updateError && (requestedPage > 1 || hasOlderUpdates) && (
              <nav aria-label="Committee update pages" className="mt-3 flex gap-4 text-sm font-semibold text-brand-primary">
                {requestedPage > 1 && <Link href={requestedPage === 2 ? href : `${href}?page=${requestedPage - 1}`} className="hover:underline">Newer updates</Link>}
                {hasOlderUpdates && <Link href={`${href}?page=${requestedPage + 1}`} className="hover:underline">Older updates</Link>}
              </nav>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
