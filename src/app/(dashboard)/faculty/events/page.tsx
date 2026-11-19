import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import AppLayout from "../components/AppLayout";
import EventsList from "./events-list";
import { loadFacultyRequests } from "./queries";

export default async function FacultyEventsPage({ searchParams }: PageProps<"/faculty/events">) {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const [requests, filters] = await Promise.all([loadFacultyRequests(supabase, profile.id), searchParams]);

  return (
    <AppLayout facultyName={profile.full_name}>
      <EventsList requests={requests} searchParams={filters} />
    </AppLayout>
  );
}
