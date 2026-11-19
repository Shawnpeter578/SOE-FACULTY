export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;
export const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const PROPOSAL_ATTACHMENT_BUCKET = "proposal-attachments";

export type ProposalAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
};

export function validateAttachments(files: Pick<File, "size" | "type" | "name">[]) {
  if (files.length > MAX_ATTACHMENTS) return "Attach up to 3 files.";
  for (const file of files) {
    if (!ATTACHMENT_TYPES.includes(file.type)) return `${file.name}: use a PDF, JPG or PNG file.`;
    if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) return `${file.name}: file size must be between 1 byte and 5 MB.`;
  }
  return null;
}
