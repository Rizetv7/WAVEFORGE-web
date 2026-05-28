import { Copy, Download, Heart, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { presetCategories } from "../data/presets";
import type { PresetCategory, SynthPreset } from "../types";
import { useSynth } from "../state/SynthContext";
import { MiniButton, MiniSelect, Panel } from "./Panel";

const downloadJson = (name: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export const PresetBrowser = ({ compact = false }: { compact?: boolean }) => {
  const { state, presets, loadPreset, savePreset, dispatch } = useSynth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PresetCategory | "All">("All");
  const [name, setName] = useState("");
  const [saveCategory, setSaveCategory] = useState<PresetCategory>("Bass");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    return presets.filter((preset) => {
      const matchesQuery = preset.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || preset.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, presets, query]);

  const active = presets.find((preset) => preset.id === state.activePresetId);

  const importPreset = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as SynthPreset | SynthPreset[];
    const items = Array.isArray(parsed) ? parsed : [parsed];
    items.forEach((preset) => dispatch({ type: "DUPLICATE_PRESET", preset: { ...preset, id: preset.id ?? "imported" } }));
  };

  return (
    <Panel title={compact ? undefined : "Preset Browser"}>
      <div className={compact ? "grid gap-2" : "grid grid-cols-[320px_1fr] gap-4"}>
        <div className="grid gap-3">
          <div className="flex items-center gap-2 rounded border border-white/10 bg-black/30 px-2">
            <Search size={14} className="text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search presets"
              className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"
            />
          </div>
          <MiniSelect value={category} options={["All", ...presetCategories]} onChange={(value) => setCategory(value as PresetCategory | "All")} />
          {!compact && (
            <div className="grid gap-2 rounded border border-white/10 bg-black/20 p-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New preset name"
                className="h-8 rounded border border-white/10 bg-[#0b1018] px-2 text-sm outline-none"
              />
              <MiniSelect value={saveCategory} options={presetCategories} onChange={(value) => setSaveCategory(value as PresetCategory)} />
              <MiniButton onClick={() => savePreset(name || "User Patch", saveCategory)}>Save Preset</MiniButton>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <MiniButton onClick={() => active && dispatch({ type: "DUPLICATE_PRESET", preset: active })}>
              <Copy size={12} />
            </MiniButton>
            <MiniButton onClick={() => downloadJson("waveforge-preset.json", active ?? state)}>
              <Download size={12} />
            </MiniButton>
            <MiniButton onClick={() => fileRef.current?.click()}>
              <Upload size={12} />
            </MiniButton>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importPreset(file);
              }}
            />
          </div>
        </div>
        <div className={compact ? "max-h-64 overflow-auto rounded border border-white/10" : "max-h-[520px] overflow-auto rounded border border-white/10"}>
          {filtered.map((preset) => {
            const custom = preset.id.startsWith("custom");
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPreset(preset)}
                className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/10 px-3 py-2 text-left transition ${
                  state.activePresetId === preset.id ? "bg-cyan-300/12 text-cyan-100" : "bg-white/[0.025] text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{preset.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{preset.category}</span>
                </span>
                <Heart size={14} className={preset.favorite ? "fill-orange-300 text-orange-300" : "text-slate-600"} />
                {custom && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch({ type: "DELETE_CUSTOM_PRESET", id: preset.id });
                    }}
                    className="rounded p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-200"
                  >
                    <Trash2 size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};
