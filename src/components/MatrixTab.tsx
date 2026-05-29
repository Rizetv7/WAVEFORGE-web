import { Plus, Trash2, Wand2 } from "lucide-react";
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
const destinationLabel = (value: string) => destinations.find((destination) => destination.value === value)?.label ?? value;

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
    <svg viewBox="0 0 100 100" className="h-10 w-full rounded border border-white/10 bg-[#070b12]">
      <line x1="0" x2="100" y1="50" y2="50" stroke="rgba(255,255,255,0.12)" />
      <polyline points={points} fill="none" stroke="#38f6ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const MatrixTab = () => {
  const { state, setParam, dispatch } = useSynth();

  const addRoute = (assignment: Omit<ModAssignment, "id">) => {
    dispatch({ type: "ADD_MOD", assignment });
  };

  return (
    <Panel
      title="Modulation Matrix"
      right={
        <div className="flex items-center gap-2">
          <MiniButton onClick={() => addRoute({ source: "lfo1", destination: "filters.filter1.cutoff", amount: 0.2, curve: "Linear", polarity: "Bipolar" })}>
            <span className="inline-flex items-center gap-1"><Plus size={12} /> Route</span>
          </MiniButton>
          <MiniButton onClick={() => addRoute({ source: "macro3", destination: "effects.fx-reverb.mix", amount: 0.35, curve: "S-Curve", polarity: "Unipolar" })}>
            <span className="inline-flex items-center gap-1"><Wand2 size={12} /> Space Macro</span>
          </MiniButton>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded border border-white/10 bg-black/20 p-3">
            <div className="font-mono text-lg text-cyan-100">{state.modMatrix.length}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Active routes</div>
          </div>
          <div className="rounded border border-white/10 bg-black/20 p-3">
            <div className="font-mono text-lg text-cyan-100">{new Set(state.modMatrix.map((route) => route.source)).size}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Sources used</div>
          </div>
          <div className="col-span-2 rounded border border-white/10 bg-[#080d14] p-3">
            <div className="font-mono text-lg text-cyan-100">{new Set(state.modMatrix.map((route) => route.destination)).size}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Destinations used</div>
          </div>
        </div>
        <div className="overflow-hidden rounded border border-white/10">
          <div className="grid grid-cols-[1fr_1.45fr_1.1fr_0.9fr_0.9fr_1fr_52px] bg-white/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <span>Source</span>
            <span>Destination</span>
            <span>Amount</span>
            <span>Curve</span>
            <span>Polarity</span>
            <span>Shape</span>
            <span />
          </div>
          {state.modMatrix.map((assignment, index) => (
            <div
              key={assignment.id}
              className="grid grid-cols-[1fr_1.45fr_1.1fr_0.9fr_0.9fr_1fr_52px] items-center gap-2 border-t border-white/10 px-3 py-2"
            >
              <MiniSelect value={assignment.source} options={sources} onChange={(value) => setParam(`modMatrix.${index}.source`, value)} />
              <label className="grid gap-1">
                <select
                  value={assignment.destination}
                  onChange={(event) => setParam(`modMatrix.${index}.destination`, event.target.value)}
                  className="h-7 rounded border border-white/10 bg-[#0b1018] px-2 text-[11px] text-slate-100 outline-none focus:border-cyan-300/50"
                  title={destinationLabel(assignment.destination)}
                >
                  {Array.from(new Set(destinations.map((destination) => destination.group))).map((group) => (
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
              <label className="grid grid-cols-[1fr_46px] items-center gap-2">
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={assignment.amount}
                  onChange={(event) => setParam(`modMatrix.${index}.amount`, Number(event.target.value))}
                  className="w-full"
                />
                <span className="font-mono text-[10px] text-cyan-100">{assignment.amount.toFixed(2)}</span>
              </label>
              <MiniSelect value={assignment.curve} options={curves} onChange={(value) => setParam(`modMatrix.${index}.curve`, value)} />
              <MiniSelect value={assignment.polarity} options={["Bipolar", "Unipolar"]} onChange={(value) => setParam(`modMatrix.${index}.polarity`, value)} />
              <CurvePreview curve={assignment.curve} amount={Math.max(0.1, Math.abs(assignment.amount))} />
              <MiniButton onClick={() => dispatch({ type: "REMOVE_MOD", id: assignment.id })} title="Remove route">
                <Trash2 size={13} />
              </MiniButton>
            </div>
          ))}
          {!state.modMatrix.length && (
            <div className="border-t border-white/10 px-3 py-8 text-center text-sm text-slate-500">
              No modulation routes yet.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};
