import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: RouteContext<"/committee-reminders/[committeeId]">) {
  const { committeeId } = await params;
  if (!z.uuid().safeParse(committeeId).success) return new Response(null, { status: 404 });

  const path = `/faculty/co-faculty/committees/${committeeId}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const location = !error && typeof data?.claims?.sub === "string"
    ? `${path}#committee-composer`
    : `/login?next=${encodeURIComponent(path)}`;
  return new Response(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}
