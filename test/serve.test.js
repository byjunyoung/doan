import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../src/serve.js';
import { propose } from '../src/proposals.js';

const examples = fileURLToPath(new URL('../examples/store-ops', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'dc-srv-'));
cpSync(examples, dir, { recursive: true });
const server = await startServer(dir, { port: 0, branch: 'feature/x', today: '2026-09-24' });
const base = `http://127.0.0.1:${server.port}`;
after(() => server.close());

test('the server opens on the first canvas and renders a screen page on request, with the comment box wired in', async () => {
  const index = await (await fetch(`${base}/`)).text();
  assert.match(index, /location\.replace\("canvas-[^"]+\.html"/);
  const canvas = await (await fetch(`${base}/${index.match(/url=(canvas-[^"]+\.html)/)[1]}`)).text();
  assert.match(canvas, /inventory-list/);
  const page = await (await fetch(`${base}/inventory-list.html`)).text();
  assert.match(page, /data-path="elements\.1\.children\.1"/);
  assert.match(page, /DOAN_API/);
});

test('comments can be posted from the page and read back per screen', async () => {
  const res = await fetch(`${base}/api/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ screen: 'inventory-list', path: 'elements.1.children.1', text: 'drop the line column', author: 'junyoung' }) });
  assert.equal(res.status, 201);
  const list = await (await fetch(`${base}/api/comments?screen=inventory-list`)).json();
  assert.equal(list.comments.length, 1);
  assert.equal(list.comments[0].text, 'drop the line column');
  const page = await (await fetch(`${base}/inventory-list.html`)).text();
  assert.match(page, /drop the line column/, 'the rendered page shows open comments');
});

test('a pending proposal is applied from its page with no name to type — the git author approves; the page asks for none', async () => {
  const before = readFileSync(join(dir, 'screens', 'payment-list.yaml'), 'utf8');
  const p = await propose(dir, { screen: 'payment-list', after: before.replace('columns: [nickname, order_no, store, method, amount, status, paid_at]', 'columns: [nickname, amount]') }, { branch: 'feature/x', today: '2026-09-24' });
  const page = await (await fetch(`${base}/proposal-${p.id}.html`)).text();
  assert.match(page, /id="approve"/);
  assert.doesNotMatch(page, /id="by"/);
  const ok = await fetch(`${base}/api/proposals/${p.id}/apply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(ok.status, 200);
  const { authorOf } = await import('../src/comments.js');
  assert.equal((await ok.json()).approved_by, authorOf(dir));
  assert.match(readFileSync(join(dir, 'screens', 'payment-list.yaml'), 'utf8'), /\[nickname, amount\]/);
});

test('lint is served as JSON for a bot to read', async () => {
  const lint = await (await fetch(`${base}/api/lint`)).json();
  assert.equal(typeof lint.summary.blocking, 'number');
});

// The first five minutes (trust round, A)
test('a default port in use moves to the next free one and says so; a named port in use is an error, not a move', async () => {
  const busy = await startServer(dir, { port: 0 });
  try {
    const moved = await startServer(dir, { port: busy.port });
    try {
      assert.equal(moved.port, busy.port + 1);
      assert.equal(moved.moved, busy.port);
    } finally {
      await moved.close();
    }
    await assert.rejects(startServer(dir, { port: busy.port, strict: true }), (err) => err.code === 'EADDRINUSE' && err.message === `port ${busy.port} is in use`);
  } finally {
    await busy.close();
  }
});

test('serve --port on a busy port prints one line and exits 1, never a stack trace', async () => {
  const { execFile } = await import('node:child_process');
  const busy = await startServer(dir, { port: 0 });
  try {
    const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
    const err = await new Promise((res) => execFile(process.execPath, [cli, 'serve', dir, '--port', String(busy.port)], (e, stdout, stderr) => res({ code: e?.code, stderr })));
    assert.equal(err.code, 1);
    assert.match(err.stderr, new RegExp(`^error: port ${busy.port} is in use`));
    assert.doesNotMatch(err.stderr, /at .*\.js:\d+/);
  } finally {
    await busy.close();
  }
});

test('a section that exists only in a pending proposal: its link opens that canvas drawn as the proposal leaves it, and without the proposal a page says so', async () => {
  const d = mkdtempSync(join(tmpdir(), 'dc-srv-new-'));
  cpSync(examples, d, { recursive: true });
  const srv = await startServer(d, { port: 0, branch: 'feature/x', today: '2026-09-24' });
  try {
    const yaml = 'schema: doan/0.2\nid: scr_newsec\nscreen: unit-board\nsection: "09. Units - Board"\ntype: page\nelements:\n  - { id: title, kind: caption, text: Units }\n';
    const p = await propose(d, { screen: 'unit-board', after: yaml, summary: 'a board of units' });
    const b = `http://127.0.0.1:${srv.port}`;
    const home = await (await fetch(`${b}/inventory-list.html`)).text();
    assert.match(home, new RegExp(`href="canvas-units\\.html\\?proposal=${p.id}"`), 'the sidebar links the proposal to its own section, not the first canvas');
    const tobe = await fetch(`${b}/canvas-units.html?proposal=${p.id}`);
    assert.equal(tobe.status, 200);
    assert.match(await tobe.text(), /unit-board/);
    const bare = await fetch(`${b}/canvas-units.html`);
    const text = await bare.text();
    assert.doesNotMatch(text, /^\{"error"/);
    assert.match(text, /This section exists only in a pending proposal/);
    assert.match(text, new RegExp(`canvas-units\\.html\\?proposal=${p.id}`));
    const nowhere = await fetch(`${b}/canvas-nowhere.html`);
    assert.equal(nowhere.status, 404);
    assert.match(await nowhere.text(), /No such section/);
  } finally {
    await srv.close();
  }
});

test('Apply lands on the applied screen\'s frame with an Undo; undo from the viewer puts the file back', async () => {
  const d = mkdtempSync(join(tmpdir(), 'dc-srv-undo-'));
  cpSync(examples, d, { recursive: true });
  const srv = await startServer(d, { port: 0, branch: 'feature/x', today: '2026-09-24' });
  try {
    const file = join(d, 'screens', 'inventory-list.yaml');
    const before = readFileSync(file, 'utf8');
    const p = await propose(d, { screen: 'inventory-list', after: before.replace('elements:\n', 'elements:\n  - { id: extra-note, kind: caption, text: Note }\n'), summary: 'a note on top' });
    const b = `http://127.0.0.1:${srv.port}`;
    const applied = await (await fetch(`${b}/api/proposals/${p.id}/apply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"by":"tester"}' })).json();
    assert.equal(applied.status, 'applied');
    assert.match(applied.href, new RegExp(`^canvas-[^?#]+\\.html\\?applied=${p.id}#inventory-list$`));
    const page = await (await fetch(`${b}/proposal-${p.id}.html`)).text();
    assert.match(page, new RegExp(`id="undo" type="button" data-id="${p.id}"`), 'an applied proposal\'s page offers Undo');
    const undone = await (await fetch(`${b}/api/proposals/${p.id}/undo`, { method: 'POST' })).json();
    assert.equal(undone.status, 'undone');
    assert.equal(readFileSync(file, 'utf8'), before);
  } finally {
    await srv.close();
  }
});

test('the red lint count is a button with a title, carrying the findings it counts for the panel', async () => {
  const d = mkdtempSync(join(tmpdir(), 'dc-srv-lint-'));
  cpSync(examples, d, { recursive: true });
  const { appendFileSync } = await import('node:fs');
  appendFileSync(join(d, 'screens', 'inventory-list.yaml'), 'flows:\n  - { from: nowhere-element, to: no-such-screen }\n');
  const srv = await startServer(d, { port: 0, branch: 'feature/x', today: '2026-09-24' });
  try {
    const html = await (await fetch(`http://127.0.0.1:${srv.port}/inventory-list.html`)).text();
    const pill = html.match(/<button type="button" class="pill block lint-pill" title="([^"]+)" data-screen="inventory-list" data-findings="([^"]+)">/);
    assert.ok(pill, 'a lint pill button');
    assert.match(pill[1], /\d+ blocking — show them/);
    const findings = JSON.parse(pill[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    assert.ok(findings.some((f) => f.severity === 'blocking' && /inventory-list\.yaml:\d+$/.test(f.where)));
  } finally {
    await srv.close();
  }
});
