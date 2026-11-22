import Link from "next/link";
import { ReportFolders, ReportHeading, reportPage, reportSurface } from "@/components/report-browser";
import { requireRole } from "@/lib/auth/guard";
import { formatApprovalTime } from "@/lib/event-approval";
import { reportLoadMessage, type EventReportSubmission } from "@/lib/event-reports";
import { createClient } from "@/lib/supabase/server";

const pageSize = 24;

export default async function DeanReports({ searchParams }: PageProps<"/dean/reports">) {
  const dean = await requireRole(["DEAN"]);
  const { page: value } = await searchParams;
  const page = typeof value === "string" && /^[1-9][0-9]{0,5}$/.test(value) ? Number(value) : 1;
  const start = (page - 1) * pageSize;
  const supabase = await createClient();
  const { data: submissions, count, error } = await supabase.from("event_report_submissions")
    .select("id, event_title, faculty_name, file_count, submitted_at", { count: "exact" })
    .eq("dean_id", dean.id).order("submitted_at", { ascending: false }).order("id")
    .range(start, start + pageSize - 1).overrideTypes<EventReportSubmission[], { merge: false }>();

  return (
    <div className={reportPage}>
      <ReportHeading description="Open report packages sent by faculty event leads." />
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-brand-primary">Received reports</h2>
        {error ? <p role="status" className={`${reportSurface} p-5 text-sm text-text-secondary`}>{reportLoadMessage(error.code)}</p>
          : submissions.length ? <ReportFolders folders={submissions.map((item) => ({
            href: `/dean/reports/${item.id}`, title: item.event_title,
            detail: `${item.faculty_name} · ${item.file_count} ${item.file_count === 1 ? "file" : "files"} · ${formatApprovalTime(item.submitted_at)}`,
          }))} /> : <p className={`${reportSurface} p-5 text-sm text-text-secondary`}>{page > 1 ? "No report packages on this page." : "Report packages sent to you will appear here."}</p>}
      </section>
      {!error && (page > 1 || (count ?? 0) > start + pageSize) && <nav aria-label="Report pages" className="flex gap-4 text-sm font-semibold text-brand-primary">
        {page > 1 && <Link href={page === 2 ? "/dean/reports" : `/dean/reports?page=${page - 1}`}>Newer reports</Link>}
        {(count ?? 0) > start + pageSize && <Link href={`/dean/reports?page=${page + 1}`}>Older reports</Link>}
      </nav>}
    </div>
  );
}
