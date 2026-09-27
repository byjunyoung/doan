import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from '../src/index.js';
import { flowGraph, layoutFlows, nodeGeometry } from '../src/flowmap.js';
import { renderIndex } from '../src/render/index.js';

const mobile = fileURLToPath(new URL('../examples/mobile-app', import.meta.url));
const ops = fileURLToPath(new URL('../examples/store-ops', import.meta.url));

async function dirWith(files) {
  const dir = await mkdtemp(join(tmpdir(), 'doan-flows-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(dir, name, '..'), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  return dir;
}

test('flowGraph lists the edges that resolve, the ones that do not, and the screens no flow touches', async () => {
  const project = await loadProject(mobile);
  const g = flowGraph(project);
  assert.deepEqual(g.nodes.map((n) => n.screen).sort(), ['feed', 'item-detail', 'cart-sheet'].sort());
  assert.ok(g.edges.length >= 2);
  const e = g.edges.find((x) => x.screen === 'feed');
  assert.ok(e.target && e.state, 'every edge names a target screen and a state');
  assert.match(e.label, /tap/);
  assert.deepEqual(g.dead, []);
  assert.deepEqual(g.orphans, []);
});

test('a node is a thumbnail in the platform proportions with one row per state', async () => {
  const project = await loadProject(mobile);
  const feed = project.screens.find((s) => s.doc.screen === 'feed');
  const g = nodeGeometry(project, feed, ['Default', 'Empty', 'Loading']);
  assert.equal(g.thumb.w, 120);
  assert.equal(g.thumb.h, Math.round(844 * (120 / 390)));
  assert.equal(g.rows.length, 3);
  assert.ok(g.rows[1].y > g.rows[0].y);
  assert.ok(g.h > g.thumb.h + 3 * 18);
});

test('layoutFlows puts every screen in its section box and routes every edge to the row of the state it names, in page coordinates', async () => {
  const project = await loadProject(mobile);
  const map = await layoutFlows(project);
  assert.equal(map.ok, true);
  assert.equal(map.nodes.length, 3);
  assert.ok(map.width > 0 && map.height > 0);
  for (const n of map.nodes) {
    const sec = map.sections.find((s) => s.title === n.section);
    assert.ok(sec, `${n.screen} has a section box`);
    assert.ok(n.x >= sec.x && n.x + n.w <= sec.x + sec.w + 1, `${n.screen} sits inside its section`);
  }
  for (const e of map.edges) {
    assert.ok(e.points.length >= 2);
    const target = map.nodes.find((n) => n.screen === e.target);
    const row = target.rows.find((r) => r.name === e.state);
    const end = e.points[e.points.length - 1];
    assert.ok(Math.abs(end.x - target.x) < 3, `${e.id} ends at the target's left edge`);
    assert.ok(Math.abs(end.y - (target.y + row.y + 9)) < 3, `${e.id} ends at the "${e.state}" row`);
    // orthogonal: consecutive points share x or y
    for (let i = 1; i < e.points.length; i++) assert.ok(Math.abs(e.points[i].x - e.points[i - 1].x) < 0.01 || Math.abs(e.points[i].y - e.points[i - 1].y) < 0.01, `${e.id} bends at right angles`);
  }
});

test('without elkjs the map says so and still lists edges, dead ends and orphans', async () => {
  const project = await loadProject(mobile);
  const map = await layoutFlows(project, { elk: null });
  assert.equal(map.ok, false);
  assert.match(map.reason, /elkjs/);
  assert.ok(map.edges.length >= 2);
});

// --- the click-through prototype ---------------------------------------------------------

import { renderProto } from '../src/render/index.js';

test('renderProto holds every screen in every state, hidden, with the flows as data and the script that arms them', async () => {
  const project = await loadProject(mobile);
  const html = renderProto(project, { branch: 'x' });
  const expected = project.screens.reduce((n, s) => n + 1 + Object.keys(s.doc.states ?? {}).length, 0);
  assert.equal((html.match(/<section class="proto-view"/g) ?? []).length, expected);
  assert.match(html, /<section class="proto-view" data-screen="feed" data-state="Refreshing" hidden>/);
  assert.match(html, /window\.DOAN_FLOWS = \[\{"screen":"cart-sheet"/);
  assert.match(html, /"from":"list","to":"item-detail","state":"Default","nav":"push"/);
  assert.match(html, /<select id="proto-screen"[^>]*><option value="feed">feed<\/option>/); // sections order: 01. shop first
  assert.match(html, /id="proto-hot" checked/);
  assert.match(html, /querySelectorAll\('\.el\[data-id="' \+ from \+ '"\]'\)/);
  assert.match(html, /<nav class="views">[^<]*<a class="" href="canvas-shop\.html">Canvas<\/a><a class="current" href="proto\.html#feed">Prototype<\/a><\/nav>/);
});

test('the screen page links into the prototype at that screen', async () => {
  const project = await loadProject(mobile);
  const { renderScreen } = await import('../src/render/index.js');
  const feed = project.screens.find((s) => s.doc.screen === 'feed');
  assert.match(renderScreen(project, feed), /<nav class="views">[^<]*<a class="" href="canvas-shop\.html#feed">Canvas<\/a><a class="" href="proto\.html#feed">Prototype<\/a>/);
});

test('the prototype selects nothing: its panel explains and lists the flows, the inspector click handler stands down, an element with several flows asks which', async () => {
  const dir = new URL('../examples/mobile-app', import.meta.url).pathname;
  const project = await loadProject(dir);
  const { renderProto } = await import('../src/render/index.js');
  const html = renderProto(project, { branch: 'x' });
  assert.match(html, /<aside id="inspector" class="drawer"><div class="hint">A prototype only follows flows/);
  assert.match(html, /document\.body\.setAttribute\('data-mode', 'proto'\)/);
  assert.match(html, /if \(document\.body\.getAttribute\('data-mode'\) === 'proto'\) return;/);
  assert.match(html, /box\.className = 'proto-flows'/);
  assert.match(html, /T\.chooseFlow/);
  assert.match(html, /"flowsFrom":"Flows from this screen"/);
});

test('a flow may name the states it leaves from (in); the graph carries it, lint names a state the screen lacks, and the prototype plays timeout flows by itself', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'doan-in-'));
  await mkdir(join(dir, 'screens'), { recursive: true });
  await writeFile(join(dir, 'conventions.yaml'), 'meta: { language: en }\nflows:\n  gestures: [tap, timeout]\n');
  await writeFile(join(dir, 'sections.yaml'), '- A\n');
  await writeFile(join(dir, 'screens', 'pay.yaml'), 'schema: doan/0.2\nid: scr_P\nscreen: pay\nsection: A\ntype: page\nelements:\n  - { id: go, kind: button, label: Pay }\nstates:\n  Loading:\n    - { target: go, set: { disabled: true } }\nflows:\n  - { from: go, to: pay.Loading, gesture: tap, in: Default }\n  - { from: go, to: done, gesture: timeout, in: Loading, when: approved }\n  - { from: go, to: done, gesture: tap, in: Nope }\n');
  await writeFile(join(dir, 'screens', 'done.yaml'), 'schema: doan/0.2\nid: scr_D\nscreen: done\nsection: A\ntype: page\nelements:\n  - { id: ok, kind: caption, text: Done }\n');
  const project = await loadProject(dir);
  const g = flowGraph(project);
  assert.deepEqual(g.edges.map((e) => e.in), [['Default'], ['Loading'], ['Nope']]);
  const { lint } = await import('../src/lint.js');
  const l16 = lint(project, { branch: null }).filter((f) => f.id === 'L16');
  assert.equal(l16.length, 1);
  assert.match(l16[0].message, /state "Nope" is not a state of this screen/);
  const { PROTO_JS } = await import('../src/render/page.js');
  assert.match(PROTO_JS, /function leaves\(f, screen, state\) \{ return f\.screen === screen && \(!f\.in \|\| f\.in\.indexOf\(state\) >= 0\); \}/);
  assert.match(PROTO_JS, /f\.gesture === 'timeout' && leaves\(f, t\.screen, t\.state\)/);
});
