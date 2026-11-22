import { z } from "zod";

export const committeeUpdateKinds = ["MESSAGE", "REPORT", "NEED", "UPDATE"] as const;
export type CommitteeUpdateKind = (typeof committeeUpdateKinds)[number];
export const committeeUpdateLabels: Record<CommitteeUpdateKind, string> = {
  REPORT: "Report",
  NEED: "Need",
  UPDATE: "Update",
  MESSAGE: "Message",
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
  second_coordinator_id: z.uuid().nullable().optional(), second_coordinator_name: z.string().nullable().optional(),
  event_title: z.string(), venue: z.string(), start_date: z.iso.date(), end_date: z.iso.date(), owner_name: z.string(),
});
export type EventCommittee = z.infer<typeof eventCommitteeSchema>;

export function committeeCoordinators(committee: EventCommittee) {
  return [
    { id: committee.coordinator_id, name: committee.coordinator_name },
    { id: committee.second_coordinator_id, name: committee.second_coordinator_name },
  ].flatMap(({ id, name }) => id && name ? [{ id, name }] : []);
}

export type CommitteeUpdate = {
  id: string;
  title: string;
  kind: CommitteeUpdateKind;
  submitted_by_name: string;
  submitted_by: string | null;
  details: string;
  file_name: string | null;
  file_removed: boolean;
  created_at: string;
};

export const COMMITTEE_FILES = "committee-files";

