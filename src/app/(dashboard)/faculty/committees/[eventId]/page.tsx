import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowRight, LockKeyhole, Plus, UsersRound } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { approvedCommitteeEvents, committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import { committeeCoordinators, type CommitteeEvent } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../../components/AppLayout";
import { CommitteeAvatar, CommitteeBack, CommitteeEmpty, CommitteeHeader, committeePage, committeePanel, committeeLink } from "../workspace-ui";
import { CreateCommitteeForm } from "../forms";

export default async function EventCommitteesPage({ params }: PageProps<"/faculty/committees/[eventId]">) {
  const profile = await requireRole(["FACULTY"]);
  const { eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) notFound();
  const supabase = await createClient();
  const { data: event, error } = await approvedCommitteeEvents(supabase, profile.id).eq("id", eventId).maybeSingle<CommitteeEvent>();
  if (error) throw new Error("Unable to load the approved event.");
  if (!event) notFound();
  const { data: committees, error: committeeError } = await loadEventCommittees(supabase, event.id);

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={committeePage}>
        <CommitteeBack href="/faculty/committees">All events</CommitteeBack>
        <CommitteeHeader title={event.title} context={`${formatEventDateRange(event.start_date, event.end_date)}${event.venue ? ` · ${event.venue}` : ""}`}>
          <div className="flex flex-wrap gap-2">
            <Link href={`/faculty/events/${event.proposal_id}`} className={committeeLink}><LockKeyhole size={15} aria-hidden="true" />Event details</Link>
            <Link href={`/faculty/reports?event=${event.id}`} className={committeeLink}><Archive size={16} aria-hidden="true" />Event files</Link>
          </div>
        </CommitteeHeader>
        {committeeError ? <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(committeeError.code)}</p> :
          <div className="@container">
            <div className="grid items-start gap-5 @min-[48rem]:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
              <section className={`${committeePanel} overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 border-b border-brand-border px-5 py-4">
                  <h2 className="text-lg font-bold text-brand-primary">Event committees</h2>
                  <span className="rounded-full bg-brand-selected px-2.5 py-1 text-xs font-semibold text-brand-primary">{committees.length}</span>
                </div>
                {committees.length ? <ul className="divide-y divide-brand-border">
                  {committees.map((committee) => {
                    const coordinators = committeeCoordinators(committee);
                    return <li key={committee.id}>
                      <Link href={`/faculty/committees/${event.id}/${committee.id}`} className="group flex items-start gap-3 px-4 py-4 no-underline transition-colors hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-primary sm:px-5">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-selected text-brand-primary group-hover:bg-white"><UsersRound size={18} aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-semibold text-brand-primary">{committee.name}</h3>
                          {committee.responsibilities && <p className="mt-0.5 line-clamp-2 break-words text-sm text-text-secondary">{committee.responsibilities}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-text-secondary">
                            {coordinators.map(({ id, name }) => <span key={id} className="inline-flex min-w-0 items-center gap-1.5"><CommitteeAvatar name={name} /><span className="break-words">{name}</span></span>)}
                            {!coordinators.length && <span className="rounded-full bg-warning-bg px-2.5 py-1 text-amber-900">No co-faculty assigned</span>}
                          </div>
                        </div>
                        <ArrowRight size={17} className="mt-1 shrink-0 text-brand-primary" aria-hidden="true" />
                      </Link>
                    </li>;
                  })}
                </ul> : <CommitteeEmpty title="No committees yet">Create a committee to start assigning co-faculty and collecting files.</CommitteeEmpty>}
              </section>
              <section className={`${committeePanel} p-5 sm:p-6`}>
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-selected text-brand-primary"><Plus size={21} aria-hidden="true" /></span>
                  <div>
                    <h2 className="text-lg font-bold text-brand-primary">New committee</h2>
                    <p className="mt-0.5 text-sm text-text-secondary">Give the team a name and describe what it will handle.</p>
                  </div>
                </div>
                <CreateCommitteeForm eventId={event.id} />
              </section>
            </div>
          </div>}
      </div>
    </AppLayout>
  );
}
