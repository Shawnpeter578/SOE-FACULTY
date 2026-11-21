"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { coordinatorCandidateSchema, coordinatorProgress, type CoordinatorCandidate } from "@/lib/event-coordinators";
import { createClient } from "@/lib/supabase/server";

export type AssignmentActionState = { success: boolean; message: string };
export type CandidateSearchState = { matches: CoordinatorCandidate[]; message: string };

function refreshAssignmentPages() {
  revalidatePath("/faculty/co-faculty");
  revalidatePath("/faculty/co-faculty/assignments");
  revalidatePath("/faculty/events/[id]", "page");
}

export async function findCoordinatorCandidates(eventId: string, _previous: CandidateSearchState, formData: FormData): Promise<CandidateSearchState> {
  await requireRole(["FACULTY"]);
  const parsed = z.object({ eventId: z.uuid(), name: z.string().trim().min(2).max(120) })
    .safeParse({ eventId, name: formData.get("name") });
  if (!parsed.success) return { matches: [], message: "Enter at least two characters of the faculty member’s name." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_event_coordinator_candidates", {
    p_event_id: parsed.data.eventId, p_name: parsed.data.name,
  });
  const candidates = z.array(coordinatorCandidateSchema).safeParse(data);
  if (error || !candidates.success) return { matches: [], message: "Faculty search could not be completed. Try again." };
  return { matches: candidates.data, message: candidates.data.length ? "" : "No available faculty members match that name." };
}

export async function assignCoordinator(eventId: string, _previous: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const parsed = z.object({ eventId: z.uuid(), facultyId: z.uuid(), responsibilities: z.string().trim().min(1).max(1000), dueDate: z.iso.date().nullable() })
    .safeParse({ eventId, facultyId: formData.get("facultyId"), responsibilities: formData.get("responsibilities"), dueDate: formData.get("dueDate") || null });
  if (!parsed.success) return { success: false, message: "Select a faculty member and enter their responsibilities and an optional due date." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_event_coordinator", {
    p_event_id: parsed.data.eventId, p_faculty_id: parsed.data.facultyId,
    p_responsibilities: parsed.data.responsibilities, p_due_date: parsed.data.dueDate,
  });
  if (error) return { success: false, message: "Could not assign this faculty member. Check that your event is approved and try again." };
  if (!data) return { success: false, message: "This faculty member is already assigned to the event." };
  refreshAssignmentPages();
  return { success: true, message: "Co-coordinator assigned." };
}

export async function removeCoordinator(assignmentId: string): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  if (!z.uuid().safeParse(assignmentId).success) return { success: false, message: "Invalid assignment." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_event_coordinator", { p_assignment_id: assignmentId });
  if (error || !data) return { success: false, message: "Could not remove this assignment. Refresh and try again." };
  refreshAssignmentPages();
  return { success: true, message: "Assignment removed." };
}

export async function saveCoordinatorProgress(assignmentId: string, _previous: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const parsed = z.object({ assignmentId: z.uuid(), progress: z.enum(coordinatorProgress) })
    .safeParse({ assignmentId, progress: formData.get("progress") });
  if (!parsed.success) return { success: false, message: "Choose a valid progress status." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_coordinator_progress", { p_assignment_id: parsed.data.assignmentId, p_progress: parsed.data.progress });
  if (error || !data) return { success: false, message: "This assignment could not be updated. Refresh and try again." };
  refreshAssignmentPages();
  return { success: true, message: "Progress saved." };
}
