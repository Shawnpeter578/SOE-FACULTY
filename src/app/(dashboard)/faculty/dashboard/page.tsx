
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const { data: proposals, error: proposalError } = await supabase
    .from("event_proposals")
    .select(`
      id,
      title,
      venue,
      start_date,
      end_date,
      status,
      estimated_budget,
      created_at
    `)
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  if (proposalError) {
    console.error("Faculty dashboard query failed:", proposalError.code);
    throw new Error("Unable to load dashboard data.");
  }

  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id, title, venue, start_date, end_date, status")
    .order("start_date", { ascending: true });

  if (eventError) {
    console.error("Faculty events query failed:", eventError.code);
    throw new Error("Unable to load events.");
  }

  return (
    <DashboardClient
      profile={{
        fullName: profile.full_name,
      }}
      proposals={proposals ?? []}
      events={events ?? []}
    />
  );
}
