export type TabId = "OSC" | "FX" | "MATRIX" | "SEQ" | "PRESETS";

export type OscillatorId = "A" | "B" | "C";
export type FilterId = "filter1" | "filter2";
export type EnvelopeId = "env1" | "env2" | "env3" | "env4";
export type LfoId = "lfo1" | "lfo2" | "lfo3" | "lfo4";
export type MacroId = "macro1" | "macro2" | "macro3" | "macro4";

export type WavetableName =
  | "Sine"
  | "Triangle"
  | "Saw"
  | "Square"
  | "Pulse"
  | "Basic Harmonics"
  | "Digital Bright"
  | "Soft Pad"
  | "Metallic"
  | "Bass Growl"
  | "Imported";

export type WarpMode =
  | "Bend+"
  | "Bend-"
  | "Sync"
  | "PWM"
  | "FM"
  | "Ring"
  | "Off";

export type SynthMode = "Wavetable" | "Analog" | "Sample" | "Granular";
export type OscRoute = "filter1" | "filter2" | "direct";

export interface OscillatorConfig {
  id: OscillatorId;
  enabled: boolean;
  wavetable: WavetableName;
  position: number;
  octave: number;
  semitone: number;
  fine: number;
  unison: number;
  detune: number;
  width: number;
  phase: number;
  randomPhase: number;
  pan: number;
  level: number;
  warp: WarpMode;
  mode: SynthMode;
  route: OscRoute;
  sampleName?: string;
}

export interface SubConfig {
  enabled: boolean;
  shape: "Sine" | "Triangle" | "Saw" | "Square";
  octave: -2 | -1 | 0;
  directOut: boolean;
  level: number;
}

export interface NoiseConfig {
  enabled: boolean;
  type: "White" | "Pink" | "Tape" | "Air";
  level: number;
  pan: number;
  oneShot: boolean;
}

export type FilterType =
  | "LP12"
  | "LP24"
  | "HP"
  | "BP"
  | "Notch"
  | "Comb"
  | "Formant";

export interface FilterConfig {
  enabled: boolean;
  type: FilterType;
  cutoff: number;
  resonance: number;
  drive: number;
  mix: number;
  keytrack: number;
}

export interface EnvelopeConfig {
  attack: number;
  hold: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LfoPoint {
  x: number;
  y: number;
}

export interface LfoConfig {
  enabled: boolean;
  shape: "Sine" | "Triangle" | "Saw Up" | "Saw Down" | "Square" | "Random" | "Custom";
  rate: number;
  sync: boolean;
  syncRate: "1/1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/8T" | "1/8D";
  trigger: boolean;
  envelope: boolean;
  loop: boolean;
  points: LfoPoint[];
}

export interface MacroConfig {
  name: string;
  value: number;
}

export type ModSource =
  | LfoId
  | EnvelopeId
  | MacroId
  | "velocity"
  | "modWheel"
  | "aftertouch"
  | "noteTracking";

export interface ModAssignment {
  id: string;
  source: ModSource;
  destination: string;
  amount: number;
  curve: "Linear" | "Expo" | "Log" | "S-Curve";
  polarity: "Bipolar" | "Unipolar";
}

export type EffectType =
  | "Distortion"
  | "Chorus"
  | "Phaser"
  | "Flanger"
  | "Compressor"
  | "EQ"
  | "Delay"
  | "Reverb"
  | "Filter FX"
  | "Stereo Width";

export interface EffectConfig {
  id: string;
  type: EffectType;
  enabled: boolean;
  params: Record<string, number | string>;
}

export interface StepConfig {
  active: boolean;
  pitch: number;
  velocity: number;
  gate: number;
}

export interface SequencerConfig {
  playing: boolean;
  bpm: number;
  rootNote: number;
  sync: boolean;
  arpMode: "Up" | "Down" | "Up/Down" | "Random" | "Chord";
  arpRate: "1/4" | "1/8" | "1/16";
  gate: number;
  octaveRange: number;
  steps: StepConfig[];
}

export interface PerformanceConfig {
  masterVolume: number;
  mono: boolean;
  glide: number;
  voices: number;
  sustain: boolean;
  pitchBend: number;
  modWheel: number;
  aftertouch: number;
}

export type PresetCategory = "Bass" | "Lead" | "Pad" | "Pluck" | "Keys" | "FX" | "Sequence";

export interface SynthPreset {
  id: string;
  name: string;
  category: PresetCategory;
  favorite?: boolean;
  state: DeepPartial<SynthState>;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface SynthState {
  activeTab: TabId;
  activePresetId: string;
  cpu: number;
  midiActivity: boolean;
  oscillators: Record<OscillatorId, OscillatorConfig>;
  sub: SubConfig;
  noise: NoiseConfig;
  filters: Record<FilterId, FilterConfig>;
  envelopes: Record<EnvelopeId, EnvelopeConfig>;
  lfos: Record<LfoId, LfoConfig>;
  macros: Record<MacroId, MacroConfig>;
  modMatrix: ModAssignment[];
  effects: EffectConfig[];
  sequencer: SequencerConfig;
  performance: PerformanceConfig;
  customPresets: SynthPreset[];
  importedSamples: string[];
}

export interface SamplePayload {
  name: string;
  buffer: AudioBuffer;
}
