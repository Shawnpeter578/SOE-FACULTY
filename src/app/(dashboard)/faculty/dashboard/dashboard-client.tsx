
"use client";

import { useMemo } from "react";
import Link from "next/link";
import StatCard from "@/components/metric-card";
import { formatEventDateRange } from "@/lib/event-approval";
import { FacultyNotificationPreview } from "../components/FacultyNotifications";
import { facultyCardClass, facultyPageClass } from "../components/workspace-styles";
import { getStatusLabel, getStatusStyle } from "../events/event-status";
import {
  Calendar,
  Clock,
  CalendarCheck,
  ChevronRight,
  Check,
  ArrowRight,
  MapPin,
  Plus,
  X,
} from "lucide-react";

type StageStatus = "completed" | "current" | "upcoming";

interface Stage {
  label: string;
  status: StageStatus;
}

interface DashboardProposal {
  id: string;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: string;
  estimated_budget: number | null;
  created_at: string;
}

interface DashboardEvent {
  id: string;
  proposal_id: string;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: string;
  letter_printed_at: string | null;
}

interface DashboardProps {
  profile: {
    fullName: string;
  };
  proposals: DashboardProposal[];
  events: DashboardEvent[];
}

interface EventItem {
  id: string;
  proposalId: string;
  month: string;
  day: string;
  startDate: string;
  title: string;
  dateStr: string;
  location: string;
  status: string;
  stages: Stage[];
  canRecordDecision?: boolean;
}

const dashboardCard = `${facultyCardClass} min-w-0 p-4 sm:p-6`;


function PipelineBar({ stages }: { stages: Stage[] }) {
  const colors: Record<StageStatus, string> = {
    completed: "bg-emerald-600",
    current: "bg-brand-primary",
    upcoming: "bg-brand-border",
  };

  return (
    <div className="mt-4 rounded-2xl bg-brand-canvas px-3 py-3 sm:px-4">
      <p className="mb-2.5 text-xs font-semibold text-brand-primary">Event progress</p>
      <ol aria-label="Event progress" className="grid grid-cols-5 gap-x-1.5 sm:gap-x-2.5">
        {stages.map((stage) => (
          <li key={stage.label} aria-current={stage.status === "current" ? "step" : undefined} className="min-w-0">
            <span aria-hidden="true" className={`mb-1.5 block h-1.5 rounded-full ${colors[stage.status]}`} />
            <span className={`block text-[10px] leading-tight [overflow-wrap:anywhere] sm:text-xs ${stage.status === "current" ? "font-bold text-brand-primary" : "font-medium text-text-secondary"}`}>
              {stage.label}<span className="sr-only">, {stage.status}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const declined = event.status === "REJECTED" || event.status === "REJECTED_BY_VC";
  const approved = event.status === "APPROVED_BY_DEAN" || event.status === "OFFICIALLY_APPROVED";
  const StatusIcon = declined ? X : approved ? Check : Clock;
  const detailHref = `/faculty/events/${event.proposalId}`;

  return (
    <article className={`${dashboardCard} transition-colors hover:bg-brand-selected`}>
      <Link
        href={detailHref}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl no-underline hover:no-underline focus:no-underline active:no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary sm:gap-4"
      >
        <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-brand-selected py-2.5 text-brand-primary sm:w-14" aria-hidden="true">
          <span className="text-[10px] font-bold uppercase tracking-wider sm:text-xs">{event.month}</span>
          <span className="mt-0.5 text-xl font-bold leading-none tabular-nums sm:text-2xl">{event.day}</span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <h3 className="min-w-0 text-base font-bold leading-snug tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-lg">
              {event.title}
            </h3>
            <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(event.status)}`}>
              <StatusIcon size={14} className="shrink-0" aria-hidden="true" />
              <span>{getStatusLabel(event.status)}</span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-text-secondary">
            <span className="inline-flex items-start gap-1.5">
              <Calendar size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {event.dateStr}
            </span>
            {event.location && (
              <span className="inline-flex min-w-0 items-start gap-1.5 [overflow-wrap:anywhere]">
                <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{event.location}</span>
              </span>
            )}
          </div>
        </div>

        <span className="flex size-7 items-center justify-center rounded-full bg-brand-canvas text-brand-primary sm:size-9">
          <ChevronRight size={17} aria-hidden="true" />
        </span>
      </Link>

      {!declined && <PipelineBar stages={event.stages} />}

      {event.canRecordDecision && (
        <Link href={`${detailHref}/decision`} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
          Record VC decision <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}

      {event.status === "CHANGES_REQUESTED" && (
        <Link
          href={`${detailHref}/edit`}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-warning-bg px-3.5 py-2 text-sm font-semibold text-amber-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Review feedback and make changes <ArrowRight size={15} className="shrink-0" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return {
    month: date.toLocaleString("en-IN", { month: "short" }),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

function getProposalStages(status: string): Stage[] {
  const deanCompleted = status === "APPROVED_BY_DEAN";

  return [
    {
      label: "Dean",
      status: deanCompleted ? "completed" : "current",
    },
    { label: "VC document", status: "upcoming" },
    { label: "Committees", status: "upcoming" },
    { label: "Event", status: "upcoming" },
    { label: "Reports", status: "upcoming" },
  ];
}

function getEventStages(status: string): Stage[] {
  const documentUploaded = status === "OFFICIALLY_APPROVED";

  return [
    { label: "Dean", status: "completed" },
    {
      label: "VC document",
      status: documentUploaded ? "completed" : "current",
    },
    { label: "Committees", status: "upcoming" },
    { label: "Event", status: "upcoming" },
    { label: "Reports", status: "upcoming" },
  ];
}

export default function DashboardClient({
  profile,
  proposals,
  events,
}: DashboardProps) {
  const dashboardEvents = useMemo<EventItem[]>(() => {
    const proposalItems: EventItem[] = proposals.map((proposal) => {
      const date = formatDate(proposal.start_date);

      return {
        id: proposal.id,
        proposalId: proposal.id,
        month: date.month,
        day: date.day,
        startDate: proposal.start_date,
        title: proposal.title,
        dateStr: formatEventDateRange(
          proposal.start_date,
          proposal.end_date
        ),
        location: proposal.venue,
        status: proposal.status,
        stages: getProposalStages(proposal.status),
      };
    });

    const officialEventItems: EventItem[] = events.map((event) => {
      const date = formatDate(event.start_date);

      return {
        id: event.id,
        proposalId: event.proposal_id,
        month: date.month,
        day: date.day,
        startDate: event.start_date,
        title: event.title,
        dateStr: formatEventDateRange(
          event.start_date,
          event.end_date
        ),
        location: event.venue,
        status: event.status,
        stages: getEventStages(event.status),
        canRecordDecision: Boolean(event.letter_printed_at && event.status === "AWAITING_VC_DOCUMENT"),
      };
    });

    // Avoid displaying the same event twice after Dean approval.
    const approvedProposalIds = new Set(
      officialEventItems.map((event) => event.proposalId)
    );

    const uniqueProposals = proposalItems.filter(
      (proposal) =>
        !(
          proposal.status === "APPROVED_BY_DEAN" &&
          approvedProposalIds.has(proposal.proposalId)
        )
    );

    return [...officialEventItems, ...uniqueProposals].sort(
      (a, b) => a.startDate.localeCompare(b.startDate)
    );
  }, [proposals, events]);

  const pendingCount = proposals.filter((proposal) =>
    ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(
      proposal.status
    )
  ).length;

  const approvedCount = events.filter((event) => event.status !== "REJECTED_BY_VC").length;

  const ongoingCount = events.filter((event) => {
    const today = new Date().toISOString().slice(0, 10);

    return (
      event.status === "OFFICIALLY_APPROVED" &&
      event.start_date <= today &&
      event.end_date >= today
    );
  }).length;

  const firstName = profile.fullName.trim().split(/\s+/)[0] || "there";

  return (
    <>
      <div className={`${facultyPageClass} @container`}>
        {/* Mobile heading */}
        <div className="lg:hidden">
          <h1 className="mb-1 text-[28px] font-extrabold tracking-tight text-[#0F172A]">
            Good morning, {firstName}
          </h1>
          <p className="text-[15px] font-medium text-[#64748B]">Your faculty workspace</p>
        </div>

        {/* Desktop heading */}
        <div className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
          <div className="min-w-0">
            <h1 className="mb-1 break-words text-3xl font-bold tracking-tight text-slate-900">
              Good morning, {firstName}
            </h1>

            <p className="text-sm text-slate-500">
              Your faculty workspace
            </p>
          </div>

          <Link
            href="/faculty/request"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#1E2B58] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#162044]"
          >
            <Plus size={18} strokeWidth={2.5} />
            New event request
          </Link>
        </div>

        {/* Statistics */}
        <section aria-label="Event statistics" className="grid auto-rows-fr grid-cols-2 gap-3 @min-[42rem]:grid-cols-3 sm:gap-4">
          <StatCard title="Pending approval" count={pendingCount} icon={Clock} />
          <StatCard title="Approved events" count={approvedCount} icon={CalendarCheck} />
          <StatCard title="Ongoing events" count={ongoingCount} icon={Calendar} />
        </section>

        {/* Main dashboard content */}
        <section aria-labelledby="dashboard-events-heading" className="grid items-start gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <h2 id="dashboard-events-heading" className="text-xl font-bold tracking-tight text-slate-900">
              My events
            </h2>

            <Link
              href="/faculty/events"
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-brand-selected px-3 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              View all {dashboardEvents.length}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
            {dashboardEvents.length === 0 ? (
              <div className={`${dashboardCard} flex min-h-56 flex-col items-center justify-center text-center`}>
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-selected text-brand-primary">
                  <Calendar size={24} aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold text-text-primary">No events yet</h3>
                <p className="mt-1 text-sm text-text-secondary">Your requests and their progress will appear here.</p>
                <Link
                  href="/faculty/request"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                >
                  <Plus size={16} aria-hidden="true" /> Propose your first event
                </Link>
              </div>
            ) : (
              dashboardEvents.map((event) => <EventCard key={event.id} event={event} />)
            )}

          </div>

          {/* Desktop sidebar */}
          <div className="hidden min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:flex">
            {/* Upcoming deadlines placeholder */}
            <div className={dashboardCard}>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-selected text-brand-primary">
                  <Clock size={19} aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Upcoming deadlines
                </h3>
              </div>
              <div className="mt-4 rounded-2xl bg-brand-canvas p-4">
                <p className="text-sm font-medium text-text-primary">No deadlines available yet.</p>
                <p className="mt-1 text-xs text-text-secondary">Event task management is coming soon.</p>
              </div>
            </div>

            <FacultyNotificationPreview className={dashboardCard} />
          </div>
        </section>
      </div>
    </>
  );
}
