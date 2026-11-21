
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guard";
import { z } from "zod";

const reviewSchema = z.object({
  proposalId: z.string().uuid(),
  action: z.enum(["REJECTED", "APPROVED_BY_DEAN"]),
  note: z.string().trim().max(500).optional(),
});

export type ReviewState = {
  success: boolean;
  message: string | null;
};

export async function reviewProposal(
  _previousState: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  await requireRole(["DEAN"]);

  const parsed = reviewSchema.safeParse({
    proposalId: formData.get("proposalId"),
    action: formData.get("action"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid review submission.",
    };
  }

  const { proposalId, action, note } = parsed.data;
  const supabase = await createClient();

  const { data: proposal, error: fetchError } = await supabase
    .from("event_proposals")
    .select("id, status")
    .eq("id", proposalId)
    .maybeSingle();

  if (fetchError || !proposal) {
    return {
      success: false,
      message: "Proposal not found.",
    };
  }

  if (!["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(proposal.status)) {
    return { success: false, message: "This proposal cannot be reviewed in its current state." };
  }

  if (action === "REJECTED" && !note) {
    return { success: false, message: "Please provide a reason for this decision." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("event_proposals")
    .update({
      status: action,
      review_note: note ?? null,
    })
    .eq("id", proposalId)
    .eq("status", proposal.status)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Proposal review failed:", updateError.code);

    return {
      success: false,
      message: "Unable to update the proposal.",
    };
  }

  if (!updated) return { success: false, message: "This proposal has changed. Refresh the page before reviewing it again." };

  revalidatePath("/dean/proposals");
  revalidatePath(`/dean/proposals/${proposalId}`);
  revalidatePath(`/faculty/events/${proposalId}/letter`);
  revalidatePath("/faculty/dashboard");
  revalidatePath("/faculty/events");
  revalidatePath(`/faculty/events/${proposalId}`);
  revalidatePath("/dean/dashboard");

  return {
    success: true,
    message:
      action === "APPROVED_BY_DEAN"
        ? "Dean approval recorded successfully."
        : "The reason has been shared with the faculty.",
  };
}
