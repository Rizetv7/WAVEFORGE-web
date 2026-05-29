import { Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect, Panel } from "./Panel";

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (note: number) => `${noteNames[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 1}`;

const SliderField = ({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) => (
  <label className="grid gap-2 rounded border border-white/10 bg-black/20 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="font-mono text-xs text-cyan-100">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full"
    />
  </label>
);

export const SequencerTab = () => {
  const { state, setParam } = useSynth();
  const seq = state.sequencer;
  const [selectedStep, setSelectedStep] = useState(0);
  const step = seq.steps[selectedStep] ?? seq.steps[0];

  const setStep = (key: "active" | "pitch" | "velocity" | "gate", value: boolean | number) => {
    setParam(`sequencer.steps.${selectedStep}.${key}`, value);
  };

  return (
    <div className="grid gap-3">
      <Panel
        title="Sequencer"
        right={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
              {noteName(seq.rootNote)} / {seq.arpRate} / {seq.bpm} BPM
            </span>
            <MiniButton active={seq.playing} onClick={() => setParam("sequencer.playing", !seq.playing)}>
              <span className="inline-flex items-center gap-1">{seq.playing ? <Pause size={12} /> : <Play size={12} />} {seq.playing ? "Stop" : "Play"}</span>
            </MiniButton>
          </div>
        }
      >
        <div className="grid grid-cols-[280px_1fr_260px] gap-4">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniSelect value={seq.arpMode} options={["Up", "Down", "Up/Down", "Random", "Chord"]} onChange={(value) => setParam("sequencer.arpMode", value)} label="Mode" />
              <MiniSelect value={seq.arpRate} options={["1/4", "1/8", "1/16"]} onChange={(value) => setParam("sequencer.arpRate", value)} label="Rate" />
            </div>
            <div className="grid grid-cols-3 gap-2 rounded border border-white/10 bg-black/20 p-3">
              <Knob label="BPM" path="sequencer.bpm" value={seq.bpm} min={50} max={220} step={1} />
              <Knob label="Gate" path="sequencer.gate" value={seq.gate} />
              <Knob label="Oct" path="sequencer.octaveRange" value={seq.octaveRange} min={1} max={4} step={1} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniButton active={seq.sync} onClick={() => setParam("sequencer.sync", !seq.sync)}>
                Sync
              </MiniButton>
              <MiniButton
                onClick={() => {
                  seq.steps.forEach((_, index) => {
                    setParam(`sequencer.steps.${index}.active`, index % 4 !== 3);
                  });
                }}
              >
                Reset Gates
              </MiniButton>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
              {seq.steps.map((item, index) => {
                const selected = selectedStep === index;
                const active = item.active;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedStep(index)}
                    className={`grid h-28 min-w-0 content-between rounded border p-2 text-left transition ${
                      selected
                        ? "border-cyan-200 bg-cyan-300/18 text-cyan-50 shadow-[0_0_18px_rgba(56,246,255,0.18)]"
                        : active
                          ? "border-cyan-300/35 bg-cyan-300/10 text-slate-100 hover:border-cyan-200/70"
                          : "border-white/10 bg-white/[0.025] text-slate-600 hover:bg-white/[0.05]"
                    }`}
                    aria-label={`Step ${index + 1}`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px]">{String(index + 1).padStart(2, "0")}</span>
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-green-300" : "bg-slate-700"}`} />
                    </span>
                    <span className="text-center font-mono text-sm">{item.pitch > 0 ? "+" : ""}{item.pitch}</span>
                    <span className="grid h-10 items-end">
                      <span className="block rounded bg-gradient-to-t from-cyan-400 to-violet-300" style={{ height: `${Math.max(5, item.velocity * 38)}px`, opacity: active ? 0.9 : 0.28 }} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 4, 8, 12].map((start) => (
                <div key={start} className="h-1 rounded bg-white/10">
                  <span
                    className="block h-1 rounded bg-cyan-300/70"
                    style={{
                      width: `${(seq.steps.slice(start, start + 4).filter((item) => item.active).length / 4) * 100}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Step</div>
                <div className="font-mono text-2xl text-cyan-100">{String(selectedStep + 1).padStart(2, "0")}</div>
              </div>
              <MiniButton active={step.active} onClick={() => setStep("active", !step.active)}>
                {step.active ? "On" : "Off"}
              </MiniButton>
            </div>
            <SliderField
              label="Pitch"
              value={step.pitch}
              min={-24}
              max={24}
              step={1}
              display={`${seq.rootNote + step.pitch > 0 ? noteName(seq.rootNote + step.pitch) : step.pitch}`}
              onChange={(value) => setStep("pitch", value)}
            />
            <SliderField
              label="Velocity"
              value={step.velocity}
              min={0}
              max={1}
              step={0.01}
              display={`${Math.round(step.velocity * 100)}%`}
              onChange={(value) => setStep("velocity", value)}
            />
            <SliderField
              label="Gate"
              value={step.gate}
              min={0.05}
              max={1}
              step={0.01}
              display={`${Math.round(step.gate * 100)}%`}
              onChange={(value) => setStep("gate", value)}
            />
            <MiniButton
              onClick={() => {
                setStep("pitch", 0);
                setStep("velocity", 0.72);
                setStep("gate", 0.5);
              }}
            >
              <span className="inline-flex items-center gap-1"><RotateCcw size={12} /> Reset Step</span>
            </MiniButton>
          </div>
        </div>
      </Panel>
    </div>
  );
};
