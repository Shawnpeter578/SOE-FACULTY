"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { coordinatorProgress } from "@/lib/event-coordinators";
import { createClient } from "@/lib/supabase/server";

export type AssignmentActionState = { success: boolean; message: string };

export async function saveCoordinatorProgress(assignmentId: string, _previous: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  await requireRole(["FACULTY"]);
  const parsed = z.object({ assignmentId: z.uuid(), progress: z.enum(coordinatorProgress) })
    .safeParse({ assignmentId, progress: formData.get("progress") });
  if (!parsed.success) return { success: false, message: "Choose a valid progress status." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_coordinator_progress", { p_assignment_id: parsed.data.assignmentId, p_progress: parsed.data.progress });
  if (error || !data) return { success: false, message: "This assignment could not be updated. Refresh and try again." };
  revalidatePath("/faculty/co-faculty");
  revalidatePath("/faculty/co-faculty/assignments");
  return { success: true, message: "Progress saved." };
}
