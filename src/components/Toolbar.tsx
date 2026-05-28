import { Download, Redo2, Save, Undo2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/engine";
import { useSynth } from "../state/SynthContext";
import { Knob } from "./Knob";
import { MiniButton } from "./Panel";

interface MidiInputInfo {
  id: string;
  name: string;
  input: any;
}

const exportPreset = (data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "waveforge-current-preset.json";
  link.click();
  URL.revokeObjectURL(url);
};

export const Toolbar = () => {
  const { state, presets, dispatch, savePreset, loadPreset, setParam } = useSynth();
  const [recording, setRecording] = useState(false);
  const [midiInputs, setMidiInputs] = useState<MidiInputInfo[]>([]);
  const [selectedMidiId, setSelectedMidiId] = useState("");
  const selectedMidi = useRef<string>("");
  const activePreset = presets.find((preset) => preset.id === state.activePresetId);

  useEffect(() => {
    const nav = navigator as any;
    if (!nav.requestMIDIAccess) return;
    nav
      .requestMIDIAccess()
      .then((access: any) => {
        const inputs = Array.from(access.inputs.values()).map((input: any) => ({ id: input.id, name: input.name ?? "MIDI Input", input }));
        setMidiInputs(inputs);
        inputs.forEach(({ input }) => {
          input.onmidimessage = (event: any) => {
            if (selectedMidi.current && input.id !== selectedMidi.current) return;
            const [status, note, value] = event.data as [number, number, number];
            const command = status & 0xf0;
            dispatch({ type: "SET_PARAM", path: "midiActivity", value: true });
            window.setTimeout(() => dispatch({ type: "SET_PARAM", path: "midiActivity", value: false }), 90);
            if (command === 0x90 && value > 0) {
              if (state.sequencer.playing) setParam("sequencer.rootNote", note);
              void audioEngine.noteOn(note, value / 127);
            }
            if (command === 0x80 || (command === 0x90 && value === 0)) audioEngine.noteOff(note);
            if (command === 0xb0 && note === 1) setParam("performance.modWheel", value / 127);
            if (command === 0xd0) setParam("performance.aftertouch", value / 127);
            if (command === 0xe0) {
              const bend = ((value << 7) + note - 8192) / 8192;
              setParam("performance.pitchBend", bend);
            }
          };
        });
      })
      .catch(() => setMidiInputs([]));
  }, [dispatch, setParam, state.sequencer.playing]);

  return (
    <header className="glass-panel flex h-20 items-center gap-4 rounded-lg px-4">
      <div className="min-w-[168px]">
        <div className="text-2xl font-black tracking-[0.18em] text-cyan-100 drop-shadow-[0_0_14px_rgba(56,246,255,0.35)]">
          WAVEFORGE
        </div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Aurum Audio Lab</div>
      </div>
      <select
        value={state.activePresetId}
        onChange={(event) => {
          const preset = presets.find((item) => item.id === event.target.value);
          if (preset) loadPreset(preset);
        }}
        className="h-10 w-[280px] rounded border border-white/10 bg-[#0b1018] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-300/50"
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.category} / {preset.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <MiniButton onClick={() => dispatch({ type: "UNDO" })} title="Undo">
          <Undo2 size={14} />
        </MiniButton>
        <MiniButton onClick={() => dispatch({ type: "REDO" })} title="Redo">
          <Redo2 size={14} />
        </MiniButton>
        <MiniButton
          onClick={() => {
            const name = window.prompt("Preset name", activePreset?.name ?? "User Patch");
            if (name) savePreset(name, activePreset?.category ?? "Bass");
          }}
          title="Save preset"
        >
          <Save size={14} />
        </MiniButton>
        <MiniButton onClick={() => exportPreset(activePreset ?? state)} title="Export preset JSON">
          <Download size={14} />
        </MiniButton>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-slate-400" />
          <Knob label="Master" path="performance.masterVolume" value={state.performance.masterVolume} size="sm" />
        </div>
        <div className="min-w-[84px] rounded border border-white/10 bg-black/20 px-3 py-2 text-center">
          <div className="font-mono text-sm text-cyan-100">{Math.round(state.cpu)}%</div>
          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">CPU</div>
        </div>
        <div className="grid min-w-[150px] gap-1">
          <select
            value={selectedMidiId}
            onChange={(event) => {
              selectedMidi.current = event.target.value;
              setSelectedMidiId(event.target.value);
            }}
            className="h-8 rounded border border-white/10 bg-[#0b1018] px-2 text-[11px] text-slate-200"
          >
            <option value="">MIDI: all inputs</option>
            {midiInputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <span className={`h-2 w-2 rounded-full ${state.midiActivity ? "bg-green-300 shadow-[0_0_12px_#65ffb0]" : "bg-slate-700"}`} />
            MIDI Activity
          </div>
        </div>
        <MiniButton
          active={recording}
          onClick={() => {
            if (!recording) {
              void audioEngine.ensure().then(() => {
                setRecording(audioEngine.startRecording());
              });
            } else {
              const blob = audioEngine.stopRecording();
              setRecording(false);
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "waveforge-performance.wav";
              link.click();
              URL.revokeObjectURL(url);
            }
          }}
        >
          {recording ? "Stop WAV" : "Record"}
        </MiniButton>
      </div>
    </header>
  );
};
