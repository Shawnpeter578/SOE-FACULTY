export type ApprovalEvent = {
  id: string;
  proposal_id: string;
  title: string;
  description: string;
  created_by: string;
  start_date: string;
  end_date: string;
  venue: string;
  status: string;
  letter_generated_at?: string | null;
  letter_faculty_name?: string | null;
  letter_faculty_signed_at?: string | null;
  letter_dean_name?: string | null;
  letter_dean_signed_at?: string | null;
  letter_event_details?: LetterEventDetails | null;
  letter_body?: string | null;
  letter_closing?: string | null;
  review_budget?: number | null;
  review_requirements?: string | null;
  review_details_at?: string | null;
  letter_printed_at?: string | null;
  vc_decision?: "APPROVED" | "REJECTED" | null;
  vc_note?: string | null;
  vc_decided_at?: string | null;
  vc_document_uploaded_at?: string | null;
  vc_approval_document_path?: string | null;
  vc_rejection_proof_path?: string | null;
  vc_recorded_at?: string | null;
  vc_recorded_by_name?: string | null;
  vc_recorded_file_name?: string | null;
};

export type LetterEventDetails = {
  department?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  participants?: number | null;
  audience?: string | null;
  objectives?: string | null;
  deanApprovalName?: string | null;
  deanApprovedAt?: string | null;
};

export const EVENT_DOCUMENT_BUCKET = "event-documents";

export function vcApprovalFileName(event: ApprovalEvent) {
  const extension = event.vc_approval_document_path?.split(".").pop() ?? "pdf";
  return `VC approval.${extension}`;
}

const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });
const approvalDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const timestamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const time = new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "UTC" });
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export const formatApprovalDate = (value: string) => approvalDate.format(new Date(value));
export const formatEventDateRange = (start: string, end: string) => date.formatRange(new Date(start), new Date(end));
export const formatApprovalTime = (value: string) => timestamp.format(new Date(value));
export const formatEventTime = (value: string) => time.format(new Date(`2000-01-01T${value.slice(0, 5)}:00Z`));
export const formatEventBudget = (value: number) => currency.format(value);

export function getFacultyApprovalAction(event: ApprovalEvent | null) {
  if (!event || event.status !== "AWAITING_VC_DOCUMENT" || !("letter_generated_at" in event)) return null;
  if (!event.letter_generated_at) return "generate";
  if (!event.review_details_at) return "details";
  if (!event.letter_printed_at && !event.letter_faculty_signed_at) return "sign";
  if (!event.letter_printed_at) return "print";
  return null;
}
