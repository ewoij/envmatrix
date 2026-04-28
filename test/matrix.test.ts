import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseEnv } from '../src/parse.js';
import { buildMatrix } from '../src/matrix.js';

test('union of keys, sorted', () => {
  const a = parseEnv('B=1\nA=1\n', '.env.a');
  const b = parseEnv('C=1\nA=2\n', '.env.b');
  const m = buildMatrix([a, b]);
  assert.deepEqual(
    m.rows.map((r) => r.key),
    ['A', 'B', 'C'],
  );
});

test('row status: same when all values match', () => {
  const a = parseEnv('A=hello\n');
  const b = parseEnv('A=hello\n');
  const m = buildMatrix([a, b]);
  assert.equal(m.rows[0]!.status, 'same');
});

test('row status: differs when values diverge', () => {
  const a = parseEnv('A=hello\n');
  const b = parseEnv('A=world\n');
  const m = buildMatrix([a, b]);
  assert.equal(m.rows[0]!.status, 'differs');
});

test('row status: partial when missing in some env', () => {
  const a = parseEnv('A=hello\n');
  const b = parseEnv('B=world\n');
  const m = buildMatrix([a, b]);
  for (const r of m.rows) assert.equal(r.status, 'partial');
});

test('identical values across files share a color', () => {
  const a = parseEnv('A=same\n');
  const b = parseEnv('A=same\n');
  const m = buildMatrix([a, b]);
  assert.equal(m.rows[0]!.cells[0]!.bg, m.rows[0]!.cells[1]!.bg);
  assert.equal(m.rows[0]!.cells[0]!.sha, m.rows[0]!.cells[1]!.sha);
});

test('different values get different shas', () => {
  const a = parseEnv('A=one\n');
  const b = parseEnv('A=two\n');
  const m = buildMatrix([a, b]);
  assert.notEqual(m.rows[0]!.cells[0]!.sha, m.rows[0]!.cells[1]!.sha);
});

test('missing cell is null with transparent bg', () => {
  const a = parseEnv('A=1\n');
  const b = parseEnv('B=1\n');
  const m = buildMatrix([a, b]);
  const aRow = m.rows.find((r) => r.key === 'A')!;
  assert.equal(aRow.cells[1]!.value, null);
  assert.equal(aRow.cells[1]!.sha, '');
});
