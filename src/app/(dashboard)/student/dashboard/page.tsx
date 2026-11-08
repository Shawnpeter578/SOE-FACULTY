import { CalendarDays, Megaphone, Search } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";

export default async function StudentDashboardPage() {
  const student = await requireRole(["STUDENT"]);
  const firstName = student.full_name.trim().split(/\s+/)[0] || "there";

  return (
    <main className="min-h-screen bg-[#F4F6FB] px-5 py-8 text-[#26334F] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B2D68] text-white">
            <CalendarDays size={22} />
          </span>
          <div>
            <p className="text-lg font-bold text-[#202B45]">EventDesk</p>
            <p className="text-sm text-[#7B879E]">Student workspace</p>
          </div>
        </header>

        <section className="mt-10 rounded-2xl border border-[#E5E9F0] bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-semibold text-[#52638F]">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#26324D]">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77839A]">
            Your student account is signed in. Campus event listings and updates will appear here when they are available.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-[#E8EBF1] bg-[#FBFCFE] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E9EDF7] text-[#4B5E97]">
                <Search size={19} />
              </span>
              <h2 className="mt-4 text-base font-semibold text-[#34405A]">Discover campus events</h2>
              <p className="mt-1 text-sm leading-5 text-[#8490A5]">Approved events will be listed here for students to explore.</p>
            </section>

            <section className="rounded-xl border border-[#E8EBF1] bg-[#FBFCFE] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E9EDF7] text-[#4B5E97]">
                <Megaphone size={19} />
              </span>
              <h2 className="mt-4 text-base font-semibold text-[#34405A]">Campus updates</h2>
              <p className="mt-1 text-sm leading-5 text-[#8490A5]">Event announcements and important updates will show up here.</p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
