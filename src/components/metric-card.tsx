import type { ElementType } from "react";

type MetricCardProps = {
  title: string;
  count: string | number;
  icon: ElementType;
  onSelect?: () => void;
  selected?: boolean;
};

export default function MetricCard({ title, count, icon: Icon, onSelect, selected = false }: MetricCardProps) {
  const className = `flex min-w-0 flex-col justify-between gap-3 rounded-2xl border p-3.5 text-left sm:p-4 ${selected ? "border-brand-primary/25 bg-brand-selected" : "border-brand-border bg-brand-surface"}`;
  const content = (
    <>
      <span className="flex w-full items-start justify-between gap-2">
        <span className={`min-w-0 text-sm font-semibold leading-snug ${selected ? "text-brand-primary" : "text-text-secondary"}`}>{title}</span>
        <Icon size={18} className="shrink-0 text-brand-primary" aria-hidden="true" />
      </span>
      <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-brand-primary">{count}</span>
    </>
  );

  if (!onSelect) return <div className={className}>{content}</div>;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${className} transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${selected ? "" : "hover:border-brand-primary/25 hover:bg-brand-canvas"}`}
    >
      {content}
    </button>
  );
}
