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
