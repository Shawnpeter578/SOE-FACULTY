import CommitteeDetail from "../../../committees/committee-detail";

export default async function CoFacultyCommitteePage({ params, searchParams }: PageProps<"/faculty/co-faculty/committees/[committeeId]">) {
  const [{ committeeId }, { page }] = await Promise.all([params, searchParams]);
  return <CommitteeDetail committeeId={committeeId} page={page} />;
}
