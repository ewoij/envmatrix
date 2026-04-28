import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from './parse.js';
import { buildMatrix } from './matrix.js';
import { renderHtml } from './ui.js';

export async function exportStatic(paths: string[], outPath: string): Promise<void> {
  const files = await Promise.all(
    paths.map(async (p) => {
      const text = await readFile(p, 'utf8').catch((err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return '';
        throw err;
      });
      return parseEnv(text, p);
    }),
  );
  const matrix = buildMatrix(files);
  const html = renderHtml({ matrix, editable: false });
  await writeFile(outPath, html, 'utf8');
  console.log(`wrote ${outPath} (${files.length} files, ${matrix.rows.length} keys)`);
}
