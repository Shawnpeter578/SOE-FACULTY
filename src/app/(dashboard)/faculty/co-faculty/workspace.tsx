import Link from "next/link";
import { CalendarDays, ClipboardList, MapPin, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import { coordinatorProgress, progressLabels, type CoordinatorAssignment, type CoordinatorProgress } from "@/lib/event-coordinators";
import { loadCoordinatorAssignments } from "@/lib/event-coordinators-server";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { facultyPageClass } from "../components/workspace-styles";
import CoordinatorProgressForm from "./progress-form";

const assignmentsHref = "/faculty/co-faculty/assignments";
const badgeStyle: Record<CoordinatorProgress, string> = {
  NOT_STARTED: "bg-brand-selected text-brand-primary",
  IN_PROGRESS: "bg-warning-bg text-amber-900",
  DONE: "bg-success-bg text-emerald-800",
};

type Filters = Record<string, string | string[] | undefined>;
const statusOptions = ["open", ...coordinatorProgress] as const;
const statusLabels = { open: "Open assignments", ...progressLabels };

export default async function CoFacultyWorkspace({ searchParams }: { searchParams: Promise<Filters> }) {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const [loaded, filters] = await Promise.all([loadCoordinatorAssignments(supabase), searchParams]);
  const { assignments, message } = loaded;
  const query = typeof filters.q === "string" ? filters.q.trim().slice(0, 120) : "";
  const status = statusOptions.find((progress) => progress === filters.status);
  const matching = assignments.filter((assignment) => (!status || (status === "open" ? assignment.progress !== "DONE" : assignment.progress === status)) && (!query ||
    [assignment.title, assignment.venue, assignment.owner_name, assignment.responsibilities].some((value) => value.toLowerCase().includes(query.toLowerCase()))));
  function filterHref(progress?: (typeof statusOptions)[number]) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (progress) params.set("status", progress);
    return params.size ? `${assignmentsHref}?${params}` : assignmentsHref;
  }

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={facultyPageClass}>
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-brand-border bg-white p-5 sm:p-7">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-selected text-brand-primary"><UsersRound size={23} aria-hidden="true" /></span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-primary sm:text-3xl">My assignments</h1>
              <p className="mt-1 text-sm text-text-secondary">Review your responsibilities and update progress for each event.</p>
            </div>
          </div>
        </header>

        {message ? <p role="status" className="rounded-2xl border border-brand-border bg-white p-5 text-sm text-text-secondary">{message}</p> : <>
          <section aria-labelledby="assignments-title" className="min-w-0 space-y-3">
            <h2 id="assignments-title" className="sr-only">Assignment list</h2>
            <nav aria-label="Filter assignments by progress" className="flex flex-wrap gap-2">
              {[undefined, ...statusOptions].map((option) => <Link key={option ?? "all"} href={filterHref(option)} aria-current={status === option ? "true" : undefined} className={`rounded-full border border-brand-border px-3.5 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-border ${status === option ? "bg-brand-selected" : "bg-white"}`}>{option ? statusLabels[option] : "All assignments"}</Link>)}
            </nav>
            {query && <p className="text-sm text-text-secondary">Results for “{query}” <Link href={status ? `${assignmentsHref}?status=${status}` : assignmentsHref} className="ml-2 font-semibold text-brand-primary underline">Clear search</Link></p>}
            {matching.length ? <ul className="grid min-w-0 gap-4 xl:grid-cols-2">{matching.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}</ul>
              : <div className="rounded-2xl border border-brand-border bg-white px-5 py-9 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-selected text-brand-primary"><ClipboardList size={21} aria-hidden="true" /></span>
                <p className="mt-3 font-bold text-brand-primary">{query || status ? "No matching assignments" : "No assignments yet"}</p>
                <p className="mt-1 text-sm text-text-secondary">{query || status ? "Try a different search or progress filter." : "Events appear here when an event owner assigns you as a co-coordinator."}</p>
              </div>}
          </section>
        </>}
      </div>
    </AppLayout>
  );
}

function AssignmentCard({ assignment }: { assignment: CoordinatorAssignment }) {
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-bold text-brand-primary">{assignment.title}</h3>
          <p className="mt-0.5 break-words text-sm text-text-secondary">Event lead · {assignment.owner_name}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle[assignment.progress]}`}>{progressLabels[assignment.progress]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-secondary">
        <span className="flex min-w-0 items-center gap-1.5"><CalendarDays size={16} className="shrink-0" aria-hidden="true" />{formatEventDateRange(assignment.start_date, assignment.end_date)}</span>
        <span className="flex min-w-0 items-center gap-1.5"><MapPin size={16} className="shrink-0" aria-hidden="true" /><span className="break-words">{assignment.venue}</span></span>
      </div>
      <div className="rounded-xl bg-brand-canvas p-3">
        <p className="text-xs font-semibold text-brand-primary">Your responsibilities</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-primary">{assignment.responsibilities}</p>
        {assignment.due_date && <p className="mt-2 text-xs font-semibold text-text-secondary">Due {formatEventDateRange(assignment.due_date, assignment.due_date)}</p>}
      </div>
      <div className="mt-auto"><CoordinatorProgressForm id={assignment.id} progress={assignment.progress} title={assignment.title} /></div>
    </li>
  );
}
