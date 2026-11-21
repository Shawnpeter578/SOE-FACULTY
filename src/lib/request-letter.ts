import type { SignatureMark } from "@/lib/profile-signature";

export type RequestLetter = {
  id: string;
  title: string;
  description: string;
  date: string;
  times: string;
  venue: string;
  objectives?: string | null;
  department?: string | null;
  duration?: string | null;
  participants?: number | null;
  audience?: string | null;
  budget: string | null;
  requirements?: string | null;
  faculty: string;
  dean: string;
  facultySignedAt?: string | null;
  deanSignedAt?: string | null;
  deanApprovedAt?: string | null;
  facultySignature?: SignatureMark | null;
  deanApprovalSignature?: SignatureMark | null;
  createdAt?: string | null;
  letterId: string;
  body?: string | null;
  closing?: string | null;
  usesLegacyLetterFormat?: boolean;
};

export const LETTER_BODY_LIMIT = 12000;
export const LETTER_CLOSING_LIMIT = 3000;

export function defaultLetterBody(letter: RequestLetter) {
  const introduction = letter.department
    ? `The ${letter.department.startsWith("Department of ") ? letter.department : `Department of ${letter.department}`} seeks your permission to conduct ${letter.title}.`
    : `I seek your permission to conduct ${letter.title}.`;
  return ["Dear Vice-Chancellor,", introduction, letter.description, letter.objectives].filter(Boolean).join("\n\n");
}

export const defaultLetterClosing = "We kindly request your approval to proceed with the event.\n\nYours faithfully,";

export function requestLetterFields(letter: RequestLetter) {
  return [
    ["Date & time", [letter.date, letter.times && `${letter.times} IST`].filter(Boolean).join(" · ")],
    ["Venue", letter.venue],
    ["Duration", letter.duration],
    ["Participants", [letter.participants?.toLocaleString("en-IN"), letter.audience].filter(Boolean).join(" · ")],
    ["Budget estimate", letter.budget],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

export function letterArrangementRows(letter: RequestLetter) {
  return [
    ["Date and time", [letter.date, letter.times && `${letter.times} IST`].filter(Boolean).join(", ")],
    ["Duration", letter.duration],
    ["Venue", letter.venue],
    ["Participants", [letter.participants?.toLocaleString("en-IN"), letter.audience].filter(Boolean).join(" ")],
    ["Estimated budget", letter.budget],
    ["Support required", letter.requirements],
  ].filter((row): row is [string, string] => Boolean(row[1]));
}
