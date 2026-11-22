import Link from "next/link";
import { notFound } from "next/navigation";
import { Folder } from "lucide-react";
import { z } from "zod";
import { ReportBreadcrumbs, ReportFiles, ReportHeading, reportPage, reportSurface } from "@/components/report-browser";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalTime } from "@/lib/event-approval";
import { reportLoadMessage, type EventReportFile, type EventReportSubmission } from "@/lib/event-reports";
import { createClient } from "@/lib/supabase/server";

const pageSize = 40;

export default async function DeanReportPackage({ params, searchParams }: PageProps<"/dean/reports/[id]">) {
  const dean = await requireRole(["DEAN"]);
  const [{ id }, { page: value }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const page = typeof value === "string" && /^[1-9][0-9]{0,5}$/.test(value) ? Number(value) : 1;
  const start = (page - 1) * pageSize;
  const supabase = await createClient();
  const { data: report, error } = await supabase.from("event_report_submissions")
    .select("id, event_title, faculty_name, file_count, submitted_at")
    .eq("id", id).eq("dean_id", dean.id).maybeSingle<EventReportSubmission>();
  if (error) return <p role="status" className={`${reportSurface} mt-5 p-5 text-sm text-text-secondary`}>{reportLoadMessage(error.code)}</p>;
  if (!report) notFound();
  const { data: files, count, error: fileError } = await supabase.from("event_report_files")
    .select("id, committee_name, file_name, submitted_by_name", { count: "exact" })
    .eq("submission_id", id).order("committee_name").order("file_name").order("id")
    .range(start, start + pageSize - 1).overrideTypes<EventReportFile[], { merge: false }>();
  const folders = new Map<string, EventReportFile[]>();
  for (const file of files ?? []) {
    const group = folders.get(file.committee_name);
    if (group) group.push(file);
    else folders.set(file.committee_name, [file]);
  }

  return (
    <div className={reportPage}>
      <ReportHeading description="Browse the files included in this submission." />
      <div className={`${reportSurface} px-3 py-2.5 sm:px-4`}>
        <ReportBreadcrumbs items={[{ name: "Received reports", href: "/dean/reports" }, { name: report.event_title }]} />
      </div>
      <section className={`${reportSurface} p-4 sm:px-5`}>
        <h2 className="break-words text-lg font-bold text-brand-primary">{report.event_title}</h2>
        <p className="mt-1 text-sm text-text-secondary">From {report.faculty_name} · {formatApprovalTime(report.submitted_at)}</p>
        <p className="mt-1 text-xs text-text-secondary">{report.file_count} {report.file_count === 1 ? "file" : "files"} in this package</p>
      </section>
      {fileError ? <p role="status" className={`${reportSurface} p-5 text-sm text-text-secondary`}>{reportLoadMessage(fileError.code)}</p>
        : folders.size ? [...folders].map(([name, group]) => (
          <section key={name} className="space-y-2">
            <h3 className="flex min-w-0 items-center gap-2 break-words text-sm font-bold text-brand-primary"><Folder size={17} className="shrink-0" aria-hidden="true" />{name}</h3>
            <ReportFiles empty="No files in this committee." files={group.map((file) => ({
              id: file.id, name: file.file_name, contributor: file.submitted_by_name, href: `/dean/reports/files/${file.id}`,
              detail: file.file_name.split(".").at(-1)?.toUpperCase(),
            }))} />
          </section>
        )) : <p className={`${reportSurface} p-5 text-sm text-text-secondary`}>No files on this page.</p>}
      {!fileError && (page > 1 || (count ?? 0) > start + pageSize) && <nav aria-label="Report file pages" className="flex gap-4 text-sm font-semibold text-brand-primary">
        {page > 1 && <Link href={`/dean/reports/${id}?page=${page - 1}`}>Previous files</Link>}
        {(count ?? 0) > start + pageSize && <Link href={`/dean/reports/${id}?page=${page + 1}`}>Next files</Link>}
      </nav>}
    </div>
  );
}
