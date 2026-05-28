/*
  WAVEFORGE Logic Pro Audio Unit port scaffold

  Purpose:
  - This is the native JUCE/C++ starting point for turning the browser prototype
    into a Logic Pro Audio Unit / AUv3 plugin.
  - A website cannot be loaded directly as a Logic instrument. Logic needs a
    compiled native plugin bundle.

  How to use:
  1. Create a JUCE Audio Plug-In project.
  2. Enable plugin formats: AU and optionally AUv3/VST3.
  3. Replace the generated PluginProcessor implementation with this file, or
     split this file into PluginProcessor.h/.cpp according to your project style.
  4. Build in Xcode, then validate with auval and load it in Logic Pro.

  This file intentionally does not reuse React, Tailwind, Web Audio API, or
  browser-only MIDI APIs. It ports the DSP/control architecture into native code.
*/

#include <JuceHeader.h>

namespace waveforge
{
namespace IDs
{
static constexpr auto masterGain = "masterGain";
static constexpr auto glide = "glide";
static constexpr auto voices = "voices";

static constexpr auto filterType = "filterType";
static constexpr auto filterCutoff = "filterCutoff";
static constexpr auto filterResonance = "filterResonance";
static constexpr auto filterDrive = "filterDrive";
static constexpr auto filterMix = "filterMix";

static constexpr auto envAttack = "envAttack";
static constexpr auto envHold = "envHold";
static constexpr auto envDecay = "envDecay";
static constexpr auto envSustain = "envSustain";
static constexpr auto envRelease = "envRelease";

static constexpr auto lfoRate = "lfoRate";
static constexpr auto lfoDepth = "lfoDepth";
static constexpr auto lfoToCutoff = "lfoToCutoff";

static constexpr auto delayOn = "delayOn";
static constexpr auto delayTime = "delayTime";
static constexpr auto delayFeedback = "delayFeedback";
static constexpr auto delayMix = "delayMix";

static constexpr auto reverbOn = "reverbOn";
static constexpr auto reverbSize = "reverbSize";
static constexpr auto reverbDamping = "reverbDamping";
static constexpr auto reverbMix = "reverbMix";
} // namespace IDs

static juce::String oscId (int osc, const char* suffix)
{
    return "osc" + juce::String (osc) + "_" + suffix;
}

static float getParam (juce::AudioProcessorValueTreeState& apvts, const juce::String& id)
{
    if (auto* value = apvts.getRawParameterValue (id))
        return value->load();

    jassertfalse;
    return 0.0f;
}

static float midiNoteToHz (int note, float pitchBendSemitones = 0.0f)
{
    return 440.0f * std::pow (2.0f, (static_cast<float> (note) - 69.0f + pitchBendSemitones) / 12.0f);
}

static float wrapPhase (float phase)
{
    phase -= std::floor (phase);
    return phase;
}

static float softClip (float x)
{
    return std::tanh (x);
}

enum class WaveShape
{
    sine = 0,
    triangle,
    saw,
    square,
    pulse,
    harmonics,
    digitalBright,
    softPad,
    metallic,
    bassGrowl
};

enum class WarpMode
{
    off = 0,
    bendPlus,
    bendMinus,
    sync,
    pwm,
    fm,
    ring
};

static float sampleWave (WaveShape shape, WarpMode warp, float phase, float position, float fm = 0.0f)
{
    phase = wrapPhase (phase + fm);
    auto twoPi = juce::MathConstants<float>::twoPi;

    float value = 0.0f;

    switch (shape)
    {
        case WaveShape::sine:
            value = std::sin (twoPi * phase);
            break;

        case WaveShape::triangle:
            value = 4.0f * std::abs (phase - 0.5f) - 1.0f;
            break;

        case WaveShape::saw:
            value = phase * 2.0f - 1.0f;
            break;

        case WaveShape::square:
            value = phase < 0.5f ? 1.0f : -1.0f;
            break;

        case WaveShape::pulse:
            value = phase < juce::jlimit (0.05f, 0.95f, 0.12f + position * 0.76f) ? 1.0f : -1.0f;
            break;

        case WaveShape::harmonics:
            for (int h = 1; h <= 12; ++h)
                value += std::sin (twoPi * phase * static_cast<float> (h)) * (1.0f / static_cast<float> (h));
            value *= 0.42f;
            break;

        case WaveShape::digitalBright:
            for (int h = 1; h <= 24; ++h)
                value += std::sin (twoPi * phase * static_cast<float> (h) + h * 1.73f) / std::sqrt ((float) h);
            value *= 0.18f;
            break;

        case WaveShape::softPad:
            for (int h = 1; h <= 18; ++h)
                value += std::sin (twoPi * phase * static_cast<float> (h)) * std::exp (-h * 0.16f);
            value *= 0.55f;
            break;

        case WaveShape::metallic:
            for (auto h : { 1, 2, 5, 7, 11, 17, 23, 29 })
                value += std::sin (twoPi * phase * static_cast<float> (h) + h * 0.33f) / std::sqrt ((float) h);
            value *= 0.22f;
            break;

        case WaveShape::bassGrowl:
            for (int h = 1; h <= 20; ++h)
                value += std::sin (twoPi * phase * static_cast<float> (h)) * (h % 2 == 0 ? -0.35f : 0.9f) / h;
            value *= 0.5f;
            break;
    }

    switch (warp)
    {
        case WarpMode::off:
            break;
        case WarpMode::bendPlus:
            value = std::copysign (std::pow (std::abs (value), 0.72f), value);
            break;
        case WarpMode::bendMinus:
            value = std::copysign (std::pow (std::abs (value), 1.4f), value);
            break;
        case WarpMode::sync:
            value = std::sin (std::asin (juce::jlimit (-1.0f, 1.0f, value)) * (1.0f + position * 4.0f));
            break;
        case WarpMode::pwm:
            value = sampleWave (WaveShape::pulse, WarpMode::off, phase, position);
            break;
        case WarpMode::fm:
            value = std::sin (twoPi * wrapPhase (phase + std::sin (twoPi * phase * 2.0f) * position * 0.2f));
            break;
        case WarpMode::ring:
            value *= std::sin (twoPi * phase * (2.0f + position * 12.0f));
            break;
    }

    return juce::jlimit (-1.0f, 1.0f, value);
}

class OnePoleFilter
{
public:
    void prepare (double newSampleRate)
    {
        sampleRate = newSampleRate;
        z1 = 0.0f;
        hpZ1 = 0.0f;
    }

    void setParams (int typeIndex, float cutoff, float resonance)
    {
        type = typeIndex;
        auto hz = juce::jlimit (20.0f, 19000.0f, cutoff);
        a = 1.0f - std::exp (-juce::MathConstants<float>::twoPi * hz / static_cast<float> (sampleRate));
        q = juce::jlimit (0.0f, 0.95f, resonance);
    }

    float process (float input)
    {
        z1 += a * (input - z1);
        auto low = z1;
        auto high = input - low;
        hpZ1 += a * (high - hpZ1);
        auto band = hpZ1;

        switch (type)
        {
            case 0:  return low;
            case 1:  return low + q * (low - input) * 0.35f;
            case 2:  return high;
            case 3:  return band;
            case 4:  return input - band * (0.5f + q);
            default: return low;
        }
    }

private:
    double sampleRate = 44100.0;
    int type = 0;
    float a = 0.1f;
    float q = 0.0f;
    float z1 = 0.0f;
    float hpZ1 = 0.0f;
};

class DelayLine
{
public:
    void prepare (double sr, int maxBlock)
    {
        sampleRate = sr;
        buffer.setSize (2, static_cast<int> (sampleRate * 2.0) + maxBlock + 1);
        buffer.clear();
        write = 0;
    }

    void process (juce::AudioBuffer<float>& audio, float timeSeconds, float feedback, float mix)
    {
        auto delaySamples = juce::jlimit (1, buffer.getNumSamples() - 1, static_cast<int> (timeSeconds * sampleRate));
        auto fb = juce::jlimit (0.0f, 0.92f, feedback);
        auto wet = juce::jlimit (0.0f, 1.0f, mix);

        for (int sample = 0; sample < audio.getNumSamples(); ++sample)
        {
            auto read = (write - delaySamples + buffer.getNumSamples()) % buffer.getNumSamples();

            for (int ch = 0; ch < audio.getNumChannels(); ++ch)
            {
                auto in = audio.getSample (ch, sample);
                auto delayed = buffer.getSample (ch % buffer.getNumChannels(), read);
                buffer.setSample (ch % buffer.getNumChannels(), write, in + delayed * fb);
                audio.setSample (ch, sample, in * (1.0f - wet * 0.45f) + delayed * wet);
            }

            write = (write + 1) % buffer.getNumSamples();
        }
    }

private:
    double sampleRate = 44100.0;
    juce::AudioBuffer<float> buffer;
    int write = 0;
};

class WaveforgeSound final : public juce::SynthesiserSound
{
public:
    bool appliesToNote (int) override { return true; }
    bool appliesToChannel (int) override { return true; }
};

class WaveforgeVoice final : public juce::SynthesiserVoice
{
public:
    explicit WaveforgeVoice (juce::AudioProcessorValueTreeState& state) : apvts (state) {}

    bool canPlaySound (juce::SynthesiserSound* sound) override
    {
        return dynamic_cast<WaveforgeSound*> (sound) != nullptr;
    }

    void prepare (double sr)
    {
        sampleRate = sr;
        filter.prepare (sr);
        adsr.setSampleRate (sr);
    }

    void startNote (int midiNoteNumber, float velocity, juce::SynthesiserSound*, int pitchWheel) override
    {
        note = midiNoteNumber;
        noteVelocity = velocity;
        pitchBend = pitchWheelToSemitones (pitchWheel);
        phases.fill (0.0f);
        lfoPhase = 0.0f;

        juce::ADSR::Parameters env;
        env.attack = getParam (apvts, IDs::envAttack);
        env.decay = getParam (apvts, IDs::envDecay);
        env.sustain = getParam (apvts, IDs::envSustain);
        env.release = getParam (apvts, IDs::envRelease);
        adsr.setParameters (env);
        adsr.noteOn();
    }

    void stopNote (float, bool allowTailOff) override
    {
        adsr.noteOff();
        if (! allowTailOff)
            clearCurrentNote();
    }

    void pitchWheelMoved (int newPitchWheelValue) override
    {
        pitchBend = pitchWheelToSemitones (newPitchWheelValue);
    }

    void controllerMoved (int controller, int value) override
    {
        if (controller == 1)
            modWheel = static_cast<float> (value) / 127.0f;
    }

    void renderNextBlock (juce::AudioBuffer<float>& output, int startSample, int numSamples) override
    {
        if (! isVoiceActive())
            return;

        auto filterBase = getParam (apvts, IDs::filterCutoff);
        auto filterRes = getParam (apvts, IDs::filterResonance);
        auto filterType = static_cast<int> (getParam (apvts, IDs::filterType));
        auto filterMix = getParam (apvts, IDs::filterMix);
        auto drive = 1.0f + getParam (apvts, IDs::filterDrive) * 8.0f;
        auto lfoRate = getParam (apvts, IDs::lfoRate);
        auto lfoDepth = getParam (apvts, IDs::lfoDepth) * getParam (apvts, IDs::lfoToCutoff);

        for (int i = 0; i < numSamples; ++i)
        {
            auto amp = adsr.getNextSample();
            if (amp <= 0.00001f && ! adsr.isActive())
            {
                clearCurrentNote();
                break;
            }

            lfoPhase = wrapPhase (lfoPhase + lfoRate / static_cast<float> (sampleRate));
            auto lfo = std::sin (juce::MathConstants<float>::twoPi * lfoPhase);
            auto cutoff = filterBase * std::pow (2.0f, lfo * lfoDepth * 4.0f);
            filter.setParams (filterType, cutoff, filterRes);

            float dry = 0.0f;
            dry += renderOsc (0);
            dry += renderOsc (1);
            dry += renderOsc (2);

            dry *= noteVelocity * amp;
            auto filtered = filter.process (softClip (dry * drive));
            auto sample = dry * (1.0f - filterMix) + filtered * filterMix;

            for (int ch = 0; ch < output.getNumChannels(); ++ch)
                output.addSample (ch, startSample + i, sample);
        }
    }

private:
    float renderOsc (int osc)
    {
        auto enabled = getParam (apvts, oscId (osc, "on")) > 0.5f;
        if (! enabled)
            return 0.0f;

        auto wave = static_cast<WaveShape> ((int) getParam (apvts, oscId (osc, "wave")));
        auto warp = static_cast<WarpMode> ((int) getParam (apvts, oscId (osc, "warp")));
        auto octave = getParam (apvts, oscId (osc, "octave"));
        auto semitone = getParam (apvts, oscId (osc, "semitone"));
        auto fine = getParam (apvts, oscId (osc, "fine"));
        auto unison = juce::jlimit (1, 16, static_cast<int> (std::round (getParam (apvts, oscId (osc, "unison")))));
        auto detune = getParam (apvts, oscId (osc, "detune"));
        auto level = getParam (apvts, oscId (osc, "level"));
        auto position = getParam (apvts, oscId (osc, "position"));

        auto rootHz = midiNoteToHz (note + static_cast<int> (octave) * 12, pitchBend + semitone + fine / 100.0f);
        float sum = 0.0f;

        for (int u = 0; u < unison; ++u)
        {
            auto spread = unison == 1 ? 0.0f : (static_cast<float> (u) / static_cast<float> (unison - 1)) * 2.0f - 1.0f;
            auto hz = rootHz * std::pow (2.0f, spread * detune * 0.24f / 12.0f);
            auto phaseIncrement = hz / static_cast<float> (sampleRate);
            auto phase = wrapPhase (phases[(size_t) osc] + spread * 0.013f);
            sum += sampleWave (wave, warp, phase, position, modWheel * 0.03f);
            phases[(size_t) osc] = wrapPhase (phases[(size_t) osc] + phaseIncrement);
        }

        return (sum / std::sqrt ((float) unison)) * level;
    }

    static float pitchWheelToSemitones (int value)
    {
        return (static_cast<float> (value) - 8192.0f) / 8192.0f * 2.0f;
    }

    juce::AudioProcessorValueTreeState& apvts;
    double sampleRate = 44100.0;
    int note = 60;
    float noteVelocity = 0.0f;
    float pitchBend = 0.0f;
    float modWheel = 0.0f;
    float lfoPhase = 0.0f;
    std::array<float, 3> phases {};
    juce::ADSR adsr;
    OnePoleFilter filter;
};

class WaveforgeAudioProcessor final : public juce::AudioProcessor
{
public:
    WaveforgeAudioProcessor()
        : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          apvts (*this, nullptr, "WaveforgeState", createParameterLayout())
    {
        synth.addSound (new WaveforgeSound());
        rebuildVoices();
    }

    const juce::String getName() const override { return "WAVEFORGE"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 4.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return "Init"; }
    void changeProgramName (int, const juce::String&) override {}

    void prepareToPlay (double sampleRate, int samplesPerBlock) override
    {
        synth.setCurrentPlaybackSampleRate (sampleRate);
        for (auto* voice : synth.getVoices())
            if (auto* waveVoice = dynamic_cast<WaveforgeVoice*> (voice))
                waveVoice->prepare (sampleRate);

        juce::dsp::ProcessSpec spec { sampleRate, static_cast<juce::uint32> (samplesPerBlock), 2 };
        reverb.prepare (spec);
        reverb.reset();
        delay.prepare (sampleRate, samplesPerBlock);
    }

    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::mono()
            || layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo();
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override
    {
        juce::ScopedNoDenormals noDenormals;
        buffer.clear();

        auto requestedVoices = static_cast<int> (getParam (apvts, IDs::voices));
        if (requestedVoices != currentVoiceCount)
            rebuildVoices();

        synth.renderNextBlock (buffer, midiMessages, 0, buffer.getNumSamples());

        if (getParam (apvts, IDs::delayOn) > 0.5f)
            delay.process (buffer,
                           getParam (apvts, IDs::delayTime),
                           getParam (apvts, IDs::delayFeedback),
                           getParam (apvts, IDs::delayMix));

        if (getParam (apvts, IDs::reverbOn) > 0.5f)
        {
            juce::Reverb::Parameters params;
            params.roomSize = getParam (apvts, IDs::reverbSize);
            params.damping = getParam (apvts, IDs::reverbDamping);
            params.wetLevel = getParam (apvts, IDs::reverbMix);
            params.dryLevel = 1.0f - params.wetLevel * 0.45f;
            reverb.setParameters (params);
            reverb.processStereo (buffer.getWritePointer (0),
                                  buffer.getNumChannels() > 1 ? buffer.getWritePointer (1) : buffer.getWritePointer (0),
                                  buffer.getNumSamples());
        }

        buffer.applyGain (getParam (apvts, IDs::masterGain));
    }

    bool hasEditor() const override { return true; }

    juce::AudioProcessorEditor* createEditor() override
    {
        return new juce::GenericAudioProcessorEditor (*this);
    }

    void getStateInformation (juce::MemoryBlock& destData) override
    {
        auto state = apvts.copyState();
        std::unique_ptr<juce::XmlElement> xml (state.createXml());
        copyXmlToBinary (*xml, destData);
    }

    void setStateInformation (const void* data, int sizeInBytes) override
    {
        std::unique_ptr<juce::XmlElement> xml (getXmlFromBinary (data, sizeInBytes));
        if (xml != nullptr && xml->hasTagName (apvts.state.getType()))
            apvts.replaceState (juce::ValueTree::fromXml (*xml));
    }

private:
    static void addOscParams (juce::AudioProcessorValueTreeState::ParameterLayout& layout, int osc, const juce::String& label)
    {
        layout.add (std::make_unique<juce::AudioParameterBool> (oscId (osc, "on"), label + " On", osc < 2));
        layout.add (std::make_unique<juce::AudioParameterChoice> (oscId (osc, "wave"), label + " Wave",
                                                                  juce::StringArray { "Sine", "Triangle", "Saw", "Square", "Pulse", "Basic Harmonics", "Digital Bright", "Soft Pad", "Metallic", "Bass Growl" },
                                                                  osc == 1 ? 2 : 5));
        layout.add (std::make_unique<juce::AudioParameterChoice> (oscId (osc, "warp"), label + " Warp",
                                                                  juce::StringArray { "Off", "Bend+", "Bend-", "Sync", "PWM", "FM", "Ring" },
                                                                  0));
        layout.add (std::make_unique<juce::AudioParameterFloat> (oscId (osc, "position"), label + " Position", 0.0f, 1.0f, 0.3f));
        layout.add (std::make_unique<juce::AudioParameterInt> (oscId (osc, "octave"), label + " Octave", -3, 3, osc == 1 ? -1 : 0));
        layout.add (std::make_unique<juce::AudioParameterInt> (oscId (osc, "semitone"), label + " Semitone", -12, 12, 0));
        layout.add (std::make_unique<juce::AudioParameterFloat> (oscId (osc, "fine"), label + " Fine", -50.0f, 50.0f, 0.0f));
        layout.add (std::make_unique<juce::AudioParameterInt> (oscId (osc, "unison"), label + " Unison", 1, 16, osc == 0 ? 3 : 1));
        layout.add (std::make_unique<juce::AudioParameterFloat> (oscId (osc, "detune"), label + " Detune", 0.0f, 1.0f, 0.12f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (oscId (osc, "level"), label + " Level", 0.0f, 1.0f, osc == 2 ? 0.2f : 0.45f));
    }

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout()
    {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;

        addOscParams (layout, 0, "OSC A");
        addOscParams (layout, 1, "OSC B");
        addOscParams (layout, 2, "OSC C");

        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::masterGain, "Master Gain", 0.0f, 1.0f, 0.72f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::glide, "Glide", 0.0f, 0.35f, 0.02f));
        layout.add (std::make_unique<juce::AudioParameterInt> (IDs::voices, "Voices", 1, 24, 12));

        layout.add (std::make_unique<juce::AudioParameterChoice> (IDs::filterType, "Filter Type",
                                                                  juce::StringArray { "LP12", "LP24", "HP", "BP", "Notch" },
                                                                  1));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::filterCutoff, "Filter Cutoff",
                                                                 juce::NormalisableRange<float> (20.0f, 19000.0f, 0.01f, 0.35f),
                                                                 2200.0f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::filterResonance, "Filter Resonance", 0.0f, 1.0f, 0.2f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::filterDrive, "Filter Drive", 0.0f, 1.0f, 0.12f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::filterMix, "Filter Mix", 0.0f, 1.0f, 1.0f));

        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::envAttack, "Env Attack", 0.001f, 4.0f, 0.018f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::envHold, "Env Hold", 0.0f, 2.0f, 0.0f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::envDecay, "Env Decay", 0.001f, 5.0f, 0.42f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::envSustain, "Env Sustain", 0.0f, 1.0f, 0.66f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::envRelease, "Env Release", 0.01f, 8.0f, 0.74f));

        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::lfoRate, "LFO 1 Rate", 0.02f, 20.0f, 0.35f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::lfoDepth, "LFO 1 Depth", 0.0f, 1.0f, 0.4f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::lfoToCutoff, "LFO To Cutoff", -1.0f, 1.0f, 0.25f));

        layout.add (std::make_unique<juce::AudioParameterBool> (IDs::delayOn, "Delay On", true));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::delayTime, "Delay Time", 0.03f, 1.6f, 0.32f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::delayFeedback, "Delay Feedback", 0.0f, 0.9f, 0.28f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::delayMix, "Delay Mix", 0.0f, 1.0f, 0.22f));

        layout.add (std::make_unique<juce::AudioParameterBool> (IDs::reverbOn, "Reverb On", true));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::reverbSize, "Reverb Size", 0.0f, 1.0f, 0.58f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::reverbDamping, "Reverb Damping", 0.0f, 1.0f, 0.35f));
        layout.add (std::make_unique<juce::AudioParameterFloat> (IDs::reverbMix, "Reverb Mix", 0.0f, 1.0f, 0.2f));

        return layout;
    }

    void rebuildVoices()
    {
        currentVoiceCount = static_cast<int> (getParam (apvts, IDs::voices));
        synth.clearVoices();

        for (int i = 0; i < currentVoiceCount; ++i)
            synth.addVoice (new WaveforgeVoice (apvts));
    }

    juce::AudioProcessorValueTreeState apvts;
    juce::Synthesiser synth;
    juce::Reverb reverb;
    DelayLine delay;
    int currentVoiceCount = 12;
};
} // namespace waveforge

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new waveforge::WaveforgeAudioProcessor();
}
