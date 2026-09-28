import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addRequest, listRequests, closeRequest } from '../src/requests.js';
import { startServer } from '../src/serve.js';

const ops = fileURLToPath(new URL('../examples/store-ops', import.meta.url));
const copy = () => { const d = mkdtempSync(join(tmpdir(), 'doan-req-')); cpSync(ops, d, { recursive: true }); return d; };

test('a request is asked once while it is open, closed with what it produced, and a closed one cannot close again', async () => {
  const dir = copy();
  const a = await addRequest(dir, { kind: 'apply-comments', by: 'me' });
  const b = await addRequest(dir, { kind: 'apply-comments' });
  assert.equal(a.id, b.id, 'pressing twice asks once');
  assert.equal((await listRequests(dir)).length, 1);
  const done = await closeRequest(dir, { id: a.id, proposals: ['p_x'], note: 'two comments, one proposal' });
  assert.equal(done.status, 'done');
  assert.deepEqual(done.closed.proposals, ['p_x']);
  assert.equal((await listRequests(dir)).length, 0);
  assert.equal((await listRequests(dir, { status: 'all' })).length, 1);
  await assert.rejects(closeRequest(dir, { id: a.id }), /already done/);
  await assert.rejects(addRequest(dir, { kind: 'deploy' }), /not a request the viewer makes/);
});

test('the live viewer asks at the foot of its right panel, writes the request, and the button is off while it is open', async () => {
  const dir = copy();
  const srv = await startServer(dir, { port: 0 });
  try {
    const base = srv.url.replace(/\/$/, '');
    await fetch(`${base}/api/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ screen: 'inventory-list', path: 'elements.0', text: 'bigger' }) });
    const before = await (await fetch(`${base}/foundations.html`)).text();
    assert.match(before, /<div class="drawer-foot"><div class="hint" id="ask-count">1 open comment\(s\)<\/div><button class="btn btn-primary" id="ask-comments" type="button" data-request="">Ask the agent to apply them<\/button>/);
    const r = await (await fetch(`${base}/api/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"kind":"apply-comments"}' })).json();
    assert.equal(r.status, 'open');
    const after = await (await fetch(`${base}/foundations.html`)).text();
    assert.match(after, new RegExp(`class="btn btn-primary" id="ask-comments" type="button" disabled data-request="${r.id}">The agent is on it…`));
    const closed = await (await fetch(`${base}/api/requests/${r.id}/close`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"proposals":["p_1"]}' })).json();
    assert.equal(closed.status, 'done');
  } finally {
    await srv.close();
  }
});

test('a static render has no ask at the panel foot — nobody is there to ask', async () => {
  const { loadProject } = await import('../src/index.js');
  const { renderFoundations } = await import('../src/render/index.js');
  assert.doesNotMatch(renderFoundations(await loadProject(ops), { branch: 'x' }), /class="drawer-foot"/);
});

test('a pending proposal opens on the canvas: TO-BE drawn, its changed elements marked, the proposal in the panel and the decision at its foot; AS-IS one tab away', async () => {
  const { readFileSync } = await import('node:fs');
  const { propose } = await import('../src/proposals.js');
  const dir = copy();
  const f = join(dir, 'screens', 'inventory-list.yaml');
  const p = await propose(dir, { screen: 'inventory-list', after: readFileSync(f, 'utf8').replace('kind: pagination', 'kind: pager') }, { branch: 'x', today: '2026-09-28' });
  const srv = await startServer(dir, { port: 0 });
  try {
    const base = srv.url.replace(/\/$/, '');
    const side = await (await fetch(`${base}/foundations.html`)).text();
    const href = side.match(/href="(canvas-[^"]+\?proposal=p_[a-z0-9]+)"/)[1];
    const tobe = await (await fetch(`${base}/${href}`)).text();
    assert.match(tobe, /<div class="prop-panel" data-screen="inventory-list">/);
    assert.match(tobe, /<div class="prop-sides"><a class="on" href="[^"]*\?proposal=[^"]*">TO-BE<\/a>/);
    assert.match(tobe, /window\.DOAN_PROPOSAL = \{"screen":"inventory-list","changed":\[/);
    assert.match(tobe, /id="approve" type="button" data-id="p_/);
    assert.match(tobe, /data-kind="pager"/);
    assert.match(tobe, /<ul class="changes prop-changes"><li class="ch-changed" data-el="[^"]+" title="/);
    assert.doesNotMatch(tobe, /proposal-p_[a-z0-9]+\.html"/, 'no link to the old page from the live canvas');
    const asis = await (await fetch(`${base}/${href}&side=asis`)).text();
    assert.match(asis, /<a class="on" href="[^"]*side=asis">AS-IS<\/a>/);
    assert.doesNotMatch(asis, /data-kind="pager"/);
  } finally {
    await srv.close();
  }
});

test('a layout picked in the panel becomes a proposal that changes only layout.<id>, comments and order kept; an empty rule removes it', async () => {
  const { readFileSync } = await import('node:fs');
  const { proposeLayout } = await import('../src/proposals.js');
  const dir = copy();
  const f = join(dir, 'screens', 'inventory-list.yaml');
  const before = readFileSync(f, 'utf8');
  const p = await proposeLayout(dir, { screen: 'inventory-list', id: 'header', rule: { kind: 'stack', direction: 'row', gap: 'space.md', align: 'center', justify: 'center', junk: 1, grow: false } }, { branch: 'x', today: '2026-09-28' });
  assert.equal(p.status, 'pending');
  assert.match(p.after, /\n  header: \{ kind: stack, direction: row, gap: space\.md, align: center, justify: center \}\n/);
  assert.doesNotMatch(p.after, /junk|grow/);
  const was = before.split('\n'), now = p.after.split('\n');
  assert.deepEqual(was.filter((l) => !now.includes(l)), [], 'no line of the file is touched');
  assert.deepEqual(now.filter((l) => !was.includes(l)), ['  header: { kind: stack, direction: row, gap: space.md, align: center, justify: center }']);
  const gone = await proposeLayout(dir, { screen: 'inventory-list', id: 'paging', rule: {} }, { branch: 'x', today: '2026-09-28' });
  assert.deepEqual(was.filter((l) => !gone.after.split('\n').includes(l)), ['  paging: { align: end }'], 'an empty rule removes the line');
  assert.match(p.summary, /^Layout — header: side by side · gap space\.md/);
  await assert.rejects(proposeLayout(dir, { screen: 'inventory-list', id: 'a b', rule: {} }), /not an element id/);
});

test('the live viewer takes a layout from the panel: /api/layout answers with the proposal and where to look at it', async () => {
  const dir = copy();
  const srv = await startServer(dir, { port: 0 });
  try {
    const base = srv.url.replace(/\/$/, '');
    const page = await (await fetch(`${base}/inventory-list.html`)).text();
    assert.match(page, /data-id="header"[^>]*data-layout="/);
    assert.match(page, /window\.DOAN_SPACE = \[\{"name":"space\./);
    const st = await (await fetch(`${base}/api/layout-style`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rule: { kind: 'stack', direction: 'row', gap: 'space.md' }, container: true }) })).json();
    assert.match(st.style, /display:flex;flex-direction:row;gap:var\(--space-md\)/, 'the preview style is the one the picture is drawn with');
    const j = await (await fetch(`${base}/api/layout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ screen: 'inventory-list', id: 'header', rule: { kind: 'stack', direction: 'row' } }) })).json();
    assert.match(j.id, /^p_/);
    assert.equal(j.status, 'pending');
    assert.match(j.href, /^canvas-.+\.html\?proposal=p_/);
  } finally {
    await srv.close();
  }
});

test('padding may be one token or [vertical, horizontal] — Figma\'s two fields — with 0 for none; it draws, lints clean and is written as a pair', async () => {
  const { layoutStyle } = await import('../src/render/index.js');
  assert.match(layoutStyle({ kind: 'stack', padding: ['space.md', 0] }), /padding:var\(--space-md\) 0/);
  assert.match(layoutStyle({ kind: 'stack', padding: 'space.lg' }), /padding:var\(--space-lg\)/);
  const { proposeLayout } = await import('../src/proposals.js');
  const dir = copy();
  const p = await proposeLayout(dir, { screen: 'inventory-list', id: 'card', rule: { kind: 'stack', padding: ['space.md', '0'] } }, { branch: 'x', today: '2026-09-28' });
  assert.match(p.after, /\n  card: \{ kind: stack, padding: \[space\.md, 0\] \}\n/);
  assert.equal(p.lint.after.blocking, 0);
});
