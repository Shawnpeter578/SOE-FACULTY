import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { signProposalAttachments } from "@/lib/supabase/proposal-attachments";
import { EVENT_DOCUMENT_BUCKET, vcApprovalFileName, type ApprovalEvent } from "@/lib/event-approval";
import EventDetail from "./event-detail";

export default async function FacultyRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["FACULTY"]);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const [proposalResult, eventResult] = await Promise.all([
    supabase.from("event_proposals").select("*").eq("id", id).eq("created_by", profile.id).maybeSingle(),
    supabase.from("events").select("*").eq("proposal_id", id).eq("created_by", profile.id).maybeSingle<ApprovalEvent>(),
  ]);
  if (proposalResult.error || eventResult.error) throw new Error("Unable to load your event request.");
  const proposal = proposalResult.data;
  if (!proposal) notFound();
  const event = eventResult.data;
  const [attachments, document] = await Promise.all([
    signProposalAttachments(supabase, proposal.attachments),
    event?.vc_approval_document_path
      ? supabase.storage.from(EVENT_DOCUMENT_BUCKET).createSignedUrl(event.vc_approval_document_path, 3600, { download: vcApprovalFileName(event) })
      : null,
  ]);

  return <EventDetail proposal={proposal} event={event} facultyName={profile.full_name} attachments={attachments} approvalUrl={document?.data?.signedUrl} />;
}
