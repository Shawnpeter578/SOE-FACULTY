"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export type LetterActionState = { message: string; success: boolean };

export async function updateRequestLetter(proposalId: string, _previous: LetterActionState, form: FormData): Promise<LetterActionState> {
  await requireRole(["FACULTY", "DEAN"]);
  const parsed = z.object({
    id: z.uuid(),
    action: z.enum(["sign_letter", "confirm_printed"]),
    detailsAt: z.iso.datetime({ offset: true }).nullable(),
  }).safeParse({ id: proposalId, action: form.get("action"), detailsAt: form.get("detailsAt") || null });

  if (!parsed.success || form.get("consent") !== "yes") {
    return { success: false, message: "Confirm the action before continuing." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_request_letter", {
    p_proposal_id: parsed.data.id,
    p_action: parsed.data.action,
    p_expected_details_at: parsed.data.detailsAt,
  });
  if (error) {
    const message = error.code === "PGRST202"
      ? "Letter signing is waiting for the database update. Contact your EventDesk administrator."
      : error.code === "42501" ? "Only the submitting faculty member and approving dean can update this letter."
      : "The letter could not be updated. Refresh to check the latest signatures and approval stage.";
    return { success: false, message };
  }

  for (const path of [
    `/faculty/events/${proposalId}`, `/faculty/events/${proposalId}/letter`,
    `/dean/proposals/${proposalId}`, `/dean/proposals/${proposalId}/letter`, `/dean/proposals/${proposalId}/decision`,
    "/faculty/dashboard", "/dean/dashboard", "/dean/proposals", "/vc/dashboard",
  ]) revalidatePath(path);

  return { success: true, message: parsed.data.action === "sign_letter" ? "Your e-signature was recorded." : "Letter marked printed and ready for VC review." };
}
