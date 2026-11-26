import Link from "next/link";
import { Archive, ArrowUpRight, CalendarDays, CircleCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { approvedCommitteeEvents, committeeLoadError } from "@/lib/event-committees-server";
import type { CommitteeEvent } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { CommitteeEmpty, CommitteeEventMeta, CommitteeHeader, committeeLink, committeePage, committeePanel } from "./workspace-ui";

export default async function CommitteesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const { data: events, error } = await approvedCommitteeEvents(supabase, profile.id).order("start_date").order("title")
    .overrideTypes<CommitteeEvent[], { merge: false }>();

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={committeePage}>
        <CommitteeHeader title="Committees" context="Create teams, assign co-faculty, and collect files for your events.">
          <Link href="/faculty/reports" className={committeeLink}><Archive size={16} aria-hidden="true" />Open Reports</Link>
        </CommitteeHeader>
        <section aria-labelledby="committee-events-title">
          <h2 id="committee-events-title" className="mb-3 text-lg font-bold text-brand-primary">Your approved events</h2>
          {error ? <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
            : events.length ? <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <li key={event.id} className={committeePanel}>
                  <Link href={`/faculty/committees/${event.id}`} className="group flex h-full flex-col gap-4 rounded-2xl p-5 no-underline transition-colors hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary">
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-selected text-brand-primary group-hover:bg-white"><CalendarDays size={19} aria-hidden="true" /></span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-emerald-800"><CircleCheck size={13} aria-hidden="true" />VC approved</span>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <h3 className="break-words text-lg font-bold text-brand-primary">{event.title}</h3>
                      <CommitteeEventMeta start={event.start_date} end={event.end_date} venue={event.venue} />
                    </div>
                    <span className="mt-auto flex items-center justify-between gap-3 border-t border-brand-border pt-3 text-sm font-semibold text-brand-primary">Manage committees <ArrowUpRight size={16} aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul> : <div className={committeePanel}><CommitteeEmpty title="No approved events yet">Events appear here after you record VC approval and lock them with the signed letter.</CommitteeEmpty></div>}
        </section>
      </div>
    </AppLayout>
  );
}
