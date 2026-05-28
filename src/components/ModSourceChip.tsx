import type { ModSource } from "../types";

interface ModSourceChipProps {
  id: ModSource;
  label: string;
  color?: string;
}

export const ModSourceChip = ({ id, label, color = "#38f6ff" }: ModSourceChipProps) => (
  <div
    draggable
    onDragStart={(event) => event.dataTransfer.setData("text/waveforge-source", id)}
    className="flex cursor-grab items-center justify-between gap-2 rounded border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-slate-200 active:cursor-grabbing"
  >
    <span className="h-2 w-2 rounded-full shadow-[0_0_12px_currentColor]" style={{ color, background: color }} />
    <span className="truncate">{label}</span>
  </div>
);
