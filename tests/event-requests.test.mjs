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
const facultyId = "00000000-0000-4000-8000-000000000010";
const proposalId = "00000000-0000-4000-8000-000000000020";
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

test("dean must start review before a final decision and explain rejection or changes", async () => {
  const submitted = reviewHarness("SUBMITTED");
  assert.equal((await submitted.review("APPROVED_BY_DEAN")).success, false);
  assert.equal(submitted.updates.length, 0);
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
