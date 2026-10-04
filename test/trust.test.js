import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/index.js';
import { lint } from '../src/lint.js';
import { renderScreen, layoutStyle } from '../src/render/index.js';
import { createAdapter } from '../src/render/adapters/index.js';
import { cp, mkdtemp, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each case here was silent in the 2026-10-02 audit: lint green, the picture wrong or a value
// ignored. Every one now either reports or draws (docs/specs/2026-10-02-trust-round.md, B).
const dir = fileURLToPath(new URL('./fixtures/trust', import.meta.url));
const screenOf = (project, name) => project.screens.find((s) => s.doc.screen === name);

test('a grid track that names a size class draws as its custom property, and lint passes it', async () => {
  const project = await loadProject(dir);
  assert.deepEqual(lint(project, { branch: null }).filter((f) => f.screen === 'tracks-ok' && f.severity === 'blocking'), []);
  assert.match(layoutStyle(screenOf(project, 'tracks-ok').doc.layout.line), /grid-template-columns:var\(--size-sm\) 1fr minmax\(var\(--size-sm\),var\(--size-md\)\)/);
});

test('a track with a unit and a word css does not know are blocking, each named', async () => {
  const project = await loadProject(dir);
  const l13 = lint(project, { branch: null }).filter((f) => f.id === 'L13' && f.screen === 'tracks-bad');
  assert.equal(l13.length, 2);
  assert.match(l13[0].message, /"320px" is a number with a unit/);
  assert.match(l13[1].message, /"wide" is not a track/);
});

test('a group that scrolls vertically does not wrap; wrapping is asked for', () => {
  assert.match(layoutStyle({ kind: 'stack', direction: 'row', scroll: 'vertical' }), /flex-wrap:nowrap/);
  assert.doesNotMatch(layoutStyle({ kind: 'stack', direction: 'row', scroll: 'vertical', wrap: true }), /nowrap/);
});

test('the silent cases now draw: group disabled, card overlay, progress value, column kind and align, empty title', async () => {
  const project = await loadProject(dir);
  const html = renderScreen(project, screenOf(project, 'drawn'));
  const inGroup = html.slice(html.indexOf('data-id="actions"'), html.indexOf('data-id="summary"'));
  assert.match(inGroup, /<button class="btn btn-default" disabled>/, 'the button inside a disabled group is disabled');
  assert.match(inGroup, /data-id="note"[^>]*class|class="[^"]*is-disabled[^"]*"[^>]*data-id="note"/, 'the input inside is marked disabled');
  assert.match(html, /class="box-overlay">.*Counting stock/s, 'the card draws its overlay');
  assert.match(html, /class="bar"><span style="width:30%">/, 'the bar fills to the value');
  assert.match(html, /<td style="text-align:right">/, 'a column aligned right draws its cells right');
  assert.match(html, /data-kind="tag"/, 'a column of kind tag draws its cells as tags');
  assert.match(html, /notice-title">No items yet/, 'the empty notice draws its title');
});

test('the same cases through a library adapter: antd draws the empty notice title and the column', async () => {
  const project = await loadProject(dir);
  const adapter = await createAdapter('antd', project);
  const html = renderScreen(project, screenOf(project, 'drawn'), { adapter });
  assert.match(html, /No items yet/);
  assert.match(html, /Counting stock/);
  assert.match(html, /data-kind="tag"/);
});

// L30 — a prop written, declared, and drawn by nothing

async function withScreen(yamlBody, { components = {}, conventions = '' } = {}) {
  const d = await mkdtemp(join(tmpdir(), 'doan-l30-'));
  await cp(dir, d, { recursive: true });
  await writeFile(join(d, 'screens', 'case.yaml'), `schema: doan/0.2\nid: scr_l30\nscreen: case\nsection: "01. Store - Trust cases"\ntype: page\n${yamlBody}`);
  if (Object.keys(components).length) await mkdir(join(d, 'components'), { recursive: true });
  for (const [name, text] of Object.entries(components)) await writeFile(join(d, 'components', `${name}.yaml`), text);
  if (conventions) await writeFile(join(d, 'conventions.yaml'), (await readFile(join(dir, 'conventions.yaml'), 'utf8')) + conventions);
  return loadProject(d);
}
const l30 = (project) => lint(project, { branch: null }).filter((f) => f.id === 'L30' && (f.screen === 'case' || String(f.file).includes('components')));

test('L30: a declared prop the bundled set does not read is a warning naming the prop, the kind and the line', async () => {
  const card = 'kind: card\nprops:\n  title: { type: string }\n  badge: { type: string, description: declared, never drawn }\nsample: { title: A }\n';
  const project = await withScreen('elements:\n  - id: totals\n    kind: card\n    title: Totals\n    badge: New\n', { components: { card } });
  const found = l30(project);
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, 'warning');
  assert.match(found[0].message, /prop "badge" is written but card does not draw it/);
  assert.equal(found[0].line, 10);
});

test('L30 is quiet where it does not apply: a $tbd drawn as a chip, drawn: false, an unknown kind, a kind a library adapter draws', async () => {
  const card = 'kind: card\nmaps_to: { antd: Card }\nprops:\n  title: { type: string }\n  badge: { type: string }\n  doc: { type: string, drawn: false, drawn_reason: for the spec page }\nsample: { title: A }\n';
  const body = 'elements:\n  - { id: a, kind: caption, text: { $tbd: { owner: pm } } }\n  - { id: b, kind: card, title: B, doc: why }\n  - { id: c, kind: gadget, color: red }\n';
  assert.deepEqual(l30(await withScreen(body, { components: { card } })), []);
  const viaAntd = await withScreen('elements:\n  - { id: d, kind: card, title: D, badge: New }\n', { components: { card }, conventions: 'render:\n  base: antd\n' });
  assert.deepEqual(l30(viaAntd), [], 'a kind drawn by antd is the coverage test\'s, not lint\'s');
});

test('the viewer marks a not-drawn prop with a dot whose title names it', async () => {
  const card = 'kind: card\nprops:\n  title: { type: string }\n  badge: { type: string }\nsample: { title: A }\n';
  const project = await withScreen('elements:\n  - { id: totals, kind: card, title: Totals, badge: New }\n', { components: { card } });
  const html = renderScreen(project, project.screens.find((s) => s.doc.screen === 'case'));
  assert.match(html, /<i class="dot undrawn" title="not drawn — written in the file, not in the picture: badge"><\/i>/);
});
