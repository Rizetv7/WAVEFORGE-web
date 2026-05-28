import { useEffect, useRef } from "react";
import { audioEngine } from "./audio/engine";
import { FilterPanel } from "./components/FilterPanel";
import { FxRack } from "./components/FxRack";
import { MatrixTab } from "./components/MatrixTab";
import { ModulationPanel } from "./components/ModulationPanel";
import { OscillatorPanel } from "./components/OscillatorPanel";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { PresetBrowser } from "./components/PresetBrowser";
import { SequencerTab } from "./components/SequencerTab";
import { SubNoisePanel } from "./components/SubNoisePanel";
import { Toolbar } from "./components/Toolbar";
import { MiniButton, Panel } from "./components/Panel";
import { SpectrumCanvas } from "./components/visuals";
import { oscillatorIds, useSynth } from "./state/SynthContext";
import type { TabId } from "./types";

const tabs: TabId[] = ["OSC", "FX", "MATRIX", "SEQ", "PRESETS"];

const rateMultiplier: Record<string, number> = {
  "1/4": 1,
  "1/8": 2,
  "1/16": 4,
};

const useAudioBridge = () => {
  const { state, dispatch } = useSynth();
  useEffect(() => {
    audioEngine.update(state);
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const enabledFx = state.effects.filter((fx) => fx.enabled).length;
      const enabledOsc = Object.values(state.oscillators).filter((osc) => osc.enabled).length;
      const cpu = Math.min(96, 4 + enabledFx * 3.4 + enabledOsc * 2.5 + Math.random() * 5);
      dispatch({ type: "SET_PARAM", path: "cpu", value: cpu });
    }, 900);
    return () => window.clearInterval(timer);
  }, [dispatch, state.effects, state.oscillators]);
};

const useStepSequencer = () => {
  const { state } = useSynth();
  const index = useRef(0);
  useEffect(() => {
    if (!state.sequencer.playing) return undefined;
    const stepMs = 60000 / state.sequencer.bpm / (rateMultiplier[state.sequencer.arpRate] ?? 4);
    const timer = window.setInterval(() => {
      const step = state.sequencer.steps[index.current % state.sequencer.steps.length];
      index.current += 1;
      if (!step.active) return;
      const note = state.sequencer.rootNote + step.pitch;
      void audioEngine.noteOn(note, step.velocity);
      window.setTimeout(() => audioEngine.noteOff(note), stepMs * step.gate * state.sequencer.gate);
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [state.sequencer]);
};

const OscTab = () => {
  const { state } = useSynth();
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-3">
        {oscillatorIds.map((id) => (
          <OscillatorPanel key={id} id={id} oscillator={state.oscillators[id]} />
        ))}
      </div>
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-3">
        <SubNoisePanel />
        <FilterPanel id="filter1" />
        <FilterPanel id="filter2" />
      </div>
      <ModulationPanel />
    </div>
  );
};

const VisualPanel = () => (
  <div className="grid grid-cols-2 gap-3">
    <Panel title="Oscilloscope">
      <div className="h-32">
        <SpectrumCanvas mode="scope" />
      </div>
    </Panel>
    <Panel title="Spectrum">
      <div className="h-32">
        <SpectrumCanvas mode="spectrum" />
      </div>
    </Panel>
  </div>
);

const App = () => {
  const { state, dispatch } = useSynth();
  useAudioBridge();
  useStepSequencer();

  return (
    <main className="min-h-screen px-6 py-5 text-slate-100">
      <div className="mx-auto flex w-[1440px] max-w-[calc(100vw-48px)] flex-col gap-3">
        <Toolbar />
        <div className="glass-panel flex items-center justify-between rounded-lg px-3 py-2">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <MiniButton key={tab} active={state.activeTab === tab} onClick={() => dispatch({ type: "SET_TAB", tab })}>
                {tab}
              </MiniButton>
            ))}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
            {state.performance.mono ? "Mono" : "Poly"} / {state.performance.voices} voices / {state.sequencer.bpm} BPM
          </div>
        </div>
        {state.activeTab === "OSC" && <OscTab />}
        {state.activeTab === "FX" && <FxRack />}
        {state.activeTab === "MATRIX" && <MatrixTab />}
        {state.activeTab === "SEQ" && <SequencerTab />}
        {state.activeTab === "PRESETS" && <PresetBrowser />}
        <VisualPanel />
        <PianoKeyboard />
      </div>
    </main>
  );
};

export default App;
