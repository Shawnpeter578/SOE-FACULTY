import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDeanAccount } from "../account";
import { getDeanRecentActivity } from "../recent-activity";
import DeanDashboard, { type DashboardItem } from "./dashboard-client";

export default async function DeanDashboardPage({ searchParams }: PageProps<"/dean/dashboard">) {
  const dean = await getDeanAccount();
  if ((await searchParams).panel === "reports") redirect("/dean/reports");
  const supabase = await createClient();

  const [proposalResult, eventResult, activities] = await Promise.all([
    supabase
      .from("event_proposals")
      .select("id, title, venue, start_date, end_date, status, created_at, updated_at, created_by, reviewed_by, review_note")
      .order("updated_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, proposal_id, title, venue, start_date, end_date, status, created_at, created_by")
      .order("start_date", { ascending: true }),
    getDeanRecentActivity(),
  ]);

  if (proposalResult.error || eventResult.error) {
    throw new Error("Unable to load the dean dashboard.");
  }

  const proposals = proposalResult.data ?? [];
  const events = eventResult.data ?? [];
  const profileIds = [...new Set([
    ...proposals.map((proposal) => proposal.created_by),
    ...events.map((event) => event.created_by),
  ])];

  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error("Unable to load dashboard profiles.");
  }

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const proposalRows: DashboardItem[] = proposals.map((proposal) => ({
    id: proposal.id,
    title: proposal.title,
    venue: proposal.venue,
    startDate: proposal.start_date,
    status: proposal.status,
    kind: "proposal",
    href: `/dean/proposals/${proposal.id}`,
    person: names.get(proposal.created_by) ?? "Faculty member",
    updatedAt: proposal.updated_at,
    reviewNote: proposal.review_note,
  }));
  const eventRows: DashboardItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    venue: event.venue,
    startDate: event.start_date,
    status: event.status,
    kind: "event",
    href: `/dean/proposals/${event.proposal_id}`,
    person: names.get(event.created_by) ?? "Faculty member",
    updatedAt: event.created_at,
    reviewNote: null,
  }));

  return (
    <DeanDashboard
      deanId={dean.id}
      deanName={dean.details.fullName}
      proposals={proposalRows}
      events={eventRows}
      activities={activities}
    />
  );
}
