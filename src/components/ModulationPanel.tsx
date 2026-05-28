import type { EnvelopeId, LfoId, MacroId } from "../types";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { ModSourceChip } from "./ModSourceChip";
import { MiniButton, MiniSelect, Panel } from "./Panel";
import { EnvelopeCanvas, LfoCanvas } from "./visuals";

const envIds: EnvelopeId[] = ["env1", "env2", "env3", "env4"];
const lfoIds: LfoId[] = ["lfo1", "lfo2", "lfo3", "lfo4"];
const macroIds: MacroId[] = ["macro1", "macro2", "macro3", "macro4"];
const lfoShapes = ["Sine", "Triangle", "Saw Up", "Saw Down", "Square", "Random", "Custom"];
const syncRates = ["1/1", "1/2", "1/4", "1/8", "1/16", "1/8T", "1/8D"];

export const ModulationPanel = () => {
  const { state, setParam } = useSynth();
  return (
    <div className="grid grid-cols-[1fr_1.2fr_0.85fr] gap-3">
      <Panel title="Envelope 1">
        <div className="grid gap-3">
          <EnvelopeCanvas env={state.envelopes.env1} />
          <div className="grid grid-cols-5 gap-2">
            <Knob label="A" path="envelopes.env1.attack" value={state.envelopes.env1.attack} min={0.001} max={4} step={0.001} display={(v) => `${v.toFixed(2)}s`} />
            <Knob label="H" path="envelopes.env1.hold" value={state.envelopes.env1.hold} min={0} max={2} step={0.001} display={(v) => `${v.toFixed(2)}s`} />
            <Knob label="D" path="envelopes.env1.decay" value={state.envelopes.env1.decay} min={0.001} max={5} step={0.001} display={(v) => `${v.toFixed(2)}s`} />
            <Knob label="S" path="envelopes.env1.sustain" value={state.envelopes.env1.sustain} />
            <Knob label="R" path="envelopes.env1.release" value={state.envelopes.env1.release} min={0.01} max={6} step={0.001} display={(v) => `${v.toFixed(2)}s`} />
          </div>
        </div>
      </Panel>
      <Panel title="LFO 1">
        <div className="grid gap-3">
          <LfoCanvas
            lfo={state.lfos.lfo1}
            bpm={state.sequencer.bpm}
            onChange={(points, shape) => {
              setParam("lfos.lfo1.points", points);
              if (shape) setParam("lfos.lfo1.shape", shape);
            }}
          />
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2">
            <MiniSelect value={state.lfos.lfo1.shape} options={lfoShapes} onChange={(v) => setParam("lfos.lfo1.shape", v)} label="Shape" />
            <MiniSelect value={state.lfos.lfo1.syncRate} options={syncRates} onChange={(v) => setParam("lfos.lfo1.syncRate", v)} label="Sync" />
            <MiniButton active={state.lfos.lfo1.sync} onClick={() => setParam("lfos.lfo1.sync", !state.lfos.lfo1.sync)}>
              Sync
            </MiniButton>
            <MiniButton active={state.lfos.lfo1.trigger} onClick={() => setParam("lfos.lfo1.trigger", !state.lfos.lfo1.trigger)}>
              Trig
            </MiniButton>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Knob label="Rate" path="lfos.lfo1.rate" value={state.lfos.lfo1.rate} min={0.02} max={20} step={0.01} display={(v) => `${v.toFixed(2)}Hz`} />
            <Knob label="Macro 1" path="macros.macro1.value" value={state.macros.macro1.value} />
            <Knob label="Macro 2" path="macros.macro2.value" value={state.macros.macro2.value} />
            <Knob label="Macro 3" path="macros.macro3.value" value={state.macros.macro3.value} />
          </div>
        </div>
      </Panel>
      <Panel title="Sources">
        <div className="grid gap-2">
          {macroIds.map((id, index) => (
            <ModSourceChip key={id} id={id} label={state.macros[id].name} color={["#38f6ff", "#5e83ff", "#a36bff", "#ffad55"][index]} />
          ))}
          {envIds.map((id, index) => (
            <ModSourceChip key={id} id={id} label={id.toUpperCase()} color={["#ffad55", "#ff6f91", "#f9f871", "#b8f7d4"][index]} />
          ))}
          {lfoIds.map((id, index) => (
            <ModSourceChip key={id} id={id} label={id.toUpperCase()} color={["#38f6ff", "#5e83ff", "#a36bff", "#65ffb0"][index]} />
          ))}
          <ModSourceChip id="velocity" label="Velocity" color="#65ffb0" />
          <ModSourceChip id="modWheel" label="Mod Wheel" color="#ffad55" />
          <ModSourceChip id="aftertouch" label="Aftertouch" color="#ff6f91" />
          <ModSourceChip id="noteTracking" label="Key Track" color="#b8f7d4" />
        </div>
      </Panel>
    </div>
  );
};
