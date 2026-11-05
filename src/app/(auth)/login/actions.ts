
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
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
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email, password } = validation.data;

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

  // 5. Refresh application data
  revalidatePath("/", "layout");

  // 6. Redirect after successful login
redirect("/faculty/dashboard");
}
