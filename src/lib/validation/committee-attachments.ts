const committeeFileTypes = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  xml: "application/xml",
} as const;

const compoundDocument = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const zippedDocument = [0x50, 0x4b, 0x03, 0x04];
const signatures: Partial<Record<keyof typeof committeeFileTypes, number[]>> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46],
  rtf: [0x7b, 0x5c, 0x72, 0x74, 0x66],
  doc: compoundDocument,
  xls: compoundDocument,
  ppt: compoundDocument,
  docx: zippedDocument,
  xlsx: zippedDocument,
  pptx: zippedDocument,
  odt: zippedDocument,
  ods: zippedDocument,
  odp: zippedDocument,
};

export const COMMITTEE_FILE_ACCEPT = Object.keys(committeeFileTypes).map((extension) => `.${extension}`).join(",");
export const COMMITTEE_FILE_LIMIT = 10 * 1024 * 1024;

export async function validateCommitteeAttachment(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").at(-1)?.toLowerCase() : undefined;
  if (!extension || !Object.hasOwn(committeeFileTypes, extension) || !file.size || file.size > COMMITTEE_FILE_LIMIT) return null;
  const key = extension as keyof typeof committeeFileTypes;
  const signature = signatures[key];
  const bytes = new Uint8Array(await file.slice(0, signature ? 12 : 4096).arrayBuffer());
  if (signature && !signature.every((byte, index) => bytes[index] === byte)) return null;
  if (!signature && bytes.includes(0)) return null;
  if (key === "webp" && String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null;
  return { extension, contentType: committeeFileTypes[key] };
}
