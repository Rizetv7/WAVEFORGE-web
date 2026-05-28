import type { ReactNode } from "react";

export const Panel = ({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) => (
  <section className="glass-panel min-w-0 rounded-lg p-3">
    {(title || right) && (
      <div className="mb-3 flex items-center justify-between gap-3">
        {title ? <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">{title}</h2> : <span />}
        {right}
      </div>
    )}
    {children}
  </section>
);

export const MiniButton = ({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
      active
        ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgba(56,246,255,0.18)]"
        : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-100"
    }`}
  >
    {children}
  </button>
);

export const MiniSelect = ({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  label?: string;
}) => (
  <label className="grid gap-1">
    {label && <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 rounded border border-white/10 bg-[#0b1018] px-2 text-[11px] text-slate-100 outline-none focus:border-cyan-300/50"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);
