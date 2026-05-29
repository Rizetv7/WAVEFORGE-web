import { ArrowRight, Plus, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ModAssignment, ModSource } from "../types";
import { useSynth } from "../state/SynthContext";
import { MiniButton, MiniSelect, Panel } from "./Panel";

const sources: ModSource[] = [
  "lfo1",
  "lfo2",
  "lfo3",
  "lfo4",
  "env1",
  "env2",
  "env3",
  "env4",
  "macro1",
  "macro2",
  "macro3",
  "macro4",
  "velocity",
  "modWheel",
  "aftertouch",
  "noteTracking",
];

const sourceNames: Record<ModSource, string> = {
  lfo1: "LFO 1",
  lfo2: "LFO 2",
  lfo3: "LFO 3",
  lfo4: "LFO 4",
  env1: "ENV 1",
  env2: "ENV 2",
  env3: "ENV 3",
  env4: "ENV 4",
  macro1: "Macro 1",
  macro2: "Macro 2",
  macro3: "Macro 3",
  macro4: "Macro 4",
  velocity: "Velocity",
  modWheel: "Mod Wheel",
  aftertouch: "Aftertouch",
  noteTracking: "Key Track",
};

const sourceColors: Record<ModSource, string> = {
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

const destinations = [
  { group: "Filter", value: "filters.filter1.cutoff", label: "Filter 1 / Cutoff" },
  { group: "Filter", value: "filters.filter1.resonance", label: "Filter 1 / Resonance" },
  { group: "Filter", value: "filters.filter1.mix", label: "Filter 1 / Mix" },
  { group: "Filter", value: "filters.filter2.cutoff", label: "Filter 2 / Cutoff" },
  { group: "Filter", value: "filters.filter2.resonance", label: "Filter 2 / Resonance" },
  { group: "Filter", value: "filters.filter2.mix", label: "Filter 2 / Mix" },
  { group: "Oscillator", value: "oscillators.A.level", label: "OSC A / Level" },
  { group: "Oscillator", value: "oscillators.B.level", label: "OSC B / Level" },
  { group: "Oscillator", value: "oscillators.C.level", label: "OSC C / Level" },
  { group: "Oscillator", value: "oscillators.A.pan", label: "OSC A / Pan" },
  { group: "Oscillator", value: "oscillators.B.pan", label: "OSC B / Pan" },
  { group: "Oscillator", value: "oscillators.C.pan", label: "OSC C / Pan" },
  { group: "FX", value: "effects.fx-distortion.drive", label: "Distortion / Drive" },
  { group: "FX", value: "effects.fx-distortion.mix", label: "Distortion / Mix" },
  { group: "FX", value: "effects.fx-chorus.depth", label: "Chorus / Depth" },
  { group: "FX", value: "effects.fx-chorus.mix", label: "Chorus / Mix" },
  { group: "FX", value: "effects.fx-delay.feedback", label: "Delay / Feedback" },
  { group: "FX", value: "effects.fx-delay.mix", label: "Delay / Mix" },
  { group: "FX", value: "effects.fx-reverb.size", label: "Reverb / Size" },
  { group: "FX", value: "effects.fx-reverb.decay", label: "Reverb / Decay" },
  { group: "FX", value: "effects.fx-reverb.mix", label: "Reverb / Mix" },
  { group: "FX", value: "effects.fx-filter.cutoff", label: "Filter FX / Cutoff" },
  { group: "FX", value: "effects.fx-width.width", label: "Stereo Width / Width" },
  { group: "Noise", value: "noise.level", label: "Noise / Level" },
] as const;

const curves: ModAssignment["curve"][] = ["Linear", "Expo", "Log", "S-Curve"];
const polarities: ModAssignment["polarity"][] = ["Bipolar", "Unipolar"];
const destinationLabel = (value: string) => destinations.find((destination) => destination.value === value)?.label ?? value;
const groups = Array.from(new Set(destinations.map((destination) => destination.group)));

const CurvePreview = ({ curve, amount }: { curve: ModAssignment["curve"]; amount: number }) => {
  const points = Array.from({ length: 32 }, (_, index) => {
    const x = index / 31;
    const bipolar = x * 2 - 1;
    let y = bipolar;
    if (curve === "Expo") y = Math.sign(bipolar) * bipolar * bipolar;
    if (curve === "Log") y = Math.sign(bipolar) * Math.sqrt(Math.abs(bipolar));
    if (curve === "S-Curve") y = Math.tanh(bipolar * 1.7);
    return `${x * 100},${50 - y * amount * 38}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full rounded border border-white/10 bg-[#070b12]">
      <line x1="0" x2="100" y1="50" y2="50" stroke="rgba(255,255,255,0.12)" />
      <polyline points={points} fill="none" stroke="#38f6ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DestinationSelect = ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) => (
  <label className="grid gap-1">
    {label && <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded border border-white/10 bg-[#0b1018] px-2 text-[11px] text-slate-100 outline-none focus:border-cyan-300/50"
      title={destinationLabel(value)}
    >
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {destinations.filter((destination) => destination.group === group).map((destination) => (
            <option key={destination.value} value={destination.value}>
              {destination.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </label>
);

const SourceSelect = ({ value, onChange, label }: { value: ModSource; onChange: (value: ModSource) => void; label?: string }) => (
  <label className="grid gap-1">
    {label && <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ModSource)}
      className="h-8 rounded border border-white/10 bg-[#0b1018] px-2 text-[11px] text-slate-100 outline-none focus:border-cyan-300/50"
      title={sourceNames[value]}
    >
      {sources.map((source) => (
        <option key={source} value={source}>
          {sourceNames[source]}
        </option>
      ))}
    </select>
  </label>
);

const SourceBadge = ({ source }: { source: ModSource }) => (
  <span className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-semibold text-slate-200">
    <span className="h-2 w-2 rounded-full" style={{ background: sourceColors[source], boxShadow: `0 0 10px ${sourceColors[source]}` }} />
    {sourceNames[source]}
  </span>
);

export const MatrixTab = () => {
  const { state, setParam, dispatch } = useSynth();
  const [draft, setDraft] = useState<Omit<ModAssignment, "id">>({
    source: "lfo1",
    destination: "filters.filter1.cutoff",
    amount: 0.24,
    curve: "Linear",
    polarity: "Bipolar",
  });

  const sourceCount = useMemo(() => new Set(state.modMatrix.map((route) => route.source)).size, [state.modMatrix]);
  const destinationCount = useMemo(() => new Set(state.modMatrix.map((route) => route.destination)).size, [state.modMatrix]);

  const addRoute = (assignment = draft) => {
    dispatch({ type: "ADD_MOD", assignment });
  };

  const applyRoute = (assignment: Omit<ModAssignment, "id">) => {
    setDraft(assignment);
    const existingIndex = state.modMatrix.findIndex(
      (route) => route.source === assignment.source && route.destination === assignment.destination,
    );
    if (existingIndex === -1) {
      dispatch({ type: "ADD_MOD", assignment });
      return;
    }
    setParam(`modMatrix.${existingIndex}.amount`, assignment.amount);
    setParam(`modMatrix.${existingIndex}.curve`, assignment.curve);
    setParam(`modMatrix.${existingIndex}.polarity`, assignment.polarity);
  };

  return (
    <Panel
      title="Modulation Matrix"
      right={
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
            {state.modMatrix.length} routes / {sourceCount} sources / {destinationCount} targets
          </span>
          <MiniButton onClick={() => addRoute()}>
            <span className="inline-flex items-center gap-1"><Plus size={12} /> Add</span>
          </MiniButton>
        </div>
      }
    >
      <div className="grid grid-cols-[340px_1fr] gap-4">
        <div className="grid gap-3">
          <div className="rounded border border-white/10 bg-black/20 p-3">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Route Builder</div>
            <div className="grid gap-3">
              <SourceSelect value={draft.source} onChange={(value) => setDraft((current) => ({ ...current, source: value }))} label="Source" />
              <DestinationSelect value={draft.destination} onChange={(value) => setDraft((current) => ({ ...current, destination: value }))} label="Destination" />
              <label className="grid gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">Amount</span>
                <div className="grid grid-cols-[1fr_52px] items-center gap-2">
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={draft.amount}
                    onChange={(event) => setDraft((current) => ({ ...current, amount: Number(event.target.value) }))}
                    className="w-full"
                  />
                  <span className="font-mono text-[11px] text-cyan-100">{draft.amount.toFixed(2)}</span>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <MiniSelect value={draft.curve} options={curves} onChange={(value) => setDraft((current) => ({ ...current, curve: value as ModAssignment["curve"] }))} label="Curve" />
                <MiniSelect value={draft.polarity} options={polarities} onChange={(value) => setDraft((current) => ({ ...current, polarity: value as ModAssignment["polarity"] }))} label="Polarity" />
              </div>
              <CurvePreview curve={draft.curve} amount={Math.max(0.1, Math.abs(draft.amount))} />
              <MiniButton onClick={() => addRoute()}>
                <span className="inline-flex items-center gap-1"><Plus size={12} /> Add Route</span>
              </MiniButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniButton onClick={() => applyRoute({ source: "lfo1", destination: "filters.filter1.cutoff", amount: 0.22, curve: "Linear", polarity: "Bipolar" })}>
              LFO Cutoff
            </MiniButton>
            <MiniButton onClick={() => applyRoute({ source: "macro3", destination: "effects.fx-reverb.mix", amount: 0.35, curve: "S-Curve", polarity: "Unipolar" })}>
              <span className="inline-flex items-center gap-1"><Wand2 size={12} /> Space</span>
            </MiniButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {state.modMatrix.map((assignment, index) => (
            <div key={assignment.id} className="grid gap-3 rounded border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <SourceBadge source={assignment.source} />
                  <ArrowRight size={14} className="shrink-0 text-slate-500" />
                  <span className="truncate text-sm font-semibold text-slate-200">{destinationLabel(assignment.destination)}</span>
                </div>
                <MiniButton onClick={() => dispatch({ type: "REMOVE_MOD", id: assignment.id })} title="Remove route">
                  <Trash2 size={13} />
                </MiniButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SourceSelect value={assignment.source} onChange={(value) => setParam(`modMatrix.${index}.source`, value)} label="Source" />
                <DestinationSelect value={assignment.destination} onChange={(value) => setParam(`modMatrix.${index}.destination`, value)} label="Destination" />
              </div>
              <div className="grid grid-cols-[1fr_68px] items-center gap-3">
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={assignment.amount}
                  onChange={(event) => setParam(`modMatrix.${index}.amount`, Number(event.target.value))}
                  className="w-full"
                />
                <span className="rounded border border-white/10 bg-[#080d14] px-2 py-1 text-center font-mono text-xs text-cyan-100">
                  {assignment.amount.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-2">
                <MiniSelect value={assignment.curve} options={curves} onChange={(value) => setParam(`modMatrix.${index}.curve`, value)} label="Curve" />
                <MiniSelect value={assignment.polarity} options={polarities} onChange={(value) => setParam(`modMatrix.${index}.polarity`, value)} label="Polarity" />
                <CurvePreview curve={assignment.curve} amount={Math.max(0.1, Math.abs(assignment.amount))} />
              </div>
            </div>
          ))}
          {!state.modMatrix.length && (
            <div className="col-span-2 rounded border border-white/10 bg-black/20 px-3 py-8 text-center text-sm text-slate-500">
              No routes
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};
