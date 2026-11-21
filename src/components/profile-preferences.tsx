"use client";

import { useActionState, useEffect, useRef, useState, type PointerEvent } from "react";
import { MapPin, PenLine } from "lucide-react";
import { saveProfilePreferences, type PreferencesState } from "@/app/(dashboard)/profile-preferences-actions";
import { workplaceFields, type WorkplaceDetails } from "@/lib/profile-preferences";
import { SIGNATURE_GRID_MAX, SIGNATURE_NAME_LIMIT, signatureStrokes, type SavedSignature, type SignaturePoint, type SignatureStroke } from "@/lib/profile-signature";
import SignaturePreview, { paintSignature } from "./signature-mark";

const initial: PreferencesState = { success: false, message: "" };
const panel = "min-w-0 rounded-3xl border border-brand-border bg-brand-surface p-5 sm:p-7";
const fieldClass = "w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary disabled:bg-brand-canvas";
const primary = "min-h-10 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50";
const secondary = "min-h-10 rounded-xl px-3 text-sm font-semibold text-brand-primary hover:bg-brand-selected disabled:opacity-50";

function SaveMessage({ state }: { state: PreferencesState }) {
  return state.message ? <p role={state.success ? "status" : "alert"} className={`text-sm ${state.success ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p> : null;
}

export function WorkplaceSettings({ values }: { values: WorkplaceDetails }) {
  const [draft, setDraft] = useState<Partial<WorkplaceDetails>>({});
  const [state, submit, pending] = useActionState(async (previous: PreferencesState, data: FormData) => {
    const result = await saveProfilePreferences(previous, data);
    if (result.success) setDraft({});
    return result;
  }, initial);
  const dirty = workplaceFields.some(({ name }) => draft[name] !== undefined && draft[name] !== values[name]);
  return (
    <section className={panel}>
      <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-brand-primary"><MapPin size={19} aria-hidden="true" /> Workplace details</h2>
      <form action={submit} className="mt-4 space-y-4">
        <input type="hidden" name="action" value="save_workplace" />
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          {workplaceFields.map(({ name, label, maxLength }) => {
            const input = { name, maxLength, value: draft[name] ?? values[name], className: fieldClass };
            return (
              <label key={name} className={`block text-sm font-semibold ${name === "bio" ? "sm:col-span-2" : ""}`}>
                <span className="mb-1.5 block">{label}</span>
                {name === "bio" ? <textarea {...input} rows={3} onChange={(event) => setDraft({ ...draft, [name]: event.target.value })} />
                  : <input {...input} onChange={(event) => setDraft({ ...draft, [name]: event.target.value })} />}
              </label>
            );
          })}
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3"><SaveMessage state={state} /><button type="submit" className={`${primary} ml-auto`} disabled={pending || !dirty}>{pending ? "Saving…" : "Save workplace details"}</button></div>
      </form>
    </section>
  );
}

export function SignatureSettings({ fullName, saved, role, available, missingMigration }: {
  fullName: string; saved: SavedSignature | null; role: "FACULTY" | "DEAN"; available: boolean; missingMigration: boolean;
}) {
  const [mode, setMode] = useState(saved?.kind ?? "typed");
  const [typedName, setTypedName] = useState(saved?.kind === "typed" ? saved.value : fullName);
  const [strokes, setStrokes] = useState<SignatureStroke[]>(() => saved?.kind === "drawn" ? signatureStrokes(saved.value) : []);
  const [state, submit, pending] = useActionState(saveProfilePreferences, initial);
  const drawing = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef<{ pointer: number; points: SignatureStroke } | null>(null);
  const pointCount = strokes.reduce((count, stroke) => count + stroke.length, 0);
  const value = mode === "typed" ? typedName.trim() : strokes.map((stroke) => stroke.map((point) => point.join(",")).join(" ")).join("|");

  useEffect(() => {
    if (mode === "drawn" && drawing.current) paintSignature(drawing.current, strokes);
  }, [strokes, mode]);

  function position(event: PointerEvent<HTMLCanvasElement>): SignaturePoint {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = (value: number, size: number) => Math.max(0, Math.min(SIGNATURE_GRID_MAX, Math.round(value / size * SIGNATURE_GRID_MAX)));
    return [scale(event.clientX - bounds.left, bounds.width), scale(event.clientY - bounds.top, bounds.height)];
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (pending || activeStroke.current || event.button !== 0 || pointCount >= 1799) return;
    activeStroke.current = { pointer: event.pointerId, points: [position(event)] };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current;
    if (!stroke || stroke.pointer !== event.pointerId || pointCount + stroke.points.length >= 1800) return;
    const point = position(event);
    const [x, y] = stroke.points[stroke.points.length - 1];
    if (Math.abs(point[0] - x) + Math.abs(point[1] - y) < 3) return;
    stroke.points.push(point);
    paintSignature(event.currentTarget, [...strokes, stroke.points]);
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStroke.current;
    if (!stroke || stroke.pointer !== event.pointerId) return;
    activeStroke.current = null;
    if (stroke.points.length > 1) setStrokes((previous) => [...previous, stroke.points]);
  }

  return (
    <section className={panel} aria-labelledby="esig-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="esig-title" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-brand-primary"><PenLine size={19} aria-hidden="true" /> E-signature</h2>
        {saved && <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-emerald-800">Saved</span>}
      </div>
      {!available ? <p role="status" className="mt-3 text-sm text-text-secondary">{missingMigration ? "Workplace details and e-signatures need the latest EventDesk database update." : "Profile settings could not be loaded. Refresh to try again."}</p> : (
        <form action={submit} className="mt-3 space-y-4" aria-busy={pending}>
          <p className="text-sm text-text-secondary">{role === "DEAN" ? "You can attach your saved signature when you approve a request." : "You can use your saved signature when you sign a request letter."}</p>
          <input type="hidden" name="kind" value={mode} />
          <input type="hidden" name="signature" value={value} />
          <div role="group" aria-label="Signature method" className="grid grid-cols-2 gap-1 rounded-xl bg-brand-canvas p-1">
            {(["typed", "drawn"] as const).map((option) => <button key={option} type="button" aria-pressed={mode === option} disabled={pending} onClick={() => setMode(option)} className={`min-h-9 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-brand-selected ${mode === option ? "bg-white shadow-sm" : ""}`}>{option === "typed" ? "Type" : "Draw"}</button>)}
          </div>
          {mode === "typed" ? <>
            <label className="block text-sm font-semibold">Signature name<input className={`${fieldClass} mt-1.5`} value={typedName} maxLength={SIGNATURE_NAME_LIMIT} onChange={(event) => setTypedName(event.target.value)} disabled={pending} /></label>
            <div aria-label="Signature preview" className="rounded-xl border border-brand-border bg-brand-canvas px-4 py-3"><SignaturePreview signature={{ kind: "typed", value }} /></div>
          </> : <div>
            <p className="mb-2 text-xs text-text-secondary">Draw with a mouse, touch or stylus.</p>
            <canvas ref={drawing} width={800} height={240} aria-label="Signature drawing area" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} className="block aspect-[10/3] w-full touch-none rounded-xl border border-brand-border bg-brand-canvas" />
            <div className="mt-1 flex justify-end gap-1">
              <button type="button" disabled={pending || !strokes.length} onClick={() => setStrokes((previous) => previous.slice(0, -1))} className={secondary}>Undo stroke</button>
              <button type="button" disabled={pending || !strokes.length} onClick={() => setStrokes([])} className={secondary}>Clear</button>
            </div>
          </div>}
          <SaveMessage state={state} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button name="action" value="save_signature" type="submit" className={primary} disabled={pending || !value || (mode === saved?.kind && value === saved.value)}>{pending ? "Saving…" : "Save signature"}</button>
            {saved && <button name="action" value="remove_signature" type="submit" disabled={pending} className={secondary}>Remove saved signature</button>}
          </div>
        </form>
      )}
    </section>
  );
}
