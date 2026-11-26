import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
if (!dryRun) required.push("EVENTDESK_APP_URL", "RESEND_API_KEY", "EVENTDESK_REMINDER_FROM");
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`Missing environment variable: ${name}`);
}

const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const appUrl = dryRun ? null : new URL(process.env.EVENTDESK_APP_URL);
if (appUrl && (appUrl.protocol !== "https:" || appUrl.username || appUrl.password)) {
  throw new Error("EVENTDESK_APP_URL must be the HTTPS address of EventDesk.");
}

const { data: reminders, error } = await database.rpc("due_committee_upload_reminders").limit(100);
if (error) throw new Error(`Could not find pending reminders (${error.code}).`);

console.log(`${reminders.length} committee upload reminders due in this batch.`);
if (!dryRun) {
  for (const reminder of reminders) {
    try {
      await sendReminder(reminder);
    } catch (error) {
      console.error("Committee reminder failed:", error.message);
      process.exitCode = 1;
    }
    await delay(550);
  }
}

async function sendReminder(reminder) {
  const { committee_id, coordinator_id } = reminder;
  const { data: current, error: lookupError } = await database.rpc("due_committee_upload_reminders")
    .eq("committee_id", committee_id).eq("coordinator_id", coordinator_id).maybeSingle();
  if (lookupError) throw new Error(`Could not recheck reminder eligibility (${lookupError.code}).`);
  if (!current) return;

  const { email, coordinator_name, event_title, committee_name, end_date } = current;
  const link = new URL(`/committee-reminders/${committee_id}`, appUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `committee-upload/${committee_id}/${coordinator_id}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      from: process.env.EVENTDESK_REMINDER_FROM,
      to: [email],
      subject: "EventDesk reminder to upload your committee file",
      text: `Hi ${coordinator_name},\n\nThree days have passed since ${event_title} ended on ${end_date}. Your file for the ${committee_name} committee is still pending. Please upload it in EventDesk so your event lead can access it.\n\nOpen your committee: ${link}\n\nSign in with your faculty account if prompted.\n\nEventDesk`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);

  const { error } = await database.from("committee_upload_reminders")
    .upsert({ committee_id, coordinator_id }, { onConflict: "committee_id,coordinator_id", ignoreDuplicates: true });
  if (error) throw new Error(`Could not record reminder delivery (${error.code}).`);
}
