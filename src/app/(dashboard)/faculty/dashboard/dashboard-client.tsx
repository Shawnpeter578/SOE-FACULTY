
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FacultyNotificationButton, FacultyNotificationPreview } from "../components/FacultyNotifications";
import { facultyCardClass, facultyPageClass } from "../components/workspace-styles";
import { getStatusLabel, getStatusStyle } from "../events/event-status";
import {
  Calendar,
  Clock,
  CalendarCheck,
  Receipt,
  ChevronRight,
  Check,
  AlertCircle,
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
  title: string;
  dateStr: string;
  location: string;
  status: string;
  stages: Stage[];
}

const dashboardCard = `${facultyCardClass} min-w-0 p-4 sm:p-5`;

const StatCard = ({
  title,
  count,
  subtitle,
  icon: Icon,
}: {
  title: string;
  count: string | number;
  subtitle: string;
  icon: React.ElementType;
}) => (
  <div className={`${facultyCardClass} grid min-h-28 min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start items-center gap-x-2 gap-y-1 p-3.5 sm:p-4`}>
    <h3 className="col-span-2 text-[13px] font-medium leading-4 text-slate-600">{title}</h3>
    <p className="text-[30px] font-bold leading-none tabular-nums text-slate-900">{count}</p>
    <span className="flex size-7 items-center justify-center rounded-full bg-slate-50 text-[#1E2B58]">
      <Icon size={16} aria-hidden="true" />
    </span>
    <p className="col-span-2 text-[13px] leading-4 text-slate-600">{subtitle}</p>
  </div>
);

const PipelineBar = ({ stages }: { stages: Stage[] }) => (
  <div className="mt-4 grid w-full grid-cols-5 gap-1.5">
    {stages.map((stage, idx) => (
      <div
        key={idx}
        className="flex min-w-0 flex-col items-center gap-1.5 text-center"
      >
        <div
          className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
            stage.status === "completed"
              ? "bg-[#10B981]"
              : stage.status === "current"
                ? "bg-[#1E2B58]"
                : "bg-slate-200"
          }`}
        />

        <span
          className={`break-words text-[11px] leading-tight font-bold transition-colors duration-300 ${
            stage.status === "current"
              ? "text-[#1E2B58]"
              : "text-slate-400"
          }`}
        >
          {stage.label}
        </span>
      </div>
    ))}
  </div>
);

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return {
    month: date.toLocaleString("en-IN", { month: "short" }),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

function formatDateRange(start: string, end: string) {
  if (start === end) return start;
  return `${start} – ${end}`;
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
  const [searchQuery] = useState("");

  const dashboardEvents = useMemo<EventItem[]>(() => {
    const proposalItems: EventItem[] = proposals.map((proposal) => {
      const date = formatDate(proposal.start_date);

      return {
        id: proposal.id,
        proposalId: proposal.id,
        month: date.month,
        day: date.day,
        title: proposal.title,
        dateStr: formatDateRange(
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
        title: event.title,
        dateStr: formatDateRange(
          event.start_date,
          event.end_date
        ),
        location: event.venue,
        status: event.status,
        stages: getEventStages(event.status),
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
      (a, b) => a.dateStr.localeCompare(b.dateStr)
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

  const filteredEvents = dashboardEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const firstName = profile.fullName.trim().split(/\s+/)[0] || "there";

  return (
    <>
      <div className={`${facultyPageClass} @container`}>
        {/* Mobile heading */}
        <div className="flex items-start justify-between gap-3 lg:hidden">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#0F172A] tracking-tight mb-1">
              Good morning, {firstName}
            </h1>

            <p className="text-[15px] font-medium text-[#64748B]">
              Your faculty workspace
            </p>
          </div>

          <FacultyNotificationButton />
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
        <section aria-label="Event statistics" className="grid auto-rows-fr grid-cols-2 gap-3 @min-[42rem]:grid-cols-4 sm:gap-4">
          <StatCard
            title="Pending approval"
            count={pendingCount}
            subtitle="Awaiting Dean review"
            icon={Clock}
          />

          <StatCard
            title="Approved events"
            count={approvedCount}
            subtitle="Dean-approved events"
            icon={CalendarCheck}
          />

          <StatCard
            title="Ongoing events"
            count={ongoingCount}
            subtitle="Currently happening"
            icon={Calendar}
          />

          <StatCard
            title="Bills pending"
            count="—"
            subtitle="Finance module coming soon"
            icon={Receipt}
          />
        </section>

        {/* Main dashboard content */}
        <section aria-labelledby="dashboard-events-heading" className="grid items-start gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <h2 id="dashboard-events-heading" className="text-xl font-bold tracking-tight text-slate-900">
              {searchQuery ? "Search Results" : "My events"}
            </h2>

            <Link
              href="/faculty/events"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E2B58] hover:underline"
            >
              View all {dashboardEvents.length}
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
            {filteredEvents.length === 0 ? (
              <div className={`${facultyCardClass} p-5 text-center sm:p-7`}>
                <Calendar
                  size={32}
                  className="mx-auto mb-3 text-slate-300"
                />

                <p className="text-slate-500 font-medium">
                  {searchQuery
                    ? `No events found matching "${searchQuery}"`
                    : "You haven't submitted any event proposals yet."}
                </p>

                {!searchQuery && (
                  <Link
                    href="/faculty/request"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1E2B58] hover:underline"
                  >
                    <Plus size={16} />
                    Propose your first event
                  </Link>
                )}
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`${dashboardCard} transition-colors hover:border-slate-300`}
                >
                  <Link href={`/faculty/events/${event.proposalId}`} className="group flex items-start gap-3 rounded-lg sm:gap-4">
                    <div className="w-14 shrink-0 rounded-xl bg-slate-50 p-2.5 text-center sm:w-16 sm:p-3">
                      <div className="text-[13px] font-bold text-[#1E2B58] uppercase tracking-wider">
                        {event.month}
                      </div>

                      <div className="mt-1 text-xl font-bold leading-none text-slate-900 sm:text-2xl">
                        {event.day}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="min-w-0 break-words text-base font-bold tracking-tight text-slate-900">
                          <span className="group-hover:underline">{event.title}</span>
                        </h3>

                        <ChevronRight
                          size={18}
                          className="text-slate-400 flex-shrink-0"
                        />
                      </div>

                      <p className="mt-1 mb-2 break-words text-sm text-slate-600">
                        {event.dateStr}
                        {event.location && ` · ${event.location}`}
                      </p>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold ${getStatusStyle(event.status)}`}
                      >
                        {event.status === "REJECTED" || event.status === "REJECTED_BY_VC" ? (
                          <X size={14} />
                        ) : event.status === "APPROVED_BY_DEAN" ||
                          event.status === "OFFICIALLY_APPROVED" ? (
                          <Check size={16} strokeWidth={3} />
                        ) : (
                          <Clock size={14} strokeWidth={2.5} />
                        )}

                        {getStatusLabel(event.status)}
                      </span>
                    </div>
                  </Link>

                  <PipelineBar stages={event.stages} />

                  {event.status === "CHANGES_REQUESTED" && (
                    <Link
                      href={`/faculty/events/${event.proposalId}/edit`}
                      className="mt-4 inline-block text-sm font-semibold text-orange-700 hover:underline"
                    >
                      Review feedback and make changes →
                    </Link>
                  )}
                </div>
              ))
            )}

            {/* Mobile finance placeholder */}
            <div className="lg:hidden flex items-start gap-4 px-2 mt-4">
              <AlertCircle
                size={24}
                className="text-slate-400 mt-0.5 flex-shrink-0"
                strokeWidth={2.5}
              />

              <div>
                <p className="text-[15px] font-bold text-slate-600">
                  Finance module
                </p>

                <p className="text-[15px] text-[#475569] font-medium mt-0.5">
                  Expense and invoice tracking will be available here.
                </p>
              </div>
            </div>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:flex">
            {/* Upcoming deadlines placeholder */}
            <div className={dashboardCard}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Upcoming deadlines
                </h3>

                <Clock size={18} className="shrink-0 text-[#1E2B58]" aria-hidden="true" />
              </div>

              <div className="text-center py-5">
                <Calendar
                  size={30}
                  className="mx-auto mb-3 text-slate-300"
                />

                <p className="text-sm text-slate-500">
                  No deadlines available yet.
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Event task management is coming soon.
                </p>
              </div>
            </div>

            <FacultyNotificationPreview className={dashboardCard} />
          </div>
        </section>
      </div>
    </>
  );
}
