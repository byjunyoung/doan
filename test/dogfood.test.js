// What the portfolio site showed when it was written as doan files (2026-09-28): eight places where
// the file said one thing and the picture another, or where the file could not say it at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/index.js';
import { renderScreen } from '../src/render/index.js';
import { validateComponent } from '../src/validate.js';
import { resolveTokens } from '../src/tokens.js';

const src = (p) => fileURLToPath(new URL(`../src/${p}`, import.meta.url));

async function project(files, { own = false } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'doan-dogfood-'));
  const conv = own ? 'meta: { language: en }\nrender: { base: none, components: ./components/kinds.js }\n' : 'meta: { language: en }\n';
  for (const [name, body] of Object.entries({ 'conventions.yaml': conv, 'sections.yaml': '- A\n', ...files })) {
    await mkdir(join(dir, name, '..'), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  if (own) {
    await mkdir(join(dir, 'components'), { recursive: true });
    await copyFile(src('render/kinds.js'), join(dir, 'components', 'kinds.js'));
    await copyFile(src('render/i18n.js'), join(dir, 'components', 'i18n.js'));
  }
  return loadProject(dir);
}

const screen = (elements, layout = '') => `schema: doan/0.2\nid: scr_T\nscreen: t\nsection: A\ntype: page\nelements:\n${elements}${layout ? `layout:\n${layout}` : ''}`;

const CARD = `kind: entry
props:
  title: { type: string }
tokens:
  title.font: text.title
elements:
  - { id: title, kind: caption, text: $title }
`;

for (const own of [false, true])
  test(`a part's font re-bound from its compound reaches the picture though the part's own contract binds no font (${own ? 'own set' : 'bundled'})`, async () => {
    const p = await project({ 'components/entry.yaml': CARD, 'screens/t.yaml': screen('  - { id: c, kind: entry, title: DEUX }\n') }, { own });
    const html = renderScreen(p, p.screens[0]);
    assert.match(html, /\.el-entry \[data-id\$="\/title"\] \{ --k-caption-font-size: var\(--text-title-font-size\); \}/);
    assert.match(html, /\.el-entry \[data-id\$="\/title"\]\[data-drawn\] > \* \{ font-size: var\(--k-caption-font-size\); \}/);
    assert.match(html, /\.el-entry \[data-id\$="\/title"\]:not\(\[data-drawn\]\) \{ font-size: var\(--k-caption-font-size\); \}/);
  });

test('a contract lays out its parts with the same words a screen does — padding as [vertical, horizontal]', () => {
  const component = JSON.parse(readFileSync(new URL('../schema/component.schema.json', import.meta.url)));
  const scr = JSON.parse(readFileSync(new URL('../schema/screen.schema.json', import.meta.url)));
  assert.deepEqual(component.$defs.layoutRule, scr.$defs.layoutRule, 'one layout vocabulary, kept in step');
  assert.deepEqual(validateComponent({ kind: 'x', elements: [{ id: 'a', kind: 'caption', text: 'a' }], layout: { root: { kind: 'stack', direction: 'column', padding: ['space.sm', 0] } } }).errors, []);
});

test('a vertical group with no alignment lets its children take the width; a row keeps its own', async () => {
  const p = await project({ 'screens/t.yaml': screen('  - id: col\n    kind: group\n    children:\n      - { id: a, kind: caption, text: A }\n  - id: row\n    kind: group\n    children:\n      - { id: b, kind: caption, text: B }\n', '  col: { kind: stack, direction: column }\n  row: { kind: stack, direction: row }\n  mid: { kind: stack, direction: column, align: center }\n') });
  const html = renderScreen(p, p.screens[0]);
  assert.match(html, /data-id="col"[^>]*style="display:flex;flex-direction:column;--lay-dir:column;align-items:stretch"/);
  assert.match(html, /data-id="row"[^>]*style="display:flex;flex-direction:row;--lay-dir:row"/);
});

test('tabs are drawn as tabs, the active one marked, not as a box of their props', async () => {
  const p = await project({ 'screens/t.yaml': screen('  - { id: t, kind: tabs, tabs: [Posts, HW UX], active: HW UX }\n') }, { own: true });
  const html = renderScreen(p, p.screens[0]);
  assert.match(html, /<div class="tabs"><span class="tab" data-ui-tab>Posts<\/span><span class="tab active" data-ui-tab>HW UX<\/span><\/div>/);
});

test("a segment's bg is the chosen option's, not the track's, on the project's own copy of the set", async () => {
  const contract = readFileSync(src('contracts/segment.yaml'), 'utf8');
  const p = await project({ 'components/segment.yaml': contract, 'screens/t.yaml': screen('  - { id: s, kind: segment, options: [KR, EN], selected: KR }\n') }, { own: true });
  const html = renderScreen(p, p.screens[0]);
  assert.doesNotMatch(html, /\.el-segment\[data-drawn\] > \* \{[^}]*background-color/);
  assert.match(html, /\.el-segment\[data-drawn\]:not\(\[data-drawn="own"\]\) > \* \{ background-color: var\(--k-segment-bg\)/, 'a library adapter still takes it');
  assert.match(html, /<span class="on">KR<\/span><span class="">EN<\/span>/);
});

test('a line of text aligns inside its box with the layout it already has — align on the leaf', async () => {
  const p = await project({ 'screens/t.yaml': screen('  - { id: intro, kind: caption, text: A long paragraph }\n', '  intro: { align: center }\n') });
  assert.match(renderScreen(p, p.screens[0]), /data-id="intro"[^>]*style="[^"]*text-align:center/);
});

test("a text style may carry Figma's Case — textCase becomes text-transform; a word it does not know is a warning", () => {
  const r = resolveTokens([{ text: { $type: 'typography', eyebrow: { $value: { fontSize: { value: 11, unit: 'px' }, textCase: 'upper' } }, odd: { $value: { fontSize: { value: 11, unit: 'px' }, textCase: 'shout' } } } }]);
  assert.equal(r.tokens.text.eyebrow['text-transform'], 'uppercase');
  assert.equal(r.tokens.text.odd['text-transform'], undefined);
  assert.ok(r.problems.some((x) => x.severity === 'warning' && /textCase "shout"/.test(x.message)));
});
