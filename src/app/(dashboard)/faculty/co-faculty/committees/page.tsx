import Link from "next/link";
import { ArrowRight, CalendarDays, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import type { EventCommittee } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../../components/AppLayout";
import { CommitteeHeader, committeePage, committeePanel } from "../../committees/workspace-ui";

export default async function AssignedCommitteesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const { data: committees, error } = await loadEventCommittees(supabase);
  const groups = new Map<string, EventCommittee[]>();
  for (const committee of committees ?? []) {
    const group = groups.get(committee.event_id);
    if (group) group.push(committee);
    else groups.set(committee.event_id, [committee]);
  }

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={committeePage}>
        <CommitteeHeader title="My committees" context="Open a committee to message your team and share files." />
        {error ? <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
          : groups.size ? <div className="grid auto-rows-max items-start gap-4 sm:grid-cols-2">
            {[...groups].map(([eventId, [event, ...otherCommittees]]) => (
              <section key={eventId} className={`${committeePanel} p-5 sm:p-6`}>
                <h2 className="break-words text-lg font-bold text-brand-primary">{event.event_title}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary"><CalendarDays size={15} aria-hidden="true" />{formatEventDateRange(event.start_date, event.end_date)}</p>
                <p className="mt-1 break-words text-sm text-text-secondary">Event lead · {event.owner_name}</p>
                <ul className="mt-4 space-y-2">
                  {[event, ...otherCommittees].map((committee) => <li key={committee.id}>
                    <Link href={`/faculty/co-faculty/committees/${committee.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border px-3.5 py-3 text-sm font-semibold text-brand-primary no-underline hover:bg-brand-selected hover:no-underline">
                      <span className="inline-flex min-w-0 items-center gap-2"><UsersRound size={17} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{committee.name}</span></span><ArrowRight size={16} className="shrink-0" aria-hidden="true" />
                    </Link>
                  </li>)}
                </ul>
              </section>
            ))}
          </div> : <p className={`${committeePanel} p-6 text-sm text-text-secondary`}>Committees appear here when an event lead assigns you.</p>}
      </div>
    </AppLayout>
  );
}
