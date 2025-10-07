// pcmBuffer.ts
export default class PCMBuffer {
  buffer: Float32Array;
  writeIndex = 0;
  size = 0;

  constructor(public capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  push(samples: Float32Array) {
    let src = samples;
    const cap = this.capacity;
    for (let i = 0; i < src.length; i++) {
      this.buffer[this.writeIndex] = src[i];
      this.writeIndex = (this.writeIndex + 1) % cap;
      if (this.size < cap) this.size++;
    }
  }

  // Get last N samples (N <= capacity)
  lastN(n: number): Float32Array {
    const out = new Float32Array(n);
    const cap = this.capacity;
    if (n <= 0) return out;
    // If not enough data, fill start with zeros
    if (this.size < n) {
      const pad = n - this.size;
      for (let i = 0; i < pad; i++) out[i] = 0;
      // copy the available tail
      for (let i = 0; i < this.size; i++) {
        const srcIdx = (this.writeIndex - this.size + i + cap) % cap;
        out[pad + i] = this.buffer[srcIdx];
      }
      return out;
    }
    // enough data
    const start = (this.writeIndex - n + cap) % cap;
    for (let i = 0; i < n; i++) {
      out[i] = this.buffer[(start + i) % cap];
    }
    return out;
  }

  clear() {
    this.writeIndex = 0;
    this.size = 0;
  }
}
