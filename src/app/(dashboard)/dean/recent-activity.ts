import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDeanAccount } from "./account";

type RecentProposal = { id: string; title: string; status: string; updated_at: string };

export const getDeanRecentActivity = cache(async () => {
  await getDeanAccount();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_proposals")
    .select("id,title,status,updated_at")
    .neq("status", "DRAFT")
    .order("updated_at", { ascending: false })
    .order("id")
    .limit(5)
    .overrideTypes<RecentProposal[], { merge: false }>();

  if (error) return [];
  return data.map((proposal) => ({
    id: proposal.id,
    title: proposal.title,
    status: proposal.status,
    at: proposal.updated_at,
    href: `/dean/proposals/${proposal.id}`,
  }));
});
