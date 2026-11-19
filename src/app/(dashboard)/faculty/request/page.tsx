import { requireRole } from "@/lib/auth/guard";
import AppLayout from "../components/AppLayout";
import RequestForm from "./request-form";

export default async function NewRequestPage() {
  const profile = await requireRole(["FACULTY"]);
  return (
    <AppLayout>
      <RequestForm profile={{ id: profile.id, fullName: profile.full_name }} />
    </AppLayout>
  );
}
