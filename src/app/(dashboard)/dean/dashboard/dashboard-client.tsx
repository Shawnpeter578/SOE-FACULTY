"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { universityName } from "@/lib/university";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Search,
  UserRound,
  UsersRound,
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

export type DashboardActivity = {
  id: string;
  title: string;
  status: string;
  person: string;
  at: string;
  href: string;
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
  review: "Letter pending",
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

function sidebarControlClass(selected: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors [&>svg]:size-5 [&>svg]:shrink-0 ${selected ? "bg-[#EEF2F6] font-semibold text-[#1A2234]" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-[#1A2234] [&>svg]:text-slate-400"}`;
}

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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DB";
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
  activities: DashboardActivity[];
}) {
  const [selectedTab, setSelectedTab] = useState<DashboardTab | null>(null);
  const activeTab = selectedTab ?? "new";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const groups: Record<DashboardTab, DashboardItem[]> = {
    new: proposals.filter((item) => item.status === "SUBMITTED"),
    review: proposals.filter((item) => item.status === "UNDER_REVIEW"),
    vc: events.filter((item) => item.status === "AWAITING_VC_DOCUMENT"),
    approved: events.filter((item) => item.status === "OFFICIALLY_APPROVED"),
    closed: [...proposals.filter((item) => item.status === "REJECTED"), ...events.filter((item) => item.status === "REJECTED_BY_VC")],
  };

  const selectedItems = groups[activeTab];
  const term = search.trim().toLocaleLowerCase();
  const filteredItems = term
    ? selectedItems.filter((item) =>
        [item.title, item.venue, item.person, item.status]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term),
      )
    : selectedItems;

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

  function selectTab(tab: DashboardTab | null) {
    setSelectedTab(tab);
    setPage(0);
    setSearch("");
  }

  return (
    <div className="min-h-screen bg-[#F4F7F9] font-sans text-slate-900 lg:flex">
      <NewRequestAlert key={deanId} deanId={deanId} requests={groups.new} />
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white lg:flex">
        <Link href="/dean/dashboard" onClick={() => selectTab(null)} className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-6 text-xl font-bold text-[#1A2234] transition-colors hover:bg-slate-50">
          <span className="flex size-6 items-center justify-center rounded-md bg-[#1A2234] text-white">
            <CalendarDays size={16} aria-hidden="true" />
          </span>
          EventDesk
        </Link>

        <div className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-snug">{universityName}</p>
        </div>

        <nav aria-label="Dean navigation" className="space-y-1 px-3">
          <Link href="/dean/dashboard" onClick={() => selectTab(null)} aria-current={selectedTab === null ? "page" : undefined} className={sidebarControlClass(selectedTab === null)}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <button type="button" onClick={() => selectTab("new")} aria-pressed={selectedTab === "new"} className={sidebarControlClass(selectedTab === "new")}>
            <FileText size={18} /> Requests
          </button>
          <button type="button" onClick={() => selectTab("approved")} aria-pressed={selectedTab === "approved"} className={sidebarControlClass(selectedTab === "approved")}>
            <CircleCheck size={18} /> Approved events
          </button>
          <button type="button" onClick={() => selectTab("closed")} aria-pressed={selectedTab === "closed"} className={sidebarControlClass(selectedTab === "closed")}>
            <CircleX size={18} /> Closed events
          </button>
          <button type="button" onClick={() => setShowReports(true)} aria-haspopup="dialog" className={sidebarControlClass(showReports)}>
            <UsersRound size={18} /> Reports
          </button>
        </nav>

        <div className="mt-auto space-y-4 p-4">
          <button type="button" onClick={() => setShowProfile((value) => !value)} aria-expanded={showProfile} className={sidebarControlClass(showProfile)}>
            <UserRound size={18} /> Profile
          </button>
          {showProfile && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm">
              <p className="font-semibold text-slate-900">{deanName}</p>
              <p className="mt-1 text-slate-500">Dean · {universityName}</p>
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-[#1A2234]">A little help?</p>
            <p className="mb-3 mt-1 text-xs text-slate-500">Your campus guide is one click away.</p>
            <button type="button" onClick={() => setShowHelp(true)} aria-haspopup="dialog" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A2234] hover:underline">
              Visit help center <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2F6] text-sm font-bold text-[#1A2234]">{initials(deanName)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#1A2234]">{deanName}</span>
              <span className="block text-xs text-slate-500">Dean</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="relative w-96 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              aria-label="Search requests, events, and people"
              placeholder="Search dashboard..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-slate-500 focus:border-[#1A2234] focus:ring-1 focus:ring-[#1A2234]"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"><X size={16} /></button>}
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 sm:ml-4 sm:gap-5">
            <span className="hidden sm:inline">Dean workspace</span>
            <div className="relative">
              <button type="button" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifications" aria-expanded={showNotifications} className="relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-slate-100 hover:text-[#1A2234]">
                <Bell size={20} />
                {activities.length > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-white bg-red-500" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 z-40 w-[min(20rem,calc(100vw-5rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Recent activity</p>
                    <button type="button" onClick={() => setShowNotifications(false)} aria-label="Close notifications" className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X size={14} /></button>
                  </div>
                  {activities.length ? <div className="mt-3 space-y-2">{activities.slice(0, 3).map((activity) => <Link key={activity.id} href={activity.href} onClick={() => setShowNotifications(false)} className="block rounded-lg p-2 hover:bg-slate-50"><p className="truncate text-sm font-medium text-slate-700">{activity.title}</p><p className="mt-1 text-xs text-slate-500">{statusLabel(activity.status)} · {formatRelative(activity.at)}</p></Link>)}</div> : <p className="mt-3 text-sm text-slate-500">You’re all caught up.</p>}
                </div>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setShowProfile((value) => !value)} aria-label="Dean profile" aria-expanded={showProfile} className="flex size-8 items-center justify-center rounded-full bg-[#EEF2F6] text-xs font-bold text-[#1A2234] transition-colors hover:bg-slate-200">{initials(deanName)}</button>
              {showProfile && <div className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><p className="truncate text-sm font-semibold text-slate-900">{deanName}</p><p className="mt-1 text-xs text-slate-500">Dean · {universityName}</p></div>}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pb-12 pt-6 md:px-8 lg:pt-12">
          <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="mb-1 text-[28px] font-extrabold tracking-tight lg:text-3xl lg:font-bold">Events dashboard</h1>
              <p className="text-sm text-slate-500">Welcome, {deanName}.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={18} className="text-[#1E2B58]" aria-hidden="true" />{today}
            </span>
          </section>

          <section aria-label="Proposal overview" className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-3 md:-mx-8 md:scroll-px-8 md:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-5">
            {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => {
              const Icon = icons[tab];
              const selected = activeTab === tab;
              return (
                <button key={tab} type="button" onClick={() => selectTab(tab)} aria-pressed={selected} className={`flex w-56 shrink-0 snap-start flex-col justify-between gap-2 rounded-2xl border bg-white p-5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E2B58] lg:w-auto ${selected ? "border-slate-300 ring-1 ring-slate-300" : "border-slate-100"}`}>
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium ${selected ? "text-[#1E2B58]" : "text-slate-600"}`}>{tabLabels[tab]}</span>
                    <span className="shrink-0 rounded-full bg-slate-50 p-2 text-[#1E2B58]"><Icon size={18} aria-hidden="true" /></span>
                  </span>
                  <span className="text-[32px] font-bold leading-none tabular-nums text-slate-900">{groups[tab].length}</span>
                </button>
              );
            })}
          </section>

          <div className="mt-8 grid grid-cols-1 items-start gap-6 md:gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section id="events" className={`${panelClass} @container min-w-0 scroll-mt-24 overflow-hidden`}>
              <div className="px-5 pt-6 sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[22px] font-bold tracking-tight text-slate-900">Events</h2>
                  <Link href="/dean/proposals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E2B58] hover:underline">
                    All proposals <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
                <div role="group" aria-label="Filter event requests" className="mt-5 flex gap-1 overflow-x-auto pb-3 @min-[31rem]:flex-wrap">
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
                      <li key={item.id} className="grid grid-cols-1 @min-[40rem]:grid-cols-[minmax(0,1.6fr)_minmax(7rem,0.8fr)_minmax(7rem,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:px-7 @min-[40rem]:gap-4">
                        <div className="min-w-0">
                          <Link href={item.href} className="block break-words text-base font-semibold text-slate-900 hover:text-[#1E2B58] hover:underline">
                            {item.title}
                          </Link>
                          <p className="mt-1 break-words text-sm text-slate-600">{item.person}{item.venue ? ` · ${item.venue}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays size={16} className="shrink-0 text-slate-500" aria-hidden="true" />{formatDate(item.startDate)}
                        </div>
                        <div><StatusPill status={item.status} /></div>
                        <div className="@min-[40rem]:text-right">
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
                  <p className="mt-4 text-sm font-medium text-slate-600">{term ? "No matching events" : `No ${tabLabels[activeTab].toLowerCase()}`}</p>
                  {term && <button type="button" onClick={() => setSearch("")} className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-[#1E2B58] hover:bg-slate-100">Clear search</button>}
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

            <aside className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-1">
              <section className={`${panelClass} p-5 sm:p-7`}>
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

              <section className={`${panelClass} p-5 sm:p-7`}>
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
            </aside>
          </div>
        </main>

        <nav aria-label="Mobile dean navigation" className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
          {([
            ["new", "Requests", FileText],
            ["review", "Review", FileCheck2],
            ["vc", "Awaiting VC", Clock3],
            ["approved", "Approved", CircleCheck],
            ["closed", "Closed", CircleX],
          ] as const).map(([tab, label, Icon]) => (
            <button key={tab} type="button" onClick={() => selectTab(tab)} aria-pressed={activeTab === tab} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg py-1 text-[11px] hover:bg-slate-50 hover:text-[#1A2234] ${activeTab === tab ? "font-semibold text-[#1A2234]" : "font-medium text-slate-500"}`}>
              <Icon size={23} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
      </div>

      {(showReports || showHelp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowReports(false); setShowHelp(false); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="dashboard-dialog-title" className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="dashboard-dialog-title" className="text-xl font-bold tracking-tight text-slate-900">{showReports ? "Dean reports" : "Dashboard help"}</h2>
                <p className="mt-1 text-sm text-slate-500">{showReports ? "Current proposal and event overview." : "Quick guidance for your workspace."}</p>
              </div>
              <button type="button" onClick={() => { setShowReports(false); setShowHelp(false); }} aria-label="Close" className="rounded-lg p-1.5 text-[#1E2B58] hover:bg-slate-100"><X size={16} /></button>
            </div>
            {showReports ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
                  <button key={tab} type="button" onClick={() => { selectTab(tab); setShowReports(false); }} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50">
                    <span className="block text-xl font-bold text-slate-900">{groups[tab].length}</span>
                    <span className="text-sm text-slate-600">{tabLabels[tab]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                <p>Use the status cards or tabs to switch between requests, reviews, VC approvals, approved events, and closed requests.</p>
                <p>Search by event name, venue, or faculty member. Open a request to review its details and record a decision.</p>
                <Link href="/dean/proposals" className="inline-flex items-center gap-1 font-semibold text-[#1E2B58] hover:underline">Open all proposals <ArrowRight size={15} /></Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SUBMITTED: "New request received",
    UNDER_REVIEW: "Letter pending for VC",
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
    UNDER_REVIEW: "Letter printed for VC",
    CHANGES_REQUESTED: "Changes requested",
    APPROVED_BY_DEAN: "Dean approval recorded",
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
