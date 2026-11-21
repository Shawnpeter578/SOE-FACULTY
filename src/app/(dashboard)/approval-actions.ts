"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export type ApprovalState = { message: string; success: boolean };

const actions = z.enum(["generate_letter", "save_details", "mark_printed"]);

export async function advanceApproval(proposalId: string, _previous: ApprovalState, formData: FormData): Promise<ApprovalState> {
  const action = actions.safeParse(formData.get("action"));
  if (!action.success || !z.string().uuid().safeParse(proposalId).success) {
    return { message: "Choose a valid approval action.", success: false };
  }
  const step = action.data;
  await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const args: Record<string, string | number | null> = { p_proposal_id: proposalId, p_action: step };

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

  const { error } = await supabase.rpc("advance_event_approval", args);
  if (error) {
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
  return { message: "Approval journey updated.", success: true };
}
