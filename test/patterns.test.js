import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject } from '../src/index.js';
import { lint } from '../src/lint.js';
import { appliesTo, matchSkeleton } from '../src/patterns.js';

async function dirWith(files) {
  const dir = await mkdtemp(join(tmpdir(), 'doan-patterns-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(dir, name, '..'), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  return dir;
}

const conventions = 'meta: { language: en }\nstates: { known: [Default] }\n';
const screen = (id, type, elements) => `schema: doan/0.2\nid: scr_${id}\nscreen: ${id}\nsection: A\ntype: ${type}\nelements:\n${elements.map((e) => `  - ${e}`).join('\n')}\n`;
const frame = `pattern: screen-frame
description: every screen is three parts
applies_to: { except: [dialog] }
skeleton:
  - { role: header, kind: [page-header, group] }
  - { role: body, kind: any, many: true }
  - { role: bar, kind: button }
notes: [ back goes in the bar ]
`;

test('a skeleton matches the top-level elements in order; a many slot takes the middle; the first break is named', () => {
  const sk = [{ role: 'header', kind: ['page-header', 'group'] }, { role: 'body', kind: 'any', many: true }, { role: 'bar', kind: 'action-bar' }];
  const els = (...kinds) => kinds.map((kind, i) => ({ id: `e${i}`, kind }));
  assert.deepEqual(matchSkeleton(sk, els('page-header', 'segment', 'section', 'action-bar')), []);
  assert.deepEqual(matchSkeleton(sk, els('page-header', 'section', 'group')), [{ index: 2, message: 'the bar should be action-bar, not group ("e2")' }]);
  assert.equal(matchSkeleton(sk, els('section', 'action-bar'))[0].index, 0);
  assert.match(matchSkeleton(sk, els('page-header', 'action-bar'))[0].message, /the body \(any\) is missing/);
  assert.deepEqual(matchSkeleton([{ role: 'header', kind: 'page-header' }, { role: 'bar', kind: 'action-bar', optional: true }], els('page-header')), []);
});

test('patterns load from patterns/, bind the screens applies_to names, and L29 warns where a screen breaks the skeleton', async () => {
  const dir = await dirWith({
    'conventions.yaml': conventions,
    'sections.yaml': '- A\n',
    'patterns/screen-frame.yaml': frame,
    'screens/good.yaml': screen('good', 'page', ['{ id: head, kind: page-header, title: Hi }', '{ id: body, kind: section }', '{ id: go, kind: button, label: Go }']),
    'screens/bad.yaml': screen('bad', 'page', ['{ id: head, kind: page-header, title: Hi }', '{ id: body, kind: section }', '{ id: tip, kind: hint, text: psst }']),
    'screens/dialog.yaml': screen('dialog', 'page', ['{ id: box, kind: modal, title: Sure? }']),
  });
  const project = await loadProject(dir);
  assert.deepEqual(Object.keys(project.patterns), ['screen-frame']);
  assert.equal(project.patterns['screen-frame'].notes[0], 'back goes in the bar');
  const byName = (n) => project.screens.find((s) => s.doc.screen === n);
  assert.equal(appliesTo(project.patterns['screen-frame'], byName('dialog')), false, 'except wins');
  assert.equal(appliesTo({ applies_to: { types: ['list'] } }, byName('good')), false);
  const l29 = lint(project).filter((f) => f.id === 'L29');
  assert.equal(l29.length, 1);
  assert.equal(l29[0].severity, 'warning');
  assert.equal(l29[0].screen, 'bad');
  assert.match(l29[0].message, /pattern "screen-frame": the bar should be button, not hint \("tip"\)/);
  assert.deepEqual(l29[0].path, ['elements', 2]);
});

test('a pattern file that is not a pattern blocks, with its file', async () => {
  const dir = await dirWith({
    'conventions.yaml': conventions,
    'sections.yaml': '- A\n',
    'patterns/broken.yaml': 'pattern: broken\nskeleton: nope\n',
    'screens/good.yaml': screen('good', 'page', ['{ id: head, kind: page-header, title: Hi }']),
  });
  const l29 = lint(await loadProject(dir)).filter((f) => f.id === 'L29');
  assert.equal(l29.length, 1);
  assert.equal(l29[0].severity, 'blocking');
  assert.match(l29[0].file, /patterns\/broken\.yaml$/);
});

test('the patterns page draws each pattern: its skeleton, its rules, the screens that follow it and the ones that break it with why', async () => {
  const { renderPatterns } = await import('../src/render/index.js');
  const dir = await dirWith({
    'conventions.yaml': conventions,
    'sections.yaml': '- A\n',
    'patterns/screen-frame.yaml': frame,
    'screens/good.yaml': screen('good', 'page', ['{ id: head, kind: page-header, title: Hi }', '{ id: body, kind: section }', '{ id: go, kind: button, label: Go }']),
    'screens/bad.yaml': screen('bad', 'page', ['{ id: head, kind: page-header, title: Hi }', '{ id: tip, kind: hint, text: psst }']),
  });
  const html = renderPatterns(await loadProject(dir), { branch: 'x' });
  assert.match(html, /<section class="pat-card" id="p-screen-frame"><h2>screen-frame<\/h2>/);
  assert.match(html, /<div class="pat-slot many"><b>body<\/b>/);
  assert.match(html, /<li>back goes in the bar<\/li>/);
  assert.match(html, /<span class="pill ok">✓ <a[^>]*><u>good<\/u><\/a><\/span>/);
  assert.match(html, /<span class="pill tbd">⚠ <a[^>]*><u>bad<\/u><\/a><\/span> <span class="hint">the body \(any\) is missing<\/span>/);
  assert.match(html, /<a class="side-link sub current" href="patterns\.html">/);
});

test('with no patterns the page says what one is and shows the file to write', async () => {
  const { renderPatterns } = await import('../src/render/index.js');
  const dir = await dirWith({ 'conventions.yaml': conventions, 'sections.yaml': '- A\n', 'screens/good.yaml': screen('good', 'page', ['{ id: head, kind: page-header, title: Hi }']) });
  const html = renderPatterns(await loadProject(dir), { branch: 'x' });
  assert.match(html, /class="pat-empty"/);
  assert.match(html, /patterns\/screen-frame\.yaml/);
});

test('a pattern is proposed like any other design file, and its lint shows before it is applied', async () => {
  const { proposeFiles } = await import('../src/proposals.js');
  const dir = await dirWith({
    'conventions.yaml': conventions,
    'sections.yaml': '- A\n',
    'screens/good.yaml': screen('good', 'page', ['{ id: head, kind: page-header, title: Hi }', '{ id: tip, kind: hint, text: psst }']),
  });
  const p = await proposeFiles(dir, { files: [{ path: 'patterns/screen-frame.yaml', content: frame }], summary: 'the frame every screen shares' }, { branch: 'x', today: '2026-09-28' });
  assert.equal(p.status, 'pending');
  assert.ok(p.lint.after.findings.some((f) => f.id === 'L29'), 'the screen that breaks the new pattern shows before apply');
  await assert.rejects(proposeFiles(dir, { files: [{ path: 'patterns/x/y.yaml', content: frame }] }, {}), /not a file a proposal may change/);
});
