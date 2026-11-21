import { redirect } from "next/navigation";

export default async function EventReviewRedirect({ params }: PageProps<"/dean/proposals/[id]/letter">) {
  const { id } = await params;
  redirect(`/dean/proposals/${id}`);
}
