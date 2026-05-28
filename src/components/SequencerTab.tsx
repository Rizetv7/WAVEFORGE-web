import { Pause, Play } from "lucide-react";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect, Panel } from "./Panel";

export const SequencerTab = () => {
  const { state, setParam } = useSynth();
  const seq = state.sequencer;
  return (
    <div className="grid gap-3">
      <Panel
        title="Arpeggiator / Transport"
        right={
          <MiniButton active={seq.playing} onClick={() => setParam("sequencer.playing", !seq.playing)}>
            <span className="inline-flex items-center gap-1">{seq.playing ? <Pause size={12} /> : <Play size={12} />} {seq.playing ? "Stop" : "Play"}</span>
          </MiniButton>
        }
      >
        <div className="grid grid-cols-[1fr_1fr_4fr] gap-4">
          <div className="grid gap-2">
            <MiniSelect value={seq.arpMode} options={["Up", "Down", "Up/Down", "Random", "Chord"]} onChange={(v) => setParam("sequencer.arpMode", v)} label="Mode" />
            <MiniSelect value={seq.arpRate} options={["1/4", "1/8", "1/16"]} onChange={(v) => setParam("sequencer.arpRate", v)} label="Rate" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Knob label="BPM" path="sequencer.bpm" value={seq.bpm} min={50} max={220} step={1} />
            <Knob label="Gate" path="sequencer.gate" value={seq.gate} />
            <Knob label="Oct" path="sequencer.octaveRange" value={seq.octaveRange} min={1} max={4} step={1} />
            <MiniButton active={seq.sync} onClick={() => setParam("sequencer.sync", !seq.sync)}>Sync</MiniButton>
          </div>
          <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
            {seq.steps.map((step, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setParam(`sequencer.steps.${index}.active`, !step.active)}
                className={`h-20 rounded border text-[10px] transition ${
                  step.active ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-500"
                }`}
              >
                <span className="block text-[9px]">{index + 1}</span>
                <span className="mt-1 block font-mono">{step.pitch > 0 ? "+" : ""}{step.pitch}</span>
                <span className="mx-auto mt-2 block w-2 rounded bg-violet-300" style={{ height: `${Math.max(8, step.velocity * 38)}px` }} />
              </button>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="Step Detail">
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-2">
          {seq.steps.map((step, index) => (
            <div key={index} className="grid gap-2 rounded border border-white/10 bg-black/20 p-2">
              <span className="text-center font-mono text-[10px] text-slate-400">{index + 1}</span>
              <input
                type="range"
                min={-24}
                max={24}
                step={1}
                value={step.pitch}
                onChange={(event) => setParam(`sequencer.steps.${index}.pitch`, Number(event.target.value))}
                className="h-16 [writing-mode:vertical-lr]"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={step.velocity}
                onChange={(event) => setParam(`sequencer.steps.${index}.velocity`, Number(event.target.value))}
                className="h-16 [writing-mode:vertical-lr]"
              />
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={step.gate}
                onChange={(event) => setParam(`sequencer.steps.${index}.gate`, Number(event.target.value))}
                className="h-16 [writing-mode:vertical-lr]"
              />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};
