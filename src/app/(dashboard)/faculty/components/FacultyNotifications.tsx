"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bell, Check, CircleAlert, FileText, X } from "lucide-react";
import { formatApprovalTime } from "@/lib/event-approval";
import type { FacultyNotification, FacultyNotificationFeed } from "../notifications/notification-items";

type View = "recent" | "all";
type FeedState = { status: "loading" } | { status: "error" } | { status: "ready"; data: FacultyNotificationFeed };
type NotificationsContextValue = {
  recent: FeedState;
  readThrough: string;
  unread: boolean;
  open: (anchor: HTMLButtonElement, view?: View) => void;
  expanded: boolean;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const storageKey = (facultyId: string) => `eventdesk:notifications-read-through:${facultyId}`;
const isUnread = (item: FacultyNotification, readThrough: string) => Date.parse(item.at) > (Date.parse(readThrough) || 0);

function positionPopover(anchor: HTMLButtonElement): CSSProperties {
  const { right, top, bottom } = anchor.getBoundingClientRect();
  const width = Math.min(336, window.innerWidth - 24);
  const below = window.innerHeight - bottom - 20;
  const above = top - 20;
  const showAbove = below < 240 && above > below;
  return {
    width,
    right: Math.max(12, Math.min(window.innerWidth - right, window.innerWidth - width - 12)),
    ...(showAbove ? { bottom: window.innerHeight - top + 8 } : { top: bottom + 8 }),
    maxHeight: Math.max(0, Math.min(360, showAbove ? above : below)),
  };
}

async function loadFeed(view: View, signal: AbortSignal): Promise<FacultyNotificationFeed> {
  const response = await fetch(`/faculty/notifications?view=${view}`, { cache: "no-store", signal });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Unable to load notifications.");
  }
  return response.json();
}

function useNotifications() {
  const state = useContext(NotificationsContext);
  if (!state) throw new Error("Faculty notifications require the faculty workspace.");
  return state;
}

export function FacultyNotifications({ children }: { children: ReactNode }) {
  const popover = useRef<HTMLDivElement>(null);
  const recentRequest = useRef<AbortController | null>(null);
  const allRequest = useRef<AbortController | null>(null);
  const [recent, setRecent] = useState<FeedState>({ status: "loading" });
  const [all, setAll] = useState<FeedState>({ status: "loading" });
  const [view, setView] = useState<View>("recent");
  const [readThrough, setReadThrough] = useState("");
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});

  const refreshRecent = useCallback(async () => {
    recentRequest.current?.abort();
    const request = new AbortController();
    recentRequest.current = request;
    try {
      const data = await loadFeed("recent", request.signal);
      if (request.signal.aborted) return;
      try { setReadThrough(localStorage.getItem(storageKey(data.facultyId)) ?? ""); } catch { /* Keep read state in memory. */ }
      setRecent({ status: "ready", data });
    } catch {
      if (!request.signal.aborted) setRecent((current) => current.status === "ready" ? current : { status: "error" });
    }
  }, []);

  useEffect(() => {
    function refreshIfVisible() {
      if (document.visibilityState === "visible") void refreshRecent();
    }
    refreshIfVisible();
    const timer = window.setInterval(refreshIfVisible, 30000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      recentRequest.current?.abort();
      allRequest.current?.abort();
    };
  }, [refreshRecent]);

  async function refreshAll() {
    allRequest.current?.abort();
    const request = new AbortController();
    allRequest.current = request;
    setAll({ status: "loading" });
    try {
      const data = await loadFeed("all", request.signal);
      if (!request.signal.aborted) setAll({ status: "ready", data });
    } catch {
      if (!request.signal.aborted) setAll({ status: "error" });
    }
  }

  function selectView(next: View) {
    setView(next);
    if (next === "all") void refreshAll();
    else void refreshRecent();
  }

  const close = useCallback((restoreFocus = false) => {
    setAnchor(null);
    if (restoreFocus) anchor?.focus({ preventScroll: true });
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    popover.current?.focus({ preventScroll: true });

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !popover.current?.contains(event.target) && !anchor?.contains(event.target)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }
    function updatePosition(event: Event) {
      if (event.target instanceof Node && popover.current?.contains(event.target)) return;
      const rect = anchor?.getBoundingClientRect();
      if (!anchor || !rect?.height || rect.bottom <= 0 || rect.top >= window.innerHeight) close();
      else setPosition(positionPopover(anchor));
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchor, close]);

  function open(trigger: HTMLButtonElement, next: View = "recent") {
    if (anchor === trigger) {
      close(true);
      return;
    }
    setPosition(positionPopover(trigger));
    selectView(next);
    setAnchor(trigger);
  }

  const feed = view === "recent" ? recent : all;
  const items = feed.status === "ready" ? feed.data.items : [];
  const latestRecent = recent.status === "ready" ? recent.data.items[0] : undefined;
  const latest = [latestRecent, items[0]].filter((item): item is FacultyNotification => Boolean(item))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  const facultyId = recent.status === "ready" ? recent.data.facultyId : feed.status === "ready" ? feed.data.facultyId : undefined;
  const unread = Boolean(latestRecent && isUnread(latestRecent, readThrough));

  function markAllRead() {
    if (!facultyId || !latest) return;
    try { localStorage.setItem(storageKey(facultyId), latest.at); } catch { /* Keep read state in memory. */ }
    setReadThrough(latest.at);
  }

  return (
    <NotificationsContext.Provider value={{ recent, unread, readThrough, open, expanded: Boolean(anchor) }}>
      {children}
      {anchor && <div ref={popover} id="faculty-notification-popover" role="dialog" tabIndex={-1} aria-labelledby="faculty-notifications-title" style={position} className="fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg outline-none">
        <div className="shrink-0 border-b border-slate-100 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="faculty-notifications-title" className="text-base font-bold text-brand-primary">Notifications</h2>
            <button type="button" onClick={() => close(true)} aria-label="Close notifications" className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><X size={16} aria-hidden="true" /></button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Notification view" className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(["recent", "all"] as const).map((option) => <button type="button" key={option} aria-pressed={view === option} onClick={() => { if (view !== option) selectView(option); }} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === option ? "bg-white text-brand-primary shadow-sm" : "text-slate-600 hover:text-brand-primary"}`}>{option === "recent" ? "Recent" : "All"}</button>)}
            </div>
            {latest && isUnread(latest, readThrough) && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand-primary hover:underline">Mark all as read</button>}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto px-2 py-1">
          {feed.status === "loading" ? <p role="status" className="px-3 py-8 text-center text-sm text-slate-600">Loading notifications…</p>
            : feed.status === "error" ? <div className="px-3 py-8 text-center text-sm text-slate-600"><p role="alert">Could not load notifications.</p><button type="button" onClick={() => selectView(view)} className="mt-2 font-semibold text-brand-primary hover:underline">Try again</button></div>
            : items.length ? <ul className="divide-y divide-slate-100">{items.map((item) => <NotificationRow key={item.id} item={item} unread={isUnread(item, readThrough)} onSelect={() => close()} />)}</ul>
            : <p className="px-3 py-8 text-center text-sm text-slate-600">You’re all caught up.</p>}
        </div>
      </div>}
    </NotificationsContext.Provider>
  );
}

export function FacultyNotificationButton({ className = "" }: { className?: string }) {
  const { unread, open, expanded } = useNotifications();
  return (
    <button type="button" aria-haspopup="dialog" aria-expanded={expanded} aria-controls={expanded ? "faculty-notification-popover" : undefined} aria-label={unread ? "Notifications, unread updates" : "Notifications"} onClick={(event) => open(event.currentTarget)} className={`relative flex size-9 shrink-0 items-center justify-center rounded-full text-brand-primary hover:bg-slate-100 ${className}`}>
      <Bell size={20} aria-hidden="true" />
      {unread && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-white bg-red-500" aria-hidden="true" />}
    </button>
  );
}

export function FacultyNotificationPreview({ className }: { className: string }) {
  const { recent, readThrough, open } = useNotifications();
  return (
    <section className={className} aria-labelledby="faculty-recent-notifications">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="faculty-recent-notifications" className="text-base font-bold tracking-tight text-slate-900">Recent notifications</h3>
        <button type="button" aria-haspopup="dialog" onClick={(event) => open(event.currentTarget, "all")} className="text-xs font-semibold text-brand-primary hover:underline">View all</button>
      </div>
      {recent.status === "loading" ? <p className="mt-3 text-sm text-slate-600">Loading notifications…</p>
        : recent.status === "error" ? <p className="mt-3 text-sm text-slate-600">Notifications are temporarily unavailable.</p>
        : recent.data.items.length ? <ul className="mt-2 divide-y divide-slate-100">{recent.data.items.slice(0, 3).map((item) => <NotificationRow key={item.id} item={item} unread={isUnread(item, readThrough)} compact />)}</ul>
        : <p className="mt-3 text-sm text-slate-600">You’re all caught up.</p>}
    </section>
  );
}

function NotificationRow({ item, unread, compact = false, onSelect }: { item: FacultyNotification; unread: boolean; compact?: boolean; onSelect?: () => void }) {
  const Icon = item.tone === "positive" ? Check : item.tone === "attention" ? CircleAlert : FileText;
  return (
    <li>
      <Link href={`/faculty/events/${item.proposalId}`} onClick={onSelect} className="flex items-start gap-2.5 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50">
        <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.tone === "positive" ? "bg-emerald-50 text-emerald-800" : item.tone === "attention" ? "bg-amber-50 text-amber-800" : "bg-brand-selected text-brand-primary"}`}><Icon size={15} /></span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-slate-900">{item.title}</span>
          <span className="mt-0.5 block text-xs text-slate-600">{item.message}</span>
          {!compact && item.note && <span className="mt-1 line-clamp-2 break-words text-xs text-slate-600">{item.note}</span>}
          <time dateTime={item.at} className="mt-1 block text-xs text-slate-500">{formatApprovalTime(item.at)}</time>
        </span>
        {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-primary" aria-label="Unread" />}
      </Link>
    </li>
  );
}
