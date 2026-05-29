export interface WavEncodeOptions {
  bitDepth?: 16 | 24;
}

export const encodeWav = (
  left: Float32Array[],
  right: Float32Array[],
  sampleRate: number,
  options: WavEncodeOptions = {},
) => {
  const bitDepth = options.bitDepth ?? 16;
  const bytesPerSample = bitDepth / 8;
  const channelCount = 2;
  const totalLength = left.reduce((sum, block) => sum + block.length, 0);
  const dataSize = totalLength * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + totalLength * 4, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const writeSample = (value: number) => {
    const clamped = Math.max(-1, Math.min(1, value));
    if (bitDepth === 24) {
      const sample = Math.round(clamped < 0 ? clamped * 0x800000 : clamped * 0x7fffff);
      view.setUint8(offset, sample & 0xff);
      view.setUint8(offset + 1, (sample >> 8) & 0xff);
      view.setUint8(offset + 2, (sample >> 16) & 0xff);
      offset += 3;
      return;
    }
    view.setInt16(offset, Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff), true);
    offset += bytesPerSample;
  };

  for (let block = 0; block < left.length; block += 1) {
    for (let i = 0; i < left[block].length; i += 1) {
      writeSample(left[block][i]);
      writeSample(right[block]?.[i] ?? left[block][i]);
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
};
