"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { EVENT_DOCUMENT_BUCKET, type ApprovalEvent } from "@/lib/event-approval";
import { createClient } from "@/lib/supabase/server";
import { vcEvidenceExtension, VC_REASON_MAX_LENGTH } from "@/lib/validation/vc-evidence";

export async function recordDecision(id: string, formData: FormData): Promise<string> {
  const profile = await requireRole(["FACULTY"]);
  const decision = formData.get("decision");
  const rawReason = formData.get("reason");
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  const file = formData.get("document");
  const evidence = file instanceof File ? file : null;

  if (!z.uuid().safeParse(id).success || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return "Choose a valid VC decision.";
  }
  if (decision === "REJECTED" && (!reason || reason.length > VC_REASON_MAX_LENGTH)) {
    return "Enter the VC’s rejection reason in 3,000 characters or fewer.";
  }
  if (decision === "APPROVED" && !evidence) return "Upload the VC-signed copy before confirming.";
  const extension = evidence && await vcEvidenceExtension(evidence);
  if (evidence && !extension) return "Choose a valid PDF, PNG or JPG file up to 10 MB.";

  const supabase = await createClient();
  const { data: event, error: loadError } = await supabase.from("events").select("*")
    .eq("proposal_id", id).eq("created_by", profile.id).maybeSingle<ApprovalEvent>();
  if (loadError || !event?.letter_printed_at || event.status !== "AWAITING_VC_DOCUMENT" || (event.vc_decision && event.vc_decision !== decision)) {
    return "This decision is no longer available. Refresh to see the current approval stage.";
  }
  if (!("vc_recorded_at" in event)) return "The VC decision database update must be applied before recording a decision.";

  const documents = supabase.storage.from(EVENT_DOCUMENT_BUCKET);
  const path = extension ? `${event.id}/${crypto.randomUUID()}.${extension}` : null;
  if (path && evidence) {
    const { error } = await documents.upload(path, evidence, { contentType: evidence.type });
    if (error) return "Could not upload the document. Refresh to check the event status and try again.";
  }

  const { error } = await supabase.rpc("record_faculty_vc_decision", {
    p_proposal_id: id,
    p_decision: decision,
    p_reason: decision === "REJECTED" ? reason : null,
    p_document_path: path,
    p_file_name: evidence?.name ?? null,
  });
  if (error) {
    if (path) await documents.remove([path]);
    if (error.code === "PGRST202") return "Recording a VC decision requires the latest EventDesk database update.";
    return error.code === "22023" || error.code === "42501"
      ? "This decision is no longer available. Refresh to see the current approval stage."
      : "Could not record the decision. Please try again.";
  }

  revalidatePath("/dean", "layout");
  revalidatePath("/faculty/dashboard");
  revalidatePath("/faculty/events");
  revalidatePath(`/faculty/events/${id}`);
  revalidatePath(`/faculty/events/${id}/letter`);
  revalidatePath(`/faculty/events/${id}/decision`);
  if (decision === "APPROVED") {
    revalidatePath("/faculty/committees");
    revalidatePath(`/faculty/committees/${event.id}`);
    redirect(`/faculty/committees/${event.id}?locked=1`);
  }
  redirect(`/faculty/events/${id}/decision`);
}
