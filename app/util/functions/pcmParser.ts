// pcmParser.ts
import { Buffer } from "buffer";

/**
 * Convert base64 PCM (Int16 LE) to Float32Array normalized to [-1..1].
 * @param base64Chunk - base64 string provided by react-native-audio-record on 'data' events
 */
export function pcmBase64ToFloat32(base64Chunk: string): Float32Array {
  const buf = Buffer.from(base64Chunk, "base64"); // Node / RN 'buffer' package
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const out = new Float32Array(Math.floor(buf.length / 2));
  let o = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) {
    // little-endian int16
    const int16 = view.getInt16(i, true);
    out[o++] = int16 / 32768; // normalize to -1..1
  }
  return out;
}
