import { useMemo, useRef, useState } from "react";
import type { ModAssignment, ModSource } from "../types";
import { clamp } from "../utils/object";
import { useSynth } from "../state/SynthContext";

const sourceColor: Record<string, string> = {
  lfo1: "#38f6ff",
  lfo2: "#5e83ff",
  lfo3: "#a36bff",
  lfo4: "#65ffb0",
  env1: "#ffad55",
  env2: "#ff6f91",
  env3: "#f9f871",
  env4: "#b8f7d4",
  macro1: "#38f6ff",
  macro2: "#5e83ff",
  macro3: "#a36bff",
  macro4: "#ffad55",
  velocity: "#65ffb0",
  modWheel: "#ffad55",
  aftertouch: "#ff6f91",
  noteTracking: "#b8f7d4",
};

interface KnobProps {
  label: string;
  path: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
  bipolar?: boolean;
  display?: (value: number) => string;
}

const modGradient = (assignments: ModAssignment[]) => {
  if (!assignments.length) return "conic-gradient(#293449 0deg, #10151f 0deg)";
  let cursor = 0;
  const slices = assignments.map((assignment) => {
    const span = Math.max(18, Math.abs(assignment.amount) * 150);
    const color = sourceColor[assignment.source] ?? "#38f6ff";
    const segment = `${color} ${cursor}deg ${cursor + span}deg`;
    cursor += span + 8;
    return segment;
  });
  return `conic-gradient(${slices.join(", ")}, #263143 ${cursor}deg 360deg)`;
};

export const Knob = ({
  label,
  path,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  unit = "",
  size = "md",
  bipolar = false,
  display,
}: KnobProps) => {
  const { state, setParam, dispatch } = useSynth();
  const [dragging, setDragging] = useState(false);
  const start = useRef({ y: 0, value: 0 });
  const assignments = state.modMatrix.filter((mod) => mod.destination === path);
  const pct = clamp((value - min) / (max - min));
  const angle = -135 + pct * 270;
  const px = size === "lg" ? 74 : size === "sm" ? 48 : 60;

  const shown = useMemo(() => {
    if (display) return display(value);
    const precision = step < 0.01 ? 2 : step < 1 ? 2 : 0;
    return `${value.toFixed(precision)}${unit}`;
  }, [display, step, unit, value]);

  const update = (next: number) => {
    const snapped = Math.round(next / step) * step;
    setParam(path, clamp(snapped, min, max));
  };

  return (
    <div
      className="group flex min-w-0 flex-col items-center gap-1"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const source = event.dataTransfer.getData("text/waveforge-source") as ModSource;
        if (!source) return;
        dispatch({
          type: "ADD_MOD",
          assignment: {
            source,
            destination: path,
            amount: bipolar ? 0.18 : 0.24,
            curve: "Linear",
            polarity: bipolar ? "Bipolar" : "Unipolar",
          },
        });
      }}
    >
      <button
        type="button"
        className="knob-ring relative grid place-items-center rounded-full border border-white/10 bg-[#0a0e15] shadow-[inset_0_2px_10px_rgba(255,255,255,0.07),0_8px_20px_rgba(0,0,0,0.4)] outline-none transition hover:border-cyan-200/40"
        style={{ width: px, height: px }}
        onPointerDown={(event) => {
          (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
          setDragging(true);
          start.current = { y: event.clientY, value };
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          const delta = (start.current.y - event.clientY) / 140;
          update(start.current.value + delta * (max - min));
        }}
        onPointerUp={(event) => {
          (event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId);
          setDragging(false);
        }}
        onWheel={(event) => {
          event.preventDefault();
          update(value + (event.deltaY > 0 ? -step : step) * (event.shiftKey ? 10 : 1));
        }}
        aria-label={label}
      >
        <span
          className="absolute inset-[-5px] rounded-full opacity-90"
          style={{
            background: modGradient(assignments),
            WebkitMask: "radial-gradient(circle, transparent 55%, #000 57%)",
            mask: "radial-gradient(circle, transparent 55%, #000 57%)",
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            const assignment = assignments[0];
            if (!assignment) return;
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const nextAmount = clamp((event.clientX - rect.left) / rect.width, 0, 1);
            setParam(
              `modMatrix.${state.modMatrix.findIndex((mod) => mod.id === assignment.id)}.amount`,
              bipolar ? nextAmount * 2 - 1 : nextAmount,
            );
          }}
        />
        <span
          className="absolute h-[42%] w-[3px] origin-bottom rounded-full bg-cyan-100 shadow-[0_0_10px_rgba(56,246,255,0.8)]"
          style={{ transform: `translateY(-45%) rotate(${angle}deg)` }}
        />
        <span className="absolute inset-[16%] rounded-full bg-gradient-to-b from-white/10 to-black/30" />
      </button>
      <div className="w-full text-center">
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</div>
        <div className="font-mono text-[10px] text-cyan-100">{shown}</div>
      </div>
    </div>
  );
};
