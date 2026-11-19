"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { EVENT_DOCUMENT_BUCKET } from "@/lib/event-approval";

export type ApprovalState = { message: string; success: boolean };

const actions = {
  generate_letter: "FACULTY",
  save_details: "FACULTY",
  mark_printed: "FACULTY",
  vc_approve: "VC",
  vc_reject: "VC",
  lock_document: "DEAN",
} as const;

export async function advanceApproval(proposalId: string, _previous: ApprovalState, formData: FormData): Promise<ApprovalState> {
  const action = formData.get("action");
  if (typeof action !== "string" || !Object.hasOwn(actions, action) || !z.string().uuid().safeParse(proposalId).success) {
    return { message: "Choose a valid approval action.", success: false };
  }
  const step = action as keyof typeof actions;
  await requireRole([actions[step]]);
  const supabase = await createClient();
  const args: Record<string, string | number | null> = { p_proposal_id: proposalId, p_action: step };
  let uploadedPath: string | undefined;

  if (step === "save_details") {
    const budget = formData.get("budget");
    const requirements = formData.get("requirements");
    if (typeof budget !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(budget.trim()) ||
      typeof requirements !== "string" || !requirements.trim() || requirements.trim().length > 3000) {
      return { message: "Enter the budget in rupees and list the event requirements.", success: false };
    }
    args.p_budget = Number(budget);
    args.p_requirements = requirements.trim();
  }

  if (step === "vc_approve" || step === "vc_reject") {
    const note = formData.get("note");
    if (typeof note !== "string" || note.trim().length > 3000 || (step === "vc_reject" && !note.trim())) {
      return { message: "Enter a reason when declining a request. Remarks can be up to 3,000 characters.", success: false };
    }
    args.p_note = note.trim() || null;
  }

  if (step === "lock_document") {
    const document = formData.get("document");
    if (!(document instanceof File) || document.type !== "application/pdf" || document.size > 5 * 1024 * 1024 ||
      await document.slice(0, 5).text() !== "%PDF-") {
      return { message: "Choose a valid PDF of up to 5 MB.", success: false };
    }
    const { data: event, error } = await supabase.from("events").select("id, status, vc_decision")
      .eq("proposal_id", proposalId).maybeSingle();
    if (error || !event || event.status !== "AWAITING_VC_DOCUMENT" || event.vc_decision !== "APPROVED") {
      return { message: "The Vice-Chancellor must approve the event before its letter can be uploaded.", success: false };
    }
    const path = `${event.id}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage.from(EVENT_DOCUMENT_BUCKET).upload(path, document);
    if (uploadError) return { message: "Could not upload the approval PDF. Please try again.", success: false };
    uploadedPath = path;
    args.p_document_path = path;
  }

  const { error } = await supabase.rpc("advance_event_approval", args);
  if (error) {
    if (uploadedPath) await supabase.storage.from(EVENT_DOCUMENT_BUCKET).remove([uploadedPath]);
    return {
      message: error.code === "22023" || error.code === "42501"
        ? "This action is unavailable. Refresh the page to see the current approval stage."
        : "Could not save the approval update. Please try again.",
      success: false,
    };
  }

  revalidatePath(`/faculty/events/${proposalId}`);
  revalidatePath(`/faculty/events/${proposalId}/letter`);
  revalidatePath(`/dean/proposals/${proposalId}`);
  revalidatePath("/dean/proposals");
  revalidatePath("/faculty/events");
  revalidatePath("/faculty/dashboard");
  revalidatePath("/dean/dashboard");
  revalidatePath("/vc/dashboard");
  return { message: "Approval journey updated.", success: true };
}
