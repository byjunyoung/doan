import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeChanges } from '../src/render/changes.js';

const before = {
  screen: 's', title: 'Old',
  elements: [{ id: 'body', kind: 'group', children: [{ id: 'pic', kind: 'image', src: 'a.png' }, { id: 'go', kind: 'button', label: 'Go' }] }],
  layout: { body: { kind: 'grid', columns: 2 } },
  states: { Empty: [{ target: 'pic', hide: true }] },
  flows: [{ from: 'go', to: 'next' }],
  notes: ['keep'],
};
const after = {
  screen: 's', title: 'New',
  elements: [{ id: 'body', kind: 'group', children: [{ id: 'info', kind: 'group', children: [{ id: 'pic', kind: 'image', src: 'a.png' }, { id: 'desc', kind: 'caption', text: 'A cup of coffee' }] }, { id: 'go', kind: 'button', label: 'Add' }] }],
  layout: { body: { kind: 'grid', columns: 2 }, info: { kind: 'stack', direction: 'column', gap: 'space.md', align: 'center' } },
  states: { Empty: [{ target: 'pic', hide: true }], Error: [{ target: 'go', set: { disabled: true } }] },
  variants: { menu: { Latte: [{ target: 'desc', set: { text: 'milk' } }], Mocha: [] } },
  flows: [{ from: 'go', to: 'next' }, { from: 'go', to: 'done', gesture: 'timeout', when: 'later' }],
  notes: ['keep', 'one more'],
};

test('a proposal says what changes in words: a new wrapper once with what it holds, a move, a changed label, layout, states, variants, flows, notes, a field', () => {
  const rows = describeChanges(before, after, 'en');
  const line = (r) => `${r.op} ${r.area} ${r.subject} ${r.detail}`.replace(/<[^>]+>/g, '');
  const text = rows.map(line);
  for (const want of [
    'added element info group pic, desc new holds',
    'moved element pic body → info into',
    'changed element go label Go → Add',
    'added layout info stacked · gap space.md · across center',
    'added state Error go: disabled true',
    'added variant menu 2options Latte, Mochaeach changes: desc text',
    'added flow go → done (timeout) — later ',
    'added note “one more” ',
    'changed field title Old → New',
  ]) assert.ok(text.includes(want), `missing: ${want}\n${text.join('\n')}`);
  assert.ok(!text.some((t) => /added element desc/.test(t)), 'desc is said with its new wrapper');
  assert.equal(rows.filter((r) => r.area === 'state').length, 1, 'an unchanged state is not listed');
});

test('the proposal page lists the changes in words and folds the path table under them', async () => {
  const { mkdtempSync, cpSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { loadProject } = await import('../src/index.js');
  const { propose } = await import('../src/proposals.js');
  const { renderProposal } = await import('../src/render/index.js');
  const dir = mkdtempSync(join(tmpdir(), 'doan-ch-'));
  cpSync(fileURLToPath(new URL('../examples/store-ops', import.meta.url)), dir, { recursive: true });
  const f = join(dir, 'screens', 'inventory-list.yaml');
  const p = await propose(dir, { screen: 'inventory-list', after: readFileSync(f, 'utf8').replace(/notes:\n/, 'notes:\n  - a new note\n') }, { branch: 'x', today: '2026-09-28' });
  const html = renderProposal(await loadProject(dir), p);
  assert.match(html, /<ul class="changes"><li class="ch-added"><span class="ch-op">\+ added<\/span><span class="ch-area">note<\/span>/);
  assert.match(html, /<details class="raw-diff"><summary>As code \(paths and values\)<\/summary><table class="index diff-table">/);
});
