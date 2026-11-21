import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDeanAccount } from "./account";

type RecentProposal = { id: string; title: string; status: string; updated_at: string };
type ReceivedLetter = { id: string; proposal_id: string; title: string; vc_document_uploaded_at: string };
const activityLimit = 5;

export const getDeanRecentActivity = cache(async () => {
  const dean = await getDeanAccount();
  const supabase = await createClient();
  const [proposals, letters] = await Promise.all([
    supabase.from("event_proposals").select("id,title,status,updated_at").neq("status", "DRAFT")
      .order("updated_at", { ascending: false }).order("id").limit(activityLimit)
      .overrideTypes<RecentProposal[], { merge: false }>(),
    supabase.from("events").select("id,proposal_id,title,vc_document_uploaded_at,proposal:event_proposals!inner(reviewed_by)")
      .eq("status", "OFFICIALLY_APPROVED").eq("proposal.reviewed_by", dean.id)
      .not("vc_approval_document_path", "is", null).not("vc_document_uploaded_at", "is", null)
      .order("vc_document_uploaded_at", { ascending: false }).order("id").limit(activityLimit)
      .overrideTypes<ReceivedLetter[], { merge: false }>(),
  ]);

  return [
    ...(proposals.data ?? []).map((proposal) => ({
      id: proposal.id, title: proposal.title, status: proposal.status, at: proposal.updated_at,
      href: `/dean/proposals/${proposal.id}`,
    })),
    ...(letters.data ?? []).map((letter) => ({
      id: `vc-letter:${letter.id}`, title: letter.title, status: "OFFICIALLY_APPROVED", at: letter.vc_document_uploaded_at,
      href: `/dean/proposals/${letter.proposal_id}#vc-signed-letter`,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)).slice(0, activityLimit);
});
