# WAVEFORGE

WAVEFORGE ist ein browserbasierter Synthesizer-Prototyp mit React, TypeScript, Tailwind CSS und der Web Audio API. Die Oberfläche ist als eigenständiges dunkles Plugin-Interface gestaltet und kopiert keine Marken, Logos, Presets oder Assets anderer Hersteller.

## Start

```bash
npm install
npm run dev
```

Danach die angezeigte lokale URL im Browser öffnen. Audio startet nach der ersten Nutzerinteraktion, zum Beispiel per Bildschirmtastatur oder Computer-Tasten.

## Build

```bash
npm run build
```

## Bedienung

- Computer-Tasten: `A W S E D F T G Y H U J K` spielen chromatisch ab C3.
- Virtuelle Tastatur: Maus oder Trackpad direkt auf den Tasten.
- Modulation: Macro-, ENV- oder LFO-Quelle aus dem Sources-Panel auf einen Regler ziehen.
- Matrix: Modulationsrouten direkt im `MATRIX`-Tab bearbeiten.
- Presets: Factory-Presets laden, eigene Presets speichern, duplizieren, importieren und als JSON exportieren.
- WAV-Aufnahme: `Record` in der Toolbar startet eine Browser-Aufnahme, erneutes Klicken exportiert eine WAV-Datei.
- Samples: WAV/Audio-Datei in einem OSC-Modul importieren und im Sample/Granular-Modus verwenden.

## Bereits funktionsfähig

- Drei Hauptoszillatoren mit Wavetable-Auswahl, Unison, Detune, Width, Pan, Level, Tuning, Warp-Modi und Sample/Granular-Modus.
- Sub-Oszillator und Noise-Oszillator.
- Zwei Filter mit Routing pro Oszillator, Cutoff, Resonance, Drive, Mix und Key Tracking.
- Amp Envelope 1 mit ADSR/Hold und grafischer Kurve.
- Vier LFOs im State, LFO 1 mit Canvas-Editor, Sync-Rates und animierter Phase.
- Drag-and-drop Modulation auf Regler plus editierbare Modulationsmatrix.
- Effektkette mit Distortion, Chorus, Phaser, Flanger, Compressor, EQ, Delay, Reverb, Filter FX und Stereo Width.
- Verschiebbares FX-Rack mit Drag-and-Drop-Reihenfolge.
- 16-Step-Sequencer mit BPM, Gate, Pitch, Velocity und Play/Stop.
- Virtuelle Piano-Tastatur, Computer-Tastatur, Sustain, Mono/Poly, Glide, Stimmenzahl, Pitch Bend und Mod Wheel.
- Web MIDI API mit Geräteauswahl, Note On/Off, Mod Wheel, Aftertouch und Pitch Bend.
- Echtzeit-Oszilloskop, Frequenzspektrum, Oszillator-Wellenformen, Filterkurven, LFO- und Envelope-Visuals.
- Preset-System mit 20 Factory-Presets, Suche, Kategorien, Save, Duplicate, Delete für Custom-Presets, Import/Export JSON.
- Browser-WAV-Recording der Performance.
- Modularer Aufbau mit separater Audio-Engine und React-Komponenten.

## Architekturhinweis für Logic Pro

Eine reine Website kann nicht direkt als Instrument in Logic Pro geladen werden. Für Logic wäre später eine native AUv3- oder Audio-Unit-Version nötig, zum Beispiel mit JUCE oder einer ähnlichen Plugin-Technologie.

Die Browser-Version dient als funktionsfähiger Prototyp und als Grundlage für Design, Bedienlogik und Sound-Engine-Konzepte. Für eine echte Logic-Pro-Version fehlen noch:

- Native DSP-Portierung in C++/Rust/Swift oder eine JUCE-basierte Audio-Engine.
- Sample-genaue Modulation und Voice-Management unter Echtzeitbedingungen.
- AUv3/Audio-Unit-Parameter-Mapping, Automation und Host-Synchronisation.
- Plugin-Preset-Format, Factory-Bank-Management und Host-kompatible State-Serialisierung.
- Native MIDI/MPE-Integration mit Host-Events statt Browser Web MIDI.
- Offline-Rendering, Latenzkompensation und validierte Audio-Unit-Sandbox-Kompatibilität.
- Plattformgerechte UI-Brücke, zum Beispiel JUCE UI, Metal, SwiftUI oder WebView nur als Shell.
