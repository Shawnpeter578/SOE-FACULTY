import { requireRole } from "@/lib/auth/guard";

export default async function ViceChancellorDashboardPage() {
  const profile = await requireRole(["VC"]);
  return <main className="mx-auto max-w-5xl space-y-3 p-8"><h1 className="text-2xl font-semibold">Vice Chancellor dashboard</h1><p>Welcome, {profile.full_name}.</p></main>;
}
