
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guard";
import { eventProposalSchema } from "@/lib/validation/event-proposal";

export type ProposalFormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[]>;
  proposalId?: string;
};

export async function submitEventProposal(
  _previousState: ProposalFormState,
  formData: FormData
): Promise<ProposalFormState> {
  // Authorization: never trust the client to identify the user or role.
  const profile = await requireRole(["FACULTY"]);

  const parsed = eventProposalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    objectives: formData.get("objectives") || undefined,
    venue: formData.get("venue"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    estimated_budget: formData.get("estimated_budget"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_proposals")
    .insert({
      ...parsed.data,
      created_by: profile.id,
      status: "SUBMITTED",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Event proposal submission failed:", error.code);

    return {
      success: false,
      message: "Unable to submit your proposal. Please try again.",
    };
  }

  revalidatePath("/faculty");
  revalidatePath("/dean");

  return {
    success: true,
    message: "Your event proposal has been submitted successfully.",
    proposalId: data.id,
  };
}
