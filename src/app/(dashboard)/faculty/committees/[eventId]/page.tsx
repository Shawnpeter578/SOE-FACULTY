import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, UsersRound } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { approvedCommitteeEvents, committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import { committeeCoordinators, type CommitteeEvent } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../../components/AppLayout";
import { CommitteeHeader, committeePage, committeePanel } from "../workspace-ui";
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
          <Link href="/faculty/committees" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"><ArrowLeft size={16} aria-hidden="true" />All committees</Link>
        <CommitteeHeader title={event.title} context={`${formatEventDateRange(event.start_date, event.end_date)}${event.venue ? ` · ${event.venue}` : ""}`}>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-brand-primary">
            <Link href={`/faculty/events/${event.proposal_id}`} className="inline-flex items-center gap-1.5 hover:underline"><LockKeyhole size={15} aria-hidden="true" />View event details</Link>
            <Link href={`/faculty/reports?event=${event.id}`} className="rounded-lg border border-brand-border bg-white px-3 py-2 hover:bg-brand-selected">Event files</Link>
          </div>
        </CommitteeHeader>
        {committeeError ? <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(committeeError.code)}</p> :
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section className={`${committeePanel} p-5 sm:p-6`}>
              <h2 className="mb-4 text-lg font-bold text-brand-primary">New committee</h2>
              <CreateCommitteeForm eventId={event.id} />
            </section>
            <section className={`${committeePanel} overflow-hidden`}>
              <h2 className="flex items-center gap-2 border-b border-brand-border px-5 py-4 text-lg font-bold text-brand-primary"><UsersRound size={20} aria-hidden="true" />Event committees <span className="ml-auto rounded-md bg-brand-selected px-2 py-0.5 text-xs">{committees.length}</span></h2>
              {committees.length ? <ul className="divide-y divide-brand-border">
                {committees.map((committee) => <li key={committee.id}>
                  <Link href={`/faculty/committees/${event.id}/${committee.id}`} className="flex items-center justify-between gap-3 px-5 py-4 no-underline transition-colors hover:bg-brand-selected hover:no-underline">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-brand-primary">{committee.name}</p>
                      <p className="mt-0.5 break-words text-sm text-text-secondary">{committeeCoordinators(committee).map(({ name }) => name).join(", ") || "No co-faculty assigned"}</p>
                    </div>
                    <ArrowRight size={17} className="shrink-0 text-brand-primary" aria-hidden="true" />
                  </Link>
                </li>)}
              </ul> : <p className="p-5 text-sm text-text-secondary">Create a committee to start assigning coordinators.</p>}
            </section>
          </div>}
      </div>
    </AppLayout>
  );
}
