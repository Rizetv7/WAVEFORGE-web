import type { SynthPreset } from "../types";

const p = (
  id: string,
  name: string,
  category: SynthPreset["category"],
  state: SynthPreset["state"],
): SynthPreset => ({ id, name, category, state });

export const factoryPresets: SynthPreset[] = [
  p("factory-deep-sub-bass", "Deep Sub Bass", "Bass", {
    oscillators: {
      A: { wavetable: "Sine", octave: -1, unison: 1, level: 0.74, detune: 0.02, warp: "Off", route: "filter1" },
      B: { enabled: true, wavetable: "Square", octave: -2, level: 0.24, unison: 1, route: "filter1" },
      C: { enabled: false },
    },
    sub: { enabled: true, shape: "Sine", octave: -1, level: 0.62 },
    noise: { enabled: false },
    filters: { filter1: { type: "LP24", cutoff: 620, resonance: 0.24, drive: 0.32 } },
    envelopes: { env1: { attack: 0.004, decay: 0.24, sustain: 0.82, release: 0.18 } },
    effects: [
      { id: "fx-distortion", enabled: true, params: { mode: "Soft Clip", drive: 0.32, mix: 0.34 } },
      { id: "fx-delay", enabled: false },
      { id: "fx-reverb", enabled: false },
    ],
  }),
  p("factory-wide-analog-pad", "Wide Analog Pad", "Pad", {
    oscillators: {
      A: { enabled: true, wavetable: "Saw", unison: 7, detune: 0.18, width: 0.95, level: 0.48, route: "filter1" },
      B: { enabled: true, wavetable: "Triangle", octave: 0, semitone: 7, fine: -4, unison: 5, detune: 0.14, level: 0.34 },
      C: { enabled: true, wavetable: "Soft Pad", octave: 1, level: 0.18, route: "filter2" },
    },
    filters: {
      filter1: { type: "LP24", cutoff: 2100, resonance: 0.18, drive: 0.08, keytrack: 0.1 },
      filter2: { enabled: true, type: "BP", cutoff: 1850, resonance: 0.4, mix: 0.45 },
    },
    envelopes: { env1: { attack: 0.72, decay: 1.8, sustain: 0.76, release: 2.1 } },
    effects: [
      { id: "fx-chorus", enabled: true, params: { rate: 0.22, depth: 0.45, mix: 0.34 } },
      { id: "fx-reverb", enabled: true, params: { size: 0.72, decay: 3.4, predelay: 0.024, mix: 0.33 } },
    ],
  }),
  p("factory-glass-pluck", "Glass Pluck", "Pluck", {
    oscillators: {
      A: { wavetable: "Digital Bright", octave: 1, position: 0.78, unison: 2, detune: 0.04, level: 0.48 },
      B: { enabled: true, wavetable: "Sine", octave: 2, semitone: 7, level: 0.18, warp: "FM" },
      C: { enabled: false },
    },
    filters: { filter1: { type: "LP12", cutoff: 4300, resonance: 0.28, drive: 0.02 } },
    envelopes: { env1: { attack: 0.002, hold: 0, decay: 0.42, sustain: 0.04, release: 0.32 } },
    effects: [
      { id: "fx-delay", enabled: true, params: { time: 0.22, feedback: 0.34, filter: 7200, mix: 0.28, pingpong: 1 } },
      { id: "fx-reverb", enabled: true, params: { size: 0.52, decay: 2.1, mix: 0.22 } },
    ],
  }),
  p("factory-psychedelic-sweep", "Psychedelic Sweep", "FX", {
    oscillators: {
      A: { wavetable: "Metallic", unison: 4, detune: 0.18, level: 0.44, warp: "Bend+" },
      B: { enabled: true, wavetable: "Digital Bright", octave: 1, semitone: -5, level: 0.28, warp: "Ring" },
      C: { enabled: true, wavetable: "Metallic", level: 0.1 },
    },
    noise: { enabled: true, type: "Tape", level: 0.2 },
    filters: { filter1: { type: "BP", cutoff: 1450, resonance: 0.72, drive: 0.35 } },
    lfos: { lfo1: { shape: "Saw Up", sync: true, syncRate: "1/2", rate: 0.45 } },
    modMatrix: [{ id: "sweep-cutoff", source: "lfo1", destination: "filters.filter1.cutoff", amount: 0.72, curve: "S-Curve", polarity: "Unipolar" }],
  }),
  p("factory-dreamy-lead", "Dreamy Lead", "Lead", {
    oscillators: {
      A: { wavetable: "Saw", unison: 4, detune: 0.09, width: 0.7, level: 0.48 },
      B: { enabled: true, wavetable: "Pulse", octave: 0, semitone: 7, fine: 3, level: 0.26 },
      C: { enabled: false },
    },
    performance: { mono: true, glide: 0.08 },
    filters: { filter1: { type: "LP24", cutoff: 3100, resonance: 0.22 } },
    envelopes: { env1: { attack: 0.018, decay: 0.38, sustain: 0.62, release: 0.42 } },
    effects: [
      { id: "fx-delay", enabled: true, params: { time: 0.28, feedback: 0.38, mix: 0.26 } },
      { id: "fx-reverb", enabled: true, params: { decay: 2.8, mix: 0.24 } },
    ],
  }),
  p("factory-distorted-growl", "Distorted Growl Bass", "Bass", {
    oscillators: {
      A: { wavetable: "Bass Growl", octave: -1, position: 0.9, unison: 2, detune: 0.06, level: 0.54, warp: "Bend-" },
      B: { enabled: true, wavetable: "Square", octave: -1, fine: -7, level: 0.26, warp: "PWM" },
      C: { enabled: true, wavetable: "Sine", octave: -2, level: 0.2 },
    },
    filters: { filter1: { type: "LP24", cutoff: 1100, resonance: 0.36, drive: 0.55 } },
    effects: [
      { id: "fx-distortion", enabled: true, params: { mode: "Tube", drive: 0.68, mix: 0.58 } },
      { id: "fx-compressor", enabled: true, params: { threshold: -25, ratio: 4 } },
    ],
  }),
  p("factory-vintage-keys", "Vintage Keys", "Keys", {
    oscillators: {
      A: { wavetable: "Triangle", unison: 2, detune: 0.05, level: 0.52 },
      B: { enabled: true, wavetable: "Square", octave: 0, fine: 8, level: 0.2 },
      C: { enabled: false },
    },
    filters: { filter1: { type: "LP12", cutoff: 2800, resonance: 0.16, drive: 0.18 } },
    effects: [
      { id: "fx-chorus", enabled: true, params: { rate: 0.5, depth: 0.28, mix: 0.28 } },
      { id: "fx-reverb", enabled: true, params: { decay: 1.6, mix: 0.16 } },
    ],
  }),
  p("factory-airy-texture", "Airy Texture", "FX", {
    oscillators: {
      A: { wavetable: "Soft Pad", octave: 1, level: 0.3, unison: 6, detune: 0.22 },
      B: { enabled: true, wavetable: "Sine", octave: 2, level: 0.15 },
      C: { enabled: false },
    },
    noise: { enabled: true, type: "Air", level: 0.3 },
    envelopes: { env1: { attack: 1.4, decay: 2.4, sustain: 0.72, release: 3.2 } },
    effects: [{ id: "fx-reverb", enabled: true, params: { size: 0.86, decay: 5.2, mix: 0.46 } }],
  }),
  p("factory-pulsing-sequence", "Pulsing Sequence", "Sequence", {
    oscillators: {
      A: { wavetable: "Pulse", octave: 0, unison: 1, level: 0.48 },
      B: { enabled: true, wavetable: "Saw", octave: -1, level: 0.22 },
      C: { enabled: false },
    },
    filters: { filter1: { cutoff: 1650, resonance: 0.38, drive: 0.22 } },
    envelopes: { env1: { attack: 0.004, decay: 0.16, sustain: 0.2, release: 0.16 } },
    sequencer: { playing: true, bpm: 132 },
  }),
  p("factory-neon-bass", "Neon Bass", "Bass", { oscillators: { A: { wavetable: "Saw", octave: -1, unison: 3, detune: 0.08 }, B: { enabled: true, wavetable: "Pulse", octave: -1, level: 0.22 } }, filters: { filter1: { cutoff: 900, drive: 0.45 } } }),
  p("factory-soft-lead", "Soft Prism Lead", "Lead", { oscillators: { A: { wavetable: "Basic Harmonics", unison: 3, detune: 0.06 }, B: { enabled: true, wavetable: "Triangle", semitone: 12, level: 0.12 } }, effects: [{ id: "fx-delay", enabled: true, params: { mix: 0.22 } }] }),
  p("factory-ice-pad", "Ice Pad", "Pad", { oscillators: { A: { wavetable: "Digital Bright", octave: 1, unison: 5, detune: 0.16 }, B: { enabled: true, wavetable: "Soft Pad", octave: 0, level: 0.26 } }, filters: { filter1: { cutoff: 3600 } }, envelopes: { env1: { attack: 1.1, decay: 2, sustain: 0.7, release: 2.8 } } }),
  p("factory-click-pluck", "Click Pluck", "Pluck", { oscillators: { A: { wavetable: "Square", level: 0.42 }, B: { enabled: true, wavetable: "Sine", octave: 2, level: 0.12 } }, envelopes: { env1: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 } }, filters: { filter1: { cutoff: 6200 } } }),
  p("factory-cyber-keys", "Cyber Keys", "Keys", { oscillators: { A: { wavetable: "Pulse", unison: 2 }, B: { enabled: true, wavetable: "Digital Bright", octave: 1, level: 0.14 } }, effects: [{ id: "fx-chorus", enabled: true }, { id: "fx-delay", enabled: true }] }),
  p("factory-formant-wah", "Formant Wah", "FX", { filters: { filter1: { type: "Formant", cutoff: 900, resonance: 0.64 } }, lfos: { lfo1: { shape: "Triangle", sync: true, syncRate: "1/8" } }, modMatrix: [{ id: "wah-lfo", source: "lfo1", destination: "filters.filter1.cutoff", amount: 0.55, curve: "S-Curve", polarity: "Bipolar" }] }),
  p("factory-moon-sequence", "Moon Sequence", "Sequence", { oscillators: { A: { wavetable: "Sine", octave: 1 }, B: { enabled: true, wavetable: "Pulse", level: 0.18 } }, sequencer: { playing: true, bpm: 98 }, effects: [{ id: "fx-delay", enabled: true, params: { time: 0.38, feedback: 0.42, mix: 0.31 } }] }),
  p("factory-rubber-bass", "Rubber Bass", "Bass", { oscillators: { A: { wavetable: "Square", octave: -1, warp: "PWM" }, B: { enabled: true, wavetable: "Sine", octave: -1, level: 0.24 } }, filters: { filter1: { cutoff: 760, resonance: 0.48, drive: 0.28 } } }),
  p("factory-lumen-pad", "Lumen Pad", "Pad", { oscillators: { A: { wavetable: "Soft Pad", unison: 8, detune: 0.2, level: 0.42 }, B: { enabled: true, wavetable: "Triangle", semitone: 7, level: 0.24 } }, effects: [{ id: "fx-reverb", enabled: true, params: { mix: 0.42, decay: 4.8 } }] }),
  p("factory-arcade-lead", "Arcade Lead", "Lead", { oscillators: { A: { wavetable: "Pulse", unison: 1, level: 0.5 }, B: { enabled: true, wavetable: "Square", octave: 1, level: 0.16 } }, effects: [{ id: "fx-distortion", enabled: true, params: { mode: "Bitcrush", drive: 0.28, mix: 0.3 } }] }),
  p("factory-tape-keys", "Tape Keys", "Keys", { oscillators: { A: { wavetable: "Triangle", fine: -8 }, B: { enabled: true, wavetable: "Saw", fine: 8, level: 0.12 } }, noise: { enabled: true, type: "Tape", level: 0.08 }, filters: { filter1: { cutoff: 2400, drive: 0.12 } } }),
];

export const presetCategories = ["Bass", "Lead", "Pad", "Pluck", "Keys", "FX", "Sequence"] as const;
