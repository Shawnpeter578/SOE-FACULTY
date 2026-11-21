"use client";

import Link from "next/link";
import MetricCard from "@/components/metric-card";
import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DeanActivity } from "../workspace";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleX,
  Clock3,
  FileCheck2,
  FileText,
  Search,
  X,
} from "lucide-react";

export type DashboardItem = {
  id: string;
  title: string;
  venue: string;
  startDate: string;
  status: string;
  kind: "proposal" | "event";
  href: string;
  person: string;
  updatedAt: string;
  reviewNote: string | null;
};

type DashboardTab = "new" | "review" | "vc" | "approved" | "closed";

function notificationKey(request: DashboardItem) {
  return `${request.id}:${request.updatedAt}`;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readSeenRequests(stored: string) {
  try {
    const keys: unknown = JSON.parse(stored);
    return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function NewRequestAlert({ deanId, requests }: { deanId: string; requests: DashboardItem[] }) {
  const storageKey = `eventdesk:seen-requests:${deanId}`;
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const stored = useSyncExternalStore(
    subscribeToStorage,
    () => {
      try {
        return sessionStorage.getItem(storageKey) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => null,
  );
  const seen = new Set([...readSeenRequests(stored ?? "[]"), ...acknowledged]);
  const unseen = stored === null ? [] : requests.filter((request) => !seen.has(notificationKey(request)));
  const latest = unseen[0];

  function acknowledge(requestsToDismiss: DashboardItem[]) {
    const updated = [...seen, ...requestsToDismiss.map(notificationKey)];
    setAcknowledged(updated);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Dismissal still applies while this dashboard is open.
    }
  }

  if (!latest) return null;

  return (
    <aside aria-label="New request notification" className="fixed inset-x-4 top-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:left-auto sm:right-6 sm:top-6 sm:w-full">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-slate-50 p-2 text-[#1E2B58]"><Bell size={18} aria-hidden="true" /></span>
        <div role="status" className="min-w-0 flex-1">
          <p className="text-sm font-bold">{unseen.length === 1 ? "New event request" : `${unseen.length} new event requests`}</p>
          <p className="mt-1 break-words text-sm">{latest.title}</p>
          <p className="mt-1 text-xs text-slate-500">Submitted by {latest.person}</p>
        </div>
        <button type="button" onClick={() => acknowledge(unseen)} aria-label="Dismiss new request notification" className="rounded-md p-1 text-[#1E2B58] hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>
      <Link href={latest.href} onClick={() => acknowledge([latest])} className="ml-12 mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1E2B58] hover:underline">
        {unseen.length === 1 ? "Review request" : "Review latest request"} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </aside>
  );
}

const tabLabels: Record<DashboardTab, string> = {
  new: "New requests",
  review: "Under review",
  vc: "Awaiting VC",
  approved: "Approved",
  closed: "Closed",
};

const icons = {
  new: FileText,
  review: FileCheck2,
  vc: Clock3,
  approved: CheckCircle2,
  closed: CircleX,
};

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-800",
  AWAITING_VC_DOCUMENT: "bg-yellow-50 text-yellow-800",
  REJECTED: "bg-red-50 text-red-700",
  REJECTED_BY_VC: "bg-red-50 text-red-700",
};

const requestsPerPage = 5;
const panelClass = "rounded-3xl border border-slate-100 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.03)]";
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E2B58] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#162044] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E2B58]";

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

function formatRelative(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return "Recently";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DeanDashboard({
  deanId,
  deanName,
  proposals,
  events,
  activities,
}: {
  deanId: string;
  deanName: string;
  proposals: DashboardItem[];
  events: DashboardItem[];
  activities: DeanActivity[];
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("new");
  const [page, setPage] = useState(0);
  const router = useRouter();
  const panel = useSearchParams().get("panel");
  const showReports = panel === "reports";
  const showHelp = panel === "help";

  function closePanel() {
    router.replace("/dean/dashboard", { scroll: false });
  }

  const groups: Record<DashboardTab, DashboardItem[]> = {
    new: proposals.filter((item) => item.status === "SUBMITTED"),
    review: proposals.filter((item) => item.status === "UNDER_REVIEW"),
    vc: events.filter((item) => item.status === "AWAITING_VC_DOCUMENT"),
    approved: events.filter((item) => item.status === "OFFICIALLY_APPROVED"),
    closed: [...proposals.filter((item) => item.status === "REJECTED"), ...events.filter((item) => item.status === "REJECTED_BY_VC")],
  };

  const filteredItems = groups[activeTab];
  const lastPage = Math.max(0, Math.ceil(filteredItems.length / requestsPerPage) - 1);
  const currentPage = Math.min(page, lastPage);
  const firstIndex = currentPage * requestsPerPage;
  const visibleItems = filteredItems.slice(firstIndex, firstIndex + requestsPerPage);
  const needsDecision = groups.review[0] ?? groups.new[0];
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  function selectTab(tab: DashboardTab) {
    setActiveTab(tab);
    setPage(0);
  }

  return (
    <>
      <NewRequestAlert key={deanId} deanId={deanId} requests={groups.new} />
      <div className="@container mx-auto w-full min-w-0 max-w-[96rem] py-6 md:py-8">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 break-words">
            <h1 className="mb-1 text-[28px] font-extrabold tracking-tight lg:text-3xl lg:font-bold">Events dashboard</h1>
            <p className="text-sm text-slate-500">Welcome, {deanName}.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={18} className="text-[#1E2B58]" aria-hidden="true" />{today}
          </span>
        </section>

        <section aria-label="Proposal overview" className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 @min-[40rem]:grid-cols-3 @min-[56rem]:grid-cols-5">
          {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
            <MetricCard
              key={tab}
              title={tabLabels[tab]}
              count={groups[tab].length}
              icon={icons[tab]}
              onSelect={() => selectTab(tab)}
              selected={activeTab === tab}
            />
          ))}
        </section>

        <div className="mt-8 space-y-6 md:space-y-8">
          <section id="events" className={`${panelClass} @container min-w-0 scroll-mt-24 overflow-hidden`}>
            <div className="px-5 pt-6 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[22px] font-bold tracking-tight text-slate-900">Events</h2>
                <Link href="/dean/proposals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E2B58] hover:underline">
                  All requests <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div role="group" aria-label="Filter event requests" className="mt-5 flex flex-wrap gap-1 pb-3">
                {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={activeTab === tab}
                    onClick={() => selectTab(tab)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold transition-colors ${activeTab === tab ? "bg-[#EEF2F6] text-[#1A2234]" : "text-slate-600 hover:bg-slate-50 hover:text-[#1A2234]"}`}
                  >
                    {tabLabels[tab]}
                    <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${activeTab === tab ? "bg-white text-[#1E2B58]" : "bg-slate-100 text-slate-600"}`}>
                      {groups[tab].length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {visibleItems.length ? (
              <>
                <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(7rem,0.8fr)_minmax(7rem,1fr)_auto] gap-4 border-y border-slate-100 bg-slate-50 px-7 py-3 text-sm font-medium text-slate-600 @min-[40rem]:grid">
                  <span>Event</span><span>Event date</span><span>Status</span><span className="min-w-24 text-right">Action</span>
                </div>
                <ul className="divide-y divide-slate-100 border-y border-slate-100 @min-[40rem]:border-y-0">
                  {visibleItems.map((item) => (
                    <li key={item.id} className="grid grid-cols-1 @min-[40rem]:grid-cols-[minmax(0,1.6fr)_minmax(7rem,0.8fr)_minmax(7rem,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-brand-selected sm:px-7 @min-[40rem]:gap-4">
                      <div className="min-w-0">
                        <Link href={item.href} className="block break-words rounded-sm text-base font-semibold text-slate-900 no-underline hover:no-underline focus:no-underline active:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
                          {item.title}
                        </Link>
                        <p className="mt-1 break-words text-sm text-slate-600">{item.person}{item.venue ? ` · ${item.venue}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays size={16} className="shrink-0 text-slate-500" aria-hidden="true" />{formatDate(item.startDate)}
                      </div>
                      <div><StatusPill status={item.status} /></div>
                      <div className="flex flex-wrap items-center gap-2 @min-[40rem]:justify-end">
                        <Link href={item.href} aria-label={`${item.kind === "proposal" ? "Review" : "View"} ${item.title}`} className={actionClass}>
                          {item.kind === "proposal" ? "Review" : "View"} <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center border-t border-slate-100 px-5 py-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Search size={24} aria-hidden="true" /></span>
                <p className="mt-4 text-sm font-medium text-slate-600">{`No ${tabLabels[activeTab].toLowerCase()}`}</p>
              </div>
            )}

            {visibleItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">
                <p className="text-sm text-slate-600">Showing {firstIndex + 1}–{firstIndex + visibleItems.length} of {filteredItems.length}</p>
                {lastPage > 0 && (
                  <div className="flex gap-2">
                    <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#1E2B58] enabled:hover:bg-slate-50 disabled:opacity-45">
                      <ChevronLeft size={16} aria-hidden="true" /> Previous
                    </button>
                    <button type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#1E2B58] enabled:hover:bg-slate-50 disabled:opacity-45">
                      Next <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-label="Dashboard updates" className="grid min-w-0 gap-6 @min-[40rem]:grid-cols-2">
            <section className={`${panelClass} min-w-0 p-5 sm:p-7`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Needs your attention</h2>
                <CircleAlert size={20} className="shrink-0 text-[#1E2B58]" aria-hidden="true" />
              </div>
              {needsDecision ? (
                <>
                  <p className="mt-5 break-words text-sm leading-relaxed text-slate-600"><span className="font-semibold text-slate-900">{needsDecision.title}</span> is waiting for review.</p>
                  <p className="mt-2 text-sm text-slate-500">Updated {formatRelative(needsDecision.updatedAt)}</p>
                  <Link href={needsDecision.href} className={`${actionClass} mt-4`}>Open request <ArrowRight size={16} aria-hidden="true" /></Link>
                </>
              ) : <p className="mt-5 text-sm text-slate-500">There are no requests waiting for a decision.</p>}
            </section>

            <section className={`${panelClass} min-w-0 p-5 sm:p-7`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Recent activity</h2>
                <Link href="/dean/proposals" className="text-sm font-semibold text-[#1E2B58] hover:underline">View all</Link>
              </div>
              {activities.length ? (
                <ul className="mt-3 divide-y divide-slate-100">
                  {activities.slice(0, 4).map((activity) => (
                    <li key={activity.id}>
                      <Link href={activity.href} className="flex gap-3 rounded-lg py-3 hover:bg-slate-50">
                        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[#1E2B58]">{activity.status === "APPROVED_BY_DEAN" ? <CheckCircle2 size={18} /> : activity.status === "REJECTED" ? <CircleX size={18} /> : <FileText size={18} />}</span>
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-semibold text-slate-800">{activity.title}</span>
                          <span className="mt-0.5 block text-sm text-slate-600">{activityLabel(activity.status)}</span>
                          <span className="mt-1 block text-xs text-slate-500">{formatRelative(activity.at)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 border-t border-slate-100 py-4 text-sm text-slate-600">No recent activity yet.</p>}
            </section>
          </section>
        </div>
      </div>

      {(showReports || showHelp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="dashboard-dialog-title" className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="dashboard-dialog-title" className="text-xl font-bold tracking-tight text-slate-900">{showReports ? "Dean reports" : "Dashboard help"}</h2>
                <p className="mt-1 text-sm text-slate-500">{showReports ? "Current proposal and event overview." : "Quick guidance for your workspace."}</p>
              </div>
              <button type="button" onClick={closePanel} aria-label="Close" className="rounded-lg p-1.5 text-[#1E2B58] hover:bg-slate-100"><X size={16} /></button>
            </div>
            {showReports ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
                  <button key={tab} type="button" onClick={() => { selectTab(tab); closePanel(); }} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50">
                    <span className="block text-xl font-bold text-slate-900">{groups[tab].length}</span>
                    <span className="text-sm text-slate-600">{tabLabels[tab]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                <p>Use the status cards or tabs to switch between requests, reviews, VC approvals, approved events, and closed requests.</p>
                <p>Use the top search bar to find requests by event name, venue, or faculty member.</p>
                <Link href="/dean/proposals" className="inline-flex items-center gap-1 font-semibold text-[#1E2B58] hover:underline">Open all requests <ArrowRight size={15} /></Link>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SUBMITTED: "New request received",
    UNDER_REVIEW: "Under review",
    CHANGES_REQUESTED: "Changes requested",
    APPROVED_BY_DEAN: "Dean approval recorded",
    OFFICIALLY_APPROVED: "Event officially approved",
    AWAITING_VC_DOCUMENT: "Awaiting VC document",
    REJECTED: "Request closed",
    REJECTED_BY_VC: "VC disapproved",
  };
  return labels[status] ?? status.replaceAll("_", " ").toLocaleLowerCase();
}

function activityLabel(status: string) {
  const labels: Record<string, string> = {
    SUBMITTED: "New request received",
    UNDER_REVIEW: "Review started",
    CHANGES_REQUESTED: "Changes requested",
    APPROVED_BY_DEAN: "Dean approval recorded",
    OFFICIALLY_APPROVED: "VC-signed letter received",
    REJECTED: "Request closed",
  };
  return labels[status] ?? statusLabel(status);
}

function StatusPill({ status }: { status: string }) {
  const label = status === "SUBMITTED" ? "Pending" : statusLabel(status);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${statusColors[status] ?? "bg-emerald-50 text-emerald-800"}`}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      <span>{label}</span>
    </span>
  );
}
