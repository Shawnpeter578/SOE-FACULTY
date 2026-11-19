"use client";

export default function PrintLetter() {
  return <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Print letter</button>;
}
