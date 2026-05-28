import { GripVertical } from "lucide-react";
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

const EffectViz = ({ effect }: { effect: EffectConfig }) => (
  <div className="h-14 rounded border border-white/10 bg-[#070b12] p-2 precision-grid">
    <div className="flex h-full items-end gap-1">
      {Array.from({ length: 22 }, (_, i) => {
        const value = Math.abs(Math.sin(i * 0.72 + (effect.enabled ? performance.now() * 0.001 : 0))) * (effect.enabled ? 1 : 0.35);
        return (
          <span
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-cyan-400 to-violet-400 opacity-70"
            style={{ height: `${14 + value * 78}%` }}
          />
        );
      })}
    </div>
  </div>
);

export const FxRack = () => {
  const { state, setParam, patch } = useSynth();
  const move = (from: number, to: number) => {
    const effects = [...state.effects];
    const [item] = effects.splice(from, 1);
    effects.splice(to, 0, item);
    patch({ effects });
  };

  return (
    <Panel title="Effects Rack">
      <div className="grid grid-cols-2 gap-3">
        {state.effects.map((effect, index) => (
          <div
            key={effect.id}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/waveforge-fx-index", String(index))}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const from = Number(event.dataTransfer.getData("text/waveforge-fx-index"));
              if (Number.isFinite(from) && from !== index) move(from, index);
            }}
            className="rounded-lg border border-white/10 bg-black/20 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GripVertical size={15} className="text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">{effect.type}</h3>
              </div>
              <MiniButton active={effect.enabled} onClick={() => setParam(`effects.${index}.enabled`, !effect.enabled)}>
                {effect.enabled ? "On" : "Off"}
              </MiniButton>
            </div>
            <div className="grid grid-cols-[0.75fr_1fr] gap-3">
              <EffectViz effect={effect} />
              <div className="grid grid-cols-3 gap-2">
                {effect.type === "Distortion" && (
                  <>
                    <MiniSelect value={str(effect, "mode", "Tube")} options={effectModeOptions.Distortion} onChange={(v) => setParam(`effects.${index}.params.mode`, v)} />
                    <Knob label="Drive" path={`effects.${index}.params.drive`} value={num(effect, "drive", 0.3)} />
                    <Knob label="Mix" path={`effects.${index}.params.mix`} value={num(effect, "mix", 0.3)} />
                  </>
                )}
                {(effect.type === "Chorus" || effect.type === "Phaser" || effect.type === "Flanger") && (
                  <>
                    <Knob label="Rate" path={`effects.${index}.params.rate`} value={num(effect, "rate", 0.25)} min={0.01} max={8} step={0.01} />
                    <Knob label="Depth" path={`effects.${index}.params.depth`} value={num(effect, "depth", 0.35)} />
                    <Knob label="Mix" path={`effects.${index}.params.mix`} value={num(effect, "mix", 0.22)} />
                  </>
                )}
                {effect.type === "Compressor" && (
                  <>
                    <Knob label="Thresh" path={`effects.${index}.params.threshold`} value={num(effect, "threshold", -18)} min={-50} max={0} step={1} />
                    <Knob label="Ratio" path={`effects.${index}.params.ratio`} value={num(effect, "ratio", 2.5)} min={1} max={20} step={0.1} />
                    <Knob label="Mix" path={`effects.${index}.params.mix`} value={num(effect, "mix", 1)} />
                  </>
                )}
                {effect.type === "EQ" && (
                  <>
                    <Knob label="Low" path={`effects.${index}.params.low`} value={num(effect, "low", 0)} min={-12} max={12} step={0.1} bipolar />
                    <Knob label="Mid" path={`effects.${index}.params.mid`} value={num(effect, "mid", 0)} min={-12} max={12} step={0.1} bipolar />
                    <Knob label="High" path={`effects.${index}.params.high`} value={num(effect, "high", 0)} min={-12} max={12} step={0.1} bipolar />
                  </>
                )}
                {effect.type === "Delay" && (
                  <>
                    <Knob label="Time" path={`effects.${index}.params.time`} value={num(effect, "time", 0.32)} min={0.03} max={1.6} step={0.01} display={(v) => `${v.toFixed(2)}s`} />
                    <Knob label="Feed" path={`effects.${index}.params.feedback`} value={num(effect, "feedback", 0.28)} max={0.88} />
                    <Knob label="Mix" path={`effects.${index}.params.mix`} value={num(effect, "mix", 0.22)} />
                  </>
                )}
                {effect.type === "Reverb" && (
                  <>
                    <Knob label="Size" path={`effects.${index}.params.size`} value={num(effect, "size", 0.58)} />
                    <Knob label="Decay" path={`effects.${index}.params.decay`} value={num(effect, "decay", 2.2)} min={0.3} max={8} step={0.1} />
                    <Knob label="Mix" path={`effects.${index}.params.mix`} value={num(effect, "mix", 0.2)} />
                  </>
                )}
                {effect.type === "Filter FX" && (
                  <>
                    <Knob label="Cutoff" path={`effects.${index}.params.cutoff`} value={num(effect, "cutoff", 2400)} min={80} max={14000} step={1} />
                    <Knob label="Res" path={`effects.${index}.params.resonance`} value={num(effect, "resonance", 0.4)} />
                    <Knob label="Mix" path={`effects.${index}.params.mix`} value={num(effect, "mix", 0.3)} />
                  </>
                )}
                {effect.type === "Stereo Width" && <Knob label="Width" path={`effects.${index}.params.width`} value={num(effect, "width", 0.72)} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
