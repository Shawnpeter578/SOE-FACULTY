
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guard";
import { eventRequestSchema } from "@/lib/validation/event-proposal";
import { PROPOSAL_ATTACHMENT_BUCKET, validateAttachments, type ProposalAttachment } from "@/lib/validation/proposal-attachments";

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

  const parsed = eventRequestSchema.safeParse({
    ...Object.fromEntries(formData),
    sponsorship_expected: formData.get("sponsorship_expected") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  const entries = formData.getAll("attachments");
  if (entries.some((entry) => !(entry instanceof File))) {
    return { success: false, message: "Choose valid attachment files.", errors: { attachments: ["Choose valid attachment files."] } };
  }
  const files = entries.filter((file): file is File => file instanceof File && (file.name !== "" || file.size > 0));
  const attachmentError = validateAttachments(files);
  if (attachmentError) {
    return { success: false, message: attachmentError, errors: { attachments: [attachmentError] } };
  }

  const attachments: ProposalAttachment[] = [];
  const storage = supabase.storage.from(PROPOSAL_ATTACHMENT_BUCKET);
  const uploadId = crypto.randomUUID();

  // Upload before creating the proposal so the dean never sees a partial request.
  for (const [index, file] of files.entries()) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "attachment";
    const path = `${profile.id}/${uploadId}/${index}-${safeName}`;
    const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      if (attachments.length) await storage.remove(attachments.map((attachment) => attachment.path));
      console.error("Proposal attachment upload failed:", error.message);
      return {
        success: false,
        message: /bucket not found/i.test(error.message)
          ? "Your request was not sent. Attachment storage has not been set up. Contact your EventDesk administrator."
          : "Unable to upload your attachments. Your request has not been sent. Please try again.",
      };
    }
    attachments.push({ name: file.name, path, size: file.size, type: file.type });
  }

  const { data, error } = await supabase
    .from("event_proposals")
    .insert({
      ...parsed.data,
      attachments,
      created_by: profile.id,
      status: "SUBMITTED",
    })
    .select("id")
    .single();

  if (error) {
    if (attachments.length) await storage.remove(attachments.map((attachment) => attachment.path));
    console.error("Event proposal submission failed:", error.code);

    return {
      success: false,
      message: error.code === "PGRST204" || error.code === "42703"
        ? "Your request was not sent. The event request database update is missing. Contact your EventDesk administrator."
        : "Unable to submit your proposal. Please try again.",
    };
  }

  revalidatePath("/faculty/events");
  revalidatePath("/faculty/dashboard");
  revalidatePath("/dean/dashboard");
  revalidatePath("/dean/proposals");

  return {
    success: true,
    message: "Your event proposal has been submitted successfully.",
    proposalId: data.id,
  };
}
