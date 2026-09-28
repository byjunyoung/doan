// What a proposal changes, in words a designer reads — not YAML paths and JSON. The two
// documents are compared directly: elements by id (a changed parent is a move, not a removal
// and an addition), layout, states and variants as patches described in a sentence, flows as
// "from → to", notes line by line. The raw path table stays on the page, folded, for developers.

import { walkElements } from '../elements.js';

const WORDS = {
  en: {
    added: 'added', removed: 'removed', changed: 'changed', moved: 'moved',
    element: 'element', layout: 'layout', state: 'state', variant: 'variant', flow: 'flow', note: 'note', field: 'field',
    holds: 'holds', into: 'into', top: 'the top level', newMark: 'new', options: 'options', each: 'each changes',
    column: 'stacked', row: 'side by side', grid: (n) => `grid of ${n}`, gap: 'gap', align: 'across', justify: 'down', padding: 'padding', grow: 'fills the height', scroll: 'scrolls',
    hide: 'hidden', show: 'shown', becomes: 'becomes', sets: 'set', lineAdded: 'line added', lineRemoved: 'line removed', patches: 'patches',
  },
  ko: {
    added: '추가', removed: '뺌', changed: '바뀜', moved: '옮김',
    element: '요소', layout: '배치', state: '상태', variant: '변형', flow: '흐름', note: '메모', field: '항목',
    holds: '담음', into: '안으로', top: '맨 바깥', newMark: '새', options: '개', each: '마다 바뀜',
    column: '세로로 쌓기', row: '가로로 늘어놓기', grid: (n) => `${n}칸 격자`, gap: '간격', align: '가로 정렬', justify: '세로 정렬', padding: '안쪽 여백', grow: '남는 높이 채움', scroll: '스크롤',
    hide: '숨김', show: '보임', becomes: '로 바꿈', sets: '', lineAdded: '줄 추가', lineRemoved: '줄 뺌', patches: '패치',
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const code = (s) => `<code>${esc(s)}</code>`;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// a value as a person reads it: text in quotes, short; a token or a word as code; a list by its items
function val(v) {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'string') return /^[a-z][\w.-]*$/i.test(v) && !/\s/.test(v) ? code(v) : `“${esc(v.length > 48 ? `${v.slice(0, 47)}…` : v)}”`;
  if (typeof v === 'number' || typeof v === 'boolean') return code(String(v));
  if (Array.isArray(v)) return v.map(val).join(', ');
  if (typeof v === 'object' && '$tbd' in v) return code('$tbd');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${esc(k)} ${val(x)}`).join(' · ');
  return esc(String(v));
}

// every element in a document, by id, with the id of the element that holds it
function index(doc) {
  const out = new Map();
  for (const hit of walkElements(doc?.elements ?? [], ['elements'])) {
    let parent = null;
    for (const cand of walkElements(doc?.elements ?? [], ['elements'])) if ((cand.el.children ?? []).some((c) => c === hit.el)) parent = cand.el.id;
    out.set(hit.el.id, { el: hit.el, parent });
  }
  return out;
}

const labelOf = (el) => el.title ?? el.label ?? el.text ?? el.primary ?? el.summary ?? null;
const propsOf = (el) => Object.fromEntries(Object.entries(el).filter(([k]) => k !== 'id' && k !== 'children'));

function describeLayout(rule, W) {
  if (!rule || typeof rule !== 'object') return val(rule);
  const parts = [];
  if (rule.kind === 'grid') parts.push(W.grid(rule.columns ?? '?'));
  else if (rule.direction === 'row' || rule.kind === 'row') parts.push(W.row);
  else if (rule.kind === 'stack' || rule.direction === 'column') parts.push(W.column);
  if (rule.gap) parts.push(`${W.gap} ${code(rule.gap)}`);
  if (rule.align) parts.push(`${W.align} ${code(rule.align)}`);
  if (rule.justify) parts.push(`${W.justify} ${code(rule.justify)}`);
  if (rule.padding) parts.push(`${W.padding} ${[].concat(rule.padding).map(code).join(' ')}`);
  if (rule.grow) parts.push(W.grow);
  if (rule.scroll) parts.push(`${W.scroll} ${code(rule.scroll)}`);
  if (rule.size) parts.push(code(`size ${rule.size}`));
  return parts.join(' · ') || val(rule);
}

function describePatch(p, W) {
  if (!p || typeof p !== 'object') return val(p);
  const t = code(p.target ?? '?');
  if (p.hide) return `${t} ${W.hide}`;
  if (p.show) return `${t} ${W.show}`;
  if (p.replace) return `${t} → ${code(p.replace.kind ?? '?')}${labelOf(p.replace) ? ` ${val(labelOf(p.replace))}` : ''}`;
  if (p.set) return `${t}: ${Object.entries(p.set).map(([k, v]) => `${esc(k)} ${val(v)}`).join(' · ')}`;
  return val(p);
}

const flowLine = (f) => `${code(f.from + (f.via ? `.${f.via}` : ''))} → ${code(f.to)}${f.gesture && f.gesture !== 'tap' ? ` (${esc(f.gesture)})` : ''}${f.when ? ` — ${esc(f.when)}` : ''}`;

// The changes as rows { op: added|removed|changed|moved, area, subject, detail } — HTML strings.
export function describeChanges(beforeDoc, afterDoc, lang = 'en') {
  const W = WORDS[lang] ?? WORDS.en;
  const rows = [];
  const push = (op, area, subject, detail = '', id = null) => rows.push({ op, area, subject, detail, id });
  const b = index(beforeDoc), a = index(afterDoc);

  // elements: added (only the outermost new one), removed, moved, props changed
  for (const [id, { el, parent }] of a) {
    if (b.has(id)) continue;
    if (parent && !b.has(parent)) continue; // inside a new element: said with it
    const kids = (el.children ?? []).map((c) => `${code(c.id)}${b.has(c.id) ? '' : ` <span class="hint">${W.newMark}</span>`}`);
    const text = labelOf(el);
    push('added', W.element, `${code(id)} <span class="hint">${esc(el.kind)}</span>`, [text ? val(text) : '', kids.length ? `${kids.join(', ')} ${W.holds}` : ''].filter(Boolean).join(' — '), id);
  }
  for (const [id, { el, parent }] of b) {
    if (a.has(id)) continue;
    if (parent && !a.has(parent)) continue;
    push('removed', W.element, `${code(id)} <span class="hint">${esc(el.kind)}</span>`, labelOf(el) ? val(labelOf(el)) : '', id);
  }
  for (const [id, now] of a) {
    const was = b.get(id);
    if (!was) continue;
    if (was.parent !== now.parent) push('moved', W.element, code(id), `${was.parent ? code(was.parent) : W.top} → ${now.parent ? `${code(now.parent)} ${W.into}` : W.top}`, id);
    const pb = propsOf(was.el), pa = propsOf(now.el);
    for (const k of Object.keys({ ...pb, ...pa })) if (!eq(pb[k], pa[k])) push(pb[k] === undefined ? 'added' : pa[k] === undefined ? 'removed' : 'changed', W.element, `${code(id)} ${esc(k)}`, pb[k] === undefined ? val(pa[k]) : pa[k] === undefined ? val(pb[k]) : `${val(pb[k])} → ${val(pa[k])}`, id);
  }

  // layout, key by key
  const lb = beforeDoc?.layout ?? {}, la = afterDoc?.layout ?? {};
  for (const k of Object.keys({ ...lb, ...la })) {
    if (eq(lb[k], la[k])) continue;
    if (lb[k] === undefined) push('added', W.layout, code(k), describeLayout(la[k], W), k);
    else if (la[k] === undefined) push('removed', W.layout, code(k), describeLayout(lb[k], W), k);
    else push('changed', W.layout, code(k), `${describeLayout(lb[k], W)} → ${describeLayout(la[k], W)}`, k);
  }

  // states and variants: a patch list per name, said patch by patch
  const patches = (list) => (list ?? []).map((p) => describePatch(p, W)).join('<br>');
  const sb = beforeDoc?.states ?? {}, sa = afterDoc?.states ?? {};
  for (const k of Object.keys({ ...sb, ...sa })) {
    if (eq(sb[k], sa[k])) continue;
    push(sb[k] === undefined ? 'added' : sa[k] === undefined ? 'removed' : 'changed', W.state, code(k), patches(sa[k] ?? sb[k]));
  }
  const vb = beforeDoc?.variants ?? {}, va = afterDoc?.variants ?? {};
  for (const axis of Object.keys({ ...vb, ...va })) {
    if (eq(vb[axis], va[axis])) continue;
    const opts = va[axis] ?? vb[axis] ?? {};
    const names = Object.keys(opts);
    const targets = [...new Set(Object.values(opts).flat().map((p) => p?.target && `${code(p.target)} ${Object.keys(p.set ?? {}).map(esc).join('·')}`.trim()).filter(Boolean))];
    push(vb[axis] === undefined ? 'added' : va[axis] === undefined ? 'removed' : 'changed', W.variant, `${code(axis)} ${names.length}${W.options}`, `${names.map(esc).join(', ')}${targets.length ? `<br><span class="hint">${lang === 'ko' ? `${esc(axis)}${W.each}: ` : `${W.each}: `}</span>${targets.join(', ')}` : ''}`);
  }

  // flows, as lines
  const fl = (list) => (list ?? []).map((f) => JSON.stringify(f));
  const fb = fl(beforeDoc?.flows), fa = fl(afterDoc?.flows);
  for (const f of fa) if (!fb.includes(f)) push('added', W.flow, flowLine(JSON.parse(f)));
  for (const f of fb) if (!fa.includes(f)) push('removed', W.flow, flowLine(JSON.parse(f)));

  // notes, line by line
  const nb = beforeDoc?.notes ?? [], na = afterDoc?.notes ?? [];
  for (const n of na) if (!nb.includes(n)) push('added', W.note, val(n));
  for (const n of nb) if (!na.includes(n)) push('removed', W.note, val(n));

  // anything else at the top (title, type, status, platform, section …)
  const skip = new Set(['elements', 'layout', 'states', 'variants', 'flows', 'notes', 'schema', 'id']);
  for (const k of Object.keys({ ...(beforeDoc ?? {}), ...(afterDoc ?? {}) })) {
    if (skip.has(k) || eq(beforeDoc?.[k], afterDoc?.[k])) continue;
    push(beforeDoc?.[k] === undefined ? 'added' : afterDoc?.[k] === undefined ? 'removed' : 'changed', W.field, code(k), `${val(beforeDoc?.[k])} → ${val(afterDoc?.[k])}`);
  }
  return rows;
}

// a layout rule in words, for a proposal's summary: "stacked · gap space.md · across center"
export const layoutInWords = (rule, lang = 'en') => describeLayout(rule, WORDS[lang] ?? WORDS.en).replace(/<[^>]+>/g, '');

export const OP_MARK = { added: '+', removed: '−', changed: '✎', moved: '↪' };
export const opWord = (op, lang = 'en') => (WORDS[lang] ?? WORDS.en)[op];
