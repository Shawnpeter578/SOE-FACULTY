"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { Keyboard, PenLine, RotateCcw } from "lucide-react";
import { saveProfilePreferences, type PreferencesState } from "@/app/(dashboard)/profile-preferences-actions";
import { workplaceFields, type WorkplaceDetails } from "@/lib/profile-preferences";
import { SIGNATURE_GRID_MAX, SIGNATURE_NAME_LIMIT, signatureStrokes, type SavedSignature, type SignatureMark, type SignaturePoint, type SignatureStroke } from "@/lib/profile-signature";
import { ProfileFormFooter, ProfileFormMessage, profileInputClass, profilePrimaryButtonClass, profileSecondaryButtonClass } from "./profile-form-controls";
import SignaturePreview, { paintSignature } from "./signature-mark";

const initial: PreferencesState = { success: false, message: "" };
const sectionHeading = "text-lg font-bold tracking-tight text-brand-primary";
const fieldLabel = "block min-w-0 text-sm font-semibold text-text-primary";

function PreferencesUnavailable({ missingMigration }: { missingMigration: boolean }) {
  return (
    <p role="status" className="mt-3 rounded-lg border border-brand-border bg-brand-canvas px-3 py-2.5 text-sm text-text-secondary">
      {missingMigration ? "Workplace details and e-signatures need the latest EventDesk database update." : "Profile settings could not be loaded. Refresh to try again."}
    </p>
  );
}

export function WorkplaceSettings({ values, available, missingMigration }: { values: WorkplaceDetails; available: boolean; missingMigration: boolean }) {
  const [draft, setDraft] = useState<Partial<WorkplaceDetails>>({});
  const [state, submit, pending] = useActionState(async (previous: PreferencesState, data: FormData) => {
    const result = await saveProfilePreferences(previous, data);
    if (result.success) setDraft({});
    return result;
  }, initial);
  const dirty = workplaceFields.some(({ name }) => draft[name] !== undefined && draft[name] !== values[name]);
  return (
    <section>
      <h3 className={sectionHeading}>Workplace details</h3>
      {!available ? <PreferencesUnavailable missingMigration={missingMigration} /> : <form action={submit} className="mt-4" aria-busy={pending}>
        <input type="hidden" name="action" value="save_workplace" />
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          {workplaceFields.map(({ name, label, maxLength }) => {
            const input = { name, maxLength, value: draft[name] ?? values[name], className: profileInputClass };
            const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, [name]: value }));
            };
            return (
              <label key={name} className={`${fieldLabel} ${name === "bio" ? "sm:col-span-2" : ""}`}>
                <span className="mb-1.5 block">{label}</span>
                {name === "bio" ? <textarea {...input} rows={4} onChange={onChange} className={`${profileInputClass} resize-y`} />
                  : <input {...input} onChange={onChange} />}
              </label>
            );
          })}
        </fieldset>
        <ProfileFormFooter state={state} dirty={dirty} pending={pending} onDiscard={() => setDraft({})} saveLabel="Save workplace details" />
      </form>}
    </section>
  );
}

export function SignatureSettings({ fullName, saved, role, available, missingMigration }: {
  fullName: string; saved: SavedSignature | null; role: "FACULTY" | "DEAN"; available: boolean; missingMigration: boolean;
}) {
  const [modeChoice, setModeChoice] = useState<SignatureMark["kind"] | null>(null);
  const [typedDraft, setTypedDraft] = useState<string | null>(null);
  const [drawnDraft, setDrawnDraft] = useState<SignatureStroke[] | null>(null);
  const drawing = useRef<HTMLCanvasElement>(null);
  const removalDialog = useRef<HTMLDialogElement>(null);
  const activeStroke = useRef<{ pointer: number; points: SignatureStroke } | null>(null);
  const mode = modeChoice ?? saved?.kind ?? "typed";
  const typedName = typedDraft ?? (saved?.kind === "typed" ? saved.value : fullName);
  const savedDrawing = saved?.kind === "drawn" ? saved.value : null;
  const savedStrokes = useMemo(() => savedDrawing ? signatureStrokes(savedDrawing) : [], [savedDrawing]);
  const strokes = drawnDraft ?? savedStrokes;
  const [state, submit, pending] = useActionState(async (previous: PreferencesState, data: FormData) => {
    const result = await saveProfilePreferences(previous, data);
    if (result.success) {
      setModeChoice(null);
      setTypedDraft(null);
      setDrawnDraft(null);
      removalDialog.current?.close();
    }
    return result;
  }, initial);
  const pointCount = strokes.reduce((count, stroke) => count + stroke.length, 0);
  const value = mode === "typed" ? typedName.trim() : strokes.map((stroke) => stroke.map((point) => point.join(",")).join(" ")).join("|");
  const matchesSaved = mode === saved?.kind && value === saved.value;

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
    if (stroke.points.length > 1) setDrawnDraft((previous) => [...(previous ?? savedStrokes), stroke.points]);
  }

  return (
    <section aria-labelledby="esig-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="esig-title" className={sectionHeading}>E-signature</h3>
        {saved && <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${matchesSaved ? "bg-success-bg text-emerald-800" : "bg-warning-bg text-amber-900"}`}>{matchesSaved ? "Saved" : "Unsaved changes"}</span>}
      </div>
      {!available ? <PreferencesUnavailable missingMigration={missingMigration} /> : (
        <>
          <p className="mt-1.5 text-sm text-text-secondary">{role === "DEAN" ? "Attach your saved signature when you approve a request." : "Use your saved signature when you sign a request letter."}</p>
          <form action={submit} className="mt-4 space-y-4" aria-busy={pending}>
            <input type="hidden" name="action" value="save_signature" />
            <input type="hidden" name="kind" value={mode} />
            <input type="hidden" name="signature" value={value} />
            <div role="group" aria-label="Signature method" className="inline-flex gap-1 rounded-lg border border-brand-border bg-brand-canvas p-1">
              {([
                { kind: "typed", label: "Type", icon: Keyboard },
                { kind: "drawn", label: "Draw", icon: PenLine },
              ] as const).map(({ kind, label, icon: Icon }) => (
                <button key={kind} type="button" aria-pressed={mode === kind} disabled={pending} onClick={() => setModeChoice(kind)} className={`inline-flex min-h-9 min-w-21 items-center justify-center gap-2 rounded-md px-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary ${mode === kind ? "bg-brand-primary text-white" : "text-brand-primary hover:bg-brand-selected"}`}>
                  <Icon size={15} aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            {mode === "typed" ? <>
              <label className={fieldLabel}>Signature name<input className={`${profileInputClass} mt-1.5`} value={typedName} maxLength={SIGNATURE_NAME_LIMIT} onChange={(event) => setTypedDraft(event.target.value)} disabled={pending} /></label>
              <figure className="rounded-lg border border-brand-border bg-brand-canvas px-4 py-3.5 sm:px-5">
                <figcaption className="text-xs font-semibold text-text-secondary">Signature preview</figcaption>
                <div className="mt-2 flex min-h-16 items-center border-b border-dashed border-brand-border">
                  {value ? <SignaturePreview signature={{ kind: "typed", value }} className="text-3xl! [overflow-wrap:anywhere]" /> : <p className="text-sm text-text-secondary">Enter a name to preview it here.</p>}
                </div>
              </figure>
            </> : <div className="max-w-xl">
              <p className="mb-2 text-sm text-text-secondary">Draw with a mouse, touch or stylus.</p>
              <div className="relative rounded-lg border border-brand-border bg-brand-canvas">
                <span className="pointer-events-none absolute inset-x-4 bottom-[27%] border-b border-dashed border-brand-border" aria-hidden="true" />
                <canvas ref={drawing} width={800} height={240} aria-label="Signature drawing area" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} className="relative block aspect-[10/3] w-full cursor-crosshair touch-none" />
              </div>
              <div className="mt-1 flex justify-end gap-1">
                <button type="button" disabled={pending || !strokes.length} onClick={() => setDrawnDraft(strokes.slice(0, -1))} className={`${profileSecondaryButtonClass} gap-1.5`}><RotateCcw size={14} aria-hidden="true" />Undo stroke</button>
                <button type="button" disabled={pending || !strokes.length} onClick={() => setDrawnDraft([])} className={profileSecondaryButtonClass}>Clear</button>
              </div>
            </div>}
            <ProfileFormMessage state={state} />
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-brand-border pt-4">
              {saved && <button type="button" disabled={pending} onClick={() => removalDialog.current?.showModal()} className={`${profileSecondaryButtonClass} mr-auto text-red-700`}>Remove signature</button>}
              <button type="submit" className={profilePrimaryButtonClass} disabled={pending || !value || matchesSaved}>{pending ? "Saving…" : "Save signature"}</button>
            </div>
          </form>
          <dialog
            ref={removalDialog}
            aria-labelledby="remove-esig-title"
            onCancel={(event) => { if (pending) event.preventDefault(); }}
            className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-dialog border border-brand-border bg-brand-surface p-5 text-text-primary shadow-xl backdrop:bg-brand-hover/35 sm:p-6"
          >
            <h4 id="remove-esig-title" className={sectionHeading}>Remove saved e-signature?</h4>
            <p className="mt-2 text-sm text-text-secondary">Previously signed records keep the signature already applied. You can set up a new one here anytime.</p>
            <form action={submit} className="mt-5 space-y-3">
              <input type="hidden" name="action" value="remove_signature" />
              {!state.success && <ProfileFormMessage state={state} />}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" autoFocus disabled={pending} className={profileSecondaryButtonClass} onClick={() => removalDialog.current?.close()}>Cancel</button>
                <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:opacity-50">Remove signature</button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </section>
  );
}
