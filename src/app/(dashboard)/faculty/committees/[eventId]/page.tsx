import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, UsersRound } from "lucide-react";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { approvedCommitteeEvents, committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import type { CommitteeEvent } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../../components/AppLayout";
import { facultyCardClass, facultyPageClass } from "../../components/workspace-styles";
import { CreateCommitteeForm, StartCommitteesDialog } from "../forms";

export default async function EventCommitteesPage({ params, searchParams }: PageProps<"/faculty/committees/[eventId]">) {
  const profile = await requireRole(["FACULTY"]);
  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(eventId).success) notFound();
  const supabase = await createClient();
  const { data: event, error } = await approvedCommitteeEvents(supabase, profile.id).eq("id", eventId).maybeSingle<CommitteeEvent>();
  if (error) throw new Error("Unable to load the approved event.");
  if (!event) notFound();
  const { data: committees, error: committeeError } = await loadEventCommittees(supabase, event.id);

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={facultyPageClass}>
        {query.locked === "1" && <StartCommitteesDialog eventId={event.id} />}
        <header>
          <Link href="/faculty/committees" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"><ArrowLeft size={16} aria-hidden="true" />All committees</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="break-words text-3xl font-bold tracking-tight text-brand-primary">{event.title}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-emerald-800"><LockKeyhole size={13} aria-hidden="true" />Event locked</span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">{formatEventDateRange(event.start_date, event.end_date)}{event.venue && ` · ${event.venue}`}</p>
          <Link href={`/faculty/events/${event.proposal_id}`} className="mt-2 inline-block text-sm font-semibold text-brand-primary hover:underline">View event details</Link>
        </header>
        {committeeError ? <p role="status" className={`${facultyCardClass} p-5 text-sm text-text-secondary`}>{committeeLoadError(committeeError.code)}</p> :
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section className={`${facultyCardClass} min-w-0 p-5 sm:p-6`}>
              <h2 className="mb-4 text-lg font-bold text-brand-primary">New committee</h2>
              <CreateCommitteeForm eventId={event.id} />
            </section>
            <section className={`${facultyCardClass} min-w-0 p-5 sm:p-6`}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-brand-primary"><UsersRound size={20} aria-hidden="true" />Event committees</h2>
              {committees.length ? <ul className="mt-4 space-y-2.5">
                {committees.map((committee) => <li key={committee.id}>
                  <Link href={`/faculty/committees/${event.id}/${committee.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-brand-border px-4 py-3 no-underline transition-colors hover:bg-brand-selected hover:no-underline">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-brand-primary">{committee.name}</p>
                      <p className="mt-0.5 break-words text-sm text-text-secondary">{committee.coordinator_name ?? "Coordinator unassigned"}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-primary">{committee.coordinator_name ? "Open" : "Assign"} <ArrowRight size={15} aria-hidden="true" /></span>
                  </Link>
                </li>)}
              </ul> : <p className="mt-3 rounded-xl bg-brand-canvas p-3 text-sm text-text-secondary">No committees yet. Create one to start assigning coordinators.</p>}
            </section>
          </div>}
      </div>
    </AppLayout>
  );
}
