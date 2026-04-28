import { createHash } from 'node:crypto';

/** Short SHA-256 prefix used as the cell identity. */
export function shortSha(value: string, length = 7): string {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, length);
}

/**
 * Map an arbitrary string to a stable HSL color.
 *
 * Identical inputs always produce identical colors, so values that match
 * across environments share a color and divergences pop visually.
 */
export function colorFor(value: string): { bg: string; fg: string } {
  if (value === '') return { bg: 'transparent', fg: 'inherit' };
  const hash = createHash('sha256').update(value, 'utf8').digest();
  const hue = (hash[0]! << 8 | hash[1]!) % 360;
  const sat = 55 + (hash[2]! % 25); // 55–79
  const light = 78 + (hash[3]! % 12); // 78–89 — pastel, dark text contrasts
  const bg = `hsl(${hue} ${sat}% ${light}%)`;
  // Pick fg by perceived lightness — pastels in this range always read with dark text.
  const fg = 'hsl(0 0% 12%)';
  return { bg, fg };
}
