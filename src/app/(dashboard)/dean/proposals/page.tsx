import EventRequestsList, { type EventListRequest } from "@/components/event-requests-list";
import { createClient } from "@/lib/supabase/server";
import { getDeanAccount } from "../account";

type DeanRequestRow = Omit<EventListRequest, "submittedBy"> & { created_by: string };

export default async function DeanProposalsPage({ searchParams }: PageProps<"/dean/proposals">) {
  await getDeanAccount();
  const supabase = await createClient();
  const filters = await searchParams;
  const rows: DeanRequestRow[] = [];
  const batchSize = 250;
  let lastId: string | undefined;

  while (true) {
    const query = supabase.from("event_proposals")
      .select("id,title,venue,start_date,end_date,status,review_note,created_at,created_by,estimated_budget,event:events(status)")
      .neq("status", "DRAFT")
      .order("id")
      .limit(batchSize);
    const { data, error } = await (lastId ? query.gt("id", lastId) : query)
      .overrideTypes<DeanRequestRow[], { merge: false }>();

    if (error) throw new Error("Unable to load event requests.");
    rows.push(...data);
    if (data.length < batchSize) break;
    lastId = data[data.length - 1].id;
  }

  const authorIds = [...new Set(rows.map((row) => row.created_by))];
  const names = new Map<string, string>();
  for (let index = 0; index < authorIds.length; index += batchSize) {
    const { data, error } = await supabase.from("profiles").select("id,full_name").in("id", authorIds.slice(index, index + batchSize));
    if (error) throw new Error("Unable to load the faculty names for these requests.");
    for (const profile of data) names.set(profile.id, profile.full_name);
  }
  const requests = rows.map((row) => ({ ...row, submittedBy: names.get(row.created_by) ?? "Faculty member" }));

  return <EventRequestsList requests={requests} searchParams={filters} workspace="dean" />;
}
