import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from '../src/index.js';
import { renderScreen } from '../src/render/index.js';

const ops = fileURLToPath(new URL('../examples/store-ops', import.meta.url));
const orders = fileURLToPath(new URL('../examples/orders', import.meta.url));

async function copyOf(src, edit) {
  const dir = await mkdtemp(join(tmpdir(), 'doan-truth-'));
  await cp(src, dir, { recursive: true });
  await edit(dir);
  return dir;
}
const screenHtml = async (dir, name) => {
  const project = await loadProject(dir);
  return renderScreen(project, project.screens.find((s) => s.doc.screen === name), { branch: 'x' });
};

test("the contract is the one truth: change a prop's default in components/<kind>.yaml and every element that left it out draws with it", async () => {
  const before = await screenHtml(orders, 'order-list');
  assert.match(before, /<div class="el el-button[^>]*data-id="export"[^>]*data-size="md"/);
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'components', 'button.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace(/(size:[\s\S]*?default: )md/, '$1full'));
  });
  const after = await screenHtml(dir, 'order-list');
  assert.match(after, /<div class="el el-button[^>]*data-id="export"[^>]*data-size="full"/);
  // and a default that reaches the drawing itself, not only the attribute: an image with no size
  const dir2 = await copyOf(ops, async (d) => {
    const f = join(d, 'components', 'image.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace(/(size:[\s\S]*?default: )md/, '$1lg'));
  });
  const project = await loadProject(dir2);
  const shot = renderScreen(project, project.screens.find((s) => s.doc.screen === 'home'), { branch: 'x' });
  assert.doesNotMatch(shot, /class="img size-md"/);
});

test('an enum value the contract does not list is drawn as the declared default — the picture never invents a variant', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'screens', 'order-list.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('variant: secondary', 'variant: bogus'));
  });
  const html = await screenHtml(dir, 'order-list');
  assert.match(html, /<div class="el el-button[^>]*data-id="export"[^>]*data-variant="default"/);
  assert.match(html, /data-id="export"[^>]*>[^]*?<button class="btn btn-default"/);
  // what the file says is still what the inspector shows
  assert.match(html, /data-id="export"[^>]*data-props="[^"]*&quot;variant&quot;:&quot;bogus&quot;/);
});

test("a contract's token bindings reach a piece a library adapter draws: the CSS themes the adapter root from the same --k- variables", async () => {
  const html = await screenHtml(orders, 'order-list');
  assert.match(html, /\.el-button\[data-drawn\] > \* \{ background-color: var\(--k-button-bg\); color: var\(--k-button-text\); border-color: var\(--k-button-border\); border-radius: var\(--k-button-radius\); \}/);
  const { createAdapter } = await import('../src/render/adapters/index.js');
  const project = await loadProject(orders);
  const adapter = await createAdapter('antd', project);
  const drawn = renderScreen(project, project.screens.find((s) => s.doc.screen === 'order-list'), { branch: 'x', adapter });
  assert.match(drawn, /<div class="el el-button[^>]*data-id="export"[^>]*data-drawn="antd"/);
});

test('type, weight, height and shadow are slots too: a binding reaches a bundled piece through its wrapper and the css it reads, and an adapter root from outside', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'components', 'button.yaml');
    const text = await readFile(f, 'utf8');
    const next = text.replace('tokens:\n', 'tokens:\n  font-size: font.size.lg\n  font-weight: font.weight.bold\n  min-height: control.lg\n  shadow: shadow.sm\n');
    assert.notEqual(next, text);
    await writeFile(f, next);
  });
  const html = await screenHtml(dir, 'order-list');
  assert.match(html, /\.el-button \{[^}]*--k-button-font-size: var\(--font-size-lg\); --k-button-font-weight: var\(--font-weight-bold\); --k-button-min-height: var\(--control-lg\); --k-button-shadow: var\(--shadow-sm\)/);
  assert.match(html, /\.el-button\[data-drawn\] > \* \{[^}]*font-size: var\(--k-button-font-size\); font-weight: var\(--k-button-font-weight\); min-height: var\(--k-button-min-height\); box-shadow: var\(--k-button-shadow\)/);
  assert.match(html, /\.el-button:not\(\[data-drawn\]\) \{ font-size: var\(--k-button-font-size\); font-weight: var\(--k-button-font-weight\); \}/);
  assert.match(html, /\.btn \{[^}]*min-height: var\(--k-button-min-height, auto\); box-shadow: var\(--k-button-shadow, none\)/);
  assert.match(html, /--control-lg: 40px;/);
  assert.match(html, /--shadow-sm: 0px 1px 2px 0px #00000014;/);
  assert.match(html, /--font-weight-bold: 700;/);
  assert.match(html, /font: var\(--font-size-md, var\(--font-size, 14px\)\)/, 'the body reads the scale, or the one size a flat file still names');
});

test('L28: a binding to a slot the picture does not read is a warning that names the slots there are', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'components', 'button.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('tokens:\n', 'tokens:\n  colour: color.bg\n'));
  });
  const { lint } = await import('../src/lint.js');
  const l28 = lint(await loadProject(dir), { branch: null }).filter((f) => f.id === 'L28');
  assert.equal(l28.length, 1);
  assert.deepEqual(l28[0].path, ['tokens', 'colour']);
  assert.match(l28[0].message, /"colour" is not a slot the picture reads \(bg, .*font-size, font-weight, line-height, letter-spacing, min-height, shadow, muted, font, surface\)/);
});

test('the bundled set reads type from the contract where it used to fix a size: the page-header title, a field label, a hint; a segment and a stepper take a control height', async () => {
  const html = await screenHtml(orders, 'order-list');
  assert.match(html, /\.el-page-header h2 \{ font-size: var\(--k-page-header-font-size, 16px\); font-weight: var\(--k-page-header-font-weight, inherit\)/);
  assert.match(html, /\.fld \{[^}]*font-size: var\(--k-field-font-size, 12px\)/);
  assert.match(html, /\.el-hint \.hint \{ font-size: var\(--k-hint-font-size, 12px\); \}/);
  assert.match(html, /\.seg span \{[^}]*min-height: var\(--k-segment-min-height, auto\)/);
  assert.match(html, /\.stepper \{[^}]*min-height: var\(--k-stepper-min-height, auto\)/);
});

test('antd draws size: full as a block button and sm/md as small/middle, as the bundled set does', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'screens', 'order-list.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('label: Export, variant: secondary', 'label: Export, variant: secondary, size: full').replace('  - id: paging\n', '  - { id: dine, kind: segment, options: [A, B], selected: B }\n  - id: paging\n'));
  });
  const { createAdapter } = await import('../src/render/adapters/index.js');
  const project = await loadProject(dir);
  const adapter = await createAdapter('antd', project);
  const drawn = renderScreen(project, project.screens.find((s) => s.doc.screen === 'order-list'), { branch: 'x', adapter });
  assert.match(drawn, /data-id="export"[^>]*data-size="full"[^>]*data-drawn="antd"[^>]*><button[^>]*class="[^"]*ant-btn-block/);
  assert.match(drawn, /<span class="on">B<\/span>/, 'a segment draws its selected option, not always the first');
  assert.match(drawn, /\.el-card:not\(\[data-drawn\]\) \{ padding:/, 'the bundled card box does not wrap a card an adapter drew');
});

test('a list cell draws its value and hides the chevron when told — every prop of the contract reaches the picture', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'screens', 'order-list.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('  - id: paging\n', '  - { id: row, kind: list-cell, title: Americano, value: "4,500", chevron: false }\n  - { id: row2, kind: list-cell, title: Latte }\n  - id: paging\n'));
  });
  const html = await screenHtml(dir, 'order-list');
  assert.match(html, /data-id="row"[^>]*>[\s\S]*?<div class="cell-value">4,500<\/div><\/div><\/div>/);
  assert.match(html, /data-id="row2"[^>]*>[\s\S]*?<span class="cell-chevron">›<\/span>/);
});

const TILE = `kind: tile
description: A big touch target — icon above, label below.
props:
  label: { type: string, required: true }
  icon: { type: string }
  selected: { type: boolean, default: false }
tokens: { bg: color.bg, border: color.border, radius: radius.md, padding: space.lg, min-height: control.xl, label.text: color.text }
variants:
  selected:
    "true": { bg: color.primary, border: color.primary, label.text: color.primary-text }
elements:
  - { id: icon, kind: image, src: $icon, size: sm, fit: contain, show_when: icon }
  - { id: label, kind: caption, text: $label, style: title }
layout:
  root: { kind: stack, direction: column, align: center, justify: center, gap: space.sm }
`;

test("a compound's bindings dress its wrapper as a box and re-bind its parts: label.text turns white where the tile is selected", async () => {
  const dir = await copyOf(orders, async (d) => {
    await writeFile(join(d, 'components', 'tile.yaml'), TILE);
    const f = join(d, 'screens', 'order-list.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('  - id: paging\n', '  - { id: pay-card, kind: tile, label: Card, selected: true }\n  - { id: pay-cash, kind: tile, label: Cash }\n  - id: paging\n'));
  });
  const html = await screenHtml(dir, 'order-list');
  assert.match(html, /\.el-tile \{ --k-tile-bg: var\(--color-bg\); --k-tile-border: var\(--color-border\); --k-tile-radius: var\(--radius-md\); --k-tile-padding: var\(--space-lg\); --k-tile-min-height: var\(--control-xl\); \}/);
  assert.match(html, /\.el-tile \[data-id\$="\/label"\] \{ --k-caption-text: var\(--color-text\); \}/);
  assert.match(html, /\.el-tile\[data-selected="true"\] \{ --k-tile-bg: var\(--color-primary\); --k-tile-border: var\(--color-primary\); \}/);
  assert.match(html, /\.el-tile\[data-selected="true"\] \[data-id\$="\/label"\] \{ --k-caption-text: var\(--color-primary-text\); \}/);
  assert.match(html, /\.el-tile \{ background-color: var\(--k-tile-bg\); border: 1px solid var\(--k-tile-border\); border-radius: var\(--k-tile-radius\); padding: var\(--k-tile-padding\); min-height: var\(--k-tile-min-height\); \}/);
  assert.match(html, /data-id="pay-card"[^>]*data-selected="true"/);
  assert.match(html, /data-id="pay-cash"[^>]*data-selected="false"/, 'the wrapper takes the contract defaults too');
  assert.match(html, /data-id="pay-card\/label"/);
  const { lint } = await import('../src/lint.js');
  assert.equal(lint(await loadProject(dir), { branch: null }).filter((f) => f.id === 'L28').length, 0, 'label.text is a binding L28 accepts');
});

test('L28 on a compound: a part the contract does not declare, or a slot it does not have, is named', async () => {
  const dir = await copyOf(orders, async (d) => {
    await writeFile(join(d, 'components', 'tile.yaml'), TILE.replace('label.text: color.text', 'label.text: color.text, nope.text: color.text, icon.colour: color.text'));
  });
  const { lint } = await import('../src/lint.js');
  const l28 = lint(await loadProject(dir), { branch: null }).filter((f) => f.id === 'L28');
  assert.deepEqual(l28.map((f) => f.message.split('"')[1]).sort(), ['colour', 'nope']);
});

test('a text style and a surface bind whole: font: text.heading is five slots, surface: surface.raised is four; a style that does not exist is L18', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'components', 'button.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('tokens:\n', 'tokens:\n  font: text.label\n  surface: surface.raised\n'));
    await writeFile(join(d, 'components', 'card.yaml'), 'kind: card\ndescription: A box.\nprops:\n  title: { type: string }\ntokens:\n  font: text.nope\n');
  });
  const html = await screenHtml(dir, 'order-list');
  assert.match(html, /\.el-button \{[^}]*--k-button-font-family: var\(--text-label-font-family\); --k-button-font-size: var\(--text-label-font-size\); --k-button-font-weight: var\(--text-label-font-weight\); --k-button-line-height: var\(--text-label-line-height\); --k-button-bg: var\(--surface-raised-bg\); --k-button-border: var\(--surface-raised-border\); --k-button-radius: var\(--surface-raised-radius\); --k-button-shadow: var\(--surface-raised-shadow\)/);
  assert.match(html, /\.el-button:not\(\[data-drawn\]\) \{ font-family: var\(--k-button-font-family\); font-size: var\(--k-button-font-size\); font-weight: var\(--k-button-font-weight\); line-height: var\(--k-button-line-height\); \}/);
  assert.match(html, /--text-heading-font-size: 20px;/);
  const { lint } = await import('../src/lint.js');
  const l18 = lint(await loadProject(dir), { branch: null }).filter((f) => f.id === 'L18');
  assert.equal(l18.length, 1);
  assert.match(l18[0].message, /"text.nope" names no style/);
});

test('fonts: assets/fonts/<Family>-<Weight>.woff2 becomes @font-face, a stylesheet url in conventions.render.fonts a link', async () => {
  const { mkdir } = await import('node:fs/promises');
  const dir = await copyOf(orders, async (d) => {
    await mkdir(join(d, 'assets', 'fonts'), { recursive: true });
    await writeFile(join(d, 'assets', 'fonts', 'Pretendard-Bold.woff2'), 'x');
    await writeFile(join(d, 'assets', 'fonts', 'Pretendard-Regular.woff2'), 'x');
    const c = join(d, 'conventions.yaml');
    await writeFile(c, (await readFile(c, 'utf8')) + '\nrender:\n  fonts: [ "https://cdn.example.com/fonts.css" ]\n');
  });
  const html = await screenHtml(dir, 'order-list');
  assert.match(html, /@font-face \{ font-family: "Pretendard"; src: url\("assets\/fonts\/Pretendard-Bold.woff2"\) format\("woff2"\); font-weight: 700; font-style: normal; font-display: swap; \}/);
  assert.match(html, /font-weight: 400; font-style: normal/);
  assert.match(html, /<link rel="stylesheet" href="https:\/\/cdn.example.com\/fonts.css">/);
});

test('a card or modal antd draws gets the screen layout on the box its children sit in; maps_to.code is not listed as a library name', async () => {
  const dir = await copyOf(orders, async (d) => {
    const f = join(d, 'screens', 'order-list.yaml');
    await writeFile(f, (await readFile(f, 'utf8')).replace('  - id: paging\n', '  - id: box\n    kind: modal\n    title: T\n    children:\n      - { id: x1, kind: button, label: A }\n      - { id: x2, kind: button, label: B }\n  - id: paging\n').replace('  paging: { align: end }', '  paging: { align: end }\n  box: { kind: stack, direction: column, gap: space.lg }'));
  });
  const { createAdapter } = await import('../src/render/adapters/index.js');
  const project = await loadProject(dir);
  const adapter = await createAdapter('antd', project);
  const html = renderScreen(project, project.screens.find((s) => s.doc.screen === 'order-list'), { branch: 'x', adapter });
  assert.match(html, /data-id="box"[^>]*style="[^"]*--lay-dir:column;--lay-gap:var\(--space-lg\)/);
  assert.match(html, /<div class="modal-body">/);
  assert.match(html, /\.lay-body, \.el-modal:not\(\[data-drawn\]\) > \.modal-body \{ display: flex; flex-direction: var\(--lay-dir, column\); gap: var\(--lay-gap, 0\); \}/);
  assert.doesNotMatch(html, /code\/\[object Object\]/);
});
