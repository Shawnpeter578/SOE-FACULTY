"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
  deanName,
  proposals,
  events,
  activities,
}: {
  deanName: string;
  proposals: DashboardItem[];
  events: DashboardItem[];
  activities: DashboardActivity[];
}) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const groups: Record<DashboardTab, DashboardItem[]> = {
    new: proposals.filter((item) => item.status === "SUBMITTED"),
    review: proposals.filter((item) => item.status === "UNDER_REVIEW"),
    vc: events.filter((item) => item.status === "AWAITING_VC_DOCUMENT"),
    approved: events.filter((item) => item.status === "OFFICIALLY_APPROVED"),
    closed: proposals.filter((item) => item.status === "REJECTED"),
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

  const currentPage = Math.min(page, Math.max(filteredItems.length - 1, 0));
  const currentItem = filteredItems[currentPage];
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
    setSearch("");
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#26334F] lg:flex">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-[#E6EAF2] bg-white lg:flex">
        <Link href="/dean/dashboard" className="flex h-[76px] items-center gap-3 border-b border-[#EDF0F5] px-7">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B2D68] text-white">
            <CalendarDays size={20} strokeWidth={2.3} />
          </span>
          <span className="text-[20px] font-bold tracking-[-0.03em] text-[#202B45]">EventDesk</span>
        </Link>

        <div className="px-6 pt-6">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8993A8]">Workspace</p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWorkspace((value) => !value)}
              aria-expanded={showWorkspace}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E6EAF2] bg-[#FAFBFD] px-3.5 text-[13px] font-medium text-[#44516B] hover:bg-[#F4F6FA] focus:outline-none focus:ring-2 focus:ring-[#243B82]/20"
            >
              Westbridge College <ChevronDown size={13} className="text-[#75819A]" />
            </button>
            {showWorkspace && (
              <div className="absolute left-0 right-0 top-12 z-30 rounded-lg border border-[#E5E9F1] bg-white p-3.5 text-[13px] shadow-lg">
                <p className="font-semibold text-[#283550]">Westbridge College</p>
                <p className="mt-1 text-[#8490A5]">Current dean workspace</p>
              </div>
            )}
          </div>
        </div>

        <nav aria-label="Dean navigation" className="mt-6 space-y-1.5 px-3.5">
          <Link href="/dean/dashboard" className="flex h-12 items-center gap-3 rounded-xl bg-[#E9EDF7] px-3.5 text-[13px] font-semibold text-[#24366F]">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <button type="button" onClick={() => selectTab("new")} className="flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[13px] font-medium text-[#69768E] hover:bg-[#F6F7FA] hover:text-[#24366F]">
            <FileText size={18} /> Requests
          </button>
          <button type="button" onClick={() => selectTab("approved")} className="flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[13px] font-medium text-[#69768E] hover:bg-[#F6F7FA] hover:text-[#24366F]">
            <CircleCheck size={18} /> Approved events
          </button>
          <button type="button" onClick={() => selectTab("closed")} className="flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[13px] font-medium text-[#69768E] hover:bg-[#F6F7FA] hover:text-[#24366F]">
            <CircleX size={18} /> Closed events
          </button>
          <button type="button" onClick={() => setShowReports(true)} className="flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[13px] font-medium text-[#69768E] hover:bg-[#F6F7FA] hover:text-[#24366F]">
            <UsersRound size={18} /> Reports
          </button>
        </nav>

        <div className="mt-auto space-y-5 px-4 pb-6">
          <button type="button" onClick={() => setShowProfile((value) => !value)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-[#F7F8FB]">
            <UserRound size={18} className="text-[#8490A5]" />
            <span className="text-[13px] font-medium text-[#69768E]">Profile</span>
          </button>
          {showProfile && (
            <div className="rounded-lg border border-[#E7EBF2] bg-white p-3.5 text-[13px] shadow-sm">
              <p className="font-semibold text-[#25324D]">{deanName}</p>
              <p className="mt-1 text-[#8792A7]">Dean · Westbridge College</p>
            </div>
          )}
          <div className="rounded-xl bg-[#F3F5FA] p-4">
            <p className="text-[13px] font-semibold text-[#35415D]">A little help?</p>
            <p className="mt-1 text-[12px] leading-[1.45] text-[#7B879E]">Your campus guide is one click away.</p>
            <button type="button" onClick={() => setShowHelp(true)} className="mt-2 inline-flex items-center text-[12px] font-semibold text-[#24366F] hover:underline">
              Visit help center <ChevronRight size={15} />
            </button>
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8ECF5] text-[12px] font-bold text-[#314477]">{initials(deanName)}</span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-[#34405A]">{deanName}</span>
              <span className="block text-[11px] text-[#8993A8]">Dean</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#E6EAF2] bg-white px-4 sm:px-6 lg:px-8">
          <div className="relative w-full max-w-[390px]">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A95A9]" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              aria-label="Search requests, events, and people"
              placeholder="Search requests, events, people..."
              className="h-[44px] w-full rounded-lg border border-[#E5E9F0] bg-white pl-10 pr-10 text-[13px] text-[#34415B] outline-none placeholder:text-[#A2AABC] focus:border-[#93A2CC] focus:ring-2 focus:ring-[#203777]/10"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B96AA]"><X size={16} /></button>}
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-3 sm:gap-5">
            <span className="hidden text-[12px] font-medium text-[#77839A] sm:inline">Dean workspace</span>
            <div className="relative">
              <button type="button" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifications" aria-expanded={showNotifications} className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#5F6C85] hover:bg-[#F3F5F9]">
                <Bell size={19} />
                {activities.length > 0 && <span className="absolute right-[6px] top-[5px] h-1.5 w-1.5 rounded-full border border-white bg-[#334B92]" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 z-40 w-[min(320px,calc(100vw-24px))] rounded-xl border border-[#E6EAF2] bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#2C3853]">Recent activity</p>
                    <button type="button" onClick={() => setShowNotifications(false)} aria-label="Close notifications" className="text-[#8792A7]"><X size={14} /></button>
                  </div>
                  {activities.length ? <div className="mt-3 space-y-2">{activities.slice(0, 3).map((activity) => <Link key={activity.id} href={activity.href} onClick={() => setShowNotifications(false)} className="block rounded-lg p-2 hover:bg-[#F7F8FB]"><p className="truncate text-[11px] font-medium text-[#38445F]">{activity.title}</p><p className="mt-1 text-[10px] text-[#8994A8]">{statusLabel(activity.status)} · {formatRelative(activity.at)}</p></Link>)}</div> : <p className="mt-3 text-[11px] text-[#8994A8]">You’re all caught up.</p>}
                </div>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setShowProfile((value) => !value)} aria-label="Dean profile" aria-expanded={showProfile} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8ECF5] text-[12px] font-bold text-[#354778]">{initials(deanName)}</button>
              {showProfile && <div className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-[#E6EAF2] bg-white p-3 shadow-xl"><p className="truncate text-[11px] font-semibold text-[#2F3B56]">{deanName}</p><p className="mt-1 text-[10px] text-[#8792A7]">Dean · Westbridge College</p></div>}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-5 pb-10 pt-6 sm:px-8 lg:px-10 lg:pt-8">
          <section className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.035em] text-[#26324D] sm:text-[32px]">Good morning, Dean</h1>
              <p className="mt-1.5 text-[13px] text-[#8993A7]">{today}</p>
            </div>
            <span className="rounded-full border border-[#E5EAF4] bg-white px-4 py-2 text-[12px] font-semibold text-[#3A4A73]">Westbridge College</span>
          </section>

          <section aria-label="Proposal overview" className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => {
              const Icon = icons[tab];
              const selected = activeTab === tab;
              return (
                <button key={tab} type="button" onClick={() => selectTab(tab)} aria-pressed={selected} className={`min-h-[124px] rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(34,49,83,0.025)] transition hover:-translate-y-0.5 hover:shadow-sm ${selected ? "border-[#435A9D] ring-1 ring-[#435A9D]/20" : "border-[#E8EBF1]"}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E9EDF7] text-[#4B5E97]"><Icon size={19} /></span>
                  <span className="mt-3 block text-[26px] font-bold leading-none text-[#2C3854]">{groups[tab].length}</span>
                  <span className="mt-2.5 block truncate text-[12px] text-[#7F8AA0]">{tabLabels[tab]}</span>
                </button>
              );
            })}
          </section>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.35fr)_minmax(280px,0.95fr)]">
            <section id="events" className="min-w-0 overflow-hidden rounded-xl border border-[#E5E9F0] bg-white shadow-[0_2px_8px_rgba(39,54,88,0.025)]">
              <div className="px-5 pt-5 sm:px-6">
                <h2 className="text-[17px] font-bold tracking-[-0.02em] text-[#2C3852]">Events</h2>
                <div role="tablist" aria-label="Filter event requests" className="mt-2 flex gap-4 overflow-x-auto border-b border-[#E9ECF2]">
                  {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
                    <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => selectTab(tab)} className={`relative shrink-0 pb-2.5 text-[11px] ${activeTab === tab ? "font-semibold text-[#263A78]" : "text-[#8691A6] hover:text-[#364875]"}`}>
                      {tabLabels[tab]} <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? "bg-[#E8ECF6] text-[#354A87]" : "bg-[#F1F3F7] text-[#8993A7]"}`}>{groups[tab].length}</span>
                      {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#3E5596]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-[190px]">
                <div className="hidden grid-cols-[minmax(160px,1.7fr)_minmax(110px,1fr)_minmax(95px,.8fr)_minmax(94px,.8fr)] gap-2 px-6 py-4 text-[11px] font-medium text-[#8A95A9] md:grid">
                  <span>Event</span><span>Date</span><span>Status</span><span className="text-right">Action</span>
                </div>
                {currentItem ? (
                  <article className="mx-4 mb-1 rounded-lg bg-[#F7F8FB] px-4 py-4 md:mx-4 md:grid md:grid-cols-[minmax(160px,1.7fr)_minmax(110px,1fr)_minmax(95px,.8fr)_minmax(94px,.8fr)] md:items-center md:gap-3 md:px-5">
                    <div className="min-w-0">
                      <Link href={currentItem.href} className="block truncate text-[13px] font-semibold text-[#34415D] hover:text-[#243B82] hover:underline">{currentItem.title}</Link>
                      <p className="mt-1 truncate text-[11px] text-[#8792A6]">{currentItem.person}{currentItem.venue ? ` · ${currentItem.venue}` : ""}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#66738C] md:mt-0"><CalendarDays size={14} className="text-[#8994A9]" />{formatDate(currentItem.startDate)}</div>
                    <div className="mt-2 md:mt-0"><StatusPill status={currentItem.status} /></div>
                    <div className="mt-3 md:mt-0 md:text-right">
                      <Link href={currentItem.href} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#1E326F] px-4 text-[11px] font-semibold text-white transition hover:bg-[#172858] focus:outline-none focus:ring-2 focus:ring-[#6076BB]/50">
                        {currentItem.kind === "proposal" ? "Review" : "View"} <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                ) : (
                  <div className="flex min-h-[170px] flex-col items-center justify-center px-4 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F2F4F8] text-[#8A95A9]"><Search size={19} /></span>
                    <p className="mt-3 text-[13px] font-semibold text-[#5C6880]">{search ? "No matching events" : `No ${tabLabels[activeTab].toLowerCase()}`}</p>
                    <p className="mt-1 text-[12px] text-[#929CAF]">{search ? "Try another name or clear your search." : "New activity will appear here when it arrives."}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#EDF0F4] px-5 py-3.5 sm:px-6">
                <p className="text-[11px] text-[#8A95A9]">{filteredItems.length ? `Showing ${currentPage + 1} of ${filteredItems.length}` : "Showing 0 of 0"}</p>
                <div className="flex gap-5">
                  <button type="button" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#52617C] hover:text-[#263C7B] disabled:cursor-not-allowed disabled:text-[#B6BECC]"><ChevronLeft size={15} /> Previous</button>
                  <button type="button" disabled={currentPage >= filteredItems.length - 1} onClick={() => setPage((value) => Math.min(filteredItems.length - 1, value + 1))} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#52617C] hover:text-[#263C7B] disabled:cursor-not-allowed disabled:text-[#B6BECC]">Next <ChevronRight size={15} /></button>
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-xl border border-[#F0E5CB] bg-[#FFF6E2] p-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#D5A84C]"><CircleAlert size={18} /></span>
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-bold text-[#38435A]">Needs your attention</h2>
                    {needsDecision ? <>
                      <p className="mt-1.5 text-[12px] leading-[1.5] text-[#707A8D]"><span className="font-medium text-[#4D5870]">{needsDecision.title}</span> is waiting for your decision.</p>
                      <p className="mt-2 text-[10px] text-[#9A8D73]">Updated {formatRelative(needsDecision.updatedAt)}</p>
                    </> : <p className="mt-1.5 text-[12px] leading-[1.5] text-[#707A8D]">There are no requests waiting for a decision.</p>}
                  </div>
                </div>
                {needsDecision && <Link href={needsDecision.href} className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#374A7D] hover:underline"><ArrowRight size={14} /> Record decision</Link>}
              </section>

              <section className="rounded-xl border border-[#E5E9F0] bg-white p-4 shadow-[0_2px_8px_rgba(39,54,88,0.025)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-[#34405A]">Recent activity</h2>
                  <Link href="/dean/proposals" className="text-[11px] font-medium text-[#3C5089] hover:underline">View all</Link>
                </div>
                {activities.length ? (
                  <ul className="mt-3.5 space-y-3.5">
                    {activities.slice(0, 4).map((activity, index) => (
                      <li key={`${activity.id}-${index}`} className="flex gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EEF1F8] text-[#5B6C9C]">{activity.status === "APPROVED_BY_DEAN" ? <CheckCircle2 size={15} /> : activity.status === "REJECTED" ? <CircleX size={15} /> : <FileText size={15} />}</span>
                        <Link href={activity.href} className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-[#4B5770]">{activityLabel(activity.status)}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#738097]">{activity.title}</span>
                          <span className="mt-0.5 block text-[10px] text-[#9AA3B3]">{formatRelative(activity.at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="py-6 text-center text-[12px] text-[#8D98AA]">No recent activity yet.</p>}
              </section>
            </aside>
          </div>
        </main>

        <nav aria-label="Mobile dean navigation" className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-[#E5E9F0] bg-white px-1 py-2.5 lg:hidden">
          {([
            ["new", "Requests", FileText],
            ["review", "Review", FileCheck2],
            ["vc", "Awaiting VC", Clock3],
            ["approved", "Approved", CircleCheck],
            ["closed", "Closed", CircleX],
          ] as const).map(([tab, label, Icon]) => (
            <button key={tab} type="button" onClick={() => selectTab(tab)} className={`flex flex-col items-center gap-1 py-1 text-[11px] ${activeTab === tab ? "font-semibold text-[#334987]" : "text-[#8A95A9]"}`}>
              <Icon size={19} />{label}
            </button>
          ))}
        </nav>
      </div>

      {(showReports || showHelp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16213B]/30 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowReports(false); setShowHelp(false); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="dashboard-dialog-title" className="w-full max-w-lg rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="dashboard-dialog-title" className="text-lg font-bold text-[#2C3852]">{showReports ? "Dean reports" : "Dashboard help"}</h2>
                <p className="mt-1 text-[13px] text-[#8490A5]">{showReports ? "Current proposal and event overview." : "Quick guidance for your workspace."}</p>
              </div>
              <button type="button" onClick={() => { setShowReports(false); setShowHelp(false); }} aria-label="Close" className="rounded-lg p-1.5 text-[#7F8BA1] hover:bg-[#F3F5F8]"><X size={16} /></button>
            </div>
            {showReports ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(Object.keys(tabLabels) as DashboardTab[]).map((tab) => (
                  <button key={tab} type="button" onClick={() => { selectTab(tab); setShowReports(false); }} className="rounded-xl border border-[#E7EAF1] p-4 text-left hover:bg-[#F8F9FC]">
                    <span className="block text-xl font-bold text-[#2D3B62]">{groups[tab].length}</span>
                    <span className="text-[12px] text-[#75819A]">{tabLabels[tab]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-[13px] leading-relaxed text-[#68758D]">
                <p>Use the status cards or tabs to switch between requests, reviews, VC approvals, approved events, and closed requests.</p>
                <p>Search by event name, venue, or faculty member. Open a request to review its details and record a decision.</p>
                <Link href="/dean/proposals" className="inline-flex items-center gap-1 font-semibold text-[#344A85] hover:underline">Open all proposals <ArrowRight size={15} /></Link>
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
  const isPending = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "AWAITING_VC_DOCUMENT";
  const isClosed = status === "REJECTED";
  const label = status === "SUBMITTED" ? "Pending" : statusLabel(status);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${isPending ? "bg-[#FFF1D4] text-[#A57727]" : isClosed ? "bg-[#FCEBEC] text-[#A64D54]" : "bg-[#E8F3EC] text-[#447C58]"}`}>
      <span className={`h-2 w-2 rounded-full ${isPending ? "bg-[#D7A440]" : isClosed ? "bg-[#CA6B72]" : "bg-[#5D9A70]"}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
