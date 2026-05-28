import { audioEngine } from "../audio/engine";
import { warpModes, wavetableNames } from "../audio/wavetables";
import type { OscillatorConfig, OscillatorId, SynthMode } from "../types";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect, Panel } from "./Panel";
import { WaveformCanvas } from "./visuals";

const modes: SynthMode[] = ["Wavetable", "Analog", "Sample", "Granular"];
const routes = ["filter1", "filter2", "direct"] as const;

export const OscillatorPanel = ({ id, oscillator }: { id: OscillatorId; oscillator: OscillatorConfig }) => {
  const { state, setParam, dispatch } = useSynth();
  const base = `oscillators.${id}`;

  return (
    <Panel
      title={`OSC ${id}`}
      right={
        <div className="flex items-center gap-1">
          <MiniButton active={oscillator.enabled} onClick={() => setParam(`${base}.enabled`, !oscillator.enabled)}>
            {oscillator.enabled ? "On" : "Off"}
          </MiniButton>
          <MiniSelect
            value={oscillator.route}
            options={routes}
            onChange={(value) => setParam(`${base}.route`, value)}
          />
        </div>
      }
    >
      <div className="grid gap-3">
        <WaveformCanvas oscillator={oscillator} />
        <div className="grid grid-cols-3 gap-2">
          <MiniSelect
            label="Wavetable"
            value={oscillator.wavetable}
            options={wavetableNames}
            onChange={(value) => setParam(`${base}.wavetable`, value)}
          />
          <MiniSelect label="Mode" value={oscillator.mode} options={modes} onChange={(value) => setParam(`${base}.mode`, value)} />
          <MiniSelect label="Warp" value={oscillator.warp} options={warpModes} onChange={(value) => setParam(`${base}.warp`, value)} />
        </div>
        {state.importedSamples.length > 0 && (
          <MiniSelect
            label="Sample"
            value={oscillator.sampleName ?? state.importedSamples[0]}
            options={state.importedSamples}
            onChange={(value) => setParam(`${base}.sampleName`, value)}
          />
        )}
        <div className="grid grid-cols-4 gap-2">
          <Knob label="Pos" path={`${base}.position`} value={oscillator.position} />
          <Knob label="Oct" path={`${base}.octave`} value={oscillator.octave} min={-3} max={3} step={1} display={(v) => `${v > 0 ? "+" : ""}${v}`} />
          <Knob label="Semi" path={`${base}.semitone`} value={oscillator.semitone} min={-12} max={12} step={1} bipolar display={(v) => `${v > 0 ? "+" : ""}${v}`} />
          <Knob label="Fine" path={`${base}.fine`} value={oscillator.fine} min={-50} max={50} step={1} unit="c" bipolar display={(v) => `${v > 0 ? "+" : ""}${v}c`} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Knob label="Unison" path={`${base}.unison`} value={oscillator.unison} min={1} max={16} step={1} display={(v) => `${v}`} />
          <Knob label="Detune" path={`${base}.detune`} value={oscillator.detune} />
          <Knob label="Width" path={`${base}.width`} value={oscillator.width} />
          <Knob label="Phase" path={`${base}.phase`} value={oscillator.phase} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Knob label="Rand" path={`${base}.randomPhase`} value={oscillator.randomPhase} />
          <Knob label="Pan" path={`${base}.pan`} value={oscillator.pan} min={-1} max={1} step={0.01} bipolar />
          <Knob label="Level" path={`${base}.level`} value={oscillator.level} />
          <label className="grid content-end gap-1 rounded border border-white/10 bg-black/20 p-2 text-[10px] text-slate-400">
            WAV
            <input
              type="file"
              accept="audio/wav,audio/x-wav,audio/*"
              className="max-w-full text-[10px]"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const payload = await audioEngine.decodeSample(file);
                dispatch({ type: "ADD_SAMPLE", sample: payload });
                setParam(`${base}.sampleName`, payload.name);
                setParam(`${base}.mode`, "Sample");
              }}
            />
          </label>
        </div>
      </div>
    </Panel>
  );
};
