"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { eventProposalSchema } from "@/lib/validation/event-proposal";

export type EditProposalState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function updateProposal(
  proposalId: string,
  _previousState: EditProposalState,
  formData: FormData
): Promise<EditProposalState> {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const parsed = eventProposalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    objectives: formData.get("objectives") || "",
    venue: formData.get("venue"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    estimated_budget: formData.get("estimated_budget") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Verify ownership and eligibility on the server.
  const { data: proposal, error: fetchError } = await supabase
    .from("event_proposals")
    .select("id, status")
    .eq("id", proposalId)
    .eq("created_by", profile.id)
    .single();

  if (fetchError || !proposal) {
    return {
      success: false,
      message: "Proposal not found or you do not have permission to edit it.",
    };
  }

  if (proposal.status !== "CHANGES_REQUESTED") {
    return {
      success: false,
      message: "This proposal is no longer available for editing.",
    };
  }

  const { error } = await supabase
    .from("event_proposals")
    .update({
      ...parsed.data,
      status: "SUBMITTED",
      review_note: null,
    })
    .eq("id", proposalId)
    .eq("created_by", profile.id)
    .eq("status", "CHANGES_REQUESTED");

  if (error) {
    console.error("Proposal update failed:", error);
    return {
      success: false,
      message: "Could not resubmit the proposal. Please try again.",
    };
  }

  revalidatePath("/faculty/events");
  revalidatePath("/faculty/dashboard");
  revalidatePath("/dean/proposals");
  revalidatePath(`/dean/proposals/${proposalId}`);

  return {
    success: true,
    message: "Your changes have been submitted successfully.",
  };
}