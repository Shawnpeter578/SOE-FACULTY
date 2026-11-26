"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { workplaceFields, type WorkplaceDetails } from "@/lib/profile-preferences";
import { parseSignature } from "@/lib/profile-signature";
import { createClient } from "@/lib/supabase/server";

export type PreferencesState = { success: boolean; message: string };

export async function saveProfilePreferences(_previous: PreferencesState, formData: FormData): Promise<PreferencesState> {
  const profile = await requireRole(["FACULTY", "DEAN"]);
  const action = formData.get("action");
  let changes;
  let message;

  if (action === "save_workplace") {
    const workplace: WorkplaceDetails = { campus: "", office_hours: "", bio: "" };
    for (const field of workplaceFields) {
      const value = formData.get(field.name);
      if (typeof value !== "string" || value.trim().length > field.maxLength) {
        return { success: false, message: `${field.label} must be ${field.maxLength} characters or fewer.` };
      }
      workplace[field.name] = value.trim();
    }
    changes = workplace;
    message = "Workplace details saved.";
  } else if (action === "save_signature") {
    const signature = parseSignature({ kind: formData.get("kind"), value: formData.get("signature") });
    if (!signature) return { success: false, message: "Type your name or draw a signature before saving." };
    changes = { signature };
    message = "E-signature saved.";
  } else if (action === "remove_signature") {
    changes = { signature: null };
    message = "E-signature removed.";
  } else {
    return { success: false, message: "Choose a valid profile action." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profile_preferences").upsert({ profile_id: profile.id, ...changes });
  if (error) {
    return { success: false, message: "Could not update your profile. Try again." };
  }
  if (profile.role === "DEAN") revalidatePath("/dean", "layout");
  else {
    revalidatePath("/faculty/profile");
    revalidatePath("/faculty/co-faculty/profile");
    revalidatePath("/faculty/events/[id]/letter", "page");
  }
  return { success: true, message };
}
