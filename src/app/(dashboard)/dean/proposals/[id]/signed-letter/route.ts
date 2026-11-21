import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { EVENT_DOCUMENT_BUCKET, vcApprovalFileName, type ApprovalEvent } from "@/lib/event-approval";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/dean/proposals/[id]/signed-letter">) {
  await requireRole(["DEAN"]);
  const { id } = await params;
  const unavailable = "A VC-signed letter is unavailable for this event.";
  if (!z.uuid().safeParse(id).success) return new Response(unavailable, { status: 404, headers });

  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events").select("vc_approval_document_path")
    .eq("proposal_id", id).eq("status", "OFFICIALLY_APPROVED").maybeSingle<Pick<ApprovalEvent, "vc_approval_document_path">>();
  if (error) return new Response("Could not load the signed letter. Please try again.", { status: 502, headers });
  if (!event?.vc_approval_document_path) return new Response(unavailable, { status: 404, headers });

  const { data: file } = await supabase.storage.from(EVENT_DOCUMENT_BUCKET)
    .createSignedUrl(event.vc_approval_document_path, 300, { download: vcApprovalFileName(event) });
  if (!file) return new Response("Could not download the signed letter. Please try again.", { status: 502, headers });

  return new Response(null, { status: 303, headers: { ...headers, Location: file.signedUrl } });
}
