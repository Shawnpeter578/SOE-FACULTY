
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CalendarCheck,
  Receipt,
  ChevronRight,
  Check,
  AlertCircle,
  Plus,
  Bell,
  X,
  CheckCircle2,
  MessageCircle,
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
  month: string;
  day: string;
  title: string;
  dateStr: string;
  location: string;
  status: string;
  stages: Stage[];
}

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
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col w-[240px] md:w-auto md:min-w-[200px] flex-shrink-0 md:flex-shrink snap-start hover:shadow-md md:hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-[15px] font-medium text-slate-500">
        {title}
      </h3>

      <div className="p-2 bg-[#F8FAFC] rounded-full text-[#1E2B58] transition-colors">
        <Icon size={18} />
      </div>
    </div>

    <div className="text-[32px] font-bold text-slate-900 mb-1 leading-none">
      {count}
    </div>

    <p className="text-[13px] text-slate-500">{subtitle}</p>
  </div>
);

const PipelineBar = ({ stages }: { stages: Stage[] }) => (
  <div className="flex gap-1.5 w-full mt-5">
    {stages.map((stage, idx) => (
      <div
        key={idx}
        className="flex-1 flex flex-col items-center gap-1.5"
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
          className={`text-[11px] md:text-xs font-bold transition-colors duration-300 ${
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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under review",
    CHANGES_REQUESTED: "Changes requested",
    REJECTED: "Rejected",
    APPROVED_BY_DEAN: "Approved by Dean",
    AWAITING_VC_DOCUMENT: "Awaiting official letter",
    OFFICIALLY_APPROVED: "Officially approved",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

function getStatusStyle(status: string) {
  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  if (status === "CHANGES_REQUESTED") {
    return "bg-orange-50 text-orange-700";
  }

  if (status === "APPROVED_BY_DEAN" || status === "OFFICIALLY_APPROVED") {
    return "bg-[#ECFDF5] text-[#059669]";
  }

  if (status === "UNDER_REVIEW") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-blue-50 text-blue-700";
}

export default function DashboardClient({
  profile,
  proposals,
  events,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Notifications will be connected when the notifications module exists.
  const [notifications, setNotifications] = useState<
    {
      id: number;
      title: string;
      time: string;
      type: string;
    }[]
  >([]);

  const dashboardEvents = useMemo<EventItem[]>(() => {
    const proposalItems: EventItem[] = proposals.map((proposal) => {
      const date = formatDate(proposal.start_date);

      return {
        id: proposal.id,
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
      officialEventItems.map((event) => event.title)
    );

    const uniqueProposals = proposalItems.filter(
      (proposal) =>
        !(
          proposal.status === "APPROVED_BY_DEAN" &&
          approvedProposalIds.has(proposal.title)
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

  const approvedCount = events.length;

  const ongoingCount = events.filter((event) => {
    const today = new Date().toISOString().slice(0, 10);

    return (
      event.start_date <= today &&
      event.end_date >= today
    );
  }).length;

  const filteredEvents = dashboardEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const removeNotification = (id: number) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const firstName = profile.fullName.trim().split(/\s+/)[0] || "there";

  return (
    <>
      <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
        {/* Mobile heading */}
        <div className="flex items-start justify-between lg:hidden mb-8 mt-2 md:mt-0">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#0F172A] tracking-tight mb-1">
              Good morning, {firstName}
            </h1>

            <p className="text-[15px] font-medium text-[#64748B]">
              Your faculty workspace
            </p>
          </div>

          <button
            onClick={() => setNotifications([])}
            className="relative text-[#1E2B58] p-1 active:scale-90 transition-transform duration-200"
            aria-label="Clear notifications"
          >
            <Bell size={26} strokeWidth={2} />

            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-[#F8FAFC]" />
            )}
          </button>
        </div>

        {/* Desktop heading */}
        <div className="hidden lg:flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">
              Good morning, {firstName}
            </h1>

            <p className="text-sm text-slate-500">
              Your faculty workspace
            </p>

            <div className="flex gap-4 mt-3">
              <Link
                href="/faculty/events"
                className="text-sm font-semibold text-[#1E2B58] hover:underline"
              >
                My Proposals
              </Link>

              <Link
                href="/faculty/events/new"
                className="text-sm font-semibold text-[#1E2B58] hover:underline"
              >
                Propose an Event
              </Link>
            </div>
          </div>

          <Link
            href="/faculty/events/new"
            className="flex items-center gap-2 bg-[#1E2B58] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162044] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200"
          >
            <Plus size={18} strokeWidth={2.5} />
            New event request
          </Link>
        </div>

        {/* Statistics */}
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 md:gap-5 mb-8 pb-4 -mx-5 px-5 lg:mx-0 lg:px-0 hide-scrollbar snap-x snap-mandatory">
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
        </div>

        {/* Main dashboard content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-28 md:pb-0">
          <div className="lg:col-span-2 flex flex-col gap-4 md:gap-5">
            <div className="flex justify-between items-center mb-1 md:mb-2">
              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
                {searchQuery ? "Search Results" : "My events"}
              </h2>

              <Link
                href="/faculty/events"
                className="text-[15px] font-bold text-[#1E2B58] flex items-center gap-1 active:opacity-70 transition-opacity"
              >
                View all {dashboardEvents.length}
                <ChevronRight size={18} />
              </Link>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100">
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
                    href="/faculty/events/new"
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
                  className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] lg:hover:-translate-y-1 transition-transform duration-200"
                >
                  <div className="flex gap-4 md:gap-5 items-start mb-6">
                    <div className="bg-[#F8FAFC] p-3 md:p-4 rounded-[18px] min-w-[72px] md:min-w-[80px] text-center">
                      <div className="text-[13px] font-bold text-[#1E2B58] uppercase tracking-wider">
                        {event.month}
                      </div>

                      <div className="text-[28px] md:text-3xl font-bold text-slate-900 leading-none mt-1">
                        {event.day}
                      </div>
                    </div>

                    <div className="flex-1 pt-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-900 text-lg md:text-xl tracking-tight">
                          {event.title}
                        </h3>

                        <ChevronRight
                          size={22}
                          className="text-slate-400 flex-shrink-0"
                        />
                      </div>

                      <p className="text-[15px] text-slate-500 mt-1 mb-3.5 leading-relaxed">
                        {event.dateStr}
                        <br />
                        {event.location}
                      </p>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold ${getStatusStyle(event.status)}`}
                      >
                        {event.status === "REJECTED" ? (
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
                  </div>

                  <PipelineBar stages={event.stages} />

                  {event.status === "CHANGES_REQUESTED" && (
                    <Link
                      href={`/faculty/events/${event.id}/edit`}
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
          <div className="hidden lg:flex flex-col gap-6">
            {/* Upcoming deadlines placeholder */}
            <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-300">
              <div className="flex justify-between items-center mb-7">
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">
                  Upcoming deadlines
                </h3>

                <Clock size={20} className="text-[#1E2B58]" />
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

            {/* Recent notifications */}
            <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-300">
              <div className="flex justify-between items-center mb-7">
                <h3 className="font-bold text-xl text-slate-900 tracking-tight">
                  Recent notifications
                </h3>

                {notifications.length > 0 ? (
                  <span className="text-[13px] font-bold text-[#1E2B58] bg-blue-50/80 px-2.5 py-1 rounded-md">
                    {notifications.length} new
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-slate-400">
                    All caught up
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {notifications.length === 0 && (
                  <div className="text-center py-5">
                    <Bell
                      size={28}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="text-sm text-slate-500">
                      No new notifications.
                    </p>
                  </div>
                )}

                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => removeNotification(notif.id)}
                    className="flex gap-4 text-left w-full cursor-pointer group"
                  >
                    <div
                      className={`mt-0.5 bg-[#F8FAFC] p-2 rounded-full transition-colors flex-shrink-0 ${
                        notif.type === "success"
                          ? "group-hover:bg-[#ECFDF5] text-slate-600 group-hover:text-[#059669]"
                          : "group-hover:bg-blue-50 text-slate-600 group-hover:text-[#1E2B58]"
                      }`}
                    >
                      {notif.type === "success" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <MessageCircle size={18} />
                      )}
                    </div>

                    <div>
                      <p className="text-[15px] font-semibold text-[#334155] group-hover:text-slate-900 transition-colors">
                        {notif.title}
                      </p>

                      <p className="text-[13px] text-slate-500 mt-1">
                        {notif.time}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
