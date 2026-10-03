import { decode } from 'jpeg-js';
import { toByteArray } from 'base64-js';
export function imageTensor(base64: string, size: number, mean: number[], std: number[]): Float32Array {
  const { width, height, data } = decode(toByteArray(base64), { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 2, maxMemoryUsageInMB: 32 });
  if (width !== size || height !== size) throw new Error('Unexpected image size');
  const pixels = size * size;
  const tensor = new Float32Array(3 * pixels);
  let luminanceSum = 0;
  let luminanceSq = 0;
  for (let i = 0; i < pixels; i++) {
    const luminance = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    luminanceSum += luminance; luminanceSq += luminance * luminance;
    for (let c = 0; c < 3; c++) tensor[c * pixels + i] = (data[i * 4 + c] / 255 - mean[c]) / std[c];
  }
  const brightness = luminanceSum / pixels;
  const variance = luminanceSq / pixels - brightness * brightness;
  if (brightness < 12 || brightness > 245 || variance < 35) throw new Error('PHOTO_QUALITY');
  return tensor;
}
