"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import type { ProfileActionState } from "../../faculty/profile/actions";
import { profileFields, type FacultyProfileFields } from "../../faculty/profile/profile-fields";

export async function saveDeanProfile(_previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  await requireRole(["DEAN"]);
  const details: FacultyProfileFields = { fullName: "", designation: "", department: "", phone: "", officeRoom: "" };
  for (const field of profileFields) {
    const value = formData.get(field.name);
    if (typeof value !== "string" || value.trim().length > field.maxLength) {
      return { success: false, message: `${field.label} must be ${field.maxLength} characters or fewer.` };
    }
    details[field.name] = value.trim();
  }
  if (!details.fullName) return { success: false, message: "Enter your full name." };

  const supabase = await createClient();
  // These are self-edited contact details. Authorization still uses profiles.role.
  const { error } = await supabase.auth.updateUser({ data: { eventdesk_dean_contact: details } });
  if (error) {
    console.error("Dean profile save failed:", error.code);
    return { success: false, message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/dean", "layout");
  return { success: true, message: "Profile saved." };
}
