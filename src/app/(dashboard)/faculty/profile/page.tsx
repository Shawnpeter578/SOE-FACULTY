import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { SignatureSettings, WorkplaceSettings } from "@/components/profile-preferences";
import ProfileWorkspace from "@/components/profile-workspace";
import { requireRole } from "@/lib/auth/guard";
import { getProfilePreferences } from "@/lib/profile-preferences-server";
import { createClient } from "@/lib/supabase/server";
import { universityName } from "@/lib/university";
import AppLayout from "../components/AppLayout";
import { getStatusLabel, getStatusStyle } from "../events/event-status";
import { facultyRequests, type FacultyRequest } from "../events/queries";
import { getFacultyInitials } from "./profile-fields";
import ProfileForm from "./profile-form";

export default async function FacultyProfilePage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const [account, details, recent, preferences] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("faculty_profile_details").select("employee_id, designation, department, phone, office_room").eq("profile_id", profile.id).maybeSingle(),
    facultyRequests(supabase, profile.id).order("created_at", { ascending: false }).order("id").limit(3)
      .overrideTypes<FacultyRequest[], { merge: false }>(),
    getProfilePreferences(supabase, profile.id),
  ]);

  const needsMigration = details.error?.code === "PGRST205" || details.error?.code === "42P01";
  if (account.error || account.data.user?.id !== profile.id || (details.error && !needsMigration)) {
    throw new Error("Unable to load your faculty profile.");
  }

  const values = {
    fullName: profile.full_name,
    designation: details.data?.designation ?? "",
    department: details.data?.department ?? "",
    phone: details.data?.phone ?? "",
    officeRoom: details.data?.office_room ?? "",
  };

  return (
    <AppLayout facultyName={profile.full_name}>
      <ProfileWorkspace
        name={values.fullName}
        initials={getFacultyInitials(values.fullName)}
        role="Faculty"
        affiliation={[values.designation, values.department, preferences.values.campus].filter(Boolean).join(" · ") || universityName}
        email={account.data.user.email}
        employeeId={details.data?.employee_id}
        signatureSaved={preferences.available ? Boolean(preferences.signature) : null}
        personal={<ProfileForm values={values} canEdit={!needsMigration} />}
        workplace={<WorkplaceSettings values={preferences.values} available={preferences.available} missingMigration={preferences.missingMigration} />}
        signature={<SignatureSettings fullName={values.fullName} role="FACULTY" saved={preferences.signature} available={preferences.available} missingMigration={preferences.missingMigration} />}
        recent={
          <section className="min-w-0 rounded-card border border-brand-border bg-brand-surface px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold tracking-tight text-brand-primary">Recent requests</h2>
              <Link href="/faculty/events" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline">My Events <ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>
            {recent.error ? (
              <p className="mt-3 text-sm text-text-secondary">Unable to load recent requests. Open My Events to try again.</p>
            ) : recent.data.length ? (
              <ul className="mt-2 divide-y divide-brand-border">
                {recent.data.map((request) => {
                  const status = request.event?.status ?? request.status;
                  return (
                    <li key={request.id}>
                      <Link href={`/faculty/events/${request.id}`} className="-mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-2.5 no-underline transition-colors hover:bg-brand-selected hover:no-underline focus-visible:outline-2 focus-visible:outline-brand-primary">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{request.title}</p>
                          <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${getStatusStyle(status)}`}>{getStatusLabel(status)}</span>
                        </div>
                        <ChevronRight size={15} className="shrink-0 text-text-secondary" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-3 text-sm text-text-secondary">No event requests yet.</p>}
          </section>
        }
      />
    </AppLayout>
  );
}
