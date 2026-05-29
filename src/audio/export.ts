import type { EffectConfig, FilterConfig, FilterId, NoiseConfig, OscillatorConfig, SynthState } from "../types";
import { clamp } from "../utils/object";
import { createWave } from "./wavetables";
import { encodeWav } from "./wav";

export type DawExportMode = "note" | "chord" | "sequence";

export interface DawExportOptions {
  mode: DawExportMode;
  sampleRate: 44100 | 48000;
  bitDepth: 16 | 24;
  note: number;
  velocity: number;
  duration: number;
  bars: number;
  tail: number;
}

const filterTypeMap: Record<FilterConfig["type"], BiquadFilterType> = {
  LP12: "lowpass",
  LP24: "lowpass",
  HP: "highpass",
  BP: "bandpass",
  Notch: "notch",
  Comb: "allpass",
  Formant: "bandpass",
};

const typeMap: Record<OscillatorConfig["wavetable"], OscillatorType | undefined> = {
  Sine: "sine",
  Triangle: "triangle",
  Saw: "sawtooth",
  Square: "square",
  Pulse: undefined,
  "Basic Harmonics": undefined,
  "Digital Bright": undefined,
  "Soft Pad": undefined,
  Metallic: undefined,
  "Bass Growl": undefined,
  Imported: undefined,
};

const numberParam = (effect: EffectConfig, key: string, fallback: number) => {
  const value = effect.params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const modeParam = (effect: EffectConfig, key: string, fallback: string) => {
  const value = effect.params[key];
  return typeof value === "string" ? value : fallback;
};

const noteFrequency = (note: number, bend = 0) => 440 * 2 ** ((note - 69 + bend * 2) / 12);

const makeCurve = (drive: number, mode: string) => {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const amount = 1 + drive * 44;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    if (mode === "Hard Clip") curve[i] = clamp(x * amount * 0.35, -0.76, 0.76);
    else if (mode === "Bitcrush") curve[i] = Math.round(clamp(x * amount * 0.35, -1, 1) * 12) / 12;
    else if (mode === "Soft Clip") curve[i] = Math.tanh(x * amount * 0.42);
    else curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
};

const impulse = (ctx: OfflineAudioContext, seconds: number, decay: number, size: number) => {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (0.35 + size * 0.65);
    }
  }
  return buffer;
};

const connectEffects = (ctx: OfflineAudioContext, input: AudioNode, output: AudioNode, state: SynthState) => {
  let cursor = input;
  state.effects.forEach((effect) => {
    if (!effect.enabled) return;
    const unitInput = ctx.createGain();
    const unitOutput = ctx.createGain();
    cursor.connect(unitInput);
    cursor = unitOutput;

    if (effect.type === "Distortion") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const shaper = ctx.createWaveShaper();
      const mix = clamp(numberParam(effect, "mix", 0.35));
      dry.gain.value = 1 - mix;
      wet.gain.value = mix;
      shaper.curve = makeCurve(numberParam(effect, "drive", 0.35), modeParam(effect, "mode", "Tube"));
      shaper.oversample = "4x";
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(shaper).connect(wet).connect(unitOutput);
      return;
    }

    if (effect.type === "Chorus" || effect.type === "Flanger") {
      const flanger = effect.type === "Flanger";
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const delay = ctx.createDelay(0.1);
      const feedback = ctx.createGain();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      const mix = clamp(numberParam(effect, "mix", flanger ? 0.18 : 0.26));
      dry.gain.value = 1 - mix;
      wet.gain.value = mix;
      delay.delayTime.value = flanger ? 0.004 : 0.018;
      feedback.gain.value = flanger ? numberParam(effect, "feedback", 0.18) : 0.05;
      lfo.frequency.value = numberParam(effect, "rate", flanger ? 0.18 : 0.28);
      depth.gain.value = numberParam(effect, "depth", 0.32) * (flanger ? 0.004 : 0.014);
      lfo.connect(depth).connect(delay.delayTime);
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(delay).connect(wet).connect(unitOutput);
      delay.connect(feedback).connect(delay);
      lfo.start(0);
      lfo.stop(ctx.length / ctx.sampleRate);
      return;
    }

    if (effect.type === "Phaser") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const allpasses = Array.from({ length: 4 }, (_, index) => {
        const node = ctx.createBiquadFilter();
        node.type = "allpass";
        node.frequency.value = 600 + index * 260;
        return node;
      });
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      const mix = clamp(numberParam(effect, "mix", 0.22));
      dry.gain.value = 1 - mix;
      wet.gain.value = mix;
      lfo.frequency.value = numberParam(effect, "rate", 0.2);
      depth.gain.value = numberParam(effect, "depth", 0.4) * 900;
      allpasses.forEach((node, index) => {
        if (index > 0) allpasses[index - 1].connect(node);
        depth.connect(node.frequency);
      });
      lfo.connect(depth);
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(allpasses[0]);
      allpasses.at(-1)!.connect(wet).connect(unitOutput);
      lfo.start(0);
      lfo.stop(ctx.length / ctx.sampleRate);
      return;
    }

    if (effect.type === "Compressor") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      const mix = clamp(numberParam(effect, "mix", 1));
      dry.gain.value = 1 - mix;
      wet.gain.value = mix;
      compressor.threshold.value = numberParam(effect, "threshold", -18);
      compressor.ratio.value = numberParam(effect, "ratio", 2.5);
      compressor.attack.value = 0.008;
      compressor.release.value = 0.16;
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(compressor).connect(wet).connect(unitOutput);
      return;
    }

    if (effect.type === "EQ") {
      const low = ctx.createBiquadFilter();
      const mid = ctx.createBiquadFilter();
      const high = ctx.createBiquadFilter();
      low.type = "lowshelf";
      mid.type = "peaking";
      high.type = "highshelf";
      low.frequency.value = 160;
      mid.frequency.value = 980;
      high.frequency.value = 5600;
      low.gain.value = numberParam(effect, "low", 0);
      mid.gain.value = numberParam(effect, "mid", 0);
      high.gain.value = numberParam(effect, "high", 0);
      unitInput.connect(low).connect(mid).connect(high).connect(unitOutput);
      return;
    }

    if (effect.type === "Delay") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const delay = ctx.createDelay(2);
      const feedback = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const mix = clamp(numberParam(effect, "mix", 0.22));
      dry.gain.value = 1 - mix * 0.72;
      wet.gain.value = mix;
      delay.delayTime.value = clamp(numberParam(effect, "time", 0.32), 0.03, 1.8);
      feedback.gain.value = clamp(numberParam(effect, "feedback", 0.28), 0, 0.88);
      filter.type = "lowpass";
      filter.frequency.value = numberParam(effect, "filter", 5200);
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(delay).connect(filter).connect(wet).connect(unitOutput);
      filter.connect(feedback).connect(delay);
      return;
    }

    if (effect.type === "Reverb") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const predelay = ctx.createDelay(0.2);
      const convolver = ctx.createConvolver();
      const mix = clamp(numberParam(effect, "mix", 0.2));
      const decay = clamp(numberParam(effect, "decay", 2.2), 0.3, 8);
      const size = numberParam(effect, "size", 0.58);
      dry.gain.value = 1 - mix * 0.6;
      wet.gain.value = mix;
      predelay.delayTime.value = numberParam(effect, "predelay", 0.018);
      convolver.buffer = impulse(ctx, decay, 1.8 + size * 4, size);
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(predelay).connect(convolver).connect(wet).connect(unitOutput);
      return;
    }

    if (effect.type === "Filter FX") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const mix = clamp(numberParam(effect, "mix", 0.3));
      dry.gain.value = 1 - mix;
      wet.gain.value = mix;
      filter.type = "lowpass";
      filter.frequency.value = numberParam(effect, "cutoff", 2400);
      filter.Q.value = numberParam(effect, "resonance", 0.4) * 18;
      unitInput.connect(dry).connect(unitOutput);
      unitInput.connect(filter).connect(wet).connect(unitOutput);
      return;
    }

    if (effect.type === "Stereo Width") {
      const panLeft = ctx.createStereoPanner();
      const panRight = ctx.createStereoPanner();
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      const width = clamp(numberParam(effect, "width", 0.72));
      panLeft.pan.value = -width;
      panRight.pan.value = width;
      leftGain.gain.value = 0.5;
      rightGain.gain.value = 0.5;
      unitInput.connect(leftGain).connect(panLeft).connect(unitOutput);
      unitInput.connect(rightGain).connect(panRight).connect(unitOutput);
      return;
    }

    unitInput.connect(unitOutput);
  });
  cursor.connect(output);
};

const makeNoiseBuffer = (ctx: OfflineAudioContext, noise: NoiseConfig) => {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let pink = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (noise.type === "Pink") {
      pink = pink * 0.98 + white * 0.02;
      data[i] = pink * 3.5;
    } else if (noise.type === "Tape") {
      pink = pink * 0.995 + white * 0.005;
      data[i] = pink * 2 + (Math.random() * 2 - 1) * 0.08;
    } else if (noise.type === "Air") {
      data[i] = white * (Math.random() > 0.4 ? 0.6 : 0.1);
    } else {
      data[i] = white;
    }
  }
  return buffer;
};

const scheduleVoice = (
  ctx: OfflineAudioContext,
  input: AudioNode,
  state: SynthState,
  samples: Map<string, AudioBuffer>,
  note: number,
  velocity: number,
  start: number,
  duration: number,
) => {
  const output = ctx.createGain();
  const directInput = ctx.createGain();
  const filterInputs: Record<FilterId, GainNode> = { filter1: ctx.createGain(), filter2: ctx.createGain() };
  const filters: Record<FilterId, BiquadFilterNode[]> = {
    filter1: [ctx.createBiquadFilter(), ctx.createBiquadFilter()],
    filter2: [ctx.createBiquadFilter(), ctx.createBiquadFilter()],
  };
  const dry: Record<FilterId, GainNode> = { filter1: ctx.createGain(), filter2: ctx.createGain() };
  const wet: Record<FilterId, GainNode> = { filter1: ctx.createGain(), filter2: ctx.createGain() };

  (Object.keys(filterInputs) as FilterId[]).forEach((id) => {
    const filter = state.filters[id];
    dry[id].gain.value = filter.enabled ? 1 - filter.mix : 1;
    wet[id].gain.value = filter.enabled ? filter.mix : 0;
    filterInputs[id].connect(dry[id]).connect(output);
    filterInputs[id].connect(filters[id][0]);
    filters[id][0].connect(filters[id][1]).connect(wet[id]).connect(output);
    filters[id].forEach((node, index) => {
      node.type = filterTypeMap[filter.type];
      const cutoff = filter.cutoff * 2 ** (((note - 60) / 12) * filter.keytrack);
      node.frequency.value = index === 1 && filter.type !== "LP24" ? 22000 : clamp(cutoff, 24, 18000);
      node.Q.value = clamp(filter.resonance * (filter.type === "Formant" ? 30 : 18), 0.0001, 35);
      node.gain.value = filter.drive * 12;
    });
  });

  directInput.connect(output);
  output.connect(input);

  Object.values(state.oscillators).forEach((osc) => {
    if (!osc.enabled) return;
    const voices = Math.max(1, Math.min(16, Math.round(osc.unison)));
    const freq = noteFrequency(note + osc.octave * 12 + osc.semitone, state.performance.pitchBend);
    const destination = osc.route === "filter1" ? filterInputs.filter1 : osc.route === "filter2" ? filterInputs.filter2 : directInput;
    for (let i = 0; i < voices; i += 1) {
      const spread = voices === 1 ? 0 : (i / (voices - 1)) * 2 - 1;
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner();
      gain.gain.value = (osc.level * velocity) / Math.sqrt(voices);
      pan.pan.value = clamp(osc.pan + spread * osc.width * 0.72, -1, 1);
      gain.connect(pan).connect(destination);

      if ((osc.mode === "Sample" || osc.mode === "Granular") && osc.sampleName && samples.has(osc.sampleName)) {
        const source = ctx.createBufferSource();
        const sample = samples.get(osc.sampleName)!;
        source.buffer = sample;
        source.loop = osc.mode !== "Granular";
        source.playbackRate.value = clamp(freq / 261.63, 0.125, 8);
        if (osc.mode === "Granular") source.loopEnd = Math.min(sample.duration, 0.18 + osc.position * 0.8);
        source.connect(gain);
        source.start(start);
        source.stop(start + duration + state.envelopes.env1.release + 0.04);
        return;
      }

      const source = ctx.createOscillator();
      const simpleType = typeMap[osc.wavetable];
      source.frequency.value = freq;
      source.detune.value = osc.fine + spread * osc.detune * 80;
      if (simpleType) source.type = simpleType;
      else source.setPeriodicWave(createWave(ctx, osc.wavetable, osc.position, osc.warp));
      source.connect(gain);
      source.start(start);
      source.stop(start + duration + state.envelopes.env1.release + 0.04);
    }
  });

  if (state.sub.enabled) {
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    const subTypeMap = { Sine: "sine", Triangle: "triangle", Saw: "sawtooth", Square: "square" } as const;
    source.type = subTypeMap[state.sub.shape];
    source.frequency.value = noteFrequency(note + state.sub.octave * 12);
    gain.gain.value = state.sub.level * velocity;
    source.connect(gain).connect(state.sub.directOut ? directInput : filterInputs.filter1);
    source.start(start);
    source.stop(start + duration + state.envelopes.env1.release + 0.04);
  }

  if (state.noise.enabled) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    source.buffer = makeNoiseBuffer(ctx, state.noise);
    source.loop = !state.noise.oneShot;
    gain.gain.value = state.noise.level * velocity;
    pan.pan.value = state.noise.pan;
    source.connect(gain).connect(pan).connect(filterInputs.filter1);
    source.start(start);
    source.stop(start + (state.noise.oneShot ? 0.24 : duration + state.envelopes.env1.release + 0.04));
  }

  const env = state.envelopes.env1;
  const releaseStart = start + duration;
  output.gain.setValueAtTime(0, start);
  output.gain.linearRampToValueAtTime(0.95, start + Math.max(0.001, env.attack));
  const holdEnd = start + env.attack + env.hold;
  output.gain.setValueAtTime(0.95, holdEnd);
  output.gain.linearRampToValueAtTime(env.sustain, holdEnd + Math.max(0.001, env.decay));
  output.gain.setValueAtTime(env.sustain, releaseStart);
  output.gain.linearRampToValueAtTime(0, releaseStart + Math.max(0.01, env.release));
};

export const renderDawWav = async (state: SynthState, samples: Map<string, AudioBuffer>, options: DawExportOptions) => {
  const sequenceSeconds = (options.bars * 4 * 60) / Math.max(1, state.sequencer.bpm);
  const bodySeconds = options.mode === "sequence" ? sequenceSeconds : options.duration;
  const totalSeconds = bodySeconds + state.envelopes.env1.release + options.tail;
  const ctx = new OfflineAudioContext(2, Math.ceil(totalSeconds * options.sampleRate), options.sampleRate);
  const input = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = state.performance.masterVolume;
  connectEffects(ctx, input, master, state);
  master.connect(ctx.destination);

  if (options.mode === "sequence") {
    const stepSeconds = 60 / Math.max(1, state.sequencer.bpm) / ({ "1/4": 1, "1/8": 2, "1/16": 4 }[state.sequencer.arpRate] ?? 4);
    const stepCount = Math.max(1, Math.ceil(sequenceSeconds / stepSeconds));
    for (let i = 0; i < stepCount; i += 1) {
      const step = state.sequencer.steps[i % state.sequencer.steps.length];
      if (!step.active) continue;
      scheduleVoice(ctx, input, state, samples, state.sequencer.rootNote + step.pitch, step.velocity, i * stepSeconds, stepSeconds * step.gate * state.sequencer.gate);
    }
  } else {
    const notes = options.mode === "chord" ? [options.note, options.note + 4, options.note + 7] : [options.note];
    notes.forEach((note) => scheduleVoice(ctx, input, state, samples, note, options.velocity, 0, options.duration));
  }

  const rendered = await ctx.startRendering();
  return encodeWav([rendered.getChannelData(0)], [rendered.getChannelData(1)], options.sampleRate, { bitDepth: options.bitDepth });
};
