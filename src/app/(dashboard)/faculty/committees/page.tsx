import Link from "next/link";
import { ArrowRight, CalendarDays, LockKeyhole } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { approvedCommitteeEvents, committeeLoadError } from "@/lib/event-committees-server";
import type { CommitteeEvent } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { CommitteeHeader, committeePage, committeePanel } from "./workspace-ui";

export default async function CommitteesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const { data: events, error } = await approvedCommitteeEvents(supabase, profile.id).order("start_date").order("title")
    .overrideTypes<CommitteeEvent[], { merge: false }>();

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={committeePage}>
        <CommitteeHeader title="Committees" context="Choose an approved event to manage its teams.">
          <Link href="/faculty/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected">Open Reports <ArrowRight size={16} aria-hidden="true" /></Link>
        </CommitteeHeader>
        {error ? <p role="status" className={`${committeePanel} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
          : events.length ? <ul className={`${committeePanel} divide-y divide-brand-border overflow-hidden`}>
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/faculty/committees/${event.id}`} className="group flex items-center gap-3 p-4 no-underline transition-colors hover:bg-brand-selected hover:no-underline sm:gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-selected text-brand-primary"><CalendarDays size={19} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words text-lg font-bold text-brand-primary">{event.title}</h2>
                  </div>
                  <p className="mt-1 break-words text-sm text-text-secondary">{formatEventDateRange(event.start_date, event.end_date)}{event.venue && ` · ${event.venue}`}</p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-success-bg px-2 py-1 text-xs font-semibold text-emerald-800 sm:inline-flex"><LockKeyhole size={13} aria-hidden="true" />Locked</span>
                  <ArrowRight size={17} className="shrink-0 text-brand-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          : <p className={`${committeePanel} p-6 text-sm text-text-secondary`}>Events appear here after you record VC approval and lock them with the signed letter.</p>}
      </div>
    </AppLayout>
  );
}
