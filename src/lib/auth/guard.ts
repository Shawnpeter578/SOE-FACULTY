
import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole =
  | "STUDENT"
  | "FACULTY"
  | "DEAN"
  | "VC"
  | "ADMIN";

export type UserProfile = {
  id: string;
  full_name: string;
  role: AppRole;
};

export async function requireAuthenticatedProfile(): Promise<UserProfile> {
  const supabase = await createClient();

  // Verify the user's authentication claims
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  // Retrieve the user's institutional profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error("Unable to retrieve user profile.");
  }

  // An authenticated account without a profile
  // must not receive dashboard access.
  if (!profile) {
    redirect("/access-denied");
  }

  return profile as UserProfile;
}

export async function requireRole(
  allowedRoles: AppRole[]
): Promise<UserProfile> {

  const profile = await requireAuthenticatedProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/access-denied");
  }

  return profile;
}
