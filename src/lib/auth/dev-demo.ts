import "server-only";

import { cookies } from "next/headers";

export type DemoRole = "STUDENT" | "DEAN";

export type DemoProfile = {
  id: string;
  full_name: string;
  role: DemoRole;
  isDemo: true;
};

const demoCookieName = "eventdesk_demo_role";

export function isDemoLoginEnabled() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_EVENTDESK_DEMO_LOGIN !== "true"
  ) {
    return false;
  }

  const expiresAt = Date.parse(process.env.EVENTDESK_DEMO_LOGIN_UNTIL ?? "");
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export async function getDemoProfile(): Promise<DemoProfile | null> {
  if (!isDemoLoginEnabled()) return null;

  const role = (await cookies()).get(demoCookieName)?.value;
  if (role !== "STUDENT" && role !== "DEAN") return null;

  return role === "DEAN"
    ? {
        id: "00000000-0000-4000-8000-000000000002",
        full_name: "Dr. Elena Brooks (Demo)",
        role,
        isDemo: true,
      }
    : {
        id: "00000000-0000-4000-8000-000000000001",
        full_name: "Alex Student (Demo)",
        role,
        isDemo: true,
      };
}

export async function setDemoSession(role: DemoRole) {
  if (!isDemoLoginEnabled()) {
    throw new Error("Demo login is not enabled.");
  }

  const expiresAt = Date.parse(process.env.EVENTDESK_DEMO_LOGIN_UNTIL ?? "");
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000);

  (await cookies()).set(demoCookieName, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge,
  });
}

export async function clearDemoSession() {
  (await cookies()).delete(demoCookieName);
}
