import type { LfoConfig, WavetableName, WarpMode } from "../types";
import { clamp } from "../utils/object";

export const wavetableNames: WavetableName[] = [
  "Sine",
  "Triangle",
  "Saw",
  "Square",
  "Pulse",
  "Basic Harmonics",
  "Digital Bright",
  "Soft Pad",
  "Metallic",
  "Bass Growl",
  "Imported",
];

export const warpModes: WarpMode[] = ["Off", "Bend+", "Bend-", "Sync", "PWM", "FM", "Ring"];

export const oscillatorShapes: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];

const harmonicLevel = (name: WavetableName, harmonic: number, position: number) => {
  const n = harmonic;
  switch (name) {
    case "Sine":
      return n === 1 ? 1 : 0;
    case "Triangle":
      return n % 2 ? (n % 4 === 1 ? 1 : -1) / (n * n) : 0;
    case "Saw":
      return 1 / n;
    case "Square":
      return n % 2 ? 1 / n : 0;
    case "Pulse":
      return Math.sin(Math.PI * n * (0.15 + position * 0.45)) / n;
    case "Basic Harmonics":
      return n <= 12 ? (1 / n) * (1 - position * 0.35) : 0;
    case "Digital Bright":
      return n <= 32 ? Math.sin(n * 1.73 + position * 4) / Math.sqrt(n) : 0;
    case "Soft Pad":
      return n <= 18 ? Math.exp(-n * 0.16) * Math.cos(position * n * 0.8) : 0;
    case "Metallic":
      return [1, 2, 5, 7, 11, 17, 23, 29].includes(n) ? Math.sin(n * 2.2) / Math.sqrt(n) : 0;
    case "Bass Growl":
      return n <= 20 ? (Math.sin(n * position * 5.5) + (n % 2 ? 0.8 : -0.3)) / n : 0;
    case "Imported":
      return n <= 14 ? Math.sin(n * 0.9) / n : 0;
    default:
      return 0;
  }
};

export const createWave = (
  ctx: BaseAudioContext,
  name: WavetableName,
  position: number,
  warp: WarpMode,
): PeriodicWave => {
  const size = 64;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  const pos = clamp(position);
  for (let harmonic = 1; harmonic < size; harmonic += 1) {
    let amount = harmonicLevel(name, harmonic, pos);
    if (warp === "Bend+") amount *= 1 + pos * harmonic * 0.04;
    if (warp === "Bend-") amount *= Math.max(0.05, 1 - pos * harmonic * 0.025);
    if (warp === "Sync") amount *= Math.sin(harmonic * (1 + pos * 4));
    if (warp === "PWM") amount *= Math.sin(Math.PI * harmonic * (0.08 + pos * 0.58));
    if (warp === "Ring") amount *= harmonic % 3 === 0 ? -0.6 : 1;
    imag[harmonic] = amount;
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
};

export const sampleWavetable = (name: WavetableName, phase: number, position: number, warp: WarpMode) => {
  const x = phase % 1;
  let value = 0;
  for (let harmonic = 1; harmonic <= 26; harmonic += 1) {
    value += harmonicLevel(name, harmonic, position) * Math.sin(Math.PI * 2 * harmonic * x);
  }
  if (warp === "Sync") value = Math.sin(Math.asin(clamp(value, -1, 1)) * (1 + position * 4));
  if (warp === "Ring") value *= Math.sin(Math.PI * 2 * x * (2 + position * 12));
  if (warp === "Bend+") value = Math.sign(value) * Math.pow(Math.abs(value), 0.72);
  if (warp === "Bend-") value = Math.sign(value) * Math.pow(Math.abs(value), 1.4);
  return clamp(value, -1, 1);
};

export const syncRateToHz = (syncRate: LfoConfig["syncRate"], bpm: number) => {
  const beatHz = bpm / 60;
  const values: Record<LfoConfig["syncRate"], number> = {
    "1/1": beatHz / 4,
    "1/2": beatHz / 2,
    "1/4": beatHz,
    "1/8": beatHz * 2,
    "1/16": beatHz * 4,
    "1/8T": beatHz * 3,
    "1/8D": beatHz * 1.5,
  };
  return values[syncRate];
};

export const lfoValueAt = (lfo: LfoConfig, time: number, bpm: number) => {
  const rate = lfo.sync ? syncRateToHz(lfo.syncRate, bpm) : lfo.rate;
  const phase = (time * Math.max(0.01, rate)) % 1;
  switch (lfo.shape) {
    case "Sine":
      return Math.sin(phase * Math.PI * 2);
    case "Triangle":
      return 1 - Math.abs(phase * 4 - 2);
    case "Saw Up":
      return phase * 2 - 1;
    case "Saw Down":
      return 1 - phase * 2;
    case "Square":
      return phase < 0.5 ? 1 : -1;
    case "Random":
      return Math.sin(Math.floor(phase * 16) * 12.9898 + 78.233) % 1;
    case "Custom": {
      if (lfo.points.length < 2) return 0;
      const points = [...lfo.points].sort((a, b) => a.x - b.x);
      let left = points[0];
      let right = points[1];
      let leftX = left.x;
      let rightX = right.x;
      if (phase < points[0].x) {
        left = points[points.length - 1];
        right = points[0];
        leftX = left.x - 1;
        rightX = right.x;
      } else if (phase > points[points.length - 1].x) {
        left = points[points.length - 1];
        right = points[0];
        leftX = left.x;
        rightX = right.x + 1;
      } else {
        const nextIndex = Math.max(1, points.findIndex((point) => point.x >= phase));
        left = points[nextIndex - 1];
        right = points[nextIndex];
        leftX = left.x;
        rightX = right.x;
      }
      const t = rightX === leftX ? 0 : (phase - leftX) / (rightX - leftX);
      return (left.y + (right.y - left.y) * clamp(t)) * 2 - 1;
    }
    default:
      return 0;
  }
};
