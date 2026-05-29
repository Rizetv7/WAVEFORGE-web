import type {
  EffectConfig,
  FilterConfig,
  FilterId,
  ModSource,
  NoiseConfig,
  OscillatorConfig,
  OscillatorId,
  SamplePayload,
  SubConfig,
  SynthState,
} from "../types";
import { clamp, getAtPath } from "../utils/object";
import type { DawExportOptions } from "./export";
import { renderDawWav } from "./export";
import { createWave, lfoValueAt } from "./wavetables";
import { encodeWav } from "./wav";

interface VoiceOscNode {
  oscId: OscillatorId | "sub" | "noise";
  node: AudioScheduledSourceNode;
  gain: GainNode;
  pan?: StereoPannerNode;
  baseDetune?: number;
}

interface Voice {
  id: string;
  note: number;
  velocity: number;
  output: GainNode;
  filterInputs: Record<FilterId, GainNode>;
  directInput: GainNode;
  filters: Record<FilterId, BiquadFilterNode[]>;
  filterDry: Record<FilterId, GainNode>;
  filterWet: Record<FilterId, GainNode>;
  oscillators: VoiceOscNode[];
  createdAt: number;
  releaseTimer?: number;
}

interface EffectUnit {
  id: string;
  input: GainNode;
  output: GainNode;
  update: (effect: EffectConfig, state: SynthState) => void;
  dispose?: () => void;
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

const numberParam = (effect: EffectConfig, key: string, fallback: number) => {
  const value = effect.params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const modeParam = (effect: EffectConfig, key: string, fallback: string) => {
  const value = effect.params[key];
  return typeof value === "string" ? value : fallback;
};

const impulse = (ctx: AudioContext, seconds: number, decay: number, size: number) => {
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

const makeNoiseBuffer = (ctx: AudioContext, noise: NoiseConfig) => {
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

const noteFrequency = (note: number, bend = 0) => 440 * 2 ** ((note - 69 + bend * 2) / 12);

class WaveForgeEngine {
  private ctx?: AudioContext;
  private input?: GainNode;
  private master?: GainNode;
  private analyser?: AnalyserNode;
  private effects = new Map<string, EffectUnit>();
  private effectHash = "";
  private voices = new Map<string, Voice>();
  private heldNotes = new Set<number>();
  private sustainHeld = new Set<number>();
  private samples = new Map<string, AudioBuffer>();
  private state?: SynthState;
  private lfoTimer?: number;
  private recorder?: ScriptProcessorNode;
  private recordLeft: Float32Array[] = [];
  private recordRight: Float32Array[] = [];
  private recording = false;

  async ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.input = this.ctx.createGain();
      this.master = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.input.connect(this.master);
      this.lfoTimer = window.setInterval(() => this.modulationTick(), 24);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  get context() {
    return this.ctx;
  }

  get analyserNode() {
    return this.analyser;
  }

  update(state: SynthState) {
    this.state = state;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(state.performance.masterVolume, this.ctx.currentTime, 0.015);
    this.rebuildEffectsIfNeeded(state);
    state.effects.forEach((effect) => this.effects.get(effect.id)?.update(effect, state));
    this.voices.forEach((voice) => this.updateVoice(voice));
  }

  async addSample(sample: SamplePayload) {
    await this.ensure();
    this.samples.set(sample.name, sample.buffer);
  }

  async decodeSample(file: File): Promise<SamplePayload> {
    const ctx = await this.ensure();
    const buffer = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(buffer.slice(0));
    this.samples.set(file.name, audio);
    return { name: file.name, buffer: audio };
  }

  sampleNames() {
    return Array.from(this.samples.keys());
  }

  async noteOn(note: number, velocity = 0.82) {
    const ctx = await this.ensure();
    if (!this.state || !this.input) return;
    const state = this.state;

    if (state.performance.mono) this.allNotesOff(true);
    this.heldNotes.add(note);
    while (this.voices.size >= state.performance.voices) {
      const oldest = [...this.voices.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!oldest) break;
      this.releaseVoice(oldest, 0.02, true);
    }

    const voice = this.createVoice(ctx, note, velocity, state);
    this.voices.set(voice.id, voice);
  }

  noteOff(note: number) {
    this.heldNotes.delete(note);
    if (this.state?.performance.sustain) {
      this.sustainHeld.add(note);
      return;
    }
    this.voices.forEach((voice) => {
      if (voice.note === note) this.releaseVoice(voice);
    });
  }

  setSustain(enabled: boolean) {
    if (!enabled) {
      this.sustainHeld.forEach((note) => this.noteOff(note));
      this.sustainHeld.clear();
    }
  }

  allNotesOff(fast = false) {
    this.heldNotes.clear();
    this.sustainHeld.clear();
    this.voices.forEach((voice) => this.releaseVoice(voice, fast ? 0.025 : undefined, true));
  }

  startRecording() {
    if (!this.ctx || !this.master || this.recording) return false;
    this.recordLeft = [];
    this.recordRight = [];
    this.recorder = this.ctx.createScriptProcessor(2048, 2, 2);
    this.recorder.onaudioprocess = (event) => {
      if (!this.recording) return;
      this.recordLeft.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      this.recordRight.push(new Float32Array(event.inputBuffer.getChannelData(1)));
    };
    this.master.connect(this.recorder);
    this.recorder.connect(this.ctx.destination);
    this.recording = true;
    return true;
  }

  stopRecording() {
    if (!this.ctx || !this.recording) return undefined;
    this.recording = false;
    this.recorder?.disconnect();
    this.recorder = undefined;
    return encodeWav(this.recordLeft, this.recordRight, this.ctx.sampleRate);
  }

  exportDawWav(state: SynthState, options: DawExportOptions) {
    return renderDawWav(state, this.samples, options);
  }

  private createVoice(ctx: AudioContext, note: number, velocity: number, state: SynthState): Voice {
    const id = `${note}-${performance.now()}-${Math.random()}`;
    const output = ctx.createGain();
    output.gain.value = 0;
    output.connect(this.input!);

    const filterInputs = { filter1: ctx.createGain(), filter2: ctx.createGain() };
    const directInput = ctx.createGain();
    const filters = {
      filter1: [ctx.createBiquadFilter(), ctx.createBiquadFilter()],
      filter2: [ctx.createBiquadFilter(), ctx.createBiquadFilter()],
    };
    const filterDry = { filter1: ctx.createGain(), filter2: ctx.createGain() };
    const filterWet = { filter1: ctx.createGain(), filter2: ctx.createGain() };

    (Object.keys(filterInputs) as FilterId[]).forEach((idKey) => {
      filterInputs[idKey].connect(filterDry[idKey]);
      filterDry[idKey].connect(output);
      filterInputs[idKey].connect(filters[idKey][0]);
      filters[idKey][0].connect(filters[idKey][1]);
      filters[idKey][1].connect(filterWet[idKey]);
      filterWet[idKey].connect(output);
    });
    directInput.connect(output);

    const voice: Voice = {
      id,
      note,
      velocity,
      output,
      filterInputs,
      directInput,
      filters,
      filterDry,
      filterWet,
      oscillators: [],
      createdAt: ctx.currentTime,
    };

    Object.values(state.oscillators).forEach((osc) => {
      if (osc.enabled) this.createOscillatorsForVoice(ctx, voice, osc, note, velocity, state);
    });
    if (state.sub.enabled) this.createSub(ctx, voice, state.sub, note, velocity);
    if (state.noise.enabled) this.createNoise(ctx, voice, state.noise, velocity);

    this.updateVoice(voice);
    this.applyAmpEnvelope(voice, state);
    return voice;
  }

  private destinationForVoice(voice: Voice, route: OscillatorConfig["route"]) {
    if (route === "filter1") return voice.filterInputs.filter1;
    if (route === "filter2") return voice.filterInputs.filter2;
    return voice.directInput;
  }

  private createOscillatorsForVoice(
    ctx: AudioContext,
    voice: Voice,
    osc: OscillatorConfig,
    note: number,
    velocity: number,
    state: SynthState,
  ) {
    const voices = Math.max(1, Math.min(16, Math.round(osc.unison)));
    const freq = noteFrequency(note + osc.octave * 12 + osc.semitone, state.performance.pitchBend);
    const baseLevel = this.modulated("oscillators." + osc.id + ".level", osc.level, voice);
    const sample = osc.sampleName ? this.samples.get(osc.sampleName) : undefined;

    for (let i = 0; i < voices; i += 1) {
      const spread = voices === 1 ? 0 : (i / (voices - 1)) * 2 - 1;
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner();
      gain.gain.value = (baseLevel * velocity) / Math.sqrt(voices);
      pan.pan.value = clamp(osc.pan + spread * osc.width * 0.72, -1, 1);
      gain.connect(pan);
      pan.connect(this.destinationForVoice(voice, osc.route));

      let source: AudioScheduledSourceNode;
      if ((osc.mode === "Sample" || osc.mode === "Granular") && sample) {
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = sample;
        bufferSource.loop = osc.mode !== "Granular";
        bufferSource.playbackRate.value = clamp(freq / 261.63, 0.125, 8);
        if (osc.mode === "Granular") bufferSource.loopEnd = Math.min(sample.duration, 0.18 + osc.position * 0.8);
        bufferSource.connect(gain);
        source = bufferSource;
      } else {
        const oscillator = ctx.createOscillator();
        oscillator.frequency.value = freq;
        oscillator.detune.value = osc.fine + spread * osc.detune * 80 + (Math.random() - 0.5) * osc.randomPhase * 24;
        oscillator.setPeriodicWave(createWave(ctx, osc.wavetable, osc.position, osc.warp));
        oscillator.connect(gain);
        source = oscillator;
      }

      source.start();
      voice.oscillators.push({ oscId: osc.id, node: source, gain, pan, baseDetune: spread * osc.detune * 80 + osc.fine });
    }
  }

  private createSub(ctx: AudioContext, voice: Voice, sub: SubConfig, note: number, velocity: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const typeMap = { Sine: "sine", Triangle: "triangle", Saw: "sawtooth", Square: "square" } as const;
    osc.type = typeMap[sub.shape];
    osc.frequency.value = noteFrequency(note + sub.octave * 12);
    gain.gain.value = sub.level * velocity;
    osc.connect(gain);
    gain.connect(sub.directOut ? voice.directInput : voice.filterInputs.filter1);
    osc.start();
    voice.oscillators.push({ oscId: "sub", node: osc, gain });
  }

  private createNoise(ctx: AudioContext, voice: Voice, noise: NoiseConfig, velocity: number) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    source.buffer = makeNoiseBuffer(ctx, noise);
    source.loop = !noise.oneShot;
    gain.gain.value = noise.level * velocity;
    pan.pan.value = noise.pan;
    source.connect(gain);
    gain.connect(pan);
    pan.connect(voice.filterInputs.filter1);
    source.start();
    if (noise.oneShot) source.stop(ctx.currentTime + 0.24);
    voice.oscillators.push({ oscId: "noise", node: source, gain, pan });
  }

  private applyAmpEnvelope(voice: Voice, state: SynthState) {
    const ctx = this.ctx!;
    const env = state.envelopes.env1;
    const now = ctx.currentTime;
    const peak = 0.95;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setValueAtTime(0, now);
    voice.output.gain.linearRampToValueAtTime(peak, now + Math.max(0.001, env.attack));
    const holdEnd = now + env.attack + env.hold;
    voice.output.gain.setValueAtTime(peak, holdEnd);
    voice.output.gain.linearRampToValueAtTime(env.sustain, holdEnd + Math.max(0.001, env.decay));
  }

  private releaseVoice(voice: Voice, releaseOverride?: number, force = false) {
    const ctx = this.ctx;
    const state = this.state;
    if (!ctx || !state) return;
    const release = releaseOverride ?? state.envelopes.env1.release;
    const now = ctx.currentTime;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setValueAtTime(voice.output.gain.value, now);
    voice.output.gain.linearRampToValueAtTime(0, now + Math.max(0.01, release));
    window.clearTimeout(voice.releaseTimer);
    voice.releaseTimer = window.setTimeout(() => {
      voice.oscillators.forEach((entry) => {
        try {
          entry.node.stop();
        } catch {
          /* node already stopped */
        }
        entry.node.disconnect();
        entry.gain.disconnect();
        entry.pan?.disconnect();
      });
      voice.output.disconnect();
      this.voices.delete(voice.id);
    }, Math.ceil((release + (force ? 0.02 : 0.08)) * 1000));
  }

  private updateVoice(voice: Voice) {
    if (!this.ctx || !this.state) return;
    const state = this.state;
    (["filter1", "filter2"] as FilterId[]).forEach((id) => {
      const filter = state.filters[id];
      const wet = filter.enabled ? filter.mix : 0;
      voice.filterWet[id].gain.setTargetAtTime(wet, this.ctx!.currentTime, 0.012);
      voice.filterDry[id].gain.setTargetAtTime(1 - wet, this.ctx!.currentTime, 0.012);
      voice.filters[id].forEach((node, index) => {
        node.type = filterTypeMap[filter.type];
        const keytracked = filter.cutoff * 2 ** (((voice.note - 60) / 12) * filter.keytrack);
        const modCutoff = this.modulated(`filters.${id}.cutoff`, keytracked, voice);
        node.frequency.setTargetAtTime(clamp(modCutoff, 24, 18000), this.ctx!.currentTime, 0.018);
        node.Q.setTargetAtTime(clamp(filter.resonance * (filter.type === "Formant" ? 30 : 18), 0.0001, 35), this.ctx!.currentTime, 0.018);
        node.gain.setTargetAtTime(filter.drive * 12 + (index === 1 && filter.type === "LP24" ? 0 : 0), this.ctx!.currentTime, 0.018);
        if (filter.type !== "LP24" && index === 1) node.frequency.setTargetAtTime(22000, this.ctx!.currentTime, 0.018);
      });
    });

    voice.oscillators.forEach((entry) => {
      if (entry.oscId === "sub" || entry.oscId === "noise") return;
      const osc = state.oscillators[entry.oscId];
      const level = this.modulated(`oscillators.${entry.oscId}.level`, osc.level, voice);
      entry.gain.gain.setTargetAtTime((level * voice.velocity) / Math.sqrt(Math.max(1, osc.unison)), this.ctx!.currentTime, 0.018);
      entry.pan?.pan.setTargetAtTime(this.modulated(`oscillators.${entry.oscId}.pan`, osc.pan, voice), this.ctx!.currentTime, 0.018);
    });
  }

  private sourceValue(source: ModSource, voice?: Voice) {
    if (!this.ctx || !this.state) return 0;
    if (source.startsWith("lfo")) return lfoValueAt(this.state.lfos[source as keyof SynthState["lfos"]], this.ctx.currentTime, this.state.sequencer.bpm);
    if (source.startsWith("macro")) return this.state.macros[source as keyof SynthState["macros"]].value * 2 - 1;
    if (source === "velocity") return (voice?.velocity ?? 0.75) * 2 - 1;
    if (source === "modWheel") return this.state.performance.modWheel * 2 - 1;
    if (source === "aftertouch") return this.state.performance.aftertouch * 2 - 1;
    if (source === "noteTracking") return voice ? clamp((voice.note - 60) / 24, -1, 1) : 0;
    if (source.startsWith("env")) return voice ? clamp((this.ctx.currentTime - voice.createdAt) / 1.5, 0, 1) * 2 - 1 : 0;
    return 0;
  }

  private modulated(path: string, base: number, voice?: Voice) {
    if (!this.state) return base;
    let sum = 0;
    this.state.modMatrix.forEach((assignment) => {
      if (assignment.destination !== path) return;
      let value = this.sourceValue(assignment.source, voice);
      if (assignment.polarity === "Unipolar") value = (value + 1) / 2;
      if (assignment.curve === "Expo") value = Math.sign(value) * value * value;
      if (assignment.curve === "Log") value = Math.sign(value) * Math.sqrt(Math.abs(value));
      if (assignment.curve === "S-Curve") value = Math.tanh(value * 1.7);
      sum += value * assignment.amount;
    });
    if (path.endsWith(".cutoff")) return clamp(base * 2 ** (sum * 4.5), 20, 19000);
    if (path.endsWith(".pan")) return clamp(base + sum, -1, 1);
    if (path.endsWith(".level") || path.endsWith(".mix")) return clamp(base + sum, 0, 1);
    return base + sum;
  }

  private effectValue(effect: EffectConfig, key: string, fallback: number, min = -Number.MAX_VALUE, max = Number.MAX_VALUE) {
    return clamp(this.modulated(`effects.${effect.id}.${key}`, numberParam(effect, key, fallback)), min, max);
  }

  private modulationTick() {
    if (!this.ctx || !this.state) return;
    this.voices.forEach((voice) => this.updateVoice(voice));
    this.state.effects.forEach((effect) => this.effects.get(effect.id)?.update(effect, this.state!));
  }

  private rebuildEffectsIfNeeded(state: SynthState) {
    if (!this.ctx || !this.input || !this.master) return;
    const hash = state.effects.map((fx) => `${fx.id}:${fx.type}:${fx.enabled}`).join("|");
    if (hash === this.effectHash) return;
    this.effectHash = hash;
    this.input.disconnect();
    this.effects.forEach((unit) => {
      unit.dispose?.();
      unit.input.disconnect();
      unit.output.disconnect();
    });
    this.effects.clear();

    let cursor: AudioNode = this.input;
    state.effects.forEach((effect) => {
      const unit = this.createEffectUnit(effect);
      this.effects.set(effect.id, unit);
      cursor.connect(unit.input);
      cursor = unit.output;
    });
    cursor.connect(this.master);
  }

  private createPassUnit(id: string): EffectUnit {
    const ctx = this.ctx!;
    const input = ctx.createGain();
    const output = ctx.createGain();
    input.connect(output);
    return { id, input, output, update: () => undefined };
  }

  private createEffectUnit(effect: EffectConfig): EffectUnit {
    if (!this.ctx || !effect.enabled) return this.createPassUnit(effect.id);
    const ctx = this.ctx;
    const input = ctx.createGain();
    const output = ctx.createGain();

    if (effect.type === "Distortion") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const shaper = ctx.createWaveShaper();
      input.connect(dry).connect(output);
      input.connect(shaper).connect(wet).connect(output);
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          const mix = this.effectValue(fx, "mix", 0.35, 0, 1);
          dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.02);
          wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.02);
          shaper.curve = makeCurve(this.effectValue(fx, "drive", 0.35, 0, 1), modeParam(fx, "mode", "Tube"));
          shaper.oversample = "4x";
        },
      };
    }

    if (effect.type === "Chorus" || effect.type === "Flanger") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const delay = ctx.createDelay(0.1);
      const feedback = ctx.createGain();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.connect(depth).connect(delay.delayTime);
      input.connect(dry).connect(output);
      input.connect(delay).connect(wet).connect(output);
      delay.connect(feedback).connect(delay);
      lfo.start();
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          const flanger = fx.type === "Flanger";
          const mix = this.effectValue(fx, "mix", flanger ? 0.18 : 0.26, 0, 1);
          dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.02);
          wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.02);
          delay.delayTime.setTargetAtTime(flanger ? 0.004 : 0.018, ctx.currentTime, 0.02);
          feedback.gain.setTargetAtTime(flanger ? this.effectValue(fx, "feedback", 0.18, 0, 0.96) : 0.05, ctx.currentTime, 0.02);
          lfo.frequency.setTargetAtTime(this.effectValue(fx, "rate", flanger ? 0.18 : 0.28, 0.01, 8), ctx.currentTime, 0.02);
          depth.gain.setTargetAtTime(this.effectValue(fx, "depth", 0.32, 0, 1) * (flanger ? 0.004 : 0.014), ctx.currentTime, 0.02);
        },
        dispose: () => lfo.stop(),
      };
    }

    if (effect.type === "Phaser") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const allpasses = Array.from({ length: 4 }, () => ctx.createBiquadFilter());
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      allpasses.forEach((node, index) => {
        node.type = "allpass";
        node.frequency.value = 600 + index * 260;
        if (index > 0) allpasses[index - 1].connect(node);
      });
      lfo.connect(depth);
      allpasses.forEach((node) => depth.connect(node.frequency));
      input.connect(dry).connect(output);
      input.connect(allpasses[0]);
      allpasses[allpasses.length - 1].connect(wet).connect(output);
      lfo.start();
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          const mix = this.effectValue(fx, "mix", 0.22, 0, 1);
          dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.02);
          wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.02);
          lfo.frequency.setTargetAtTime(this.effectValue(fx, "rate", 0.2, 0.01, 8), ctx.currentTime, 0.02);
          depth.gain.setTargetAtTime(this.effectValue(fx, "depth", 0.4, 0, 1) * 900, ctx.currentTime, 0.02);
        },
        dispose: () => lfo.stop(),
      };
    }

    if (effect.type === "Compressor") {
      const compressor = ctx.createDynamicsCompressor();
      input.connect(compressor).connect(output);
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          compressor.threshold.setTargetAtTime(this.effectValue(fx, "threshold", -18, -60, 0), ctx.currentTime, 0.02);
          compressor.ratio.setTargetAtTime(this.effectValue(fx, "ratio", 2.5, 1, 20), ctx.currentTime, 0.02);
          compressor.attack.setTargetAtTime(0.008, ctx.currentTime, 0.02);
          compressor.release.setTargetAtTime(0.16, ctx.currentTime, 0.02);
        },
      };
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
      input.connect(low).connect(mid).connect(high).connect(output);
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          low.gain.setTargetAtTime(this.effectValue(fx, "low", 0, -12, 12), ctx.currentTime, 0.02);
          mid.gain.setTargetAtTime(this.effectValue(fx, "mid", 0, -12, 12), ctx.currentTime, 0.02);
          high.gain.setTargetAtTime(this.effectValue(fx, "high", 0, -12, 12), ctx.currentTime, 0.02);
        },
      };
    }

    if (effect.type === "Delay") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const delay = ctx.createDelay(2);
      const feedback = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      input.connect(dry).connect(output);
      input.connect(delay).connect(filter).connect(wet).connect(output);
      filter.connect(feedback).connect(delay);
      return {
        id: effect.id,
        input,
        output,
        update: (fx, synth) => {
          const baseTime = this.effectValue(fx, "time", 0.32, 0.03, 1.8);
          const time = synth.sequencer.sync ? 60 / synth.sequencer.bpm : baseTime;
          const modMix = this.effectValue(fx, "mix", 0.22, 0, 1);
          dry.gain.setTargetAtTime(1 - modMix * 0.72, ctx.currentTime, 0.02);
          wet.gain.setTargetAtTime(modMix, ctx.currentTime, 0.02);
          delay.delayTime.setTargetAtTime(clamp(time, 0.03, 1.8), ctx.currentTime, 0.02);
          feedback.gain.setTargetAtTime(this.effectValue(fx, "feedback", 0.28, 0, 0.88), ctx.currentTime, 0.02);
          filter.frequency.setTargetAtTime(this.effectValue(fx, "filter", 5200, 400, 16000), ctx.currentTime, 0.02);
        },
      };
    }

    if (effect.type === "Reverb") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const predelay = ctx.createDelay(0.2);
      const convolver = ctx.createConvolver();
      input.connect(dry).connect(output);
      input.connect(predelay).connect(convolver).connect(wet).connect(output);
      let impulseKey = "";
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          const mix = this.effectValue(fx, "mix", 0.2, 0, 1);
          const decay = this.effectValue(fx, "decay", 2.2, 0.3, 8);
          const size = this.effectValue(fx, "size", 0.58, 0, 1);
          const key = `${decay.toFixed(2)}:${size.toFixed(2)}`;
          if (key !== impulseKey) {
            impulseKey = key;
            convolver.buffer = impulse(ctx, clamp(decay, 0.3, 8), 1.8 + size * 4, size);
          }
          dry.gain.setTargetAtTime(1 - mix * 0.6, ctx.currentTime, 0.02);
          wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.02);
          predelay.delayTime.setTargetAtTime(this.effectValue(fx, "predelay", 0.018, 0, 0.2), ctx.currentTime, 0.02);
        },
      };
    }

    if (effect.type === "Filter FX") {
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      input.connect(dry).connect(output);
      input.connect(filter).connect(wet).connect(output);
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          const mix = this.effectValue(fx, "mix", 0.3, 0, 1);
          dry.gain.setTargetAtTime(1 - mix, ctx.currentTime, 0.02);
          wet.gain.setTargetAtTime(mix, ctx.currentTime, 0.02);
          filter.frequency.setTargetAtTime(this.effectValue(fx, "cutoff", 2400, 80, 14000), ctx.currentTime, 0.02);
          filter.Q.setTargetAtTime(this.effectValue(fx, "resonance", 0.4, 0, 1) * 18, ctx.currentTime, 0.02);
        },
      };
    }

    if (effect.type === "Stereo Width") {
      const panLeft = ctx.createStereoPanner();
      const panRight = ctx.createStereoPanner();
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      input.connect(leftGain).connect(panLeft).connect(output);
      input.connect(rightGain).connect(panRight).connect(output);
      return {
        id: effect.id,
        input,
        output,
        update: (fx) => {
          const width = this.effectValue(fx, "width", 0.72, 0, 1);
          panLeft.pan.setTargetAtTime(-width, ctx.currentTime, 0.02);
          panRight.pan.setTargetAtTime(width, ctx.currentTime, 0.02);
          leftGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.02);
          rightGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.02);
        },
      };
    }

    input.connect(output);
    return { id: effect.id, input, output, update: () => undefined };
  }
}

export const audioEngine = new WaveForgeEngine();

export const readAnalyserWaveform = (analyser: AnalyserNode | undefined, buffer: Uint8Array<ArrayBuffer>) => {
  if (!analyser) return;
  analyser.getByteTimeDomainData(buffer);
};

export const readAnalyserSpectrum = (analyser: AnalyserNode | undefined, buffer: Uint8Array<ArrayBuffer>) => {
  if (!analyser) return;
  analyser.getByteFrequencyData(buffer);
};

export const getBaseValue = (state: SynthState, path: string) => getAtPath(state, path);
