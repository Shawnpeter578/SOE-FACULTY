import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { COMMITTEE_FILES } from "@/lib/event-committees";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/faculty/committee-files/[id]">) {
  await requireRole(["FACULTY"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404, headers });
  const supabase = await createClient();
  const { data: update, error } = await supabase.from("event_committee_updates")
    .select("file_name, file_path").eq("id", id).maybeSingle();
  if (error) return new Response("Could not load the attachment. Try again.", { status: 502, headers });
  if (!update?.file_path || !update.file_name) return new Response(null, { status: 404, headers });

  const { data } = await supabase.storage.from(COMMITTEE_FILES).createSignedUrl(update.file_path, 60, { download: update.file_name });
  if (!data) return new Response("Could not open the attachment. Try again.", { status: 502, headers });
  return new Response(null, { status: 303, headers: { ...headers, Location: data.signedUrl } });
}
