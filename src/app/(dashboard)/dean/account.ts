import "server-only";

import { cache } from "react";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { profileFields, type FacultyProfileFields } from "../faculty/profile/profile-fields";

export const getDeanAccount = cache(async () => {
  const profile = await requireRole(["DEAN"]);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== profile.id) throw new Error("Unable to load your dean profile.");

  const saved = data.user.user_metadata?.eventdesk_dean_contact as Record<string, unknown> | undefined;
  const details: FacultyProfileFields = {
    fullName: profile.full_name,
    designation: "",
    department: "",
    phone: "",
    officeRoom: "",
  };
  for (const field of profileFields) {
    const value = saved?.[field.name];
    if (typeof value === "string" && value.trim() && value.length <= field.maxLength) {
      details[field.name] = value.trim();
    }
  }
  return { id: profile.id, email: data.user.email, details };
});
