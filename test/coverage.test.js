import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from 'yaml';
import { drawElement } from '../src/render/index.js';
import { kinds } from '../src/render/kinds.js';
import { wrapperDrawn, cssBound } from '../src/render/reads.js';
import { CSS } from '../src/render/page.js';
import { DEFAULT_TOKENS } from '../src/render/tokens.js';
import { createAdapter } from '../src/render/adapters/index.js';

// Every prop a contract declares is drawn by every path that draws the kind — the bundled set,
// and each library adapter that maps it. "Drawn" is two facts at once: the drawing function read
// the prop, and the picture changed when the prop's value did. A read that changes nothing (a
// presence test) is not drawing; an enum or boolean a variant's css binds through data-<prop> is.
// A prop meant for the documentation only says `drawn: false` with a reason and is skipped.

const dir = fileURLToPath(new URL('../src/contracts', import.meta.url));
const contracts = Object.fromEntries(readdirSync(dir).filter((n) => n.endsWith('.yaml')).map((n) => {
  const c = parse(readFileSync(join(dir, n), 'utf8'));
  return [c.kind, c];
}));
const bound = cssBound(CSS);

// a value for the prop that differs from what the element draws without it — its default
export function distinct(name, def, sample = {}) {
  const now = def?.default ?? (def?.type === 'enum' ? def.options?.[0] : undefined);
  // a choice among the element's own options (a select's value, a segment's selection) is one of them
  const choices = [sample.options, sample.items, sample.tabs].find(Array.isArray);
  if (def?.type === 'string' && /^(value|selected|active)$/.test(name) && choices?.length > 1) return choices[1];
  switch (def?.type) {
    case 'boolean': return !now;
    case 'number': return now === 7 ? 8 : 7;
    case 'enum': return (def.options ?? []).find((o) => o !== now) ?? now;
    case 'element': return { id: `mk-${name}`, kind: 'caption', text: `MK-${name}` };
    case 'list': return [`MK-${name}`];
    default: return `MK-${name}`;
  }
}

async function paths() {
  const project = { components: contracts, tokens: DEFAULT_TOKENS, conventions: {}, dir };
  const out = [{ name: 'bundled', adapter: null }];
  for (const name of ['antd', 'mui']) {
    try {
      out.push({ name, adapter: await createAdapter(name, project) });
    } catch (err) {
      out.push({ name, skipped: err.message });
    }
  }
  return out;
}

export async function coverageGaps() {
  const gaps = [];
  const skipped = [];
  for (const path of await paths()) {
    if (path.skipped) {
      skipped.push(`${path.name}: ${path.skipped}`);
      continue;
    }
    for (const [kind, c] of Object.entries(contracts)) {
      if (c.elements) continue; // a compound draws the tree it declares; no bundled contract is one
      const drawsIt = path.adapter ? !!path.adapter.kinds[kind] : !!kinds[kind];
      if (!drawsIt) continue;
      const wrapper = wrapperDrawn(c, bound.get(kind));
      for (const [name, def] of Object.entries(c.props ?? {})) {
        if (def?.drawn === false) continue;
        const base = { id: 'x', kind, ...(c.sample ?? {}) };
        delete base[name];
        // a second name for another prop is drawn in its place, so it is tested with that one absent
        if (def?.alias_of) delete base[def.alias_of];
        const withIt = { ...base, [name]: distinct(name, def, c.sample) };
        const a = drawElement(base, { components: contracts, adapter: path.adapter });
        const b = drawElement(withIt, { components: contracts, adapter: path.adapter });
        if (wrapper.has(name)) continue;
        const read = b.record?.read.has(name);
        const changed = a.inner !== b.inner;
        if (!read || !changed) gaps.push(`${kind}.${name} — ${path.name}: ${!read ? 'never read' : 'read but the picture does not change'}`);
      }
    }
  }
  return { gaps, skipped };
}

test('every declared prop is drawn by every path that draws its kind', { timeout: 300000 }, async () => {
  const { gaps, skipped } = await coverageGaps();
  if (skipped.length) console.log(`# coverage skipped: ${skipped.join('; ')}`);
  assert.deepEqual(gaps, [], `${gaps.length} declared props are not drawn:\n  ${gaps.join('\n  ')}`);
});
