"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { LETTER_BODY_LIMIT, LETTER_CLOSING_LIMIT } from "@/lib/request-letter";
import { createClient } from "@/lib/supabase/server";

export type LetterActionState = { message: string; success: boolean };

export async function updateRequestLetter(proposalId: string, _previous: LetterActionState, form: FormData): Promise<LetterActionState> {
  await requireRole(["FACULTY"]);
  const parsed = z.object({
    id: z.uuid(),
    action: z.enum(["save_draft", "sign_letter", "confirm_printed"]),
    detailsAt: z.iso.datetime({ offset: true }).nullable(),
  }).safeParse({ id: proposalId, action: form.get("action"), detailsAt: form.get("detailsAt") || null });

  if (!parsed.success || (parsed.data.action !== "save_draft" && form.get("consent") !== "yes")) {
    return { success: false, message: "Confirm the action before continuing." };
  }

  const args = {
    p_proposal_id: parsed.data.id,
    p_action: parsed.data.action,
    p_expected_details_at: parsed.data.detailsAt,
  };
  const signatureRevision = parsed.data.action === "sign_letter" ? form.get("signatureRevision") : null;
  if (signatureRevision !== null && !z.uuid().safeParse(signatureRevision).success) {
    return { success: false, message: "Refresh the letter before using your saved signature." };
  }
  const hasDraft = parsed.data.action === "save_draft" || (parsed.data.action === "sign_letter" && form.has("body"));
  const draft = hasDraft ? z.object({
    body: z.string().trim().min(1).max(LETTER_BODY_LIMIT),
    closing: z.string().trim().max(LETTER_CLOSING_LIMIT),
  }).safeParse({ body: form.get("body"), closing: form.get("closing") }) : null;
  if (draft && !draft.success) {
    return { success: false, message: "Enter a letter body and keep both text fields within their limits." };
  }

  const supabase = await createClient();
  const { error } = signatureRevision
    ? await supabase.rpc("sign_request_letter_with_profile_signature", {
      p_proposal_id: args.p_proposal_id, p_signature_revision: signatureRevision, p_expected_details_at: args.p_expected_details_at,
      p_body: draft?.data?.body ?? null, p_closing: draft?.data?.closing ?? null,
    })
    : draft?.success
    ? await supabase.rpc("prepare_request_letter", { ...args, p_body: draft.data.body, p_closing: draft.data.closing })
    : await supabase.rpc("update_request_letter", args);
  if (error) {
    const message = error.code === "PGRST202" ? "This letter action requires the latest EventDesk database update."
      : error.code === "P0001" ? "Your saved signature changed. Refresh the letter to review it before signing."
      : error.code === "42501" ? "Only the submitting faculty member can update this letter."
      : "The letter could not be updated. Refresh to check the latest signatures and approval stage.";
    return { success: false, message };
  }

  for (const path of [
    `/faculty/events/${proposalId}`, `/faculty/events/${proposalId}/letter`,
    `/dean/proposals/${proposalId}`, `/faculty/events/${proposalId}/decision`,
    "/faculty/dashboard", "/dean/dashboard", "/dean/proposals",
  ]) revalidatePath(path);

  const message = parsed.data.action === "save_draft" ? "Letter draft saved."
    : parsed.data.action === "sign_letter" ? "Your e-signature was recorded." : "Letter marked printed and ready for VC review.";
  return { success: true, message };
}
