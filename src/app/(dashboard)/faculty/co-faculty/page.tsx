import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CircleCheck, ClipboardList, Clock3,
  MapPin, Paperclip, UsersRound,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { formatEventDateRange } from "@/lib/event-approval";
import type { EventCommittee } from "@/lib/event-committees";
import { committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import { loadCoordinatorAssignments } from "@/lib/event-coordinators-server";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import CoordinatorProgressForm from "./progress-form";

const workspace = "/faculty/co-faculty";
const committeeHref = (id: string) => `${workspace}/committees/${id}`;
const assignmentsHref = `${workspace}/assignments`;
const panel = "min-w-0 rounded-2xl border border-brand-border bg-white shadow-card";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";

const campusDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata" });
const longDate = new Intl.DateTimeFormat("en-IN", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
});

function orderCommittees(committees: EventCommittee[], today: string) {
  return committees.toSorted((left, right) => {
    const leftPast = left.end_date < today;
    const rightPast = right.end_date < today;
    if (leftPast !== rightPast) return leftPast ? 1 : -1;
    return leftPast ? right.end_date.localeCompare(left.end_date) : left.start_date.localeCompare(right.start_date);
  });
}

export default async function CoFacultyDashboardPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const [committeeResult, assignmentResult] = await Promise.all([
    loadEventCommittees(supabase),
    loadCoordinatorAssignments(supabase),
  ]);

  const now = new Date();
  const today = campusDate.format(now);
  const committees = orderCommittees(committeeResult.data ?? [], today);
  const committeeError = committeeResult.error ? committeeLoadError(committeeResult.error.code) : null;
  const { assignments, message: assignmentError } = assignmentResult;
  const ongoing = committees.find((committee) => committee.start_date <= today && committee.end_date >= today);
  const nextEvent = ongoing ?? committees.find((committee) => committee.start_date > today);
  const active = assignments.filter((assignment) => assignment.progress !== "DONE").toSorted((left, right) =>
    (left.due_date ?? left.start_date).localeCompare(right.due_date ?? right.start_date),
  );

  const tiles = [
    { title: "My committees", count: committeeError ? null : committees.length, href: `${workspace}/committees`, icon: UsersRound, color: "bg-brand-selected text-brand-primary" },
    { title: "Open assignments", count: assignmentError ? null : active.length, href: `${assignmentsHref}?status=open`, icon: ClipboardList, color: "bg-warning-bg text-amber-800" },
    { title: "Completed assignments", count: assignmentError ? null : assignments.length - active.length, href: `${assignmentsHref}?status=DONE`, icon: CircleCheck, color: "bg-success-bg text-emerald-800" },
  ];

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className="mx-auto max-w-6xl space-y-5 pb-3 sm:space-y-6">
        <header className="relative isolate overflow-hidden rounded-3xl bg-brand-primary p-5 text-white shadow-card sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 bg-[radial-gradient(ellipse_at_top_right,#415e9f_0%,transparent_72%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 -z-10 size-96 rounded-full border border-white/10 ring-24 ring-white/5" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-blue-100">
                <CalendarDays size={16} aria-hidden="true" />{longDate.format(now)}
              </p>
              <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl">Co-Faculty dashboard</h1>
              <p className="mt-2 max-w-md break-words text-sm leading-relaxed text-blue-100 sm:text-base">
                Welcome back, {profile.full_name.trim() || "Faculty"}. Find your committees, share files, and track your assignments.
              </p>
              <Link href={`${workspace}/committees`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                Open my committees <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-xs font-semibold text-blue-100">
                <CalendarDays size={15} aria-hidden="true" />{ongoing ? "Today’s committee event" : "Next committee event"}
              </p>
              {nextEvent ? <>
                <Link href={committeeHref(nextEvent.id)} className="mt-2 inline-flex items-start gap-2 break-words font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <span className="min-w-0">{nextEvent.event_title}</span><ArrowUpRight size={16} className="mt-1 shrink-0" aria-hidden="true" />
                </Link>
                <p className="mt-1 text-sm text-blue-100">{formatEventDateRange(nextEvent.start_date, nextEvent.end_date)}</p>
                <p className="mt-1 break-words text-sm text-blue-100">{nextEvent.name}</p>
              </> : <p className="mt-2 text-sm text-white">{committeeError ? "Schedule unavailable" : "No upcoming committee events"}</p>}
            </div>
          </div>
        </header>

        <ul aria-label="Co-faculty overview" className="grid grid-cols-3 gap-2 sm:gap-3">
          {tiles.map(({ title, count, href, icon: Icon, color }) => (
            <li key={title} className={panel}>
              <Link href={href} className={`group flex h-full items-center gap-2 rounded-2xl px-2.5 py-3 transition-colors hover:bg-brand-canvas sm:gap-3 sm:p-4 ${focus}`}>
                <span className={`hidden size-11 shrink-0 place-items-center rounded-xl md:grid ${color}`}><Icon size={20} aria-hidden="true" /></span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                  <p className="order-2 text-[11px] leading-tight font-medium text-text-secondary sm:order-0 sm:text-sm">{title}</p>
                  <p className="text-xl font-bold leading-tight text-brand-primary tabular-nums sm:text-2xl">{count ?? <span aria-label="Unavailable">—</span>}</p>
                </div>
                <ArrowUpRight size={16} className="hidden shrink-0 text-text-secondary group-hover:text-brand-primary md:block" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-6">
          <section aria-labelledby="co-committees-heading" className={panel}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-brand-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="co-committees-heading" className="text-lg font-bold text-brand-primary">Your committees</h2>
                <p className="mt-0.5 text-sm text-text-secondary">Open a chat or send a file to your team.</p>
              </div>
              <Link href={`${workspace}/committees`} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-brand-selected ${focus}`}>View all <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            {committeeError ? <p role="status" className="p-5 text-sm text-text-secondary">{committeeError}</p>
              : committees.length ? <ul className="divide-y divide-brand-border">
                {committees.slice(0, 4).map((committee) => <CommitteeRow key={committee.id} committee={committee} />)}
              </ul> : <EmptyState icon={UsersRound} title="No committees yet" detail="Committees appear here when an event lead assigns you to one." />}
          </section>

          <section aria-labelledby="co-assignments-heading" className={panel}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-brand-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="co-assignments-heading" className="text-lg font-bold text-brand-primary">Assignment queue</h2>
                <p className="mt-0.5 text-sm text-text-secondary">Open assignments, earliest due first.</p>
              </div>
              <Link href={assignmentsHref} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-brand-selected ${focus}`}>View all <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            {assignmentError ? <p role="status" className="p-5 text-sm text-text-secondary">{assignmentError}</p>
              : active.length ? <ul className="divide-y divide-brand-border">
                {active.slice(0, 3).map((assignment) => <li key={assignment.id} className="min-w-0 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold text-brand-primary">{assignment.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${assignment.progress === "IN_PROGRESS" ? "bg-warning-bg text-amber-900" : "bg-brand-selected text-brand-primary"}`}>
                      {assignment.progress === "IN_PROGRESS" ? "In progress" : "Not started"}
                    </span>
                  </div>
                  {assignment.due_date && <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${assignment.due_date < today ? "text-red-700" : "text-text-secondary"}`}>
                    <Clock3 size={14} aria-hidden="true" />{assignment.due_date < today ? "Overdue" : "Due"} {formatEventDateRange(assignment.due_date, assignment.due_date)}
                  </p>}
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-secondary">{assignment.responsibilities}</p>
                  <div className="mt-3"><CoordinatorProgressForm id={assignment.id} progress={assignment.progress} title={assignment.title} /></div>
                </li>)}
              </ul> : <EmptyState icon={CircleCheck} title={assignments.length ? "You’re all caught up" : "No assignments yet"} detail={assignments.length ? "See past work under Completed assignments." : "Event assignments will appear here when an event lead adds you."} />}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function CommitteeRow({ committee }: { committee: EventCommittee }) {
  const href = committeeHref(committee.id);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 sm:px-5">
      <span className="grid size-10 shrink-0 place-items-center self-start rounded-xl bg-brand-selected text-brand-primary"><UsersRound size={18} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 basis-36">
        <h3 className="break-words text-sm font-bold text-brand-primary">
          <Link href={href} className={`rounded hover:bg-brand-selected ${focus}`}>{committee.name}</Link>
        </h3>
        <p className="mt-0.5 break-words text-sm text-text-secondary">{committee.event_title}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1"><CalendarDays size={13} className="shrink-0" aria-hidden="true" />{formatEventDateRange(committee.start_date, committee.end_date)}</span>
          {committee.venue && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{committee.venue}</span></span>}
        </div>
      </div>
      <Link href={`${href}#committee-composer`} aria-label={`Share file in ${committee.name}`} className={`ml-13 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-brand-border px-2.5 text-xs font-semibold text-brand-primary hover:bg-brand-selected sm:ml-0 ${focus}`}>
        <Paperclip size={15} aria-hidden="true" />Share file
      </Link>
    </li>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof UsersRound; title: string; detail: string }) {
  return (
    <div className="px-5 py-7 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-xl bg-brand-selected text-brand-primary"><Icon size={19} aria-hidden="true" /></span>
      <p className="mt-2 font-semibold text-brand-primary">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{detail}</p>
    </div>
  );
}
