import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Search } from "lucide-react";
import { z } from "zod";
import { ReportBreadcrumbs, ReportFiles, ReportFolders, ReportHeading, reportPage, reportSurface } from "@/components/report-browser";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalTime, formatEventDateRange } from "@/lib/event-approval";
import type { CommitteeEvent, CommitteeUpdate } from "@/lib/event-committees";
import { approvedCommitteeEvents, committeeLoadError, loadEventCommittees } from "@/lib/event-committees-server";
import { reportLoadMessage, type EventReportDraft } from "@/lib/event-reports";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import { DeleteCommitteeFileForm } from "../committees/forms";
import SendReport from "./send-report";

const pageSize = 25;
const reportsHref = "/faculty/reports";

export default async function FacultyReports({ searchParams }: PageProps<"/faculty/reports">) {
  const profile = await requireRole(["FACULTY"]);
  const query = await searchParams;
  const eventId = typeof query.event === "string" && z.uuid().safeParse(query.event).success ? query.event : undefined;
  const committeeId = typeof query.committee === "string" && z.uuid().safeParse(query.committee).success ? query.committee : undefined;
  const page = typeof query.page === "string" && /^[1-9][0-9]{0,5}$/.test(query.page) ? Number(query.page) : 1;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const supabase = await createClient();
  const { data: events, error: eventError } = await approvedCommitteeEvents(supabase, profile.id)
    .order("start_date", { ascending: false }).order("title").overrideTypes<CommitteeEvent[], { merge: false }>();
  const event = events?.find(({ id }) => id === eventId);
  if (eventId && !event && !eventError) notFound();
  const [{ data: committees, error: committeeError }, { data: draft, error: draftError }] = event ? await Promise.all([
    loadEventCommittees(supabase, event.id),
    supabase.rpc("preview_event_report", { p_event_id: event.id }).maybeSingle<EventReportDraft>(),
  ]) : [{ data: [], error: null }, { data: null, error: null }];
  const committee = committees.find(({ id }) => id === committeeId);
  if (committeeId && !committee && !eventError && !committeeError) notFound();

  const start = (page - 1) * pageSize;
  const filesQuery = committee && supabase.from("event_committee_updates")
    .select("id, file_name, submitted_by_name, created_at", { count: "exact" })
    .eq("committee_id", committee.id).not("file_name", "is", null);
  if (filesQuery && search) filesQuery.ilike("file_name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  const { data: files, count, error: fileError } = filesQuery ? await filesQuery
    .order("created_at", { ascending: false }).order("id").range(start, start + pageSize - 1)
    .overrideTypes<Pick<CommitteeUpdate, "id" | "file_name" | "submitted_by_name" | "created_at">[], { merge: false }>()
    : { data: [], count: 0, error: null };
  const { data: included, error: includedError } = files?.length ? await supabase.from("event_report_files")
    .select("update_id").in("update_id", files.map(({ id }) => id)) : { data: [], error: null };
  const sentIds = new Set(included?.map(({ update_id }) => update_id));
  const error = eventError ?? committeeError ?? fileError;
  const eventHref = event ? `${reportsHref}?event=${event.id}` : reportsHref;
  const folderHref = `${eventHref}&committee=${committee?.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const breadcrumbs = [
    { name: "My reports", href: event ? reportsHref : undefined },
    ...(event ? [{ name: event.title, href: committee ? eventHref : undefined }] : []),
    ...(committee ? [{ name: committee.name }] : []),
  ];
  const folders = event ? committees.map((group) => ({ title: group.name, href: `${eventHref}&committee=${group.id}` }))
    : (events ?? []).map((item) => ({ title: item.title, href: `${reportsHref}?event=${item.id}`, detail: formatEventDateRange(item.start_date, item.end_date) }));

  return (
    <AppLayout facultyName={profile.full_name}>
      <div className={reportPage}>
        <ReportHeading description="Browse committee files and send a complete report package to the Dean." />
        <div className={`${reportSurface} flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4`}>
          <ReportBreadcrumbs items={breadcrumbs} />
          {committee && <Form action={reportsHref} role="search" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-brand-border bg-brand-canvas px-2.5 sm:max-w-64">
            <input type="hidden" name="event" value={eventId} /><input type="hidden" name="committee" value={committee.id} />
            <input aria-label="Search files" name="q" type="search" defaultValue={search} maxLength={100} placeholder="Search this folder" className="min-h-10 min-w-0 flex-1 bg-transparent text-sm" />
            <button type="submit" aria-label="Search this folder" className="grid size-8 shrink-0 place-items-center rounded-md text-brand-primary hover:bg-brand-selected"><Search size={16} aria-hidden="true" /></button>
          </Form>}
        </div>
        {error ? <p role="status" className={`${reportSurface} p-5 text-sm text-text-secondary`}>{committeeLoadError(error.code)}</p> : <>
          {event && <section className={`${reportSurface} flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5`}>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-sm font-bold text-brand-primary">Event report package</h2>
              {draftError ? <p role="status" className="text-sm text-text-secondary">{reportLoadMessage(draftError.code)}</p>
                : !draft?.dean_id ? <p className="text-sm text-text-secondary">This event has no approving Dean available to receive a package.</p>
                : draft.already_sent ? <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CircleCheck size={16} aria-hidden="true" />Current package sent to {draft.dean_name}</p>
                : !draft.committee_count ? <p className="text-sm text-text-secondary">Create at least one committee and add its report files.</p>
                : draft.missing_committees.length ? <p className="break-words text-sm text-text-secondary">Waiting for files from {draft.missing_committees.join(", ")}.</p>
                : <p className="text-sm text-text-secondary">{draft.file_ids.length} {draft.file_ids.length === 1 ? "file" : "files"} ready to send to {draft.dean_name}.</p>}
              {draft?.last_sent_at && <p className="text-xs text-text-secondary">Last sent {formatApprovalTime(draft.last_sent_at)}</p>}
            </div>
            {draft?.dean_id && draft.dean_name && draft.file_ids.length > 0 && !draft.missing_committees.length && !draft.already_sent &&
              <SendReport eventId={event.id} eventTitle={event.title} deanName={draft.dean_name} revision={draft.revision} fileCount={draft.file_ids.length} committeeCount={draft.committee_count} />}
          </section>}
          {committee ? <>
            <ReportFiles empty={search ? "No files match this search." : "No files on this page."} files={(files ?? []).flatMap((file) => {
              if (!file.file_name) return [];
              const sent = sentIds.has(file.id);
              return [{
                id: file.id, name: file.file_name, href: `/faculty/committee-files/${file.id}`, contributor: file.submitted_by_name,
                detail: formatApprovalTime(file.created_at),
                actions: sent ? <span className="rounded-md bg-success-bg px-1.5 py-1 text-xs font-semibold text-emerald-800">Sent</span>
                  : includedError ? null : <DeleteCommitteeFileForm id={file.id} name={file.file_name} />,
              }];
            })} />
            {(page > 1 || (count ?? 0) > start + pageSize) && <nav aria-label="File pages" className="flex gap-4 text-sm font-semibold text-brand-primary">
              {page > 1 && <Link href={`${folderHref}&page=${page - 1}`}>Newer files</Link>}
              {(count ?? 0) > start + pageSize && <Link href={`${folderHref}&page=${page + 1}`}>Older files</Link>}
            </nav>}
          </> : <section className="space-y-3">
            <h2 className="text-sm font-bold text-brand-primary">{event ? "Committee folders" : "Event folders"}</h2>
            {folders.length ? <ReportFolders folders={folders} /> : <p className={`${reportSurface} p-5 text-sm text-text-secondary`}>{event ? "No committees yet." : "Approved events will appear here."}</p>}
          </section>}
        </>}
      </div>
    </AppLayout>
  );
}
