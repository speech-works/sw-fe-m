// downsample.ts
export function downsampleAverage(
  input: Float32Array,
  outLen: number
): Float32Array {
  const out = new Float32Array(outLen);
  if (input.length === 0) return out;
  const ratio = input.length / outLen;
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let k = start; k < Math.min(end + 1, input.length); k++) {
      sum += input[k];
      count++;
    }
    if (count === 0) {
      out[i] = input[Math.min(input.length - 1, Math.floor(i * ratio))];
    } else {
      out[i] = sum / count;
    }
  }
  return out;
}
