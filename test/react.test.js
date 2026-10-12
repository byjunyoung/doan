import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { drawScreen, boxStyle, chipOf, flatButtons } from '../react/core.js';

const e = React.createElement;
const view = {
  screen: 'orders', state: 'Default', type: 'list',
  elements: [
    { id: 'sider', kind: 'nav', items: ['A'] },
    { id: 'main', kind: 'group', children: [
      { id: 'content', kind: 'group', children: [
        { id: 'header', kind: 'page-header', title: 'Orders', actions: [{ id: 'add', kind: 'button', label: 'Add', variant: 'primary' }] },
        { id: 'tabs', kind: 'tabs', tabs: ['All', 'Open'], active: 'Open' },
        { id: 'card', kind: 'card', title: 'List', children: [
          { id: 'table', kind: 'table', columns: [{ key: 'n', label: 'N' }], rows: [['1']] },
          { id: 'paging', kind: 'pagination', page_size: 20, pages: 1 },
          { id: 'f', kind: 'field', label: 'Name', control: { kind: 'group', children: [{ id: 'i', kind: 'input' }, { id: 'b', kind: 'button', label: 'Go' }] } },
        ] },
        { id: 'footer', kind: 'group', children: [{ id: 'save', kind: 'button', label: 'Save', variant: 'primary' }] },
      ] },
    ] },
  ],
  layout: { content: { kind: 'stack', direction: 'column', gap: 'space.md', padding: 'space.lg' }, f: { kind: 'stack', direction: 'row', gap: 'space.sm' } },
};

test('drawScreen draws the content with the registry, folds joined siblings, inherits a field rule, counts unmapped kinds, and anchors every element', () => {
  const seen = [];
  const registry = {
    'page-header': (el, ctx) => e('h1', null, el.title, el.joined?.tabs ? ` tabs:${el.joined.tabs.active}` : '', ...ctx.drawList(el.actions ?? [])),
    card: (el, ctx) => e('section', null, ...ctx.children(), el.joined?.footer ? ctx.draw(el.joined.footer) : null),
    table: (el) => e('table', null, el.joined?.pagination ? `pages:${el.joined.pagination.pages}` : 'no-pager'),
    button: (el) => e('button', null, el.label),
    field: (el, ctx) => e('label', null, el.label, ctx.control()),
    group: (el, ctx) => { seen.push([el.id, ctx.rule?.direction]); return e('div', { style: ctx.boxStyle() }, ...ctx.children()); },
    input: () => e('input'),
  };
  const joins = [
    { kind: 'page-header', next: 'tabs' },
    { kind: 'table', next: 'pagination' },
    { kind: 'card', next: { kind: 'group', id: 'footer' }, as: 'footer', when: (el, next) => flatButtons(next).some((b) => b.variant === 'primary') },
  ];
  const { node, unmapped, shell } = drawScreen(view, { registry, joins, space: { 'space.sm': 8, 'space.md': 16, 'space.lg': 24 } });
  const html = renderToStaticMarkup(node);
  assert.equal(shell, true, 'a nav means the app shell draws the chrome');
  assert.match(html, /<h1>Orders tabs:Open<div[^>]*data-doan-id="add"[^>]*><button>Add<\/button><\/div><\/h1>/, 'tabs folded into the header, actions drawn (each in its anchor)');
  assert.match(html, /pages:1/, 'pagination folded into the table');
  assert.match(html, /<section>[\s\S]*<button>Save<\/button>[\s\S]*<\/section>/, 'the footer folded into the card when it has a primary button');
  assert.doesNotMatch(html, /data-doan-kind="nav"/, 'the nav is the shell\'s');
  assert.match(html, /data-doan-id="table"/);
  assert.deepEqual(seen.find(([id]) => id === 'f.control'), ['f.control', 'row'], 'a field\'s control group takes the field\'s layout rule');
  assert.match(html, /gap:16px/, 'tokens become px through the space map (the root\'s padding is the frame\'s)');
  assert.equal(unmapped.size, 0);
  const missing = drawScreen({ ...view, elements: [{ id: 'x', kind: 'kv-table' }] }, { registry });
  assert.deepEqual([...missing.unmapped], ['kv-table']);
  assert.match(renderToStaticMarkup(missing.node), /data-doan-unmapped="kv-table"/);
});

test('a modal screen draws the modal\'s children, and the helpers read the file\'s conventions', () => {
  const m = drawScreen({ screen: 'tmp', state: 'Default', type: 'modal', elements: [{ id: 'modal', kind: 'modal', title: 'Hi', size: 'sm', children: [{ id: 'ok', kind: 'button', label: 'OK' }] }], layout: {} }, { registry: { button: (el) => e('button', null, el.label) } });
  assert.equal(m.modal.title, 'Hi');
  assert.match(renderToStaticMarkup(m.node), /<button>OK<\/button>/);
  assert.deepEqual(chipOf({ id: 'c', label: '역할: 매장 점주 ⊗' }), { label: '역할', picked: ['매장 점주'] });
  assert.deepEqual(chipOf({ id: 'c', label: '상태 ▾' }), { label: '상태', picked: [] });
  assert.deepEqual(boxStyle({ kind: 'stack', direction: 'row', align: 'end' }, {}), { display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' });
});

test('doan harness <dir> writes a registry example naming exactly the kinds the screens use, and a README', async () => {
  const { mkdtemp, readFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { initProject } = await import('../src/init.js');
  const { harnessStarter } = await import('../src/verbs.js');
  const dir = await mkdtemp(join(tmpdir(), 'doan-harness-'));
  await initProject(dir, { base: 'antd' });
  const r = await harnessStarter(dir, { framework: 'react' });
  const src = await readFile(join(dir, 'harness', 'registry.example.tsx'), 'utf8');
  for (const k of r.kinds) assert.match(src, new RegExp(`'${k}': \\(el, ctx\\) => TODO`), `${k} has a TODO line`);
  assert.ok(r.kinds.includes('table') || r.kinds.includes('page-header'), 'the starter screen\'s kinds are listed');
  assert.doesNotMatch(src, /'nav': /.test(src) && !r.kinds.includes('nav') ? /'nav'/ : /never-matches/);
  assert.match(src, /createHarness\(\{/);
  assert.match(await readFile(join(dir, 'harness', 'README.md'), 'utf8'), /render\.harness\.url/);
  await assert.rejects(harnessStarter(dir, { framework: 'vue' }), /react is the one that exists/);
});
