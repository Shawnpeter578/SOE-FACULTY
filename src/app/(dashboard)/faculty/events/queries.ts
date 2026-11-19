import "server-only";

import type { createClient } from "@/lib/supabase/server";

export type FacultyRequest = {
  id: string;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: string;
  review_note: string | null;
  created_at: string;
  event: { status: string } | null;
};

export function facultyRequests(supabase: Awaited<ReturnType<typeof createClient>>, facultyId: string) {
  return supabase
    .from("event_proposals")
    .select("id, title, venue, start_date, end_date, status, review_note, created_at, event:events(status)")
    .eq("created_by", facultyId);
}

export async function loadFacultyRequests(supabase: Awaited<ReturnType<typeof createClient>>, facultyId: string) {
  const requests: FacultyRequest[] = [];
  const batchSize = 500;
  let lastId: string | undefined;

  do {
    const query = facultyRequests(supabase, facultyId).order("id").limit(batchSize);
    const { data, error } = await (lastId ? query.gt("id", lastId) : query)
      .overrideTypes<FacultyRequest[], { merge: false }>();

    if (error) throw new Error("Unable to load your event requests.");
    requests.push(...data);
    if (data.length < batchSize) return requests;
    lastId = data.at(-1)?.id;
  } while (lastId);

  return requests;
}
