import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect, Panel } from "./Panel";

export const SubNoisePanel = () => {
  const { state, setParam } = useSynth();
  return (
    <Panel title="Sub / Noise">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-white/10 bg-black/20 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sub</span>
            <MiniButton active={state.sub.enabled} onClick={() => setParam("sub.enabled", !state.sub.enabled)}>
              {state.sub.enabled ? "On" : "Off"}
            </MiniButton>
          </div>
          <MiniSelect value={state.sub.shape} options={["Sine", "Triangle", "Saw", "Square"]} onChange={(v) => setParam("sub.shape", v)} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Knob label="Oct" path="sub.octave" value={state.sub.octave} min={-2} max={0} step={1} />
            <Knob label="Level" path="sub.level" value={state.sub.level} />
          </div>
          <MiniButton active={state.sub.directOut} onClick={() => setParam("sub.directOut", !state.sub.directOut)}>
            Direct
          </MiniButton>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Noise</span>
            <MiniButton active={state.noise.enabled} onClick={() => setParam("noise.enabled", !state.noise.enabled)}>
              {state.noise.enabled ? "On" : "Off"}
            </MiniButton>
          </div>
          <MiniSelect value={state.noise.type} options={["White", "Pink", "Tape", "Air"]} onChange={(v) => setParam("noise.type", v)} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Knob label="Level" path="noise.level" value={state.noise.level} />
            <Knob label="Pan" path="noise.pan" value={state.noise.pan} min={-1} max={1} bipolar />
          </div>
          <MiniButton active={state.noise.oneShot} onClick={() => setParam("noise.oneShot", !state.noise.oneShot)}>
            One Shot
          </MiniButton>
        </div>
      </div>
    </Panel>
  );
};
