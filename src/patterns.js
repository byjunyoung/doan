import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { validatePattern } from './validate.js';

// Patterns as files — the layer between the parts and the screens. A contract says what a button
// looks like; a pattern says how the parts are arranged on this product's screens: which element
// comes first, what fills the middle, what closes the screen. Inconsistency is rarely carelessness:
// it is what happens when there was nothing to refer to, so each screen invents its own bottom bar.
// One YAML per pattern under patterns/. Lint checks only the skeleton (L29); `notes` are the rules a
// person and an agent read. When a pattern hardens, its part graduates to a compound component.
//
//   pattern: screen-frame
//   applies_to: { types: [list], platforms: [tablet], screens: [...], except: [...] }
//   skeleton:                       # the screen's top-level elements, in order
//     - { role: header, kind: page-header }
//     - { role: body, kind: any, many: true }
//     - { role: bar, kind: action-bar, optional: true }

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

export async function loadPatterns(dir) {
  const registry = {};
  const files = [];
  const problems = [];
  let names = [];
  try {
    names = (await readdir(join(dir, 'patterns'))).filter((n) => /\.ya?ml$/.test(n)).sort();
  } catch {
    names = [];
  }
  for (const n of names) {
    const file = join(dir, 'patterns', n);
    files.push(file);
    try {
      const doc = parse(await readFile(file, 'utf8'));
      const name = (isObj(doc) && typeof doc.pattern === 'string' ? doc.pattern : null) ?? n.replace(/\.ya?ml$/, '');
      for (const e of validatePattern(doc).errors) problems.push({ severity: 'blocking', file, path: e.path, message: e.message });
      registry[name] = { ...(isObj(doc) ? doc : {}), pattern: name, file };
    } catch (err) {
      problems.push({ severity: 'blocking', file, path: '', message: `cannot read ${n}: ${err.message}` });
    }
  }
  return { registry, files, problems };
}

const list = (x) => (x === undefined || x === null ? [] : [].concat(x));

// Does this pattern bind this screen? Every key given must match; `except` always wins.
export function appliesTo(pattern, screen, conventions = {}) {
  const a = pattern.applies_to ?? {};
  const doc = screen.doc ?? screen;
  if (list(a.except).includes(doc.screen)) return false;
  if (a.screens && !list(a.screens).includes(doc.screen)) return false;
  if (a.types && !list(a.types).includes(doc.type)) return false;
  const platform = doc.platform ?? conventions.platforms?.default ?? null;
  if (a.platforms && !list(a.platforms).includes(platform)) return false;
  return true;
}

// The patterns that bind a screen, by name.
export const patternsFor = (project, screen) => Object.values(project.patterns ?? {}).filter((p) => appliesTo(p, screen, project.conventions));

const kindOk = (slot, kind) => {
  const want = list(slot.kind ?? 'any');
  return want.includes('any') || want.includes(kind);
};

// Match a screen's top-level elements against a skeleton, in order. A slot takes one element; a
// `many` slot takes every element that follows while its kind fits, leaving as many at the end as
// the required slots after it need; an `optional` slot may take none. Returns what did not fit, as
// the first { index, message } that breaks it — fix it and the next shows — with index the element's place in `elements` (null for a slot missing at the end).
export function matchSkeleton(skeleton, elements) {
  const els = elements ?? [];
  const slots = skeleton ?? [];
  let i = 0;
  for (let k = 0; k < slots.length; k++) {
    const slot = slots[k];
    const role = slot.role ?? `#${k + 1}`;
    const kinds = list(slot.kind ?? 'any').join(' | ');
    if (slot.many) {
      const reserved = slots.slice(k + 1).filter((s) => !s.optional).length;
      const start = i;
      while (i < els.length - reserved && kindOk(slot, els[i]?.kind)) i++;
      if (i === start && !slot.optional) return [{ index: i < els.length ? i : null, message: `the ${role} (${kinds}) is missing` }];
      continue;
    }
    if (i < els.length && kindOk(slot, els[i]?.kind)) {
      i++;
      continue;
    }
    if (slot.optional) continue;
    return [{
      index: i < els.length ? i : null,
      message: i < els.length ? `the ${role} should be ${kinds}, not ${els[i]?.kind} ("${els[i]?.id}")` : `the ${role} (${kinds}) is missing at the end`,
    }];
  }
  if (i < els.length) return [{ index: i, message: `"${els[i]?.id}" (${els[i]?.kind}) comes after the last part of the skeleton` }];
  return [];
}
