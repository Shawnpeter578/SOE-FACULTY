import CoFacultyWorkspace from "../workspace";

export default function CoFacultyAssignmentsPage({ searchParams }: PageProps<"/faculty/co-faculty/assignments">) {
  return <CoFacultyWorkspace searchParams={searchParams} />;
}
