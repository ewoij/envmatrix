import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { colorFor, shortSha } from '../src/color.js';

test('shortSha returns 7 hex chars by default', () => {
  const s = shortSha('hello');
  assert.match(s, /^[0-9a-f]{7}$/);
});

test('shortSha is stable for the same input', () => {
  assert.equal(shortSha('x'), shortSha('x'));
});

test('shortSha differs for different inputs', () => {
  assert.notEqual(shortSha('a'), shortSha('b'));
});

test('colorFor returns transparent for empty string', () => {
  assert.deepEqual(colorFor(''), { bg: 'transparent', fg: 'inherit' });
});

test('colorFor is stable for the same input', () => {
  assert.deepEqual(colorFor('hello'), colorFor('hello'));
});

test('colorFor differs for different inputs', () => {
  assert.notEqual(colorFor('a').bg, colorFor('b').bg);
});

test('colorFor returns hsl strings in expected ranges', () => {
  const { bg } = colorFor('test');
  const m = /^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(bg);
  assert.ok(m, `bg "${bg}" did not match hsl pattern`);
  const [hue, sat, light] = [Number(m![1]), Number(m![2]), Number(m![3])];
  assert.ok(hue >= 0 && hue < 360);
  assert.ok(sat >= 55 && sat < 80);
  assert.ok(light >= 78 && light < 90);
});
