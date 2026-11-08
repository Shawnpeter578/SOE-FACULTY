
"use server";

import { createClient } from "@/lib/supabase/server";
import { isTemporaryDeanPreviewEnabled } from "@/lib/auth/guard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  role: z.enum(["Student", "Faculty", "Dean"]),
});

export type LoginState = {
  error: string | null;
};

export async function login(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {

  // 1. Validate incoming form data
  const validation = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email, password, role } = validation.data;

  // 2. Create a server-side Supabase client
  const supabase = await createClient();

  // 3. Authenticate the user
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 4. Handle authentication failure
  if (error) {
    return {
      error: "Invalid email or password. Please try again.",
    };
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return { error: "Unable to load your account. Please sign in again." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      error: "Your account profile is missing. Please contact your administrator.",
    };
  }

  const requestedRole = {
    Student: "STUDENT",
    Faculty: "FACULTY",
    Dean: "DEAN",
  }[role];
  const temporaryDeanPreview =
    role === "Dean" && isTemporaryDeanPreviewEnabled();

  if (!temporaryDeanPreview && profile.role !== requestedRole) {
    await supabase.auth.signOut();

    const roleName: Record<string, string> = {
      STUDENT: "Student",
      FACULTY: "Faculty",
      DEAN: "Dean",
      VC: "Vice Chancellor",
      ADMIN: "Administrator",
    };

    return {
      error: `This account is registered as ${roleName[profile.role] ?? "another role"}. Select the matching role or contact your administrator.`,
    };
  }

  // 5. Refresh application data
  revalidatePath("/", "layout");

  // Route from the role assigned to this account, never from the form selection.
  if (profile.role === "DEAN" || temporaryDeanPreview) {
    redirect("/dean/dashboard");
  }

  if (profile.role === "STUDENT") {
    redirect("/student/dashboard");
  }

  if (profile.role === "FACULTY") {
    redirect("/faculty/dashboard");
  }

  redirect("/access-denied");
}
