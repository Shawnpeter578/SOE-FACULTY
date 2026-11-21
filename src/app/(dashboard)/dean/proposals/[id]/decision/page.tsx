import { redirect } from "next/navigation";

export default async function EventReviewRedirect({ params }: PageProps<"/dean/proposals/[id]/decision">) {
  const { id } = await params;
  redirect(`/dean/proposals/${id}`);
}
