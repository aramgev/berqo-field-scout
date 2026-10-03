import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encode } from 'jpeg-js';
import { fromByteArray } from 'base64-js';
import { imageTensor } from '../src/fieldScout/ml/preprocess';
function jpeg(size: number, flat = false) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const bright = flat || i < size * size / 2;
    data[i * 4] = bright ? 220 : 20; data[i * 4 + 1] = bright ? 180 : 30; data[i * 4 + 2] = bright ? 130 : 40; data[i * 4 + 3] = 255;
  }
  return fromByteArray(encode({ data, width: size, height: size }, 100).data);
}
test('JPEG preprocessing produces normalized planar RGB matching the model shape', () => {
  const values = imageTensor(jpeg(224), 224, [.485, .456, .406], [.229, .224, .225]);
  const n = 224 * 224;
  assert.equal(values.length, 3 * n);
  assert.ok(Math.abs(values[0] - (220 / 255 - .485) / .229) < .04);
  assert.ok(Math.abs(values[n] - (180 / 255 - .456) / .224) < .04);
  assert.ok(Math.abs(values[2 * n] - (130 / 255 - .406) / .225) < .04);
  assert.ok(values[0] > values[n - 1]);
});
test('Wrong dimensions and featureless images are rejected before inference', () => {
  assert.throws(() => imageTensor(jpeg(32), 224, [0, 0, 0], [1, 1, 1]), /Unexpected image size/);
  assert.throws(() => imageTensor(jpeg(224, true), 224, [0, 0, 0], [1, 1, 1]), /PHOTO_QUALITY/);
});
