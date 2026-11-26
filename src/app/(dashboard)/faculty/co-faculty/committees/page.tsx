import Link from "next/link";
import { ArrowUpRight, MessageSquare, Paperclip } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import type { EventCommittee } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../../components/AppLayout";
import { CommitteeAvatar, CommitteeEmpty, CommitteeEventMeta, CommitteeHeader, committeePage, committeePanel } from "../../committees/workspace-ui";

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
        <CommitteeHeader title="My committees" context="Chat with the teams you’ve joined and share files with your event leads." />
        {error ? <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
          : groups.size ? <div className="grid items-start gap-4 sm:grid-cols-2">
            {[...groups].map(([eventId, group]) => {
              const [event] = group;
              return <section key={eventId} className={`${committeePanel} overflow-hidden`}>
                <div className="space-y-2.5 border-b border-brand-border bg-brand-canvas/70 p-5">
                  <h2 className="break-words text-lg font-bold text-brand-primary">{event.event_title}</h2>
                  <CommitteeEventMeta start={event.start_date} end={event.end_date} venue={event.venue} />
                  <div className="flex min-w-0 items-center gap-2 text-sm text-text-secondary"><CommitteeAvatar name={event.owner_name} /><span className="break-words">Event lead · {event.owner_name}</span></div>
                </div>
                <ul className="divide-y divide-brand-border">
                  {group.map((committee) => {
                    const href = `/faculty/co-faculty/committees/${committee.id}`;
                    return <li key={committee.id} className="flex items-center gap-2 p-3">
                      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-selected"><MessageSquare size={17} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold">{committee.name}</span>
                          {committee.responsibilities && <span className="mt-0.5 line-clamp-1 break-words text-xs text-text-secondary">{committee.responsibilities}</span>}
                        </span>
                        <ArrowUpRight size={15} className="shrink-0" aria-hidden="true" />
                      </Link>
                      <Link href={`${href}?view=files`} aria-label={`Shared files for ${committee.name}`} title="Shared files" className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand-border text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary"><Paperclip size={16} aria-hidden="true" /></Link>
                    </li>;
                  })}
                </ul>
              </section>;
            })}
          </div> : <div className={committeePanel}><CommitteeEmpty title="No committees yet">Committees appear here when an event lead assigns you.</CommitteeEmpty></div>}
      </div>
    </AppLayout>
  );
}
