import Link from "next/link";
import { ArrowUpRight, CalendarDays, IdCard, Mail } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { universityName } from "@/lib/university";
import AppLayout from "../components/AppLayout";
import { getStatusLabel, getStatusStyle } from "../events/event-status";
import { facultyRequests, type FacultyRequest } from "../events/queries";
import { getFacultyInitials } from "./profile-fields";
import FacultyProfileForm from "./profile-form";

export default async function FacultyProfilePage() {
  const profile = await requireRole(["FACULTY"]);
  const supabase = await createClient();
  const [account, details, recent] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("faculty_profile_details").select("employee_id, designation, department, phone, office_room").eq("profile_id", profile.id).maybeSingle(),
    facultyRequests(supabase, profile.id).order("created_at", { ascending: false }).order("id").limit(3)
      .overrideTypes<FacultyRequest[], { merge: false }>(),
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
      <div className="mx-auto max-w-6xl space-y-6 py-3 md:py-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Profile</h1>
          <p className="mt-2 text-sm text-slate-600">View your account and update your contact and office details.</p>
        </header>

        <div className="flex min-w-0 flex-wrap items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_15px_rgba(15,23,42,0.03)] sm:gap-5 sm:p-7">
          <div aria-hidden="true" className="flex size-15 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2F6] text-2xl font-bold text-[#1E2B58] sm:size-18">
            {getFacultyInitials(profile.full_name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="min-w-0 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{profile.full_name}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#1E2B58]">Faculty</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{universityName}</p>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <FacultyProfileForm values={values} canEdit={!needsMigration} />

          <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-1">
            <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_15px_rgba(15,23,42,0.03)] sm:p-7">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Account details</h2>
              <dl className="mt-4 divide-y divide-slate-100">
                <div className="flex min-w-0 items-start gap-3 pb-4">
                  <Mail size={17} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-slate-600">Sign-in email</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{account.data.user.email ?? "No email on file"}</dd>
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-3 pt-4">
                  <IdCard size={17} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-slate-600">Employee ID</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{details.data?.employee_id || "Not assigned"}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_15px_rgba(15,23,42,0.03)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent requests</h2>
                <Link href="/faculty/events" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E2B58] hover:underline">My Events <ArrowUpRight size={14} aria-hidden="true" /></Link>
              </div>
              {recent.error ? (
                <p className="mt-4 text-sm text-slate-600">Unable to load recent requests. Open My Events to try again.</p>
              ) : recent.data.length ? (
                <ul className="mt-2 divide-y divide-slate-100">
                  {recent.data.map((request) => {
                    const status = request.event?.status ?? request.status;
                    return (
                      <li key={request.id}>
                        <Link href={`/faculty/events/${request.id}`} className="flex min-w-0 items-start gap-3 rounded-lg py-3 no-underline hover:bg-brand-selected hover:no-underline focus:no-underline active:no-underline">
                          <CalendarDays size={17} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-slate-900">{request.title}</p>
                            <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusStyle(status)}`}>{getStatusLabel(status)}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="mt-4 text-sm text-slate-600">No event requests yet.</p>}
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
