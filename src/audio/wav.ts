export const encodeWav = (left: Float32Array[], right: Float32Array[], sampleRate: number) => {
  const totalLength = left.reduce((sum, block) => sum + block.length, 0);
  const buffer = new ArrayBuffer(44 + totalLength * 4);
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
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, totalLength * 4, true);

  let offset = 44;
  const writeSample = (value: number) => {
    const clamped = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  };

  for (let block = 0; block < left.length; block += 1) {
    for (let i = 0; i < left[block].length; i += 1) {
      writeSample(left[block][i]);
      writeSample(right[block]?.[i] ?? left[block][i]);
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
};
