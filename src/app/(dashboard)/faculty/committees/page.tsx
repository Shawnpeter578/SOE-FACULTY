import Link from "next/link";
import { ArrowRight, CalendarDays, LockKeyhole } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { approvedCommitteeEvents, committeeLoadError } from "@/lib/event-committees-server";
import type { CommitteeEvent } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { facultyCardClass, facultyPageClass } from "../components/workspace-styles";

export default async function CommitteesPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const { data: events, error } = await approvedCommitteeEvents(supabase, profile.id).order("start_date").order("title")
    .overrideTypes<CommitteeEvent[], { merge: false }>();

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={facultyPageClass}>
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-brand-primary">Committees</h1>
          <p className="mt-2 text-sm text-text-secondary">Form committees and manage coordinators for your locked events.</p>
        </header>
        {error ? <p role="status" className={`${facultyCardClass} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p>
          : events.length ? <ul className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/faculty/committees/${event.id}`} className={`${facultyCardClass} block h-full p-5 no-underline transition-colors hover:bg-brand-selected hover:no-underline sm:p-6`}>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words text-lg font-bold text-brand-primary">{event.title}</h2>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-emerald-800"><LockKeyhole size={13} aria-hidden="true" />Locked</span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary"><CalendarDays size={15} aria-hidden="true" />{formatEventDateRange(event.start_date, event.end_date)}</p>
                  {event.venue && <p className="mt-1 break-words text-sm text-text-secondary">{event.venue}</p>}
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary">Manage committees <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
          : <p className={`${facultyCardClass} p-6 text-sm text-text-secondary`}>Events appear here after you record VC approval and lock them with the signed letter.</p>}
      </div>
    </AppLayout>
  );
}
