import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type { Dispatch, ReactNode } from "react";
import { defaultState } from "../data/defaultState";
import { factoryPresets } from "../data/presets";
import type { DeepPartial, ModAssignment, OscillatorId, SamplePayload, SynthPreset, SynthState, TabId } from "../types";
import { clone, deepMerge, setAtPath, uid } from "../utils/object";

const STORAGE_KEY = "waveforge.customPresets.v1";

type Action =
  | { type: "SET_TAB"; tab: TabId }
  | { type: "SET_PARAM"; path: string; value: unknown }
  | { type: "PATCH"; patch: DeepPartial<SynthState> }
  | { type: "LOAD_PRESET"; preset: SynthPreset }
  | { type: "SAVE_CUSTOM_PRESET"; name: string; category: SynthPreset["category"] }
  | { type: "DELETE_CUSTOM_PRESET"; id: string }
  | { type: "DUPLICATE_PRESET"; preset: SynthPreset }
  | { type: "RENAME_PRESET"; id: string; name: string }
  | { type: "TOGGLE_FAVORITE"; id: string }
  | { type: "ADD_MOD"; assignment: Omit<ModAssignment, "id"> & { id?: string } }
  | { type: "REMOVE_MOD"; id: string }
  | { type: "ADD_SAMPLE"; sample: SamplePayload }
  | { type: "SET_IMPORTED_SAMPLE_NAMES"; names: string[] };

type HistoryAction = Action | { type: "UNDO" } | { type: "REDO" };

interface HistoryState {
  past: SynthState[];
  present: SynthState;
  future: SynthState[];
}

interface SynthContextValue {
  state: SynthState;
  presets: SynthPreset[];
  dispatch: Dispatch<HistoryAction>;
  setParam: (path: string, value: unknown) => void;
  patch: (value: DeepPartial<SynthState>) => void;
  loadPreset: (preset: SynthPreset) => void;
  savePreset: (name: string, category: SynthPreset["category"]) => void;
}

const SynthContext = createContext<SynthContextValue | null>(null);

const loadCustomPresets = (): SynthPreset[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SynthPreset[]) : [];
  } catch {
    return [];
  }
};

const persistCustomPresets = (presets: SynthPreset[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
};

const stateForPreset = (state: SynthState): SynthState => {
  const snapshot = clone(state);
  snapshot.activeTab = "OSC";
  snapshot.cpu = 0;
  snapshot.midiActivity = false;
  snapshot.customPresets = [];
  snapshot.importedSamples = state.importedSamples;
  return snapshot;
};

const reducer = (state: SynthState, action: Action): SynthState => {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_PARAM":
      if (action.path === "cpu") return { ...state, cpu: Number(action.value) };
      if (action.path === "midiActivity") return { ...state, midiActivity: Boolean(action.value) };
      return setAtPath(state, action.path, action.value);
    case "PATCH":
      return deepMerge(state as unknown as Record<string, unknown>, action.patch as Record<string, unknown>) as unknown as SynthState;
    case "LOAD_PRESET": {
      const merged = deepMerge(defaultState as unknown as Record<string, unknown>, action.preset.state as Record<string, unknown>) as unknown as SynthState;
      return {
        ...merged,
        activePresetId: action.preset.id,
        activeTab: state.activeTab,
        customPresets: state.customPresets,
        importedSamples: state.importedSamples,
      };
    }
    case "SAVE_CUSTOM_PRESET": {
      const preset: SynthPreset = {
        id: uid("custom"),
        name: action.name.trim() || "Untitled Patch",
        category: action.category,
        state: stateForPreset(state),
      };
      const customPresets = [preset, ...state.customPresets];
      persistCustomPresets(customPresets);
      return { ...state, customPresets, activePresetId: preset.id };
    }
    case "DELETE_CUSTOM_PRESET": {
      const customPresets = state.customPresets.filter((preset) => preset.id !== action.id);
      persistCustomPresets(customPresets);
      return { ...state, customPresets };
    }
    case "DUPLICATE_PRESET": {
      const preset: SynthPreset = {
        ...clone(action.preset),
        id: uid("custom"),
        name: `${action.preset.name} Copy`,
        favorite: false,
      };
      const customPresets = [preset, ...state.customPresets];
      persistCustomPresets(customPresets);
      return { ...state, customPresets, activePresetId: preset.id };
    }
    case "RENAME_PRESET": {
      const customPresets = state.customPresets.map((preset) =>
        preset.id === action.id ? { ...preset, name: action.name } : preset,
      );
      persistCustomPresets(customPresets);
      return { ...state, customPresets };
    }
    case "TOGGLE_FAVORITE": {
      const customPresets = state.customPresets.map((preset) =>
        preset.id === action.id ? { ...preset, favorite: !preset.favorite } : preset,
      );
      persistCustomPresets(customPresets);
      return { ...state, customPresets };
    }
    case "ADD_MOD": {
      const existing = state.modMatrix.find(
        (mod) => mod.source === action.assignment.source && mod.destination === action.assignment.destination,
      );
      if (existing) return state;
      return {
        ...state,
        modMatrix: [...state.modMatrix, { ...action.assignment, id: action.assignment.id ?? uid("mod") }],
      };
    }
    case "REMOVE_MOD":
      return { ...state, modMatrix: state.modMatrix.filter((assignment) => assignment.id !== action.id) };
    case "ADD_SAMPLE": {
      const importedSamples = Array.from(new Set([...state.importedSamples, action.sample.name]));
      return { ...state, importedSamples };
    }
    case "SET_IMPORTED_SAMPLE_NAMES":
      return { ...state, importedSamples: action.names };
    default:
      return state;
  }
};

const initializer = (): SynthState => {
  const wide = factoryPresets.find((preset) => preset.id === defaultState.activePresetId);
  const merged = wide
    ? (deepMerge(defaultState as unknown as Record<string, unknown>, wide.state as Record<string, unknown>) as unknown as SynthState)
    : clone(defaultState);
  return { ...merged, customPresets: loadCustomPresets() };
};

const historyReducer = (history: HistoryState, action: HistoryAction): HistoryState => {
  if (action.type === "UNDO") {
    const previous = history.past.at(-1);
    if (!previous) return history;
    return {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future].slice(0, 50),
    };
  }
  if (action.type === "REDO") {
    const next = history.future[0];
    if (!next) return history;
    return {
      past: [...history.past, history.present].slice(-50),
      present: next,
      future: history.future.slice(1),
    };
  }
  const present = reducer(history.present, action);
  if (present === history.present) return history;
  const record = action.type !== "SET_PARAM" || (!action.path.startsWith("cpu") && !action.path.startsWith("midiActivity"));
  return {
    past: record ? [...history.past, history.present].slice(-50) : history.past,
    present,
    future: record ? [] : history.future,
  };
};

export const SynthProvider = ({ children }: { children: ReactNode }) => {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: initializer(),
    future: [],
  }));
  const state = history.present;

  useEffect(() => {
    persistCustomPresets(state.customPresets);
  }, [state.customPresets]);

  const presets = useMemo(() => [...factoryPresets, ...state.customPresets], [state.customPresets]);
  const setParam = useCallback((path: string, value: unknown) => dispatch({ type: "SET_PARAM", path, value }), []);
  const patch = useCallback((value: DeepPartial<SynthState>) => dispatch({ type: "PATCH", patch: value }), []);
  const loadPreset = useCallback((preset: SynthPreset) => dispatch({ type: "LOAD_PRESET", preset }), []);
  const savePreset = useCallback((name: string, category: SynthPreset["category"]) => {
    dispatch({ type: "SAVE_CUSTOM_PRESET", name, category });
  }, []);

  const value = useMemo(
    () => ({ state, presets, dispatch, setParam, patch, loadPreset, savePreset }),
    [state, presets, setParam, patch, loadPreset, savePreset],
  );

  return <SynthContext.Provider value={value}>{children}</SynthContext.Provider>;
};

export const useSynth = () => {
  const context = useContext(SynthContext);
  if (!context) throw new Error("useSynth must be used inside SynthProvider");
  return context;
};

export const oscillatorIds: OscillatorId[] = ["A", "B", "C"];
