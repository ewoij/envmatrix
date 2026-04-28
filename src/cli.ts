#!/usr/bin/env node
import { startServer } from './server.js';
import { exportStatic } from './export.js';

interface Args {
  files: string[];
  exportPath: string | null;
  port: number;
  help: boolean;
  version: boolean;
}

const HELP = `envmatrix — compare and edit multiple .env files in a browser

usage:
  envmatrix <file> <file> [<file> …]                  open interactive editor
  envmatrix <file> <file> [<file> …] --export <path>  write a static HTML report

options:
  --export <path>   write a read-only HTML report to <path> and exit
  --port <n>        port for interactive mode (default: 4321)
  -h, --help        show this help
  -v, --version     show version

examples:
  envmatrix .env.local .env.dev .env.prod
  envmatrix .env.local .env.prod --export report.html
`;

function parseArgs(argv: string[]): Args {
  const out: Args = { files: [], exportPath: null, port: 4321, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '-v' || a === '--version') out.version = true;
    else if (a === '--export') {
      const next = argv[++i];
      if (!next) throw new Error('--export requires a path');
      out.exportPath = next;
    } else if (a === '--port') {
      const next = argv[++i];
      if (!next) throw new Error('--port requires a number');
      out.port = Number(next);
      if (!Number.isInteger(out.port) || out.port < 1 || out.port > 65535) {
        throw new Error(`invalid --port: ${next}`);
      }
    } else if (a.startsWith('-')) {
      throw new Error(`unknown option: ${a}`);
    } else {
      out.files.push(a);
    }
  }
  return out;
}

async function main(): Promise<void> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`error: ${(err as Error).message}\n`);
    console.error(HELP);
    process.exit(2);
  }

  if (args.help || (args.files.length === 0 && !args.version)) {
    console.log(HELP);
    process.exit(args.help ? 0 : 2);
  }
  if (args.version) {
    const { readFile } = await import('node:fs/promises');
    const pkgUrl = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(await readFile(pkgUrl, 'utf8')) as { version: string };
    console.log(pkg.version);
    return;
  }

  if (args.files.length < 2) {
    console.error('error: need at least 2 files to compare\n');
    console.error(HELP);
    process.exit(2);
  }

  if (args.exportPath !== null) {
    await exportStatic(args.files, args.exportPath);
    return;
  }
  await startServer(args.files, args.port);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
