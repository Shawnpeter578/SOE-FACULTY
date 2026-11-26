## Backend Architecture Update — EventDesk

### Overview

We are restructuring the Next.js application to establish a scalable foundation for backend development, authentication, and role-based access control (RBAC).

The application will use:

- **Next.js 16** — Full-stack application framework.
- **TypeScript** — Application development.
- **Supabase Auth** — Authentication and session management.
- **PostgreSQL (Supabase)** — Relational database.
- **Supabase Storage** — Event media and document storage.

### 1. Application Structure

The application will use Next.js App Router route groups to separate authentication and dashboard functionality.

- `(auth)` — Authentication-related pages.
- `(dashboard)` — Authenticated application pages.
- `components/` — Shared UI and reusable components.
- `lib/supabase/` — Supabase client and session infrastructure.
- `services/` — Backend business logic.
- `types/` — Shared TypeScript definitions.
- `proxy.ts` — Authentication session refresh entry point.

### 2. Role-Based Access Control

We will implement a two-level role system.

**Global roles**

- STUDENT
- FACULTY
- DEAN
- VC
- ADMIN

These roles represent a user's institutional identity and are assigned through authorized administrative processes.

**Event-specific assignments**

Responsibilities within individual events will be managed separately.

Examples include:

- Event Coordinator
- Faculty Coordinator
- Student Lead
- Committee Head
- Committee Member

A user can hold different event-specific responsibilities across multiple events without changing their global institutional role.

### 3. Authentication and Security

Authentication will be handled through Supabase Auth.

The backend will implement:

- Secure session management.
- Protected dashboard layouts.
- Role-based authorization.
- Server-side permission checks.
- PostgreSQL Row Level Security (RLS).
- Secure handling of environment variables.

Dashboard visibility alone will not be considered an authorization mechanism. Sensitive operations must independently validate user permissions.

### 4. Development Principles

- Keep frontend components separate from backend business logic.
- Use TypeScript throughout the application.
- Validate incoming data before processing.
- Keep authentication and authorization responsibilities separate.
- Never trust client-submitted roles or permissions.
- Keep event-specific assignments separate from global user roles.
- Maintain a modular architecture as new features are introduced.

### 5. Current Development Focus

**Milestone 1: Authentication and authorization foundation**

1. Supabase integration.
2. Login and logout.
3. Session management.
4. Protected dashboard routes.
5. User profiles.
6. Global role management.
7. Event-specific permissions.

Further modules will be developed on top of this foundation.

### Committee upload reminders

Apply the Supabase migrations with `supabase db push` and deploy the updated app. In Render, create a Node **Cron Job** from the same repository. Use `npm ci` as the build command, `node scripts/send-committee-reminders.mjs` as the run command, and `0 * * * *` to check hourly. The job runs separately from the web service.

Set these environment variables on the cron job:

- `NEXT_PUBLIC_SUPABASE_URL` for the existing Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` for that project's server-only service role key.
- `EVENTDESK_APP_URL` for the deployed app's HTTPS URL.
- `RESEND_API_KEY` and `EVENTDESK_REMINDER_FROM` for your verified Resend sender.

To check eligibility without sending email or marking anything as sent, run `node scripts/send-committee-reminders.mjs --dry-run` with the two Supabase variables configured. An assigned co-faculty member becomes eligible 72 hours after the event ends in IST if they have never shared an attachment in that committee. When an older request has no end time, the job uses the end of the event's final day. The first live run can include overdue existing events.
