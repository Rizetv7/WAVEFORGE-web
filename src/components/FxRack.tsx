import { ArrowDown, ArrowUp, GripVertical, Power, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { EffectConfig } from "../types";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect, Panel } from "./Panel";

const effectModeOptions: Record<string, string[]> = {
  Distortion: ["Tube", "Soft Clip", "Hard Clip", "Bitcrush"],
};

const num = (effect: EffectConfig, key: string, fallback: number) => {
  const value = effect.params[key];
  return typeof value === "number" ? value : fallback;
};

const str = (effect: EffectConfig, key: string, fallback: string) => {
  const value = effect.params[key];
  return typeof value === "string" ? value : fallback;
};

const modPath = (effect: EffectConfig, key: string) => `effects.${effect.id}.${key}`;
const statePath = (index: number, key: string) => `effects.${index}.params.${key}`;

const EffectViz = ({ effect }: { effect: EffectConfig }) => {
  const intensity = Math.max(0.12, effect.enabled ? 1 : 0.32);
  const bars = Array.from({ length: 28 }, (_, i) => {
    const params = Object.values(effect.params).filter((value): value is number => typeof value === "number");
    const paramSum = params.reduce((sum, value) => sum + Math.abs(value), 0);
    return 18 + Math.abs(Math.sin(i * 0.58 + paramSum * 0.18)) * 72 * intensity;
  });
  return (
    <div className="h-24 rounded border border-white/10 bg-[#070b12] p-2 precision-grid">
      <div className="flex h-full items-end gap-1">
        {bars.map((value, index) => (
          <span
            key={index}
            className={`flex-1 rounded-t ${effect.enabled ? "bg-gradient-to-t from-cyan-400 via-violet-400 to-orange-300" : "bg-slate-700"}`}
            style={{ height: `${value}%`, opacity: effect.enabled ? 0.75 : 0.42 }}
          />
        ))}
      </div>
    </div>
  );
};

const ParameterGrid = ({ effect, index }: { effect: EffectConfig; index: number }) => {
  const { setParam } = useSynth();
  return (
  <div className="grid grid-cols-3 gap-3">
    {effect.type === "Distortion" && (
      <>
        <MiniSelect value={str(effect, "mode", "Tube")} options={effectModeOptions.Distortion} onChange={(value) => setParam(statePath(index, "mode"), value)} label="Mode" />
        <Knob label="Drive" path={statePath(index, "drive")} modPath={modPath(effect, "drive")} value={num(effect, "drive", 0.3)} />
        <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 0.3)} />
      </>
    )}
    {(effect.type === "Chorus" || effect.type === "Phaser" || effect.type === "Flanger") && (
      <>
        <Knob label="Rate" path={statePath(index, "rate")} modPath={modPath(effect, "rate")} value={num(effect, "rate", 0.25)} min={0.01} max={8} step={0.01} />
        <Knob label="Depth" path={statePath(index, "depth")} modPath={modPath(effect, "depth")} value={num(effect, "depth", 0.35)} />
        {effect.type === "Flanger" ? (
          <Knob label="Feed" path={statePath(index, "feedback")} modPath={modPath(effect, "feedback")} value={num(effect, "feedback", 0.18)} max={0.96} />
        ) : (
          <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 0.22)} />
        )}
        {effect.type === "Flanger" && <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 0.18)} />}
      </>
    )}
    {effect.type === "Compressor" && (
      <>
        <Knob label="Thresh" path={statePath(index, "threshold")} modPath={modPath(effect, "threshold")} value={num(effect, "threshold", -18)} min={-50} max={0} step={1} />
        <Knob label="Ratio" path={statePath(index, "ratio")} modPath={modPath(effect, "ratio")} value={num(effect, "ratio", 2.5)} min={1} max={20} step={0.1} />
        <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 1)} />
      </>
    )}
    {effect.type === "EQ" && (
      <>
        <Knob label="Low" path={statePath(index, "low")} modPath={modPath(effect, "low")} value={num(effect, "low", 0)} min={-12} max={12} step={0.1} bipolar />
        <Knob label="Mid" path={statePath(index, "mid")} modPath={modPath(effect, "mid")} value={num(effect, "mid", 0)} min={-12} max={12} step={0.1} bipolar />
        <Knob label="High" path={statePath(index, "high")} modPath={modPath(effect, "high")} value={num(effect, "high", 0)} min={-12} max={12} step={0.1} bipolar />
      </>
    )}
    {effect.type === "Delay" && (
      <>
        <Knob label="Time" path={statePath(index, "time")} modPath={modPath(effect, "time")} value={num(effect, "time", 0.32)} min={0.03} max={1.6} step={0.01} display={(v) => `${v.toFixed(2)}s`} />
        <Knob label="Feed" path={statePath(index, "feedback")} modPath={modPath(effect, "feedback")} value={num(effect, "feedback", 0.28)} max={0.88} />
        <Knob label="Damp" path={statePath(index, "filter")} modPath={modPath(effect, "filter")} value={num(effect, "filter", 5200)} min={400} max={16000} step={1} display={(v) => `${(v / 1000).toFixed(1)}k`} />
        <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 0.22)} />
      </>
    )}
    {effect.type === "Reverb" && (
      <>
        <Knob label="Size" path={statePath(index, "size")} modPath={modPath(effect, "size")} value={num(effect, "size", 0.58)} />
        <Knob label="Decay" path={statePath(index, "decay")} modPath={modPath(effect, "decay")} value={num(effect, "decay", 2.2)} min={0.3} max={8} step={0.1} />
        <Knob label="Pre" path={statePath(index, "predelay")} modPath={modPath(effect, "predelay")} value={num(effect, "predelay", 0.018)} min={0} max={0.2} step={0.001} display={(v) => `${Math.round(v * 1000)}ms`} />
        <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 0.2)} />
      </>
    )}
    {effect.type === "Filter FX" && (
      <>
        <Knob label="Cutoff" path={statePath(index, "cutoff")} modPath={modPath(effect, "cutoff")} value={num(effect, "cutoff", 2400)} min={80} max={14000} step={1} display={(v) => `${(v / 1000).toFixed(1)}k`} />
        <Knob label="Res" path={statePath(index, "resonance")} modPath={modPath(effect, "resonance")} value={num(effect, "resonance", 0.4)} />
        <Knob label="Mix" path={statePath(index, "mix")} modPath={modPath(effect, "mix")} value={num(effect, "mix", 0.3)} />
      </>
    )}
    {effect.type === "Stereo Width" && <Knob label="Width" path={statePath(index, "width")} modPath={modPath(effect, "width")} value={num(effect, "width", 0.72)} />}
  </div>
  );
};

export const FxRack = () => {
  const { state, setParam, patch } = useSynth();
  const [selectedId, setSelectedId] = useState(state.effects[0]?.id ?? "");
  const selectedIndex = Math.max(0, state.effects.findIndex((effect) => effect.id === selectedId));
  const selected = state.effects[selectedIndex] ?? state.effects[0];

  const activeCount = useMemo(() => state.effects.filter((effect) => effect.enabled).length, [state.effects]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= state.effects.length) return;
    const effects = [...state.effects];
    const [item] = effects.splice(from, 1);
    effects.splice(to, 0, item);
    patch({ effects });
  };

  const setAll = (enabled: boolean) => {
    patch({ effects: state.effects.map((effect) => ({ ...effect, enabled })) });
  };

  return (
    <Panel
      title="Effects Rack"
      right={
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">{activeCount}/{state.effects.length} active</span>
          <MiniButton onClick={() => setAll(true)} title="Enable every effect">
            All On
          </MiniButton>
          <MiniButton onClick={() => setAll(false)} title="Bypass every effect">
            Bypass
          </MiniButton>
        </div>
      }
    >
      <div className="grid grid-cols-[360px_1fr] gap-4">
        <div className="overflow-hidden rounded border border-white/10">
          <div className="grid grid-cols-[28px_1fr_auto] items-center bg-white/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <span />
            <span>Chain Order</span>
            <SlidersHorizontal size={13} />
          </div>
          {state.effects.map((effect, index) => (
            <button
              key={effect.id}
              type="button"
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/waveforge-fx-index", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/waveforge-fx-index"));
                if (Number.isFinite(from) && from !== index) move(from, index);
              }}
              onClick={() => setSelectedId(effect.id)}
              className={`grid w-full grid-cols-[28px_1fr_auto] items-center gap-2 border-t border-white/10 px-3 py-2 text-left transition ${
                selected?.id === effect.id ? "bg-cyan-300/12 text-cyan-100" : "bg-white/[0.025] text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              <GripVertical size={15} className="text-slate-500" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{effect.type}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{effect.enabled ? "processing" : "bypassed"}</span>
              </span>
              <span className={`grid h-6 w-6 place-items-center rounded border ${effect.enabled ? "border-cyan-300/50 text-cyan-100" : "border-white/10 text-slate-600"}`}>
                <Power size={12} />
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="grid gap-3 rounded border border-white/10 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Selected FX</div>
                <h3 className="mt-1 text-lg font-black uppercase tracking-[0.12em] text-slate-100">{selected.type}</h3>
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">Slot {selectedIndex + 1}</div>
              </div>
              <div className="flex items-center gap-2">
                <MiniButton onClick={() => move(selectedIndex, selectedIndex - 1)} title="Move up">
                  <ArrowUp size={13} />
                </MiniButton>
                <MiniButton onClick={() => move(selectedIndex, selectedIndex + 1)} title="Move down">
                  <ArrowDown size={13} />
                </MiniButton>
                <MiniButton active={selected.enabled} onClick={() => setParam(`effects.${selectedIndex}.enabled`, !selected.enabled)}>
                  {selected.enabled ? "On" : "Off"}
                </MiniButton>
              </div>
            </div>
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-4">
              <div className="grid gap-3">
                <EffectViz effect={selected} />
                <div className="rounded border border-white/10 bg-[#080d14] p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    <RotateCcw size={12} />
                    Route Targets
                  </div>
                  <div className="font-mono text-sm text-cyan-100">{Object.keys(selected.params).length} parameters</div>
                </div>
              </div>
              <ParameterGrid effect={selected} index={selectedIndex} />
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};
