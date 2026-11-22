import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

// Load the installed TypeScript source while replacing only framework/DB boundaries.
function loadSource(relativePath, mocks = {}) {
  const filename = path.resolve(testDirectory, "..", relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleRecord = { exports: {} };
  const nativeRequire = createRequire(filename);
  const requireSource = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/")) return loadSource(`src/${name.slice(2)}.ts`, mocks);
    return nativeRequire(name);
  };
  new Function("require", "module", "exports", compiled)(requireSource, moduleRecord, moduleRecord.exports);
  return moduleRecord.exports;
}

const { eventRequestSchema } = loadSource("src/lib/validation/event-proposal.ts");
const { validateAttachments, MAX_ATTACHMENT_BYTES } = loadSource("src/lib/validation/proposal-attachments.ts");
const { validateCommitteeAttachment, COMMITTEE_FILE_LIMIT } = loadSource("src/lib/validation/committee-attachments.ts");
const facultyId = "00000000-0000-4000-8000-000000000010";
const proposalId = "00000000-0000-4000-8000-000000000020";

test("committee uploads accept common documents even when the browser omits the MIME type", async () => {
  assert.deepEqual(await validateCommitteeAttachment(new File(["item,count\nMeals,40"], "menu.CSV")), {
    extension: "csv", contentType: "text/csv",
  });
  assert.deepEqual(await validateCommitteeAttachment(new File([Uint8Array.of(0x50, 0x4b, 0x03, 0x04)], "Slides.pptx", { type: "application/octet-stream" })), {
    extension: "pptx", contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  assert.equal(await validateCommitteeAttachment(new File(["just text"], "fake.docx")), null);
  assert.equal(await validateCommitteeAttachment(new File(["sample"], "sample.exe")), null);
  assert.equal(await validateCommitteeAttachment(new File([new Uint8Array(COMMITTEE_FILE_LIMIT + 1)], "large.txt")), null);
});

test("the approving dean gets a recent activity link for the confirmed signed letter", async () => {
  const deanId = "00000000-0000-4000-8000-000000000012";
  const filters = [];
  const eventId = "00000000-0000-4000-8000-000000000030";
  const { getDeanRecentActivity } = loadSource("src/app/(dashboard)/dean/recent-activity.ts", {
    "server-only": {},
    react: { cache: (read) => read },
    "./account": { getDeanAccount: async () => ({ id: deanId }) },
    "@/lib/supabase/server": { createClient: async () => ({
      from(table) {
        const query = {
          select: () => query, order: () => query, limit: () => query, neq: () => query,
          eq: (...args) => { filters.push([table, ...args]); return query; },
          not: (...args) => { filters.push([table, ...args]); return query; },
          overrideTypes: async () => ({ data: table === "events"
            ? [{ id: eventId, proposal_id: proposalId, title: "Workshop", vc_document_uploaded_at: "2026-11-20T10:00:00Z" }]
            : [{ id: proposalId, title: "Workshop", status: "APPROVED_BY_DEAN", updated_at: "2026-11-19T09:00:00Z" }] }),
        };
        return query;
      },
    }) },
  });
  const activity = await getDeanRecentActivity();
  assert.deepEqual(filters, [
    ["events", "status", "OFFICIALLY_APPROVED"], ["events", "proposal.reviewed_by", deanId],
    ["events", "vc_approval_document_path", "is", null], ["events", "vc_document_uploaded_at", "is", null],
  ]);
  assert.equal(activity.length, 2);
  assert.equal(activity[0].href, `/dean/proposals/${proposalId}#vc-signed-letter`);
  assert.equal(activity[0].status, "OFFICIALLY_APPROVED");
});

test("the Dean signed-letter endpoint uses a private download for the final uploaded copy", async () => {
  const filters = [];
  const path = "event/final-signed-copy.png";
  const url = "https://example.test/storage/signed-copy?token=temporary";
  let role = "DEAN";
  let data = null;
  const downloads = [];
  const query = {
    select: () => query,
    eq: (...args) => { filters.push(args); return query; },
    maybeSingle: async () => ({ data, error: null }),
  };
  const { GET } = loadSource("src/app/(dashboard)/dean/proposals/[id]/signed-letter/route.ts", {
    "@/lib/auth/guard": { requireRole: async (roles) => { if (!roles.includes(role)) throw new Error("Access denied"); } },
    "@/lib/supabase/server": { createClient: async () => ({
      from: () => query,
      storage: { from: (bucket) => ({ createSignedUrl: async (...args) => {
        downloads.push([bucket, ...args]);
        return { data: { signedUrl: url } };
      } }) },
    }) },
  });
  const request = () => GET(new Request("https://example.test"), { params: Promise.resolve({ id: proposalId }) });
  role = "FACULTY";
  await assert.rejects(request(), /Access denied/);
  role = "DEAN";
  assert.equal((await request()).status, 404);
  assert.equal(downloads.length, 0);
  data = { vc_approval_document_path: path };
  const response = await request();
  assert.deepEqual(filters.slice(-2), [["proposal_id", proposalId], ["status", "OFFICIALLY_APPROVED"]]);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), url);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(downloads, [["event-documents", path, 300, { download: "VC approval.png" }]]);
});

test("faculty notifications combine owned approval updates and load the full history", async () => {
  const notificationDirectory = "src/app/(dashboard)/faculty/notifications";
  const mapper = loadSource(`${notificationDirectory}/notification-items.ts`);
  const reviews = Array.from({ length: 205 }, (_, index) => ({
    id: `review-${index}`, proposal_id: proposalId, action: "UNDER_REVIEW", note: null,
    created_at: new Date(Date.UTC(2026, 10, 19, 8, 0, 205 - index)).toISOString(),
    proposal: { title: "Workshop", created_by: facultyId },
  }));
  const ownerFilters = [];
  let missingVcColumns = false;
  const event = { id: "event", proposal_id: proposalId, title: "Workshop", letter_printed_at: "2026-11-19T08:30:00Z", vc_decision: "APPROVED", vc_note: "Approved", vc_decided_at: "2026-11-19T09:00:00Z", vc_document_uploaded_at: "2026-11-19T10:00:00Z" };
  const supabase = {
    from(table) {
      let columns = "";
      let from = 0;
      let to = 0;
      const query = {
        select(value) { columns = value; return query; },
        eq(column, value) { ownerFilters.push([column, value]); return query; },
        order() { return query; },
        not() { return query; },
        range(start, end) { from = start; to = end; return query; },
        async overrideTypes() {
          if (table === "proposal_reviews") return { data: reviews.slice(from, to + 1), error: null };
          if (missingVcColumns && (columns.includes("vc_decision") || columns.includes("letter_printed_at"))) return { data: null, error: { code: "42703" } };
          return { data: from === 0 ? [event] : [], error: null };
        },
      };
      return query;
    },
  };
  const { GET } = loadSource(`${notificationDirectory}/route.ts`, {
    "./notification-items": mapper,
    "@/lib/auth/guard": { requireRole: async (roles) => { assert.deepEqual(roles, ["FACULTY"]); return { id: facultyId }; } },
    "@/lib/supabase/server": { createClient: async () => supabase },
  });
  const recentResponse = await GET(new Request("https://example.test/faculty/notifications"));
  assert.equal(recentResponse.headers.get("Cache-Control"), "private, no-store");
  const recent = await recentResponse.json();
  assert.equal(recent.items.length, 5);
  assert.deepEqual(recent.items.slice(0, 3).map((item) => item.id), ["document:event", "vc:event", "printed:event"]);
  assert.ok(ownerFilters.some(([field]) => field === "proposal.created_by"));
  assert.ok(ownerFilters.some(([field]) => field === "created_by"));
  assert.ok(ownerFilters.every(([, id]) => id === facultyId));

  missingVcColumns = true;
  const allResponse = await GET(new Request("https://example.test/faculty/notifications?view=all"));
  const all = await allResponse.json();
  assert.equal(all.items.length, 206);
  assert.equal(all.items[0].id, "document:event");
  assert.equal(all.items.at(-1).id, "dean:review-204");
});


function approvalForm(action, fields = {}) {
  const data = new FormData();
  data.set("action", action);
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

test("request letter signatures require consent and send the signed revision without a client-supplied name", async () => {
  const calls = [];
  const refreshed = [];
  const { updateRequestLetter } = loadSource("src/app/(dashboard)/request-letter-actions.ts", {
    "next/cache": { revalidatePath: (route) => refreshed.push(route) },
    "@/lib/auth/guard": { requireRole: async (roles) => assert.deepEqual(roles, ["FACULTY"]) },
    "@/lib/supabase/server": { createClient: async () => ({ rpc: async (...args) => { calls.push(args); return { error: null }; } }) },
  });
  const initial = { message: "", success: false };
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("sign_letter"))).success, false);
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("sign_letter", { consent: "yes", detailsAt: "invalid" }))).success, false);
  assert.equal(calls.length, 0);
  const detailsAt = "2026-11-19T11:25:00.123456+00:00";
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("sign_letter", { consent: "yes", detailsAt, name: "Another person" }))).success, true);
  assert.deepEqual(calls[0], ["update_request_letter", {
    p_proposal_id: proposalId, p_action: "sign_letter", p_expected_details_at: detailsAt,
  }]);
  assert.ok(refreshed.includes(`/faculty/events/${proposalId}/decision`));
  assert.ok(refreshed.includes(`/faculty/events/${proposalId}/letter`));

  const body = "Dear Vice-Chancellor,\n\nHere is our custom request.";
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("save_draft", { body: " \n\t", closing: "" }))).success, false);
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("sign_letter", { body, closing: "" }))).success, false);
  assert.equal(calls.length, 1);
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("save_draft", { body, closing: "", detailsAt }))).success, true);
  assert.deepEqual(calls[1], ["prepare_request_letter", {
    p_proposal_id: proposalId, p_action: "save_draft", p_body: body, p_closing: "", p_expected_details_at: detailsAt,
  }]);
  assert.equal((await updateRequestLetter(proposalId, initial, approvalForm("sign_letter", { body, closing: "Respectfully,", consent: "yes", detailsAt }))).success, true);
  assert.deepEqual(calls[2], ["prepare_request_letter", {
    p_proposal_id: proposalId, p_action: "sign_letter", p_body: body, p_closing: "Respectfully,", p_expected_details_at: detailsAt,
  }]);
});

test("approval actions validate stage input before committing changes", async () => {
  const roles = [];
  const calls = [];
  const revalidated = [];
  const { advanceApproval } = loadSource("src/app/(dashboard)/approval-actions.ts", {
    "next/cache": { revalidatePath: (route) => revalidated.push(route) },
    "@/lib/auth/guard": { requireRole: async (allowed) => roles.push(...allowed) },
    "@/lib/supabase/server": { createClient: async () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error: null }; } }) },
  });
  const initial = { message: "", success: false };
  const invalid = await advanceApproval(proposalId, initial, approvalForm("save_details", { budget: "-10", requirements: "Room" }));
  const legacyDecision = await advanceApproval(proposalId, initial, approvalForm("vc_reject", { note: "Unavailable venue" }));
  assert.equal(invalid.success, false);
  assert.equal(legacyDecision.success, false);
  assert.deepEqual(calls, []);

  const saved = await advanceApproval(proposalId, initial, approvalForm("save_details", { budget: "2400.75", requirements: "  Laptops  " }));
  assert.equal(saved.success, true);
  assert.deepEqual(roles, ["FACULTY", "FACULTY"]);
  assert.deepEqual(calls, [{ name: "advance_event_approval", args: { p_proposal_id: proposalId, p_action: "save_details", p_budget: 2400.75, p_requirements: "Laptops" } }]);
  assert.ok(revalidated.includes(`/faculty/events/${proposalId}`));
  assert.ok(revalidated.includes("/faculty/dashboard"));
});

test("a failed VC decision removes the temporary upload", async () => {
  const eventId = "00000000-0000-4000-8000-000000000030";
  const uploads = [];
  const removed = [];
  const filters = [];
  let lockPath;
  const query = { select: () => query, eq: (...args) => { filters.push(args); return query; }, maybeSingle: async () => ({ data: { id: eventId, status: "AWAITING_VC_DOCUMENT", vc_decision: "APPROVED", vc_recorded_at: null, letter_printed_at: "2026-11-21T12:00:00Z" }, error: null }) };
  const client = {
    from: () => query,
    storage: { from: () => ({ upload: async (key) => { uploads.push(key); return { error: null }; }, remove: async (keys) => removed.push(...keys) }) },
    rpc: async (name, args) => {
      assert.equal(name, "record_faculty_vc_decision");
      lockPath = args.p_document_path;
      return { error: { code: "22023" } };
    },
  };
  const { recordDecision } = loadSource("src/app/(dashboard)/faculty/events/[id]/decision/actions.ts", {
    "next/navigation": { redirect: () => assert.fail("A failed transition cannot redirect") },
    "@/lib/validation/vc-evidence": loadSource("src/lib/validation/vc-evidence.ts"),
    "next/cache": { revalidatePath: () => assert.fail("A failed transition cannot revalidate approval pages") },
    "@/lib/auth/guard": { requireRole: async (allowed) => {
      assert.deepEqual(allowed, ["FACULTY"]);
      return { id: facultyId };
    } },
    "@/lib/supabase/server": { createClient: async () => client },
  });
  const forged = new File(["not a PDF"], "approval.pdf", { type: "application/pdf" });
  assert.match(await recordDecision(proposalId, approvalForm("decision", { decision: "APPROVED", document: forged })), /valid PDF/);
  assert.deepEqual(uploads, []);

  const pdf = new File(["%PDF-1.4\n"], "approval.pdf", { type: "application/pdf" });
  assert.match(await recordDecision(proposalId, approvalForm("decision", { decision: "APPROVED", document: pdf })), /no longer available/);
  assert.deepEqual(filters, [["proposal_id", proposalId], ["created_by", facultyId]]);
  assert.equal(uploads.length, 1);
  assert.match(lockPath, new RegExp(`^${eventId}/[0-9a-f-]+\\.pdf$`));
  assert.deepEqual(removed, uploads);
});

test("locking a VC-approved event opens the confirmation and refreshes committees and the Dean’s copy", async () => {
  const eventId = "00000000-0000-4000-8000-000000000030";
  const refreshed = [];
  const uploads = [];
  const query = {
    select: () => query, eq: () => query,
    maybeSingle: async () => ({
      data: { id: eventId, status: "AWAITING_VC_DOCUMENT", vc_recorded_at: null, letter_printed_at: "2026-11-21T12:00:00Z" },
      error: null,
    }),
  };
  const { recordDecision } = loadSource("src/app/(dashboard)/faculty/events/[id]/decision/actions.ts", {
    "next/navigation": { redirect: (href) => { throw new Error(href); } },
    "next/cache": { revalidatePath: (...args) => refreshed.push(args) },
    "@/lib/auth/guard": { requireRole: async () => ({ id: facultyId }) },
    "@/lib/validation/vc-evidence": loadSource("src/lib/validation/vc-evidence.ts"),
    "@/lib/supabase/server": { createClient: async () => ({
      from: () => query,
      storage: { from: () => ({ upload: async (path) => { uploads.push(path); return { error: null }; } }) },
      rpc: async (name, args) => {
        assert.equal(name, "record_faculty_vc_decision");
        assert.equal(args.p_document_path, args.p_decision === "APPROVED" ? uploads[0] : null);
        return { error: null };
      },
    }) },
  });

  const pdf = new File(["%PDF-1.4\n"], "approval.pdf", { type: "application/pdf" });
  await assert.rejects(recordDecision(proposalId, approvalForm("decision", { decision: "APPROVED", document: pdf })),
    { message: `/faculty/events/${proposalId}/decision?confirmed=1` });
  assert.ok(refreshed.some(([path, type]) => path === "/dean" && type === "layout"));
  assert.ok(refreshed.some(([path]) => path === "/faculty/committees"));

  refreshed.length = 0;
  await assert.rejects(recordDecision(proposalId, approvalForm("decision", { decision: "REJECTED", reason: "Schedule conflict" })),
    { message: `/faculty/events/${proposalId}/decision` });
  assert.equal(refreshed.some(([path]) => path.startsWith("/faculty/committees")), false);
});

const values = {
  title: "Campus robotics workshop", event_type: "Technical",
  description: "A practical workshop on designing and programming autonomous robots.",
  objectives: "Build a working robot and demonstrate obstacle avoidance.",
  resource_person: "Robotics resource person", venue: "Main Auditorium",
  start_date: "2026-12-01", end_date: "2026-12-01", start_time: "09:00", end_time: "13:00",
  duration: "4 hours", department: "Electronics", expected_participants: "65",
  target_audience: "All Engineering", estimated_budget: "12345.67", sponsorship_expected: true,
  special_requirements: "Accessible seating, projector and power outlets.",
};

function form(overrides = {}, attachments = []) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...values, ...overrides })) data.set(key, String(value));
  for (const attachment of attachments) data.append("attachments", attachment);
  return data;
}

function harness(options = {}) {
  const saved = [], uploaded = [], removed = [], revalidated = [];
  let clients = 0;
  const client = {
    from(table) {
      assert.equal(table, "event_proposals");
      return { insert(record) {
        saved.push(record);
        return { select: () => ({ single: async () => ({ data: options.insertError ? null : { id: proposalId }, error: options.insertError ?? null }) }) };
      } };
    },
    storage: { from(bucket) {
      assert.equal(bucket, "proposal-attachments");
      return {
        async upload(objectPath, file) {
          uploaded.push({ path: objectPath, file });
          return { error: options.failUploadAt === uploaded.length ? { message: "Simulated upload failure" } : null };
        },
        async remove(paths) { removed.push(...paths); return { error: null }; },
      };
    } },
  };
  const actions = loadSource("src/app/(dashboard)/faculty/events/new/actions.ts", {
    "next/cache": { revalidatePath: (route) => revalidated.push(route) },
    "@/lib/auth/guard": { async requireRole(roles) {
      assert.deepEqual(roles, ["FACULTY"]);
      if (options.unauthorized) throw new Error("Unauthorized");
      return { id: facultyId, role: "FACULTY" };
    } },
    "@/lib/supabase/server": { async createClient() { clients++; return client; } },
  });
  return { submit: (data) => actions.submitEventProposal({ success: false, message: null }, data), saved, uploaded, removed, revalidated, get clients() { return clients; } };
}

test("valid request retains every field and converts numeric inputs", () => {
  const parsed = eventRequestSchema.parse(values);
  assert.equal(parsed.estimated_budget, 12345.67);
  assert.equal(parsed.expected_participants, 65);
  assert.deepEqual(Object.keys(parsed).sort(), Object.keys(values).sort());
});

test("reject invalid schedules, incomplete fields and invalid estimates", () => {
  for (const overrides of [
    { title: " " }, { description: "Too short" }, { objectives: "" }, { event_type: "Invalid" },
    { start_date: "2026-02-30" }, { end_date: "2026-11-30" }, { start_time: "25:00" },
    { end_time: "09:00" }, { end_time: "08:30" }, { expected_participants: "0" },
    { expected_participants: "2.5" }, { estimated_budget: "" }, { estimated_budget: "-1" },
    { estimated_budget: "Infinity" }, { estimated_budget: "10000000000" }, { estimated_budget: "1.234" },
    { department: "" }, { target_audience: "" },
  ]) assert.equal(eventRequestSchema.safeParse({ ...values, ...overrides }).success, false, JSON.stringify(overrides));
  assert.equal(eventRequestSchema.safeParse({ ...values, end_date: "2026-12-02", end_time: "08:00", estimated_budget: "0" }).success, true);
});

test("attachment limits reject unsupported, empty, oversized or excessive files", () => {
  const valid = { name: "proposal.pdf", type: "application/pdf", size: 1024 };
  assert.equal(validateAttachments([valid]), null);
  for (const files of [[{ ...valid, type: "text/html" }], [{ ...valid, size: 0 }], [{ ...valid, size: MAX_ATTACHMENT_BYTES + 1 }], Array(4).fill(valid)]) {
    assert.ok(validateAttachments(files));
  }
});

test("submission persists all inputs with authenticated ownership and refreshes both workspaces", async () => {
  const app = harness();
  const response = await app.submit(form({ created_by: "spoofed-user", status: "APPROVED_BY_DEAN" }));
  assert.equal(response.success, true);
  assert.equal(response.proposalId, proposalId);
  assert.deepEqual(app.saved[0], { ...eventRequestSchema.parse(values), created_by: facultyId, status: "SUBMITTED", attachments: [] });
  assert.deepEqual(app.revalidated, ["/faculty/events", "/faculty/dashboard", "/dean/dashboard", "/dean/proposals"]);
});

test("unauthorized and invalid submissions never upload or create records", async () => {
  const unauthorized = harness({ unauthorized: true });
  await assert.rejects(unauthorized.submit(form()), /Unauthorized/);
  assert.equal(unauthorized.clients, 0);
  const invalid = harness();
  const response = await invalid.submit(form({ end_time: "08:00" }));
  assert.equal(response.success, false);
  assert.ok(response.errors.end_time);
  assert.equal(invalid.clients, 0);
});

test("uploads real attachments into the authenticated user's private folder", async () => {
  const app = harness();
  const file = new File(["%PDF-1.7\nTest attachment"], "../proposal.pdf", { type: "application/pdf" });
  const response = await app.submit(form({}, [file]));
  assert.equal(response.success, true);
  assert.equal(app.saved[0].attachments.length, 1);
  const attachment = app.saved[0].attachments[0];
  assert.ok(attachment.path.startsWith(`${facultyId}/`));
  assert.ok(!attachment.path.includes("/../"));
  assert.equal(attachment.name, file.name);
  assert.equal(attachment.size, file.size);
  assert.equal(app.uploaded[0].file.size, file.size);
});

test("empty, forged and excessive attachments are rejected before uploads", async () => {
  for (const attachments of [
    [new File([], "empty.pdf", { type: "application/pdf" })],
    ["forged-attachment"],
    Array.from({ length: 4 }, (_, index) => new File(["%PDF"], `${index}.pdf`, { type: "application/pdf" })),
  ]) {
    const app = harness();
    assert.equal((await app.submit(form({}, attachments))).success, false);
    assert.equal(app.uploaded.length, 0);
    assert.equal(app.saved.length, 0);
  }
});

test("upload failures remove earlier files and never send a partial proposal", async () => {
  const app = harness({ failUploadAt: 2 });
  const files = ["one.pdf", "two.pdf"].map((name) => new File(["%PDF-1.7"], name, { type: "application/pdf" }));
  assert.equal((await app.submit(form({}, files))).success, false);
  assert.equal(app.saved.length, 0);
  assert.deepEqual(app.removed, [app.uploaded[0].path]);
  assert.equal(app.revalidated.length, 0);
});

test("database failures remove uploaded files and return a retryable failure", async () => {
  const app = harness({ insertError: { code: "42501" } });
  const file = new File(["%PDF-1.7"], "one.pdf", { type: "application/pdf" });
  const response = await app.submit(form({}, [file]));
  assert.equal(response.success, false);
  assert.deepEqual(app.removed, [app.uploaded[0].path]);
  assert.equal(app.revalidated.length, 0);
});

test("a missing request migration is reported as an unsent request", async () => {
  const app = harness({ insertError: { code: "PGRST204" } });
  const response = await app.submit(form());
  assert.equal(response.success, false);
  assert.match(response.message, /request was not sent.*database update is missing/i);
  assert.equal(app.revalidated.length, 0);
});

function reviewHarness(status, options = {}) {
  const updates = [], revalidated = [], filters = [];
  const actions = loadSource("src/app/(dashboard)/dean/proposals/[id]/actions.ts", {
    "next/cache": { revalidatePath: (route) => revalidated.push(route) },
    "@/lib/auth/guard": { async requireRole(roles) {
      assert.deepEqual(roles, ["DEAN"]);
      if (options.unauthorized) throw new Error("Unauthorized");
    } },
    "@/lib/supabase/server": { async createClient() { return { from(table) {
      assert.equal(table, "event_proposals");
      let updating = false;
      const query = {
        select() { return query; },
        eq(key, value) { if (updating) filters.push([key, value]); return query; },
        update(data) { updating = true; updates.push(data); return query; },
        async maybeSingle() { return { data: updating ? (options.concurrentChange ? null : { id: proposalId }) : { id: proposalId, status }, error: null }; },
      };
      return query;
    } }; } },
  });
  return { updates, revalidated, filters, async review(action, note = "") {
    const data = new FormData();
    data.set("proposalId", proposalId); data.set("action", action); data.set("note", note);
    return actions.reviewProposal({ success: false, message: null }, data);
  } };
}

test("dean can decide a submitted request directly, with a reason required for disapproval", async () => {
  const submitted = reviewHarness("SUBMITTED");
  assert.equal((await submitted.review("APPROVED_BY_DEAN")).success, true);
  assert.deepEqual(submitted.filters, [["id", proposalId], ["status", "SUBMITTED"]]);
  const disapproval = reviewHarness("SUBMITTED");
  assert.equal((await disapproval.review("REJECTED", " ")).success, false);
  assert.equal((await disapproval.review("REJECTED", "x".repeat(501))).success, false);
  assert.equal(disapproval.updates.length, 0);
  assert.equal((await disapproval.review("REJECTED", "Venue unavailable")).success, true);
  assert.deepEqual(disapproval.updates, [{status:"REJECTED", review_note:"Venue unavailable"}]);
  const reviewing = reviewHarness("UNDER_REVIEW");
  assert.equal((await reviewing.review("CHANGES_REQUESTED")).success, false);
  assert.equal((await reviewing.review("REJECTED")).success, false);
  assert.equal(reviewing.updates.length, 0);
});

test("dean decisions refresh My Events, request details and both dashboards", async () => {
  const app = reviewHarness("UNDER_REVIEW");
  assert.equal((await app.review("APPROVED_BY_DEAN")).success, true);
  assert.deepEqual(app.updates, [{ status: "APPROVED_BY_DEAN", review_note: null }]);
  assert.deepEqual(app.filters, [["id", proposalId], ["status", "UNDER_REVIEW"]]);
  for (const route of ["/faculty/events", "/faculty/dashboard", `/faculty/events/${proposalId}`, "/dean/dashboard"]) assert.ok(app.revalidated.includes(route));
});

test("a changed proposal cannot be overwritten by a stale dean decision", async () => {
  const app = reviewHarness("UNDER_REVIEW", { concurrentChange: true });
  assert.equal((await app.review("REJECTED", "Schedule conflict")).success, false);
  assert.equal(app.revalidated.length, 0);
});

test("review actions enforce the dean role on the server", async () => {
  const app = reviewHarness("SUBMITTED", { unauthorized: true });
  await assert.rejects(app.review("UNDER_REVIEW"), /Unauthorized/);
  assert.equal(app.updates.length, 0);
});
