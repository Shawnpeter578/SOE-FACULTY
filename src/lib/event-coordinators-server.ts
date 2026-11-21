import "server-only";

import { z } from "zod";
import { coordinatorAssignmentSchema, type CoordinatorAssignment } from "@/lib/event-coordinators";
import type { createClient } from "@/lib/supabase/server";

export async function loadCoordinatorAssignments(supabase: Awaited<ReturnType<typeof createClient>>, eventId?: string) {
  const assignments: CoordinatorAssignment[] = [];
  const rowsSchema = z.array(coordinatorAssignmentSchema);
  const batchSize = 200;
  for (let start = 0; ; start += batchSize) {
    const { data, error } = await supabase.rpc("list_event_coordinators", { p_event_id: eventId ?? null })
      .range(start, start + batchSize - 1);
    if (error) {
      const message = error.code === "PGRST202" || error.code === "42883"
        ? "Co-Faculty assignments become available after the latest EventDesk database update."
        : "Assignments could not be loaded. Refresh to try again.";
      return { assignments: [], message };
    }
    const rows = rowsSchema.safeParse(data);
    if (!rows.success) return { assignments: [], message: "Assignments could not be loaded. Refresh to try again." };
    assignments.push(...rows.data);
    if (rows.data.length < batchSize) return { assignments, message: null };
  }
}
