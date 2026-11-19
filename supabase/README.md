# Event request setup

For an existing EventDesk database with the first four migrations applied, run
`migrations/202611190001_complete_event_requests.sql` in that project's Supabase
SQL Editor. It adds the request fields, creates private attachment storage, and
allows the dean to read the names of faculty who submit requests. The migration
is transactional and preserves existing proposals and events.

For a new database, apply all migrations in filename order. Do not rerun baseline
migrations against a database that already contains their tables and policies.

For an existing database, apply `migrations/202611190002_faculty_profiles.sql`
after the event request migration to enable saving faculty profile details.
Faculty can update their own name, designation, department, phone, and office.
The sign-in email comes from Supabase Auth. The employee ID is managed by the
university in `public.faculty_profile_details`.

Apply `migrations/202611190003_event_approval_journey.sql` to enable the letter
and Vice-Chancellor workflow for existing and new requests. Use separate
accounts with the `FACULTY`, `DEAN`, and `VC` roles assigned in `public.profiles`.

Use actual Supabase accounts with the `FACULTY` and `DEAN` roles assigned in
`public.profiles`. The role selector on the login form does not grant a role.
The CLI must be signed into an account with access to the same project as
`NEXT_PUBLIC_SUPABASE_URL` in `.env.local` before it can manage that database.

## Check the workflow

1. Sign in as faculty. The sidebar's **New Request**, dashboard's **New event
   request**, and mobile plus button all open `/faculty/request`.
2. Complete all four steps and optionally attach up to three PDF, JPG or PNG
   files, at most 5 MB each. Review displays the values you entered.
3. Select **Send to Dean**, then **Send** to confirm. After Supabase saves the
   request and attachments, the confirmation returns you to the faculty
   dashboard. Find the request under **Your events** or **My Events**.
4. Sign in with a separate dean account. The submitted request appears in the
   dashboard's new requests queue. Review opens all saved details and attachment
   downloads. The dean dashboard checks for new requests every 10 seconds while
   open and when returning to the tab.
5. Start the review before approving, rejecting, or requesting changes. Decisions
   and feedback appear in the faculty workspace. Approval creates the official
   event through the existing database trigger.
6. As faculty, open the Dean-approved request from My Events or the dashboard.
   Generate the letter, save the budget and requirements, open the printable
   letter, then confirm it was printed. The request appears in the VC dashboard.
7. As VC, open the letter and approve or decline the request. A reason is
   required to decline. Faculty and Dean can see the decision and remarks.
8. If approved by VC, the Dean uploads and locks the signed PDF on the Dean
   proposal detail page. The faculty detail page shows the final approval and
   provides a private download. Locked files cannot be replaced through the app.

**Save draft** stores text on the current device for the signed-in faculty
account. New requests start blank. Select **Load saved draft** to resume and
reattach any files. Submitted requests are stored in Supabase and remain
available across browsers and logins.

Run `npm test`, `npm run lint`, and `npm run build` for local checks. Submission
tests cover validation, authenticated ownership, field persistence, private upload
paths, attachment limits, and cleanup when an upload or database insert fails.
