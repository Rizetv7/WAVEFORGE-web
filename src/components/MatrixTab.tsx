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
  "filters.filter1.cutoff",
  "filters.filter1.resonance",
  "filters.filter2.cutoff",
  "oscillators.A.level",
  "oscillators.B.level",
  "oscillators.C.level",
  "oscillators.A.pan",
  "oscillators.B.pan",
  "effects.fx-delay.mix",
  "effects.fx-reverb.mix",
  "noise.level",
];

const curves: ModAssignment["curve"][] = ["Linear", "Expo", "Log", "S-Curve"];

export const MatrixTab = () => {
  const { state, setParam, dispatch } = useSynth();
  return (
    <Panel
      title="Modulation Matrix"
      right={
        <MiniButton
          onClick={() =>
            dispatch({
              type: "ADD_MOD",
              assignment: {
                source: "lfo1",
                destination: "filters.filter1.cutoff",
                amount: 0.2,
                curve: "Linear",
                polarity: "Bipolar",
              },
            })
          }
        >
          Add Route
        </MiniButton>
      }
    >
      <div className="overflow-hidden rounded border border-white/10">
        <div className="grid grid-cols-[1fr_1.45fr_1fr_1fr_1fr_80px] bg-white/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          <span>Source</span>
          <span>Destination</span>
          <span>Amount</span>
          <span>Curve</span>
          <span>Polarity</span>
          <span>Remove</span>
        </div>
        {state.modMatrix.map((assignment, index) => (
          <div
            key={assignment.id}
            className="grid grid-cols-[1fr_1.45fr_1fr_1fr_1fr_80px] items-center gap-2 border-t border-white/10 px-3 py-2"
          >
            <MiniSelect value={assignment.source} options={sources} onChange={(value) => setParam(`modMatrix.${index}.source`, value)} />
            <MiniSelect
              value={assignment.destination}
              options={destinations}
              onChange={(value) => setParam(`modMatrix.${index}.destination`, value)}
            />
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={assignment.amount}
              onChange={(event) => setParam(`modMatrix.${index}.amount`, Number(event.target.value))}
              className="w-full"
            />
            <MiniSelect value={assignment.curve} options={curves} onChange={(value) => setParam(`modMatrix.${index}.curve`, value)} />
            <MiniSelect
              value={assignment.polarity}
              options={["Bipolar", "Unipolar"]}
              onChange={(value) => setParam(`modMatrix.${index}.polarity`, value)}
            />
            <MiniButton onClick={() => dispatch({ type: "REMOVE_MOD", id: assignment.id })}>Del</MiniButton>
          </div>
        ))}
      </div>
    </Panel>
  );
};
