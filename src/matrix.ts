import { basename } from 'node:path';
import type { EnvFile } from './parse.js';
import { getEntries } from './parse.js';
import { colorFor, shortSha } from './color.js';

export type RowStatus = 'same' | 'differs' | 'partial';

export interface Cell {
  value: string | null; // null = key not present in this file
  sha: string;
  bg: string;
  fg: string;
}

export interface Row {
  key: string;
  cells: Cell[];
  status: RowStatus;
}

export interface Matrix {
  files: Array<{ path: string; label: string }>;
  rows: Row[];
}

export function buildMatrix(files: EnvFile[]): Matrix {
  const fileMaps = files.map((f) => {
    const map = new Map<string, string>();
    for (const e of getEntries(f)) map.set(e.key, e.value);
    return map;
  });

  const allKeys = new Set<string>();
  for (const m of fileMaps) for (const k of m.keys()) allKeys.add(k);

  const rows: Row[] = [...allKeys].sort().map((key) => {
    const cells: Cell[] = fileMaps.map((m) => {
      if (!m.has(key)) {
        return { value: null, sha: '', bg: 'transparent', fg: 'inherit' };
      }
      const value = m.get(key)!;
      const { bg, fg } = colorFor(value);
      return { value, sha: shortSha(value), bg, fg };
    });
    return { key, cells, status: rowStatus(cells) };
  });

  return {
    files: files.map((f) => ({ path: f.path, label: basename(f.path) })),
    rows,
  };
}

function rowStatus(cells: Cell[]): RowStatus {
  const present = cells.filter((c) => c.value !== null);
  if (present.length < cells.length) return 'partial';
  const first = present[0]!.sha;
  return present.every((c) => c.sha === first) ? 'same' : 'differs';
}
