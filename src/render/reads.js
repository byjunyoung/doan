import { RESERVED_KEYS } from '../components.js';

// What a drawing function read of the element it was handed. The picture is only as true as what
// the function looked at: a prop written in the file and never read is a prop the picture ignores,
// and lint is green over it. The element is wrapped once, at the one call site, and every string key
// the function touches (get or `in`) is written down. Enumerating the element — a spread, entries,
// JSON — reads everything and so proves nothing; that is flagged instead (only `generic` may).
export function recordReads(el) {
  const reads = new Set();
  const rec = { reads, enumerated: false, el: null };
  rec.el = new Proxy(el, {
    get(target, key, recv) {
      if (typeof key === 'string' && key in target) reads.add(key);
      return Reflect.get(target, key, recv);
    },
    has(target, key) {
      if (typeof key === 'string') reads.add(key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      rec.enumerated = true;
      return Reflect.ownKeys(target);
    },
  });
  return rec;
}

// The props an element's wrapper draws without the function: an enum or boolean prop that a
// variant's css binds to through data-<prop> — the contract's own `variants`, or a bundled rule
// written against .el-<kind>[data-<prop>].
export function wrapperDrawn(contract, cssBoundForKind = new Set()) {
  const out = new Set();
  for (const [name, def] of Object.entries(contract?.props ?? {})) {
    if (def?.type !== 'enum' && def?.type !== 'boolean') continue;
    if (contract.variants?.[name] || cssBoundForKind.has(attrName(name))) out.add(name);
  }
  return out;
}

// the wrapper's attribute name for a prop, as src/render/index.js writes it
const attrName = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

// kind → data attribute names a stylesheet binds, read from the css text itself.
export function cssBound(css) {
  const out = new Map();
  for (const m of String(css).matchAll(/\.el-([a-z0-9-]+)\[data-([a-z0-9_-]+)/g)) {
    if (!out.has(m[1])) out.set(m[1], new Set());
    out.get(m[1]).add(m[2]);
  }
  return out;
}

// What the file wrote on the element: its own keys, minus the reserved ones and the engine's `$` marks.
export function writtenProps(el) {
  return Object.keys(el).filter((k) => !RESERVED_KEYS.has(k) && !k.startsWith('$') && k !== 'layout');
}

// Props written in the file, declared by the contract, and drawn by nothing.
export function notDrawn({ written, read, wrapper, contract }) {
  return written.filter((k) => contract?.props && k in contract.props && contract.props[k]?.drawn !== false && !read.has(k) && !wrapper.has(k));
}
