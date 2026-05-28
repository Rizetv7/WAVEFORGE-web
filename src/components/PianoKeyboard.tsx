import { useEffect, useMemo, useRef, useState } from "react";
import { audioEngine } from "../audio/engine";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton, MiniSelect } from "./Panel";

const keyboardMap: Record<string, number> = {
  a: 48,
  w: 49,
  s: 50,
  e: 51,
  d: 52,
  f: 53,
  t: 54,
  g: 55,
  y: 56,
  h: 57,
  u: 58,
  j: 59,
  k: 60,
  o: 61,
  l: 62,
  p: 63,
  ";": 64,
  "'": 65,
  z: 36,
  x: 38,
  c: 40,
  v: 41,
  b: 43,
  n: 45,
  m: 47,
};

const isBlack = (note: number) => [1, 3, 6, 8, 10].includes(note % 12);
const noteName = (note: number) => {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
};

export const PianoKeyboard = () => {
  const { state, setParam } = useSynth();
  const [active, setActive] = useState<Set<number>>(new Set());
  const activeRef = useRef(active);
  activeRef.current = active;

  const notes = useMemo(() => Array.from({ length: 49 }, (_, i) => 36 + i), []);
  const whiteNotes = notes.filter((note) => !isBlack(note));

  const noteOn = (note: number, velocity = 0.82) => {
    if (state.sequencer.playing) setParam("sequencer.rootNote", note);
    void audioEngine.noteOn(note, velocity);
    setActive((old) => new Set(old).add(note));
  };
  const noteOff = (note: number) => {
    audioEngine.noteOff(note);
    setActive((old) => {
      const next = new Set(old);
      next.delete(note);
      return next;
    });
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "SELECT" || target?.tagName === "TEXTAREA") return;
      const note = keyboardMap[event.key.toLowerCase()];
      if (note === undefined || activeRef.current.has(note) || event.repeat) return;
      noteOn(note, event.shiftKey ? 1 : 0.82);
    };
    const up = (event: KeyboardEvent) => {
      const note = keyboardMap[event.key.toLowerCase()];
      if (note === undefined) return;
      noteOff(note);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    audioEngine.setSustain(state.performance.sustain);
  }, [state.performance.sustain]);

  return (
    <div className="glass-panel rounded-lg p-3">
      <div className="mb-3 grid grid-cols-[220px_1fr_280px] items-center gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Knob label="Pitch" path="performance.pitchBend" value={state.performance.pitchBend} min={-1} max={1} step={0.01} bipolar />
          <Knob label="Mod" path="performance.modWheel" value={state.performance.modWheel} />
        </div>
        <div className="flex items-center justify-center gap-2">
          <MiniButton active={state.performance.sustain} onClick={() => setParam("performance.sustain", !state.performance.sustain)}>
            Sustain
          </MiniButton>
          <MiniButton active={state.performance.mono} onClick={() => setParam("performance.mono", !state.performance.mono)}>
            {state.performance.mono ? "Mono" : "Poly"}
          </MiniButton>
          <MiniSelect
            value={String(state.performance.voices)}
            options={["1", "2", "4", "8", "12", "16", "24"]}
            onChange={(value) => setParam("performance.voices", Number(value))}
            label="Voices"
          />
          <Knob label="Glide" path="performance.glide" value={state.performance.glide} min={0} max={0.3} step={0.001} display={(v) => `${Math.round(v * 1000)}ms`} />
        </div>
        <div className="text-right font-mono text-[11px] text-slate-500">
          Computer keys: A W S E D F T G Y H U J K
        </div>
      </div>
      <div className="relative h-36 rounded border border-white/10 bg-[#060910] p-2">
        <div className="grid h-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${whiteNotes.length}, minmax(0, 1fr))` }}>
          {whiteNotes.map((note) => (
            <button
              key={note}
              type="button"
              onPointerDown={(event) => {
                (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                if (!activeRef.current.has(note)) noteOn(note);
              }}
              onPointerUp={(event) => {
                (event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId);
                noteOff(note);
              }}
              onPointerLeave={() => active.has(note) && noteOff(note)}
              onMouseDown={() => {
                if (!activeRef.current.has(note)) noteOn(note);
              }}
              onMouseUp={() => noteOff(note)}
              className={`relative rounded-b border border-slate-400/25 bg-gradient-to-b text-[9px] text-slate-700 transition ${
                active.has(note) ? "from-cyan-100 to-cyan-300 shadow-[0_0_18px_rgba(56,246,255,0.45)]" : "from-slate-100 to-slate-300"
              }`}
            >
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2">{noteName(note)}</span>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-2 top-2 h-[58%]">
          {notes.filter(isBlack).map((note) => {
            const previousWhites = whiteNotes.filter((white) => white < note).length;
            const left = (previousWhites / whiteNotes.length) * 100 - 1.45;
            return (
              <button
                key={note}
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                  if (!activeRef.current.has(note)) noteOn(note);
                }}
                onPointerUp={(event) => {
                  event.stopPropagation();
                  (event.currentTarget as HTMLButtonElement).releasePointerCapture(event.pointerId);
                  noteOff(note);
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  if (!activeRef.current.has(note)) noteOn(note);
                }}
                onMouseUp={(event) => {
                  event.stopPropagation();
                  noteOff(note);
                }}
                className={`pointer-events-auto absolute top-0 h-full w-[3.9%] rounded-b border border-black bg-gradient-to-b transition ${
                  active.has(note)
                    ? "from-violet-400 to-cyan-500 shadow-[0_0_16px_rgba(163,107,255,0.55)]"
                    : "from-slate-900 to-black"
                }`}
                style={{ left: `${left}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
