import AppLayout from "../components/AppLayout";
import DashboardClient from "./dashboard-client";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export default async function FacultyDashboardPage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();

  const [proposalsResult, eventsResult] = await Promise.all([
    supabase
      .from("event_proposals")
      .select("id, title, venue, start_date, end_date, status, estimated_budget, created_at")
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, title, venue, start_date, end_date, status")
      .eq("created_by", profile.id)
      .order("start_date", { ascending: true }),
  ]);

  if (proposalsResult.error || eventsResult.error) {
    throw new Error("Unable to load your faculty dashboard.");
  }

  return (
    <AppLayout>
      <DashboardClient
        profile={{ fullName: profile.full_name }}
        proposals={proposalsResult.data ?? []}
        events={eventsResult.data ?? []}
      />
    </AppLayout>
  );
}
