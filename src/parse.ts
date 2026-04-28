/**
 * Round-trip safe .env parser.
 *
 * Preserves comments, blank lines, key order, original quoting, and inline
 * comments. Unmodified lines serialize back to their exact original text;
 * modified or added lines are reconstructed from their parsed fields.
 */

export type EnvLine =
  | { kind: 'blank'; raw: string }
  | { kind: 'comment'; raw: string }
  | {
      kind: 'kv';
      key: string;
      value: string;
      quote: '' | '"' | "'";
      exportPrefix: boolean;
      inlineComment: string | null;
      raw: string;
      dirty: boolean;
    };

export interface EnvFile {
  path: string;
  lines: EnvLine[];
  /** Trailing newline character of original file ('\n' / '\r\n' / '') */
  eol: string;
  /** True when the original file ended with a final newline. */
  trailingNewline: boolean;
}

const KV_PATTERN = /^(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

export function parseEnv(text: string, path = ''): EnvFile {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = text.endsWith('\n');
  const body = trailingNewline ? text.slice(0, -eol.length) : text;
  const rawLines = body.length === 0 ? [] : body.split(eol);
  const lines: EnvLine[] = rawLines.map((raw) => parseLine(raw));
  return { path, lines, eol, trailingNewline };
}

function parseLine(raw: string): EnvLine {
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'blank', raw };
  if (trimmed.startsWith('#')) return { kind: 'comment', raw };

  const match = KV_PATTERN.exec(raw);
  if (!match) return { kind: 'comment', raw };

  const exportPrefix = Boolean(match[1]);
  const key = match[2]!;
  const rest = match[3] ?? '';

  const { value, quote, inlineComment } = parseValue(rest);
  return {
    kind: 'kv',
    key,
    value,
    quote,
    exportPrefix,
    inlineComment,
    raw,
    dirty: false,
  };
}

function parseValue(rest: string): {
  value: string;
  quote: '' | '"' | "'";
  inlineComment: string | null;
} {
  let s = rest.replace(/^[ \t]+/, '');

  if (s.startsWith('"')) {
    const { value, end } = readQuoted(s, '"', true);
    const tail = s.slice(end);
    return { value, quote: '"', inlineComment: extractInlineComment(tail) };
  }
  if (s.startsWith("'")) {
    const { value, end } = readQuoted(s, "'", false);
    const tail = s.slice(end);
    return { value, quote: "'", inlineComment: extractInlineComment(tail) };
  }

  // Unquoted: trim trailing whitespace; '#' after whitespace starts a comment.
  let value = '';
  let inlineComment: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '#' && (i === 0 || s[i - 1] === ' ' || s[i - 1] === '\t')) {
      inlineComment = s.slice(i + 1);
      break;
    }
    value += ch;
  }
  return { value: value.replace(/[ \t]+$/, ''), quote: '', inlineComment };
}

function readQuoted(
  s: string,
  q: '"' | "'",
  allowEscapes: boolean,
): { value: string; end: number } {
  let value = '';
  let i = 1;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === q) return { value, end: i + 1 };
    if (allowEscapes && ch === '\\' && i + 1 < s.length) {
      const next = s[i + 1]!;
      const map: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        '\\': '\\',
        '"': '"',
        "'": "'",
      };
      value += map[next] ?? next;
      i += 2;
      continue;
    }
    value += ch;
    i++;
  }
  // Unterminated — treat the rest as the value.
  return { value, end: s.length };
}

function extractInlineComment(tail: string): string | null {
  const m = /^[ \t]*#(.*)$/.exec(tail);
  return m ? m[1]! : null;
}

export function serializeEnv(file: EnvFile): string {
  const out = file.lines.map((l) => (l.kind === 'kv' && l.dirty ? renderKv(l) : l.raw));
  return out.join(file.eol) + (file.trailingNewline ? file.eol : '');
}

function renderKv(line: Extract<EnvLine, { kind: 'kv' }>): string {
  const prefix = line.exportPrefix ? 'export ' : '';
  const quote = pickQuote(line.value, line.quote);
  const rendered = quote === '' ? line.value : quote + escape(line.value, quote) + quote;
  const comment = line.inlineComment !== null ? ` #${line.inlineComment}` : '';
  return `${prefix}${line.key}=${rendered}${comment}`;
}

function pickQuote(value: string, current: '' | '"' | "'"): '' | '"' | "'" {
  // Preserve original quoting if it can still hold the new value.
  if (current === '"') return '"';
  if (current === "'") return value.includes("'") ? '"' : "'";
  // Unquoted: upgrade if needed.
  if (
    value === '' ||
    /[\s#"'\\]/.test(value) ||
    value !== value.trim()
  ) {
    return '"';
  }
  return '';
}

function escape(value: string, quote: '"' | "'"): string {
  if (quote === "'") return value;
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/** Mutation helpers — caller must mark dirty=true on edits or use these. */

export function setValue(file: EnvFile, key: string, newValue: string): boolean {
  for (const line of file.lines) {
    if (line.kind === 'kv' && line.key === key) {
      if (line.value !== newValue) {
        line.value = newValue;
        line.dirty = true;
      }
      return true;
    }
  }
  return false;
}

export function addKey(file: EnvFile, key: string, value: string): void {
  // If the file isn't blank and doesn't already end on a blank line,
  // we still just append — caller can manage spacing if desired.
  file.lines.push({
    kind: 'kv',
    key,
    value,
    quote: '',
    exportPrefix: false,
    inlineComment: null,
    raw: '',
    dirty: true,
  });
  file.trailingNewline = true;
}

export function deleteKey(file: EnvFile, key: string): boolean {
  const i = file.lines.findIndex((l) => l.kind === 'kv' && l.key === key);
  if (i === -1) return false;
  file.lines.splice(i, 1);
  return true;
}

export function getEntries(file: EnvFile): Array<{ key: string; value: string }> {
  return file.lines
    .filter((l): l is Extract<EnvLine, { kind: 'kv' }> => l.kind === 'kv')
    .map((l) => ({ key: l.key, value: l.value }));
}
