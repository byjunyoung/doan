// doan/react — the pure half of a harness: a merged screen tree (GET /api/screen) becomes a React
// tree drawn with *the team's own components*. No hooks, no window: a config of plain functions
// and `drawScreen` returns an element, so this also runs under react-dom/server in a test.
//
//   const { node, unmapped } = drawScreen(view, { registry, joins, space, onSelect });
//
// registry   kind → (el, ctx) => ReactNode. A kind with no entry draws as a dashed box and is counted.
// joins      [{ kind, next, as?, when? }] — a sibling of kind `next` (a kind name, or { kind, id })
//            right after an element of `kind` is folded into it as el.joined[as ?? next kind]; a team's
//            page-header+tabs, search-bar+filter-bar, table+pagination, form card + footer toolbar.
// space      doan spacing token → px (space.md → 16); layout rules name tokens, never px.
// onSelect   (id, event) → called when a person clicks the innermost drawn element; the bridge posts it.
// ctx        { children(), rule, draw(el), drawList(els), text, list, space, boxStyle, shell, view, unmapped }
import React from 'react';

const e = React.createElement;

export const text = (v) => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
export const list = (v) => (Array.isArray(v) ? v : []);

/** depth-first search for an element id in a tree (children only) */
export function findId(els, id) {
  for (const el of els) {
    if (el.id === id) return el;
    const r = el.children ? findId(el.children, id) : undefined;
    if (r) return r;
  }
  return undefined;
}

/** every button under a group, through nested groups — a form footer's 취소·저장·삭제 */
export function flatButtons(el) {
  const out = [];
  for (const c of el.children ?? []) {
    if (c.kind === 'button') out.push(c);
    else if (c.kind === 'group') out.push(...flatButtons(c));
  }
  return out;
}

const ALIGN = {
  'space-between': { justifyContent: 'space-between' },
  end: { justifyContent: 'flex-end' },
  center: { justifyContent: 'center', alignItems: 'center' },
  stretch: { alignItems: 'stretch' },
  start: { justifyContent: 'flex-start' },
};

/** a layout rule (stack/grid, direction, gap, padding, align, grow) as flex CSS, spacing through the token map */
export function boxStyle(rule, space = {}) {
  if (!rule) return {};
  const px = (t) => (typeof t === 'string' ? space[t] : typeof t === 'number' ? t : undefined);
  const s = {};
  if (rule.kind === 'stack' || rule.kind === 'grid' || rule.gap !== undefined || rule.direction) {
    s.display = 'flex';
    s.flexDirection = rule.direction === 'row' ? 'row' : 'column';
    if (rule.direction !== 'row') s.alignItems = 'stretch';
  }
  if (rule.gap !== undefined) s.gap = px(rule.gap);
  if (rule.padding !== undefined) {
    const p = Array.isArray(rule.padding) ? rule.padding.map(px) : [px(rule.padding)];
    s.padding = p.length === 2 ? `${p[0]}px ${p[1]}px` : p[0];
  }
  if (rule.align && ALIGN[rule.align]) Object.assign(s, ALIGN[rule.align]);
  if (rule.grow) s.flex = 1;
  return s;
}

/** a filter chip's label by the file's convention: 「역할 ▾」 → 역할; 「역할: 매장 점주 ⊗」 → 역할 + the values picked */
export function chipOf(el) {
  const raw = text(el.label ?? el.text ?? el.id).replace(/\s*[▾⊗]\s*$/u, '').trim();
  const m = raw.match(/^(.*?):\s*(.+)$/);
  const label = m ? m[1] : raw;
  const picked = m ? m[2].split(',').map((s) => s.trim()) : [];
  return { label, picked };
}

const matches = (el, spec) => (typeof spec === 'string' ? el.kind === spec : el.kind === spec.kind && (spec.id === undefined || el.id === spec.id));

export function drawScreen(view, config) {
  const { registry = {}, joins = [], space = {}, onSelect = null } = config;
  const unmapped = new Set();
  const layout = view.layout ?? {};
  const hasNav = (view.elements ?? []).some((x) => x.kind === 'nav');

  const anchor = (el, node) =>
    e(
      'div',
      {
        key: el.id,
        'data-doan-id': el.id,
        'data-doan-kind': el.kind,
        style: { display: 'contents' },
        onClickCapture: onSelect
          ? (ev) => {
              // the innermost wrapper answers: capture runs outside-in, so only the wrapper nearest the target
              const t = ev.target && ev.target.closest ? ev.target.closest('[data-doan-id]') : null;
              if (t !== ev.currentTarget) return;
              if (ev.nativeEvent && ev.nativeEvent.__doan) return;
              if (ev.nativeEvent) ev.nativeEvent.__doan = true;
              ev.preventDefault();
              ev.stopPropagation();
              onSelect(el.id, ev);
            }
          : undefined,
      },
      node,
    );

  const drawList = (els) => {
    const out = [];
    for (let i = 0; i < els.length; i++) {
      let el = els[i];
      const next = els[i + 1];
      const j = next && joins.find((jn) => el.kind === jn.kind && matches(next, jn.next) && (!jn.when || jn.when(el, next)));
      if (j) {
        const as = j.as ?? (typeof j.next === 'string' ? j.next : j.next.kind);
        el = { ...el, joined: { ...(el.joined ?? {}), [as]: next } };
        i++;
      }
      out.push(draw(el));
    }
    return out;
  };

  const draw = (el) => anchor(el, drawOne(el));

  const drawOne = (el) => {
    const rule = layout[el.id] ?? el._rule;
    const ctx = {
      children: () => drawList(el.children ?? []),
      rule,
      draw,
      drawList,
      text,
      list,
      space,
      boxStyle: (r = rule) => boxStyle(r, space),
      shell: hasNav,
      view,
      layout,
      unmapped,
      flatButtons,
      chipOf,
      // a field's control inherits the field's layout rule (a row of input + button is keyed by the field id)
      control: () => (el.control ? draw({ id: `${el.id}.control`, ...el.control, _rule: layout[el.id] }) : null),
    };
    const fn = registry[el.kind];
    if (fn) return fn(el, ctx);
    unmapped.add(el.kind);
    return e(
      'div',
      { 'data-doan-unmapped-kind': el.kind, style: { border: '1px dashed #d4380d', color: '#d4380d', padding: 4, fontSize: 12 } },
      `${el.kind}#${el.id}`,
      el.children ? ctx.children() : null,
    );
  };

  // the shell (nav + top bar) is the app's own: the file's `content` is what gets drawn; else all but the nav
  const content = findId(view.elements ?? [], 'content');
  const roots = content ? content.children ?? [] : (view.elements ?? []).filter((x) => x.kind !== 'nav');
  const rootRule = content ? layout[content.id] : undefined;
  const modal = view.type === 'modal' ? (view.elements ?? []).find((x) => x.kind === 'modal') ?? (view.elements ?? [])[0] : null;
  const nodes = modal ? drawList(modal.children ?? []) : drawList(roots);
  const banner =
    unmapped.size > 0
      ? e('div', { 'data-doan-unmapped': [...unmapped].join(','), style: { marginTop: 24, padding: 8, border: '1px dashed #d4380d', color: '#d4380d', fontSize: 12 } }, `unmapped kinds ${unmapped.size}: ${[...unmapped].join(', ')}`)
      : null;
  // the root's own padding and centring belong to the team's frame (shell / bare / modal), not to the body
  const body = e('div', { 'data-doan-screen': view.screen, 'data-doan-state': view.state, style: { ...boxStyle(modal ? layout.root ?? layout[modal.id] : rootRule, space), padding: 0, background: 'transparent', alignItems: 'stretch', justifyContent: undefined } }, ...nodes, banner);
  return { node: body, unmapped, shell: hasNav, modal, roots, rootRule };
}
