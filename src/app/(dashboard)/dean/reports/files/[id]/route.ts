import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { COMMITTEE_FILES } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/dean/reports/files/[id]">) {
  const dean = await requireRole(["DEAN"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404, headers });
  const supabase = await createClient();
  const { data: file, error } = await supabase.from("event_report_files")
    .select("file_name, file_path, report:event_report_submissions!inner(dean_id)")
    .eq("id", id).eq("report.dean_id", dean.id).maybeSingle();
  if (error) return new Response("Could not load the report file.", { status: 502, headers });
  if (!file) return new Response(null, { status: 404, headers });
  const { data } = await supabase.storage.from(COMMITTEE_FILES).createSignedUrl(file.file_path, 60, { download: file.file_name });
  if (!data) return new Response("Could not open the report file.", { status: 502, headers });
  return new Response(null, { status: 303, headers: { ...headers, Location: data.signedUrl } });
}
