import { z } from "zod";

export const coordinatorProgress = ["NOT_STARTED", "IN_PROGRESS", "DONE"] as const;
export type CoordinatorProgress = (typeof coordinatorProgress)[number];

export const progressLabels: Record<CoordinatorProgress, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
};

export const coordinatorAssignmentSchema = z.object({
  id: z.uuid(), event_id: z.uuid(), faculty_id: z.uuid(), title: z.string(), venue: z.string(),
  start_date: z.iso.date(), end_date: z.iso.date(), owner_name: z.string(), coordinator_name: z.string(),
  responsibilities: z.string(), due_date: z.iso.date().nullable(), progress: z.enum(coordinatorProgress),
});
export type CoordinatorAssignment = z.infer<typeof coordinatorAssignmentSchema>;

export const coordinatorCandidateSchema = z.object({ id: z.uuid(), full_name: z.string() });
export type CoordinatorCandidate = z.infer<typeof coordinatorCandidateSchema>;
