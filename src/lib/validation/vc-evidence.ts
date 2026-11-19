export const VC_EVIDENCE_MAX_SIZE = 10 * 1024 * 1024;
export const VC_REASON_MAX_LENGTH = 3000;
export const VC_EVIDENCE_ACCEPT = "application/pdf,image/png,image/jpeg";

const signatures = {
  "application/pdf": { extension: "pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  "image/png": { extension: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/jpeg": { extension: "jpg", bytes: [0xff, 0xd8, 0xff] },
};

export function vcEvidenceError(file: File) {
  if (!Object.hasOwn(signatures, file.type)) return "Choose a PDF, PNG or JPG file.";
  if (!file.size || file.size > VC_EVIDENCE_MAX_SIZE) return "Choose a nonempty file up to 10 MB.";
  return null;
}

export async function vcEvidenceExtension(file: File) {
  if (vcEvidenceError(file)) return null;
  const signature = signatures[file.type as keyof typeof signatures];
  const actual = new Uint8Array(await file.slice(0, signature.bytes.length).arrayBuffer());
  return signature.bytes.every((byte, index) => actual[index] === byte) ? signature.extension : null;
}
