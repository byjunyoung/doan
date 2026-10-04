import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from 'yaml';
import { recordReads, notDrawn, wrapperDrawn, cssBound } from '../src/render/reads.js';
import { drawElement } from '../src/render/index.js';
import { kinds } from '../src/render/kinds.js';

const contractsDir = fileURLToPath(new URL('../src/contracts', import.meta.url));
const contracts = Object.fromEntries(readdirSync(contractsDir).filter((n) => n.endsWith('.yaml')).map((n) => {
  const c = parse(readFileSync(join(contractsDir, n), 'utf8'));
  return [c.kind, c];
}));

test('a read is a key the function touched: get and `in` count, a key it never looked at does not', () => {
  const rec = recordReads({ title: 'A', hint: 'B', overlay: null });
  void rec.el.title;
  void ('overlay' in rec.el);
  void rec.el.toJSON; // a probe for a key the element does not have is not a read
  assert.deepEqual([...rec.reads].sort(), ['overlay', 'title']);
  assert.equal(rec.enumerated, false);
});

test('enumerating the element — a spread, entries, JSON — is flagged, since it reads everything and proves nothing', () => {
  for (const look of [(e) => ({ ...e }), (e) => Object.entries(e), (e) => JSON.stringify(e)]) {
    const rec = recordReads({ a: 1 });
    look(rec.el);
    assert.equal(rec.enumerated, true);
  }
});

test('not drawn = written, declared, not read and not drawn by the wrapper; drawn: false is skipped', () => {
  const contract = { props: { title: {}, hint: {}, size: { type: 'enum', options: ['sm', 'md'] }, doc: { drawn: false } }, variants: { size: { sm: {} } } };
  const wrapper = wrapperDrawn(contract);
  assert.deepEqual(notDrawn({ written: ['title', 'hint', 'size', 'doc', 'extra'], read: new Set(['title']), wrapper, contract }), ['hint']);
});

test('a stylesheet binding .el-<kind>[data-<prop>] counts as the wrapper drawing that prop', () => {
  const bound = cssBound('.el-image[data-size="sm"] { width: 1px } .el-button[data-size] {}');
  assert.ok(bound.get('image').has('size'));
  assert.ok(wrapperDrawn({ props: { size: { type: 'enum', options: ['sm'] } } }, bound.get('image')).has('size'));
});

test('the screen renderer records per element what was read; a child is its own record', () => {
  const el = { id: 'c', kind: 'card', title: 'Totals', hint: 'today', children: [{ id: 'b', kind: 'button', label: 'Go' }] };
  const { record } = drawElement(el, { components: contracts });
  assert.ok(record.read.has('title'));
  assert.ok(!record.read.has('label'), 'the child button\'s label belongs to the button, not the card');
});

test('only generic enumerates the element: every other bundled kind reads props by name', () => {
  for (const [kind, c] of Object.entries(contracts)) {
    if (!kinds[kind] || c.elements) continue;
    const { record } = drawElement({ id: 'x', kind, ...(c.sample ?? {}) }, { components: contracts });
    assert.equal(record?.enumerated, false, `${kind} enumerates its element`);
  }
});
