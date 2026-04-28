import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  parseEnv,
  serializeEnv,
  setValue,
  addKey,
  deleteKey,
  getEntries,
} from '../src/parse.js';

test('round-trips an unmodified file exactly', () => {
  const text = [
    '# top comment',
    '',
    'A=1',
    'B="two"',
    "C='three'",
    'export D=four',
    'E=five # inline comment',
    'F= # empty value with comment',
    '',
    '# trailing',
    '',
  ].join('\n');
  const file = parseEnv(text, '.env');
  assert.equal(serializeEnv(file), text);
});

test('parses quoting styles and inline comments', () => {
  const file = parseEnv('A=plain\nB="quoted value"\nC=\'literal\'\nD=after # comment\n');
  const entries = getEntries(file);
  assert.deepEqual(entries, [
    { key: 'A', value: 'plain' },
    { key: 'B', value: 'quoted value' },
    { key: 'C', value: 'literal' },
    { key: 'D', value: 'after' },
  ]);
});

test('parses double-quoted escapes', () => {
  const file = parseEnv('A="line1\\nline2\\t\\"end\\""\n');
  const entries = getEntries(file);
  assert.equal(entries[0]!.value, 'line1\nline2\t"end"');
});

test('keeps single-quoted values literal', () => {
  const file = parseEnv("A='no \\n escape'\n");
  assert.equal(getEntries(file)[0]!.value, 'no \\n escape');
});

test('ignores malformed lines (treats as comment) without crashing', () => {
  const file = parseEnv('not a kv line\nA=1\n');
  assert.equal(getEntries(file).length, 1);
  assert.equal(getEntries(file)[0]!.key, 'A');
});

test('setValue marks dirty and serializes the new value', () => {
  const file = parseEnv('A=old\nB=keep\n');
  setValue(file, 'A', 'new');
  const text = serializeEnv(file);
  assert.equal(text, 'A=new\nB=keep\n');
});

test('setValue preserves the original double-quote style', () => {
  const file = parseEnv('A="old"\n');
  setValue(file, 'A', 'new');
  assert.equal(serializeEnv(file), 'A="new"\n');
});

test('setValue upgrades unquoted to double-quoted when value contains spaces', () => {
  const file = parseEnv('A=old\n');
  setValue(file, 'A', 'with spaces');
  assert.equal(serializeEnv(file), 'A="with spaces"\n');
});

test('setValue escapes special chars in double-quoted output', () => {
  const file = parseEnv('A=plain\n');
  setValue(file, 'A', 'has "quote" and \nnewline');
  const out = serializeEnv(file);
  assert.equal(out, 'A="has \\"quote\\" and \\nnewline"\n');
  // and round-trip back to the original value
  const reparsed = parseEnv(out);
  assert.equal(getEntries(reparsed)[0]!.value, 'has "quote" and \nnewline');
});

test('setValue preserves inline comments', () => {
  const file = parseEnv('A=old # important note\n');
  setValue(file, 'A', 'new');
  assert.equal(serializeEnv(file), 'A=new # important note\n');
});

test('setValue preserves export prefix', () => {
  const file = parseEnv('export A=old\n');
  setValue(file, 'A', 'new');
  assert.equal(serializeEnv(file), 'export A=new\n');
});

test('addKey appends a new entry', () => {
  const file = parseEnv('A=1\n');
  addKey(file, 'B', '2');
  assert.equal(serializeEnv(file), 'A=1\nB=2\n');
});

test('deleteKey removes the line and preserves surrounding structure', () => {
  const file = parseEnv('# top\nA=1\nB=2\nC=3\n');
  assert.equal(deleteKey(file, 'B'), true);
  assert.equal(serializeEnv(file), '# top\nA=1\nC=3\n');
});

test('deleteKey returns false when key does not exist', () => {
  const file = parseEnv('A=1\n');
  assert.equal(deleteKey(file, 'B'), false);
});

test('handles file with no trailing newline', () => {
  const file = parseEnv('A=1');
  assert.equal(serializeEnv(file), 'A=1');
  setValue(file, 'A', '2');
  assert.equal(serializeEnv(file), 'A=2');
});

test('handles empty file', () => {
  const file = parseEnv('');
  assert.equal(getEntries(file).length, 0);
  assert.equal(serializeEnv(file), '');
  addKey(file, 'A', '1');
  assert.equal(serializeEnv(file), 'A=1\n');
});

test('mixed mutations preserve unrelated lines exactly', () => {
  const original = '# header\n\nA=1\nB=2 # note\nC=3\n# footer\n';
  const file = parseEnv(original);
  setValue(file, 'B', 'changed');
  deleteKey(file, 'C');
  addKey(file, 'D', '4');
  const out = serializeEnv(file);
  assert.equal(out, '# header\n\nA=1\nB=changed # note\n# footer\nD=4\n');
});
