import { useEffect, useRef } from "react";
import { audioEngine, readAnalyserSpectrum, readAnalyserWaveform } from "../audio/engine";
import { lfoValueAt, sampleWavetable } from "../audio/wavetables";
import type { EnvelopeConfig, FilterConfig, LfoConfig, OscillatorConfig } from "../types";

const setup = (canvas: HTMLCanvasElement) => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
};

export const WaveformCanvas = ({ oscillator }: { oscillator: OscillatorConfig }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = ref.current;
      if (!canvas) return;
      const { ctx, width, height } = setup(canvas);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#090d14";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i += 1) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const phase = performance.now() * 0.00008 * (1 + oscillator.position * 6);
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#38f6ff");
      gradient.addColorStop(0.55, "#5e83ff");
      gradient.addColorStop(1, "#a36bff");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.shadowColor = "#38f6ff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const value = sampleWavetable(oscillator.wavetable, x / width + phase, oscillator.position, oscillator.warp);
        const y = height / 2 - value * (height * 0.34);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [oscillator]);

  return <canvas ref={ref} className="h-24 w-full rounded border border-white/10 precision-grid" />;
};

export const SpectrumCanvas = ({ mode = "spectrum" }: { mode?: "spectrum" | "scope" }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const data = new Uint8Array(1024);
    let raf = 0;
    const draw = () => {
      const canvas = ref.current;
      if (!canvas) return;
      const { ctx, width, height } = setup(canvas);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#060a11";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
      }
      if (mode === "scope") readAnalyserWaveform(audioEngine.analyserNode, data);
      else readAnalyserSpectrum(audioEngine.analyserNode, data);
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#38f6ff");
      gradient.addColorStop(0.5, "#5e83ff");
      gradient.addColorStop(1, "#ffad55");
      ctx.strokeStyle = gradient;
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#38f6ff";
      if (mode === "scope") {
        ctx.beginPath();
        for (let i = 0; i < data.length; i += 1) {
          const x = (i / (data.length - 1)) * width;
          const y = (data[i] / 255) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        const bars = 96;
        for (let i = 0; i < bars; i += 1) {
          const value = data[Math.floor((i / bars) * data.length)] / 255;
          const barWidth = width / bars - 1;
          ctx.globalAlpha = 0.25 + value * 0.75;
          ctx.fillRect(i * (width / bars), height - value * height, barWidth, value * height);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [mode]);
  return <canvas ref={ref} className="h-full min-h-24 w-full rounded border border-white/10 precision-grid" />;
};

export const EnvelopeCanvas = ({ env }: { env: EnvelopeConfig }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { ctx, width, height } = setup(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, width, height);
    const total = env.attack + env.hold + env.decay + env.release + 0.2;
    const a = (env.attack / total) * width;
    const h = a + (env.hold / total) * width;
    const d = h + (env.decay / total) * width;
    const r = width - (env.release / total) * width;
    ctx.strokeStyle = "#ffad55";
    ctx.shadowColor = "#ffad55";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height - 8);
    ctx.lineTo(a, 8);
    ctx.lineTo(h, 8);
    ctx.lineTo(d, height - env.sustain * (height - 16) - 8);
    ctx.lineTo(r, height - env.sustain * (height - 16) - 8);
    ctx.lineTo(width, height - 8);
    ctx.stroke();
  }, [env]);
  return <canvas ref={ref} className="h-24 w-full rounded border border-white/10 precision-grid" />;
};

export const LfoCanvas = ({
  lfo,
  onChange,
  bpm,
}: {
  lfo: LfoConfig;
  onChange?: (points: LfoConfig["points"], shape?: LfoConfig["shape"]) => void;
  bpm: number;
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const activePoint = useRef<number | null>(null);
  const workingPoints = useRef<LfoConfig["points"]>(lfo.points);
  useEffect(() => {
    workingPoints.current = lfo.points;
  }, [lfo.points]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = ref.current;
      if (!canvas) return;
      const { ctx, width, height } = setup(canvas);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#070b12";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      for (let i = 1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
      }
      ctx.strokeStyle = "#38f6ff";
      ctx.shadowColor = "#38f6ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 1) {
        const value = lfoValueAt(lfo, (x / width) / Math.max(0.01, lfo.rate), bpm);
        const y = height / 2 - value * (height * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const phase = ((performance.now() / 1000) * (lfo.sync ? 1 : lfo.rate)) % 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffad55";
      ctx.fillRect(phase * width - 1, 0, 2, height);
      if (lfo.shape === "Custom") {
        ctx.fillStyle = "#ffffff";
        lfo.points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [bpm, lfo]);

  return (
    <canvas
      ref={ref}
      className="h-24 w-full rounded border border-white/10 precision-grid"
      onPointerDown={(event) => {
        if (!onChange) return;
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const existing = workingPoints.current.findIndex((point) => Math.hypot((point.x - x) * rect.width, (point.y - y) * rect.height) < 12);
        const rawPoints = existing >= 0 ? [...workingPoints.current] : [...workingPoints.current, { x, y }];
        const targetIndex = existing >= 0 ? existing : rawPoints.length - 1;
        rawPoints[targetIndex] = { x, y };
        const clampedX = Math.max(0, Math.min(1, x));
        const clampedY = Math.max(0, Math.min(1, y));
        const points = rawPoints
          .sort((a, b) => a.x - b.x)
          .map((point) => ({ x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) }));
        activePoint.current = points.reduce((nearest, point, index) => {
          const distance = Math.hypot(point.x - clampedX, point.y - clampedY);
          return distance < nearest.distance ? { index, distance } : nearest;
        }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;
        workingPoints.current = points;
        canvas.setPointerCapture(event.pointerId);
        onChange(points, "Custom");
      }}
      onPointerMove={(event) => {
        if (!onChange || activePoint.current === null) return;
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const points = [...workingPoints.current];
        points[activePoint.current] = { x, y };
        const sorted = points.sort((a, b) => a.x - b.x);
        activePoint.current = sorted.findIndex((point) => point.x === x && point.y === y);
        workingPoints.current = sorted;
        onChange(sorted, "Custom");
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        activePoint.current = null;
      }}
      onPointerCancel={() => {
        activePoint.current = null;
      }}
    />
  );
};

export const FilterCurveCanvas = ({ filter }: { filter: FilterConfig }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { ctx, width, height } = setup(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.68);
    ctx.lineTo(width, height * 0.68);
    ctx.stroke();
    ctx.strokeStyle = filter.enabled ? "#a36bff" : "#334155";
    ctx.shadowColor = "#a36bff";
    ctx.shadowBlur = filter.enabled ? 10 : 0;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cutoffX = (Math.log(filter.cutoff) - Math.log(20)) / (Math.log(20000) - Math.log(20));
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const distance = nx - cutoffX;
      let y = height * 0.35;
      if (filter.type.startsWith("LP")) y = height * (0.35 + Math.max(0, distance) * 1.2);
      if (filter.type === "HP") y = height * (0.35 + Math.max(0, -distance) * 1.2);
      if (filter.type === "BP" || filter.type === "Formant") y = height * (0.72 - Math.exp(-Math.abs(distance) * (8 + filter.resonance * 18)) * 0.52);
      if (filter.type === "Notch") y = height * (0.34 + Math.exp(-Math.abs(distance) * 24) * 0.45);
      y -= Math.exp(-Math.abs(distance) * 40) * filter.resonance * 16;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [filter]);
  return <canvas ref={ref} className="h-24 w-full rounded border border-white/10 precision-grid" />;
};
