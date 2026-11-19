"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { profileFields, type FacultyProfileFields } from "./profile-fields";

export type ProfileActionState = { success: boolean; message: string };

export async function saveFacultyProfile(_previous: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  await requireRole(["FACULTY"]);

  const values: FacultyProfileFields = { fullName: "", designation: "", department: "", phone: "", officeRoom: "" };
  for (const field of profileFields) {
    const value = formData.get(field.name) ?? "";
    if (typeof value !== "string" || value.trim().length > field.maxLength) {
      return { success: false, message: `${field.label} must be ${field.maxLength} characters or fewer.` };
    }
    values[field.name] = value.trim();
  }
  if (!values.fullName) return { success: false, message: "Enter your full name." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_faculty_profile", {
    p_full_name: values.fullName,
    p_designation: values.designation,
    p_department: values.department,
    p_phone: values.phone,
    p_office_room: values.officeRoom,
  });

  if (error) {
    console.error("Faculty profile save failed:", error.code);
    return { success: false, message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/faculty/profile");
  revalidatePath("/faculty/dashboard");
  return { success: true, message: "Profile saved." };
}
