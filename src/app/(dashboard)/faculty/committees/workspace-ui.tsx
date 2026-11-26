import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, UsersRound } from "lucide-react";
import { formatEventDateRange } from "@/lib/event-approval";

export const committeePanel = "min-w-0 rounded-2xl border border-brand-border bg-brand-surface shadow-card";
export const committeePage = "mx-auto max-w-6xl space-y-5 pb-3";
export const committeeLink = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 text-sm font-semibold text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";

export function CommitteeHeader({ title, context, children, compact = false }: {
  title: string; context?: string; children?: ReactNode; compact?: boolean;
}) {
  return (
    <header className={`relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl p-5 sm:px-7 ${compact ? "border border-brand-border bg-white text-brand-primary shadow-card" : "bg-brand-primary text-white sm:py-7"}`}>
      {!compact && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 bg-[radial-gradient(ellipse_at_top_right,#415e9f_0%,transparent_75%)]" />}
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${compact ? "bg-brand-selected" : "bg-white/15"}`}><UsersRound size={21} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {context && <p className={`mt-1 break-words text-sm ${compact ? "text-text-secondary" : "text-blue-100"}`}>{context}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}

export function CommitteeBack({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-brand-selected focus-visible:outline-2 focus-visible:outline-brand-primary"><ArrowLeft size={16} aria-hidden="true" />{children}</Link>;
}

export function CommitteeEmpty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-5 py-9 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-selected text-brand-primary"><UsersRound size={20} aria-hidden="true" /></span>
      <p className="mt-3 font-semibold text-brand-primary">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">{children}</p>
    </div>
  );
}

export function CommitteeEventMeta({ start, end, venue }: { start: string; end: string; venue?: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-text-secondary">
      <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="shrink-0" aria-hidden="true" />{formatEventDateRange(start, end)}</span>
      {venue && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={15} className="shrink-0" aria-hidden="true" /><span className="break-words">{venue}</span></span>}
    </div>
  );
}

export function CommitteeAvatar({ name, accent = false }: { name: string; accent?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((word) => word[0]).join("").toUpperCase() || "ED";
  return <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${accent ? "bg-brand-primary text-white" : "bg-brand-selected text-brand-primary"}`}>{initials}</span>;
}
