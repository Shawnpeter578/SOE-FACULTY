import Form from "next/form";
import Link from "next/link";
import { formatEventBudget } from "@/lib/event-approval";
import { ArrowDownWideNarrow, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Search, UserRound } from "lucide-react";
import { facultyCardClass, facultyPageClass } from "@/app/(dashboard)/faculty/components/workspace-styles";
import { getStatusLabel, getStatusStyle } from "@/app/(dashboard)/faculty/events/event-status";

export type EventListRequest = {
  id: string;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: string;
  review_note: string | null;
  created_at: string;
  event: { status: string } | null;
  submittedBy?: string;
  estimated_budget?: number | null;
};

const statuses = {
  all: "All requests",
  new: "New requests",
  review: "Under review",
  vc: "Awaiting VC",
  progress: "In progress",
  changes: "Needs changes",
  approved: "Approved",
  closed: "Closed",
  drafts: "Drafts",
} as const;

type StatusFilter = keyof typeof statuses;

const statusGroups: Record<string, Exclude<StatusFilter, "all">> = {
  DRAFT: "drafts",
  SUBMITTED: "progress",
  UNDER_REVIEW: "progress",
  CHANGES_REQUESTED: "changes",
  REJECTED: "closed",
  REJECTED_BY_VC: "closed",
  APPROVED_BY_DEAN: "progress",
  AWAITING_VC_DOCUMENT: "progress",
  OFFICIALLY_APPROVED: "approved",
};

function getStatusGroup(status: string, isDean: boolean) {
  if (isDean) {
    if (status === "SUBMITTED") return "new";
    if (status === "UNDER_REVIEW") return "review";
    if (status === "AWAITING_VC_DOCUMENT" || status === "APPROVED_BY_DEAN") return "vc";
  }
  return statusGroups[status];
}

const periods = { all: "Any date", upcoming: "Upcoming", ongoing: "Ongoing", past: "Past" } as const;
type Period = keyof typeof periods;
type SearchParams = Record<string, string | string[] | undefined>;
const pageSize = 8;
const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const campusDateFormat = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata" });

function getPeriod(start: string, end: string, today: string): Exclude<Period, "all"> {
  if (start > today) return "upcoming";
  return end < today ? "past" : "ongoing";
}

export default function EventRequestsList({ requests, searchParams, workspace = "faculty" }: {
  requests: EventListRequest[];
  searchParams: SearchParams;
  workspace?: "faculty" | "dean";
}) {
  const isDean = workspace === "dean";
  const basePath = isDean ? "/dean/proposals" : "/faculty/events";
  const statusKeys: StatusFilter[] = isDean
    ? ["all", "new", "review", "vc", "changes", "approved", "closed"]
    : ["all", "progress", "changes", "approved", "closed", "drafts"];
  const periodKeys = Object.keys(periods) as Period[];
  const status = statusKeys.find((key) => key === searchParams.status) ?? "all";
  const period = periodKeys.find((key) => key === searchParams.date) ?? "all";
  const sort = searchParams.sort === "date" ? "date" : "newest";
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 120) : "";
  const searchTerm = query.toLocaleLowerCase();
  const today = campusDateFormat.format(new Date());
  const requestedPage = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;

  const counts: Record<StatusFilter, number> = { all: 0, new: 0, review: 0, vc: 0, progress: 0, changes: 0, approved: 0, closed: 0, drafts: 0 };
  const matching = requests.filter((request) => {
    if (isDean && request.status === "DRAFT") return false;
    if (period !== "all" && getPeriod(request.start_date, request.end_date, today) !== period) return false;
    const effectiveStatus = request.event?.status ?? request.status;
    const words = `${request.title} ${request.venue} ${request.submittedBy ?? ""}`.toLocaleLowerCase();
    if (!words.includes(searchTerm)) return false;

    const group = getStatusGroup(effectiveStatus, isDean);
    counts.all += 1;
    if (group) counts[group] += 1;
    return status === "all" || status === group;
  });

  matching.sort((a, b) => {
    if (sort === "date" && a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
    return Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id);
  });

  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(pages, Math.max(1, requestedPage)) : 1;
  const first = (page - 1) * pageSize;
  const visible = matching.slice(first, first + pageSize);
  const hasFilters = Boolean(query || status !== "all" || period !== "all");

  function href(changes: { status?: StatusFilter; date?: Period; sort?: typeof sort; page?: number }) {
    const next = { status, date: period, sort, page: 1, ...changes };
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (next.status !== "all") params.set("status", next.status);
    if (next.date !== "all") params.set("date", next.date);
    if (next.sort !== "newest") params.set("sort", next.sort);
    if (next.page > 1) params.set("page", String(next.page));
    const encoded = params.toString();
    return encoded ? `${basePath}?${encoded}` : basePath;
  }

  return (
    <div className={facultyPageClass}>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{isDean ? "Requests" : "My Events"}</h1>
          <p className="mt-2 text-sm text-slate-600">{isDean ? "Review faculty event requests and track their approval progress." : "Track your event requests, approvals, and feedback."}</p>
        </div>
        {!isDean && <Link href="/faculty/request" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1E2B58] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#162044]">
          <Plus size={17} aria-hidden="true" /> New event request
        </Link>}
      </header>

      <section aria-label="Event requests" className={`${facultyCardClass} overflow-hidden`}>
        <div className="space-y-5 border-b border-slate-100 px-4 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Form action={basePath} scroll={false} role="search" aria-label="Search event requests" className="flex min-h-12 w-full max-w-sm items-center rounded-full border border-brand-border bg-brand-canvas pr-1.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-surface focus-within:ring-2 focus-within:ring-brand-primary/15">
              <input key={query} name="q" defaultValue={query} type="search" maxLength={120} aria-label={isDean ? "Event title, venue or faculty member" : "Event title or venue"} placeholder={isDean ? "Search events or faculty" : "Search by title or venue"} className="min-h-11 min-w-0 flex-1 bg-transparent pl-4 pr-2 text-base text-text-primary outline-none placeholder:text-text-secondary sm:text-sm" />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="date" value={period} />
              <input type="hidden" name="sort" value={sort} />
              <button type="submit" aria-label="Search events" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"><Search size={18} aria-hidden="true" /></button>
            </Form>
            <Link href={href({ sort: sort === "newest" ? "date" : "newest" })} scroll={false} aria-label={sort === "newest" ? "Sort by event date, earliest first" : "Sort by newest request"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#1E2B58] hover:bg-slate-50">
              <ArrowDownWideNarrow size={16} aria-hidden="true" /> {sort === "newest" ? "Newest requests" : "Earliest event date"}
            </Link>
          </div>

          <nav aria-label="Request status" className="flex flex-wrap items-center gap-2">
            {statusKeys.filter((key) => key !== "drafts" || key === status || counts.drafts > 0).map((key) => (
              <Link key={key} href={href({ status: key })} scroll={false} aria-current={key === status ? "true" : undefined} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${key === status ? "bg-[#1E2B58] text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                {statuses[key]} <span className={`tabular-nums text-xs ${key === status ? "text-slate-200" : "text-slate-500"}`}>{counts[key]}</span>
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <nav aria-label="Event dates" className="flex flex-wrap items-center gap-1.5">
              <CalendarDays size={16} className="mr-1 text-slate-500" aria-hidden="true" />
              {periodKeys.map((key) => (
                <Link key={key} href={href({ date: key })} scroll={false} aria-current={key === period ? "true" : undefined} className={`rounded-md px-2 py-1 text-xs font-semibold ${key === period ? "bg-[#EEF2F6] text-[#1E2B58]" : "text-slate-600 hover:bg-slate-50 hover:text-[#1E2B58]"}`}>
                  {periods[key]}
                </Link>
              ))}
            </nav>
            {hasFilters && <Link href={basePath} scroll={false} className="text-xs font-semibold text-[#1E2B58] hover:underline">Clear filters</Link>}
          </div>
        </div>

        {visible.length ? (
          <ul className="divide-y divide-slate-100">
            {visible.map((request) => <EventRow key={request.id} request={request} basePath={basePath} isDean={isDean} />)}
          </ul>
        ) : (
          <div className="px-5 py-14 text-center sm:py-20">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-[#1E2B58]">
              {hasFilters ? <Search size={22} aria-hidden="true" /> : <CalendarDays size={22} aria-hidden="true" />}
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{hasFilters ? "No matching requests" : "No event requests yet"}</h2>
            <p className="mt-1 text-sm text-slate-600">{hasFilters ? "Try a different search or reset your filters." : isDean ? "Submitted faculty requests will appear here." : "Your requests and their approval progress will appear here."}</p>
            {(hasFilters || !isDean) && <Link href={hasFilters ? basePath : "/faculty/request"} className="mt-4 inline-block text-sm font-semibold text-[#1E2B58] hover:underline">
              {hasFilters ? "Reset filters" : "Start an event request"}
            </Link>}
          </div>
        )}

        {visible.length > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:px-7">
            <p>{first + 1}–{first + visible.length} of {matching.length} {matching.length === 1 ? "request" : "requests"}</p>
            {pages > 1 && (
              <nav aria-label="Event pages" className="flex items-center gap-3">
                {page > 1 && <Link aria-label="Previous page" href={href({ page: page - 1 })} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"><ChevronLeft size={17} aria-hidden="true" /></Link>}
                <span className="tabular-nums">{page} / {pages}</span>
                {page < pages && <Link aria-label="Next page" href={href({ page: page + 1 })} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"><ChevronRight size={17} aria-hidden="true" /></Link>}
              </nav>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}

function EventRow({ request, basePath, isDean }: { request: EventListRequest; basePath: string; isDean: boolean }) {
  const href = `${basePath}/${request.id}`;
  const status = request.event?.status ?? request.status;
  const action = isDean && ["SUBMITTED", "UNDER_REVIEW"].includes(request.status) ? "Review request" : "View details";
  const start = new Date(request.start_date);
  const end = new Date(request.end_date);

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-5 transition-colors hover:bg-slate-50/60 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:px-7">
      <div aria-hidden="true" className="flex size-13 flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[#1E2B58] sm:size-15">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{monthFormat.format(start)}</span>
        <span className="text-xl font-bold leading-none tabular-nums">{start.getUTCDate()}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="min-w-0 break-words text-base font-bold text-slate-900"><Link href={href} className="no-underline hover:no-underline focus:no-underline active:no-underline">{request.title}</Link></h2>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(status)}`}>{getStatusLabel(status)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 sm:text-sm">
          <span className="inline-flex items-start gap-1.5"><CalendarDays size={15} className="shrink-0" aria-hidden="true" />{dateFormat.formatRange(start, end)}</span>
          {request.venue && <span className="inline-flex min-w-0 items-start gap-1.5"><MapPin size={15} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{request.venue}</span></span>}
          {request.submittedBy && <span className="inline-flex min-w-0 items-start gap-1.5"><UserRound size={15} className="shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{request.submittedBy}</span></span>}
          {isDean && request.estimated_budget != null && <span>Budget {formatEventBudget(request.estimated_budget)}</span>}
        </div>
        {request.review_note && (
          <details className="mt-2 text-sm text-slate-600">
            <summary className="w-fit cursor-pointer text-xs font-semibold text-[#1E2B58]">{isDean ? "Review note" : "Dean’s feedback"}</summary>
            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3">{request.review_note}</p>
          </details>
        )}
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end">
        <Link href={href} aria-label={`${action}: ${request.title}`} className="inline-flex items-center gap-1 text-[#1E2B58] hover:underline">{action} <ArrowUpRight size={15} aria-hidden="true" /></Link>
        {!isDean && request.status === "CHANGES_REQUESTED" && <Link href={`${href}/edit`} className="text-orange-800 hover:underline">Edit and resubmit</Link>}
      </div>
    </li>
  );
}
