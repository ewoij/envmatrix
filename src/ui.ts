import type { Matrix } from './matrix.js';

export interface RenderOptions {
  matrix: Matrix;
  editable: boolean;
  title?: string;
}

export function renderHtml(opts: RenderOptions): string {
  const initial = JSON.stringify({ matrix: opts.matrix, editable: opts.editable });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(opts.title ?? 'envmatrix')}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <h1>envmatrix${opts.editable ? '' : ' <span class="badge">read-only</span>'}</h1>
  <div class="header-actions">
    <label class="toggle"><input type="checkbox" id="show-values" /> show values</label>
    <button type="button" id="save-status" class="save-status" aria-live="polite">saved</button>
  </div>
</header>

<section class="toolbar">
  <input type="search" id="search" placeholder="filter keys…" autocomplete="off" />
  <label class="toggle"><input type="checkbox" id="filter-differs" /> differs only</label>
  <label class="toggle"><input type="checkbox" id="filter-partial" /> missing in some env</label>
  ${opts.editable ? '<button type="button" id="add-key" class="btn">+ add key</button>' : ''}
</section>

<main>
  <div class="table-wrap">
    <table id="matrix">
      <thead>
        <tr>
          <th class="col-status"></th>
          <th class="col-key">key</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
  <p class="empty" id="empty" hidden>no rows match the current filters.</p>
</main>

<dialog id="add-dialog">
  <form method="dialog">
    <h2>add key</h2>
    <label>key name<input id="add-key-name" required pattern="[A-Za-z_][A-Za-z0-9_]*" /></label>
    <p class="hint">the key will be added to every file with an empty value. edit each cell to set values.</p>
    <menu>
      <button value="cancel">cancel</button>
      <button id="add-confirm" value="confirm">add</button>
    </menu>
  </form>
</dialog>

<script>window.__INITIAL__ = ${initial};</script>
<script>${JS}</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const CSS = `
:root {
  --bg: #fafaf9;
  --fg: #18181b;
  --muted: #71717a;
  --muted-bg: #f4f4f5;
  --border: #e4e4e7;
  --primary: #18181b;
  --destructive: #b91c1c;
  --destructive-bg: #fef2f2;
  --pill-same-bg: #ecfdf5;
  --pill-same-fg: #065f46;
  --pill-differs-bg: #fef3c7;
  --pill-differs-fg: #92400e;
  --pill-partial-bg: #fee2e2;
  --pill-partial-fg: #991b1b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0a;
    --fg: #fafafa;
    --muted: #a1a1aa;
    --muted-bg: #18181b;
    --border: #27272a;
    --primary: #fafafa;
    --destructive: #f87171;
    --destructive-bg: #450a0a;
    --pill-same-bg: #064e3b;
    --pill-same-fg: #6ee7b7;
    --pill-differs-bg: #78350f;
    --pill-differs-fg: #fcd34d;
    --pill-partial-bg: #7f1d1d;
    --pill-partial-fg: #fca5a5;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); }
body { padding: 16px 20px 80px; max-width: 1400px; margin: 0 auto; }
header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding-bottom: 12px;
}
h1 { font-size: 18px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.badge {
  display: inline-block; vertical-align: middle; margin-left: 6px;
  padding: 2px 8px; border-radius: 999px; background: var(--muted-bg); color: var(--muted);
  font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;
}
.header-actions { display: flex; align-items: center; gap: 12px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); cursor: pointer; user-select: none; }
.toggle input { cursor: pointer; }
.save-status {
  font-size: 11px; color: var(--muted); background: transparent; border: none; cursor: default;
  padding: 2px 6px; border-radius: 4px;
}
.save-status.saving { color: var(--muted); }
.save-status.saved { color: var(--muted); }
.save-status.error { color: var(--destructive); background: var(--destructive-bg); }

.toolbar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  padding: 10px 0 14px;
}
.toolbar input[type="search"] {
  flex: 1; min-width: 200px; height: 32px; padding: 0 10px;
  border: 1px solid var(--border); background: var(--bg); color: var(--fg);
  border-radius: 6px; font-size: 13px;
}
.btn {
  height: 32px; padding: 0 10px; border-radius: 6px;
  background: var(--primary); color: var(--bg); border: none; cursor: pointer;
  font-size: 13px; font-weight: 500;
}
.btn:hover { opacity: 0.9; }
.btn-icon {
  height: 24px; width: 24px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 4px; border: none; background: transparent; color: var(--muted); cursor: pointer;
  font-size: 14px; line-height: 1;
}
.btn-icon:hover { background: var(--muted-bg); color: var(--destructive); }

.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
thead { background: var(--muted-bg); }
th, td { padding: 6px 10px; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--border); }
th { font-weight: 500; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: var(--muted-bg); }
.col-status { width: 90px; }
.col-key { font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 500; min-width: 220px; }
.col-actions { width: 32px; text-align: right; }

.pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
}
.pill-same { background: var(--pill-same-bg); color: var(--pill-same-fg); }
.pill-differs { background: var(--pill-differs-bg); color: var(--pill-differs-fg); }
.pill-partial { background: var(--pill-partial-bg); color: var(--pill-partial-fg); }

.cell {
  display: inline-flex; align-items: center; min-width: 80px; max-width: 320px;
  padding: 3px 8px; border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: text;
}
.cell-empty {
  color: var(--muted); font-style: italic; background: transparent; cursor: pointer;
  border: 1px dashed var(--border);
}
.cell-empty:hover { background: var(--muted-bg); }
.cell-input {
  width: 100%; min-width: 200px; height: 28px; padding: 0 8px;
  font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px;
  border: 1px solid var(--primary); border-radius: 4px;
  background: var(--bg); color: var(--fg);
}
.cell-input:focus { outline: 2px solid var(--primary); outline-offset: -1px; }

.empty {
  text-align: center; color: var(--muted); padding: 32px; font-size: 13px;
}

dialog {
  border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--fg);
  padding: 20px; min-width: 300px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
dialog::backdrop { background: rgba(0,0,0,0.4); }
dialog h2 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
dialog label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); }
dialog input {
  height: 32px; padding: 0 10px; font-size: 13px;
  border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg); color: var(--fg); font-family: ui-monospace, SFMono-Regular, monospace;
}
dialog .hint { font-size: 11px; color: var(--muted); margin: 8px 0 12px; }
dialog menu { display: flex; gap: 8px; justify-content: flex-end; padding: 0; margin: 0; }
dialog button {
  height: 32px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); color: var(--fg); cursor: pointer; font-size: 13px;
}
dialog #add-confirm { background: var(--primary); color: var(--bg); border-color: var(--primary); }
`;

const JS = `
(() => {
  const state = window.__INITIAL__;
  const matrix = state.matrix;
  const editable = state.editable;

  const $ = (sel) => document.querySelector(sel);
  const tbody = $('#matrix tbody');
  const thead = $('#matrix thead tr');
  const search = $('#search');
  const filterDiffers = $('#filter-differs');
  const filterPartial = $('#filter-partial');
  const showValues = $('#show-values');
  const empty = $('#empty');
  const saveStatus = $('#save-status');
  const addBtn = $('#add-key');
  const addDialog = $('#add-dialog');

  // Build header columns for files.
  for (const f of matrix.files) {
    const th = document.createElement('th');
    th.textContent = f.label;
    th.title = f.path;
    thead.appendChild(th);
  }
  if (editable) {
    const th = document.createElement('th');
    th.className = 'col-actions';
    thead.appendChild(th);
  }

  function render() {
    tbody.innerHTML = '';
    const q = search.value.trim().toLowerCase();
    const onlyDiffers = filterDiffers.checked;
    const onlyPartial = filterPartial.checked;
    const reveal = showValues.checked;

    let visible = 0;
    for (const row of matrix.rows) {
      if (q && !row.key.toLowerCase().includes(q)) continue;
      if (onlyDiffers && row.status === 'same') continue;
      if (onlyPartial && row.status !== 'partial') continue;
      tbody.appendChild(renderRow(row, reveal));
      visible++;
    }
    empty.hidden = visible > 0;
  }

  function renderRow(row, reveal) {
    const tr = document.createElement('tr');
    tr.dataset.key = row.key;

    const tdStatus = document.createElement('td');
    tdStatus.className = 'col-status';
    const pill = document.createElement('span');
    pill.className = 'pill pill-' + row.status;
    pill.textContent = row.status;
    tdStatus.appendChild(pill);
    tr.appendChild(tdStatus);

    const tdKey = document.createElement('td');
    tdKey.className = 'col-key';
    tdKey.textContent = row.key;
    tr.appendChild(tdKey);

    row.cells.forEach((cell, i) => {
      const td = document.createElement('td');
      td.appendChild(renderCell(row.key, i, cell, reveal));
      tr.appendChild(td);
    });

    if (editable) {
      const tdActions = document.createElement('td');
      tdActions.className = 'col-actions';
      const del = document.createElement('button');
      del.className = 'btn-icon';
      del.title = 'delete key from all files';
      del.setAttribute('aria-label', 'delete key ' + row.key);
      del.textContent = '×';
      del.addEventListener('click', () => deleteKey(row.key));
      tdActions.appendChild(del);
      tr.appendChild(tdActions);
    }

    return tr;
  }

  function renderCell(key, fileIndex, cell, reveal) {
    if (cell.value === null) {
      const span = document.createElement('span');
      span.className = 'cell cell-empty';
      span.textContent = '—';
      span.title = editable ? 'click to add value in this file' : 'not present';
      if (editable) {
        span.addEventListener('click', () => editCell(key, fileIndex, ''));
      }
      return span;
    }
    const span = document.createElement('span');
    span.className = 'cell';
    span.style.background = cell.bg;
    span.style.color = cell.fg;
    const label = reveal ? cell.value : cell.sha;
    span.textContent = label;
    span.title = reveal ? cell.value + ' (sha ' + cell.sha + ')' : cell.sha + ' — toggle "show values" to see the actual value';
    if (editable) {
      span.addEventListener('click', () => editCell(key, fileIndex, cell.value));
    }
    return span;
  }

  function editCell(key, fileIndex, current) {
    const row = matrix.rows.find((r) => r.key === key);
    if (!row) return;
    const tr = tbody.querySelector('tr[data-key="' + cssEscape(key) + '"]');
    if (!tr) return;
    const td = tr.children[2 + fileIndex];
    td.innerHTML = '';
    const input = document.createElement('input');
    input.className = 'cell-input';
    input.type = 'text';
    input.value = current;
    input.spellcheck = false;
    td.appendChild(input);
    input.focus();
    input.select();

    const finish = (commit) => {
      if (!commit) {
        render();
        return;
      }
      const newValue = input.value;
      saveCell(key, fileIndex, newValue);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  async function saveCell(key, fileIndex, value) {
    setStatus('saving', 'saving…');
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'set', key, fileIndex, value }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      applyMatrix(updated.matrix);
      setStatus('saved', 'saved');
    } catch (err) {
      setStatus('error', 'save failed: ' + (err && err.message ? err.message : 'unknown'));
      render();
    }
  }

  async function deleteKey(key) {
    if (!confirm('delete "' + key + '" from all files?')) return;
    setStatus('saving', 'saving…');
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'delete', key }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      applyMatrix(updated.matrix);
      setStatus('saved', 'saved');
    } catch (err) {
      setStatus('error', 'save failed: ' + (err && err.message ? err.message : 'unknown'));
    }
  }

  async function addKey(name) {
    setStatus('saving', 'saving…');
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'add', key: name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      applyMatrix(updated.matrix);
      setStatus('saved', 'saved');
    } catch (err) {
      setStatus('error', 'save failed: ' + (err && err.message ? err.message : 'unknown'));
    }
  }

  function applyMatrix(m) {
    matrix.rows = m.rows;
    matrix.files = m.files;
    render();
  }

  function setStatus(cls, text) {
    saveStatus.className = 'save-status ' + cls;
    saveStatus.textContent = text;
  }

  function cssEscape(s) {
    return s.replace(/["\\\\]/g, '\\\\$&');
  }

  search.addEventListener('input', render);
  filterDiffers.addEventListener('change', render);
  filterPartial.addEventListener('change', render);
  showValues.addEventListener('change', render);

  if (editable && addBtn) {
    addBtn.addEventListener('click', () => {
      const input = document.getElementById('add-key-name');
      input.value = '';
      addDialog.showModal();
      setTimeout(() => input.focus(), 0);
    });
    document.getElementById('add-confirm').addEventListener('click', (e) => {
      const input = document.getElementById('add-key-name');
      if (!input.checkValidity()) { e.preventDefault(); input.reportValidity(); return; }
      const name = input.value.trim();
      if (name) addKey(name);
    });
  }

  render();
})();
`;
