import "server-only";

import { parseSignature, type SavedSignature } from "@/lib/profile-signature";
import type { WorkplaceDetails } from "@/lib/profile-preferences";
import type { createClient } from "@/lib/supabase/server";

type PreferencesRow = { campus: string | null; office_hours: string | null; bio: string | null; signature: unknown; signature_revision: string | null };

export async function getProfilePreferences(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) {
  const { data, error } = await supabase.from("profile_preferences")
    .select("campus,office_hours,bio,signature,signature_revision").eq("profile_id", profileId).maybeSingle<PreferencesRow>();
  const values: WorkplaceDetails = { campus: data?.campus ?? "", office_hours: data?.office_hours ?? "", bio: data?.bio ?? "" };
  const mark = parseSignature(data?.signature);
  const signature: SavedSignature | null = mark && data?.signature_revision ? { ...mark, revision: data.signature_revision } : null;
  return { values, signature, available: !error, missingMigration: error?.code === "PGRST205" || error?.code === "42P01" };
}
