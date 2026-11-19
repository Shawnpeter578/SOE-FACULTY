import "server-only";

import type { createClient } from "./server";
import { PROPOSAL_ATTACHMENT_BUCKET, type ProposalAttachment } from "@/lib/validation/proposal-attachments";

export async function signProposalAttachments(supabase: Awaited<ReturnType<typeof createClient>>, value: unknown) {
  const attachments: ProposalAttachment[] = Array.isArray(value)
    ? value.filter((item): item is ProposalAttachment => item && typeof item.name === "string" && typeof item.path === "string" && typeof item.size === "number")
    : [];
  return Promise.all(attachments.map(async (attachment) => {
    const { data } = await supabase.storage.from(PROPOSAL_ATTACHMENT_BUCKET).createSignedUrl(attachment.path, 3600, { download: attachment.name });
    return { ...attachment, url: data?.signedUrl };
  }));
}
