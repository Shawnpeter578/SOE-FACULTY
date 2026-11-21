import { z } from "zod";

export const committeeUpdateKinds = ["REPORT", "NEED", "UPDATE"] as const;
export type CommitteeUpdateKind = (typeof committeeUpdateKinds)[number];
export const committeeUpdateLabels: Record<CommitteeUpdateKind, string> = {
  REPORT: "Report",
  NEED: "Need",
  UPDATE: "Update",
};

export type CommitteeEvent = {
  id: string;
  proposal_id: string;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
};

export const eventCommitteeSchema = z.object({
  id: z.uuid(), event_id: z.uuid(), name: z.string(), responsibilities: z.string(),
  coordinator_id: z.uuid().nullable(), coordinator_name: z.string().nullable(),
  event_title: z.string(), venue: z.string(), start_date: z.iso.date(), end_date: z.iso.date(), owner_name: z.string(),
});
export type EventCommittee = z.infer<typeof eventCommitteeSchema>;

export type CommitteeUpdate = {
  id: string;
  title: string;
  kind: CommitteeUpdateKind;
  submitted_by_name: string;
  details: string;
  file_name: string | null;
  created_at: string;
};

export const COMMITTEE_FILES = "committee-files";

