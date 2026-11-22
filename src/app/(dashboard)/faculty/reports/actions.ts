"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guard";
import { reportLoadMessage } from "@/lib/event-reports";
import { createClient } from "@/lib/supabase/server";

export async function sendEventReport(eventId: string, revision: string) {
  await requireRole(["FACULTY"]);
  if (!z.uuid().safeParse(eventId).success || !/^[a-f0-9]{32}$/.test(revision)) {
    return { success: false, message: "Open the event folder again to review its reports." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_event_report", { p_event_id: eventId, p_expected_revision: revision });
  if (error || !data) {
    const message = error?.code === "22023" || error?.code === "40001" || error?.code === "23503"
      ? "The report files changed. Refresh to review the current package before sending."
      : error?.code === "42501" ? "Only the event lead can send reports."
      : reportLoadMessage(error?.code ?? "");
    return { success: false, message };
  }
  revalidatePath("/faculty/reports");
  revalidatePath("/dean/reports");
  revalidatePath("/dean/reports/[id]", "page");
  return { success: true, message: "Reports sent to the Dean." };
}
