export type EventReportDraft = {
  dean_id: string | null;
  dean_name: string | null;
  file_ids: string[];
  committee_count: number;
  missing_committees: string[];
  revision: string;
  last_sent_at: string | null;
  already_sent: boolean;
};

export type EventReportSubmission = {
  id: string;
  event_title: string;
  faculty_name: string;
  file_count: number;
  submitted_at: string;
};

export type EventReportFile = {
  id: string;
  committee_name: string;
  file_name: string;
  submitted_by_name: string;
};

export function reportLoadMessage(code: string) {
  return ["PGRST202", "PGRST205", "42883", "42P01"].includes(code)
    ? "Report submissions require the latest EventDesk database update."
    : "Reports could not be loaded. Refresh and try again.";
}
