"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, CalendarDays, CircleCheck, CircleHelp, CircleX, FileText, LayoutDashboard, UserRound, UsersRound, X } from "lucide-react";
import WorkspaceTopBar, { workspaceInitials } from "@/components/workspace-top-bar";
import { formatApprovalTime } from "@/lib/event-approval";
import { getStatusLabel } from "../faculty/events/event-status";

export type DeanActivity = { id: string; title: string; status: string; at: string; href: string };

const sidebarLinks = [
  { label: "Dashboard", href: "/dean/dashboard", icon: LayoutDashboard },
  { label: "Requests", href: "/dean/proposals", icon: FileText },
  { label: "Approved events", href: "/dean/proposals?status=approved", icon: CircleCheck },
  { label: "Closed events", href: "/dean/proposals?status=closed", icon: CircleX },
  { label: "Reports", href: "/dean/dashboard?panel=reports", icon: UsersRound },
];

function sidebarClass(active: boolean) {
  return `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-brand-primary transition-colors hover:bg-brand-border ${active ? "bg-brand-selected font-semibold" : "font-medium"}`;
}

export default function DeanWorkspace({ name, activity, children }: { name: string; activity: DeanActivity[]; children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status");
  const panel = params.get("panel");
  const onRequests = pathname.startsWith("/dean/proposals");
  const onProfile = pathname === "/dean/profile";
  const onDashboard = pathname === "/dean/dashboard";
  const initials = workspaceInitials(name, "D");

  return (
    <div data-dean-workspace className="min-h-screen bg-brand-canvas text-text-primary lg:grid lg:grid-cols-[16.25rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen min-w-0 flex-col overflow-y-auto border-r border-brand-border bg-brand-surface lg:flex">
        <Link href="/dean/dashboard" className="flex h-16 shrink-0 items-center gap-2 border-b border-brand-border px-6 text-xl font-bold text-brand-primary hover:bg-brand-border">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand-primary text-white"><CalendarDays size={16} aria-hidden="true" /></span>
          EventDesk
        </Link>
        <nav aria-label="Dean navigation" className="space-y-1 px-3 pt-4">
          {sidebarLinks.map(({ label, href, icon: Icon }) => {
            const active = href.endsWith("status=approved") ? onRequests && status === "approved"
              : href.endsWith("status=closed") ? onRequests && status === "closed"
              : href.endsWith("panel=reports") ? onDashboard && panel === "reports"
              : href.endsWith("/proposals") ? onRequests && status !== "approved" && status !== "closed"
              : onDashboard && !panel;
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={sidebarClass(active)}><Icon size={19} aria-hidden="true" />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto space-y-2 p-3">
          <Link href="/dean/dashboard?panel=help" aria-current={onDashboard && panel === "help" ? "page" : undefined} className={sidebarClass(onDashboard && panel === "help")}><CircleHelp size={19} aria-hidden="true" />Help</Link>
          <Link href="/dean/profile" aria-current={onProfile ? "page" : undefined} className={sidebarClass(onProfile)}><UserRound size={19} aria-hidden="true" />Profile</Link>
          <Link href="/dean/profile" className="flex items-center gap-3 rounded-xl border-t border-brand-border p-3 hover:bg-brand-border">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-selected text-sm font-bold text-brand-primary">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-brand-primary">{name}</span>
              <span className="block text-xs text-text-secondary">Dean</span>
            </span>
          </Link>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col">
        <WorkspaceTopBar
          role="Dean"
          name={name}
          initials={initials}
          searchPath="/dean/proposals"
          searchLabel="Search requests by title, venue or faculty member"
          notifications={<DeanNotifications key={pathname} activity={activity} />}
        />
        <main className="min-w-0 flex-1 px-4 pb-8 sm:px-6 lg:px-8">{children}</main>
        <nav aria-label="Mobile dean navigation" className="sticky bottom-0 z-20 grid grid-cols-3 border-t border-brand-border bg-brand-surface px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
          {[
            { href: "/dean/dashboard", label: "Dashboard", active: onDashboard, icon: LayoutDashboard },
            { href: "/dean/proposals", label: "Requests", active: onRequests, icon: FileText },
            { href: "/dean/profile", label: "Profile", active: onProfile, icon: UserRound },
          ].map(({ href, label, active, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold text-brand-primary hover:bg-brand-border ${active ? "bg-brand-selected" : ""}`}>
              <Icon size={20} aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function DeanNotifications({ activity }: { activity: DeanActivity[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        event.currentTarget.querySelector("button")?.focus();
      }
    }}>
      <button type="button" onClick={() => setOpen(!open)} aria-label="Notifications" aria-expanded={open} aria-controls={open ? "dean-notifications" : undefined} className="relative flex size-11 items-center justify-center rounded-xl border border-brand-border bg-brand-surface text-brand-primary hover:bg-brand-selected aria-expanded:bg-brand-selected">
        <Bell size={20} aria-hidden="true" />
        {activity.length > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-white bg-red-500" />}
      </button>
      {open && (
        <section id="dean-notifications" aria-label="Recent activity" className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(21rem,calc(100vw-5.5rem))] rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-brand-primary">Recent activity</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-lg p-1.5 text-brand-primary hover:bg-brand-selected"><X size={17} aria-hidden="true" /></button>
          </div>
          {activity.length ? <ul className="mt-2 divide-y divide-brand-border">
            {activity.map((item) => (
              <li key={item.id}>
                <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-lg p-2 hover:bg-brand-canvas">
                  <span className="block break-words text-sm font-semibold text-text-primary">{item.title}</span>
                  <span className="mt-1 block text-xs text-text-secondary">{item.status === "OFFICIALLY_APPROVED" ? "VC-signed letter received" : getStatusLabel(item.status)} · {formatApprovalTime(item.at)}</span>
                </Link>
              </li>
            ))}
          </ul> : <p className="mt-3 text-sm text-text-secondary">No recent activity.</p>}
        </section>
      )}
    </div>
  );
}
