import { Check } from "lucide-react";

export default function RequestLetterSteps({ active, completed }: { active: number; completed: number }) {
  return (
    <ol className="mt-4 grid grid-cols-3 gap-1 text-xs font-semibold text-text-secondary sm:text-sm" aria-label="Letter progress">
      {["Letter", "Print", "VC decision"].map((label, index) => (
        <li key={label} aria-current={index === active ? "step" : undefined} className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 sm:px-3 ${index === active ? "bg-brand-selected text-brand-primary" : ""}`}>
          <span className={`grid size-6 shrink-0 place-items-center rounded-full ${index < completed ? "bg-success-bg text-emerald-800" : index === active ? "bg-brand-primary text-white" : "border border-brand-border bg-brand-surface text-text-secondary"}`}>
            {index < completed ? <Check size={14} aria-label="Complete" /> : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
