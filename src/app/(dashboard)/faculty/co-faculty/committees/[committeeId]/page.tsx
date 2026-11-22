import CommitteeDetail from "../../../committees/committee-detail";

export default async function CoFacultyCommitteePage({ params, searchParams }: PageProps<"/faculty/co-faculty/committees/[committeeId]">) {
  const [{ committeeId }, { page, view }] = await Promise.all([params, searchParams]);
  return <CommitteeDetail committeeId={committeeId} page={page} filesOnly={view === "files"} />;
}
