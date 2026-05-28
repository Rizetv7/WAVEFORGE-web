import type { FilterId } from "../types";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect, Panel } from "./Panel";
import { FilterCurveCanvas } from "./visuals";

const filterTypes = ["LP12", "LP24", "HP", "BP", "Notch", "Comb", "Formant"];

export const FilterPanel = ({ id }: { id: FilterId }) => {
  const { state, setParam } = useSynth();
  const filter = state.filters[id];
  const base = `filters.${id}`;
  return (
    <Panel
      title={id === "filter1" ? "Filter 1" : "Filter 2"}
      right={<MiniButton active={filter.enabled} onClick={() => setParam(`${base}.enabled`, !filter.enabled)}>{filter.enabled ? "On" : "Off"}</MiniButton>}
    >
      <div className="grid gap-3">
        <FilterCurveCanvas filter={filter} />
        <MiniSelect value={filter.type} options={filterTypes} onChange={(value) => setParam(`${base}.type`, value)} />
        <div className="grid grid-cols-5 gap-2">
          <Knob label="Cutoff" path={`${base}.cutoff`} value={filter.cutoff} min={20} max={18000} step={1} display={(v) => (v > 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)} />
          <Knob label="Res" path={`${base}.resonance`} value={filter.resonance} />
          <Knob label="Drive" path={`${base}.drive`} value={filter.drive} />
          <Knob label="Mix" path={`${base}.mix`} value={filter.mix} />
          <Knob label="Key" path={`${base}.keytrack`} value={filter.keytrack} />
        </div>
      </div>
    </Panel>
  );
};
