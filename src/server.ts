import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { exec } from 'node:child_process';
import {
  parseEnv,
  serializeEnv,
  setValue,
  addKey,
  deleteKey,
  type EnvFile,
} from './parse.js';
import { buildMatrix } from './matrix.js';
import { renderHtml } from './ui.js';

interface Patch {
  op: 'set' | 'add' | 'delete';
  key: string;
  fileIndex?: number;
  value?: string;
}

export async function startServer(paths: string[], port: number): Promise<void> {
  const files = await loadFiles(paths);

  const server = createServer(async (req, res) => {
    try {
      await handle(req, res, files);
    } catch (err) {
      res.statusCode = 500;
      res.end(err instanceof Error ? err.message : String(err));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  const url = `http://127.0.0.1:${port}`;
  console.log(`envmatrix → ${url}`);
  console.log(`editing ${files.length} files:`);
  for (const f of files) console.log(`  ${f.path}`);
  console.log(`press Ctrl+C to stop`);
  openBrowser(url);
}

async function loadFiles(paths: string[]): Promise<EnvFile[]> {
  return Promise.all(
    paths.map(async (p) => {
      const text = await readFile(p, 'utf8').catch((err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return '';
        throw err;
      });
      return parseEnv(text, p);
    }),
  );
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  files: EnvFile[],
): Promise<void> {
  const url = req.url ?? '/';
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    const html = renderHtml({ matrix: buildMatrix(files), editable: true });
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  if (req.method === 'POST' && url === '/api/save') {
    const body = await readBody(req);
    const patch = JSON.parse(body) as Patch;
    await applyPatch(files, patch);
    const matrix = buildMatrix(files);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ matrix }));
    return;
  }
  res.statusCode = 404;
  res.end('not found');
}

async function applyPatch(files: EnvFile[], patch: Patch): Promise<void> {
  if (patch.op === 'set') {
    const idx = patch.fileIndex ?? -1;
    const file = files[idx];
    if (!file) throw new Error(`invalid fileIndex ${idx}`);
    if (!isValidKey(patch.key)) throw new Error(`invalid key ${patch.key}`);
    const value = patch.value ?? '';
    if (!setValue(file, patch.key, value)) {
      addKey(file, patch.key, value);
    }
    await persist(file);
    return;
  }
  if (patch.op === 'add') {
    if (!isValidKey(patch.key)) throw new Error(`invalid key ${patch.key}`);
    for (const file of files) {
      if (!hasKey(file, patch.key)) {
        addKey(file, patch.key, '');
        await persist(file);
      }
    }
    return;
  }
  if (patch.op === 'delete') {
    for (const file of files) {
      if (deleteKey(file, patch.key)) {
        await persist(file);
      }
    }
    return;
  }
}

function hasKey(file: EnvFile, key: string): boolean {
  return file.lines.some((l) => l.kind === 'kv' && l.key === key);
}

function isValidKey(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

async function persist(file: EnvFile): Promise<void> {
  await writeFile(file.path, serializeEnv(file), 'utf8');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? `open "${url}"`
    : platform === 'win32' ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {
    /* swallow — user can open manually */
  });
}
