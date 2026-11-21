import CommitteeDetail from "../../committee-detail";

export default async function FacultyCommitteePage({ params, searchParams }: PageProps<"/faculty/committees/[eventId]/[committeeId]">) {
  const [{ eventId, committeeId }, { page }] = await Promise.all([params, searchParams]);
  return <CommitteeDetail eventId={eventId} committeeId={committeeId} page={page} />;
}
