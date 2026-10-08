// The bundled component set: one function per kind, each returning the INSIDE of the
// element's wrapper. `h` escapes; `v` renders any prop value (a $tbd becomes a chip).
// A kind with no entry falls back to `generic`, which shows the kind and its props —
// the renderer never refuses a kind, the same way lint only warns on one (L10).

import { dictionary } from './i18n.js';

// The language the bundled set speaks. Set once per render by renderScreen/renderIndex;
// module state is fine because a render is synchronous.
let D = dictionary('en');
export function setLanguage(lang) {
  D = dictionary(lang);
}
// the words the current render speaks, for the wrapper's own marks (src/render/index.js)
export const words = () => D;

export const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const isTbd = (x) => x && typeof x === 'object' && !Array.isArray(x) && '$tbd' in x;

// an icon prop is a glyph, or a file when it names one under assets/. The test is repeated from
// src/assets.js on purpose: init copies this file into a project, where ../assets.js is not.
const isAssetRef = (x) => typeof x === 'string' && /^assets\/\S+\.(svg|png|jpe?g|gif|webp|avif)$/i.test(x);
// An svg icon is drawn as a mask filled with the text colour, so it follows the element it sits in —
// white on a selected tile, red on a danger button; any other picture stays an <img>.
export const isIcon = (x) => isAssetRef(x) && /\.svg$/i.test(x);
export const iconMask = (x, cls = 'ico-mask') => `<span class="${cls}" role="img" style="--ico:url('${h(x)}')"></span>`;
export const ico = (x) => (isIcon(x) ? iconMask(x) : isAssetRef(x) ? `<img class="ico-img" src="${h(x)}" alt="">` : v(x));
export function v(value) {
  if (value === undefined || value === null) return '';
  if (isTbd(value)) {
    const m = value.$tbd ?? {};
    const who = [m.owner, m.due].filter(Boolean).join(' · ');
    return `<span class="tbd" title="${h(m.note ?? '')}">TBD${who ? ' ' + h(who) : ''}</span>`;
  }
  if (Array.isArray(value)) return value.map(v).join(', ');
  if (typeof value === 'object') return h(JSON.stringify(value));
  return h(value);
}

const label = (c) => (typeof c === 'object' && c && !isTbd(c) ? c.label ?? c.key ?? c.id ?? JSON.stringify(c) : c);

const RESERVED = new Set(['id', 'kind', 'children', 'show_when', 'disabled_when', 'reveals']);
const props = (el) => Object.entries(el).filter(([k]) => !RESERVED.has(k));

const list = (items) => (Array.isArray(items) ? items : items === undefined ? [] : [items]);

// a prop that holds an element — an overlay, a toast, a preview — draws as that element; a plain
// value draws as text in the same place
export const part = (x, r, id) => (x && typeof x === 'object' && !isTbd(x) && x.kind ? r.element({ id, ...x }) : v(x));
// what a state lays over a box: a busy veil, a toast, an inline notice (a card's and a modal's)
export const layers = (el, r) =>
  `${el.notice !== undefined ? `<div class="notice-inline">${el.notice && typeof el.notice === 'object' && !el.notice.kind && !isTbd(el.notice) ? v(el.notice.title ?? el.notice.text) : part(el.notice, r, `${el.id}-notice`)}</div>` : ''}` +
  `${el.toast !== undefined ? `<div class="box-toast">${part(el.toast, r, `${el.id}-toast`)}</div>` : ''}` +
  `${el.overlay !== undefined ? `<div class="box-overlay">${part(el.overlay, r, `${el.id}-overlay`)}</div>` : ''}`;

// A cell with no value gets a sample made from its column name, so the picture reads as a
// screen and not as a broken one. The inspector says the values are samples.
export function sample(key, i = 0) {
  const k = String(typeof key === 'object' && key ? key.key ?? key.label ?? key.id ?? '' : key ?? '').toLowerCase();
  const n = i + 1;
  if (/percent|rate|level|uptime|%/.test(k)) return ['92%', '47%', '18%'][i % 3];
  if (/\b(date|time|created|updated|paid|ordered)\b|_at$|\bat\b/.test(k)) return ['2026-09-24 10:12', '2026-09-23 18:40', '2026-09-21 09:05'][i % 3];
  if (/amount|price|total|sales|revenue|cost|sum|value|avg|average/.test(k)) return ['12,400', '8,900', '31,250'][i % 3];
  if (/_no$|\bno\b|number|order_no|\bid$/.test(k)) return `ORD-${1040 + n}`;
  if (/status|state/.test(k)) return D.s_status[i % 3];
  if (/count|qty|quantity|orders|visitors|units|rank/.test(k)) return String([128, 64, 12][i % 3]);
  if (/name|title|item|product/.test(k)) return D.s_item(n);
  if (/store|branch|shop/.test(k)) return D.s_stores[i % 3];
  if (/method|type|kind/.test(k)) return D.s_method[i % 3];
  if (/email/.test(k)) return `user${n}@example.com`;
  if (/phone/.test(k)) return '010-1234-5678';
  if (/version/.test(k)) return `v2.${n}.0`;
  if (/duration|fulfil|elapsed/.test(k)) return D.s_duration[i % 3];
  return D.s_sample(n);
}

// A table column's own `align` (left · center · right, or start · end) and `kind` — what each cell
// is drawn as: a progress bar, a tag, a button… any kind the set draws, filled with a sample value.
const ALIGN = { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right' };
export const alignOf = (c) => (typeof c === 'object' && c && ALIGN[c.align] ? ` style="text-align:${ALIGN[c.align]}"` : '');
// A cell's value: the file's `rows` (a row is a list in column order, or a map by column key/label),
// else a sample made from the column name
export function cellValue(el, c, i, ci) {
  const rows = Array.isArray(el?.rows) ? el.rows : null;
  const row = rows ? rows[i] : undefined;
  if (row === undefined || row === null) return sample(c, i);
  if (Array.isArray(row)) return row[ci] ?? '';
  if (typeof row === 'object' && !isTbd(row)) {
    const k = typeof c === 'object' && c ? c.key : c;
    return row[k] ?? row[label(c)] ?? '';
  }
  return row;
}
export const rowCount = (el) => (Array.isArray(el?.rows) && el.rows.length ? el.rows.length : 3);
export function cellOf(el, c, i, ci, r) {
  const k = typeof c === 'object' && c ? c.kind : null;
  if (k === 'progress') return `<div class="bar"><span style="width:${[62, 38, 84][i % 3]}%"></span></div>`;
  if (k && kinds[k] && r) {
    const val = cellValue(el, c, i, ci);
    // a cell may be { text, color } — the value plus how the kind draws it (a tag's colour)
    const extra = val && typeof val === 'object' && !isTbd(val) && !Array.isArray(val) ? val : { text: val };
    return r.element({ id: `${el.id}/c${ci}-r${i}`, kind: k, ...extra, text: extra.text, label: extra.text, $cell: true });
  }
  if (typeof c === 'object' && c?.sub) return `${v(cellValue(el, c, i, ci))}<div class="sub">${v(c.sub)}</div>`;
  return v(cellValue(el, c, i, ci));
}

export const kinds = {
  generic(el, r) {
    const rows = props(el).map(([k, val]) => `<div class="prop"><span class="k">${h(k)}</span><span class="v">${v(val)}</span></div>`).join('');
    return `<div class="generic-head">${h(el.kind)}</div>${rows}${r.children(el)}`;
  },
  'page-header'(el, r) {
    const actions = list(el.actions).map((a) => (typeof a === 'object' && a.kind ? r.element(a) : `<button class="btn">${v(a)}</button>`)).join('');
    const tabs = list(el.tabs).map((t, i) => `<span class="tab${i === 0 ? ' active' : ''}" data-ui-tab>${v(t)}</span>`).join('');
    // back: the page this one is under, as a "← parent" line over the title (a detail page's path)
    const back = el.back !== undefined ? `<div class="ph-back">← ${v(el.back)}</div>` : '';
    return `<div class="ph-left">${back}<h2>${v(el.title)}</h2>${tabs ? `<div class="tabs">${tabs}</div>` : ''}</div><div class="ph-actions">${actions}${r.children(el)}</div>`;
  },
  card(el, r) {
    const hint = el.hint ? ` <span class="hint">${v(el.hint)}</span>` : '';
    return `${el.title || hint ? `<div class="card-title">${v(el.title)}${hint}</div>` : ''}${r.children(el)}${layers(el, r)}`;
  },
  section(el, r) {
    return `${el.title ? `<div class="section-title">${v(el.title)}</div>` : ''}${r.children(el)}`;
  },
  fieldset(el, r) {
    return `${r.children(el)}${el.hint ? `<div class="hint">${v(el.hint)}</div>` : ''}`;
  },
  // a disabled group draws every control inside it disabled, as its contract promises
  group(el, r) {
    return el.disabled === true ? r.disabledInside(() => r.children(el)) : r.children(el);
  },
  // a bar written as a list of field names, not as children, draws each as a labelled control
  'filter-bar'(el, r) {
    const fields = list(el.fields).map((f) => `<label class="fld"><span>${v(label(f))}</span><input readonly placeholder="${h(label(f))}"></label>`).join('');
    return `${fields}${r.children(el)}`;
  },
  'filter-form'(el) {
    return list(el.fields).map((f) => `<label class="fld"><span>${v(label(f))}</span><input readonly placeholder="${h(label(f))}"></label>`).join('');
  },
  segmented(el) {
    return `<div class="seg">${list(el.options).map((o, i) => `<span class="${i === 0 ? 'on' : ''}">${v(o)}</span>`).join('')}</div>`;
  },
  'button-group'(el) {
    return `<div class="seg">${list(el.options).map((o, i) => `<span class="${i === 0 ? 'on' : ''}">${v(o)}</span>`).join('')}</div>`;
  },
  button(el) {
    const variant = el.variant ?? 'default';
    const icon = el.icon ? `<span class="btn-ico">${ico(el.icon)}</span>` : '';
    // the note is small print for the reader (what pressing costs or needs) — a tooltip, not screen copy
    return `<button class="btn btn-${h(variant)}"${el.disabled ? ' disabled' : ''}${el.note ? ` title="${h(v(el.note))}"` : ''}>${icon}${v(el.label ?? el.title ?? el.id)}</button>`;
  },
  caption(el) {
    return `<span class="caption style-${h(el.style ?? 'plain')}">${v(el.text)}</span>`;
  },
  hint(el) {
    return `<span class="hint">${el.icon ? `<span class="ico">${ico(el.icon)}</span> ` : ''}${v(el.text)}</span>`;
  },
  divider() {
    return `<hr>`;
  },
  table(el, r) {
    const cols = list(el.columns);
    const head = cols.map((c) => `<th${alignOf(c)}>${v(label(c))}${typeof c === 'object' && c?.sortable ? ' ↕' : ''}</th>`).join('');
    const cell = (c, i, ci) => `<td${alignOf(c)}>${cellOf(el, c, i, ci, r)}</td>`;
    // the row a Selected state highlights: a row number, or the first row
    const sel = el.selected_row === undefined || el.selected_row === null ? -1 : Number.isInteger(Number(el.selected_row)) ? Math.max(Number(el.selected_row) - 1, 0) : 0;
    const rows = Array.from({ length: rowCount(el) }, (_, i) => `<tr${i === sel ? ' class="row-sel"' : ''}>${el.selectable ? '<td class="chk">☐</td>' : ''}${cols.map((c, ci) => cell(c, i, ci)).join('')}</tr>`).join('');
    // what a tap on a row does is the inspector's and the spec's, not a line in the picture
    return `<table${el.row_action ? ` title="${h(`${D.rowTo} ${v(el.row_action)}`)}"` : ''}><thead><tr>${el.selectable ? '<th class="chk"></th>' : ''}${head}</tr></thead><tbody>${rows}</tbody></table>`;
  },
  pagination(el) {
    const pages = el.compact ? `<span class="on">1</span> / 3` : `<span class="on">1</span> 2 3`;
    return `<div class="pager">‹ ${pages} ›${el.page_size ? ` <span class="hint">${h(el.page_size)}${D.perPage}</span>` : ''}</div>`;
  },
  'empty-notice'(el) {
    return `<div class="notice"><div class="notice-icon">○</div><div class="notice-title">${v(el.title ?? D.nothingHere)}</div><div class="notice-text">${v(el.text)}</div></div>`;
  },
  'error-notice'(el) {
    return `<div class="notice error"><div class="notice-icon">!</div><div class="notice-title">${v(el.title ?? D.wentWrong)}</div><div class="notice-text">${v(el.text)}</div></div>`;
  },
  skeleton(el) {
    return Array.from({ length: Math.min(Number(el.rows) || 3, 6) }, () => `<div class="skel"></div>`).join('');
  },
  overlay(el) {
    return `<div class="overlay-box">${v(el.text ?? D.loading)}</div>`;
  },
  toast(el) {
    return `<div class="toast ${h(el.level ?? 'info')}">${v(el.text)}</div>`;
  },
  placeholder(el) {
    return `<div class="ph-label">${D.undesigned}</div><div class="ph-text">${v(el.text)}</div>`;
  },
  modal(el, r) {
    return `<div class="modal-title">${v(el.title)}</div><div class="modal-body">${r.children(el)}</div>${layers(el, r)}`;
  },
  confirm(el) {
    return `<div class="confirm"><div class="modal-title">${v(el.title)}</div><div>${v(el.text)}</div><div class="row end">${list(el.buttons).map((b) => `<button class="btn">${v(b)}</button>`).join('')}</div></div>`;
  },
  field(el, r) {
    const c = el.control;
    const control = c && typeof c === 'object' && !isTbd(c) ? r.element({ id: `${el.id}-control`, ...c }) : `<input readonly>`;
    const tip = el.tooltip !== undefined ? ` <span class="hint fld-tip" title="${h(list(el.tooltip).map((t) => (isTbd(t) ? 'TBD' : label(t))).join(' · '))}">ⓘ</span>` : '';
    const preview = el.preview !== undefined ? `<div class="fld-preview">${part(el.preview, r, `${el.id}-preview`)}</div>` : '';
    // labels: top puts the label over the control and the caption under it (an admin form's vertical layout); left is the two-column default
    const top = el.labels === 'top';
    const span = top ? ' style="grid-column:1/-1"' : '';
    const star = el.required ? ' <span class="fld-req">*</span>' : '';
    const caption = el.caption ? `<div class="hint">${v(el.caption)}</div>` : '';
    return `<div class="fld-label"${span}>${v(el.label)}${star}${tip}${top ? '' : caption}</div><div class="fld-control${top ? ' fld-top' : ''}"${span}>${control}${preview}${el.error ? `<div class="err">${v(el.error)}</div>` : ''}${top ? caption : ''}${el.reveals ? `<div class="hint">${D.revealsLabel} ${v(Object.keys(el.reveals).join(', '))}</div>` : ''}</div>`;
  },
  input(el) {
    return `<input readonly${el.readonly ? ' class="ro"' : ''} value="${h(el.text ?? el.value ?? '')}" placeholder="${h(el.placeholder ?? '')}">`;
  },
  number(el) {
    return `<input readonly type="number" value="${h(el.value ?? '')}">`;
  },
  textarea(el) {
    return `<textarea readonly rows="${h(Math.min(Number(el.rows) || 2, 12))}" placeholder="${h(el.placeholder ?? '')}"></textarea>${el.counter ? `<div class="hint">${v(el.counter)}</div>` : ''}`;
  },
  // the chosen value; with none, the placeholder (muted), else the first option
  select(el) {
    if (el.value !== undefined) return `<div class="select">${v(el.value)} ▾</div>`;
    if (el.placeholder !== undefined) return `<div class="select is-placeholder">${v(el.placeholder)} ▾</div>`;
    return `<div class="select">${v(Array.isArray(el.options) ? el.options[0] : el.options ?? D.select)} ▾</div>`;
  },
  radio(el) {
    const opts = list(el.options);
    const on = el.value === undefined ? 0 : opts.findIndex((o) => String(label(o)) === String(el.value));
    return `<div class="radio">${opts.map((o, i) => `<label><span class="dot-r${i === on ? ' on' : ''}"></span>${v(o)}</label>`).join('')}</div>`;
  },
  date(el) {
    return el.value !== undefined ? `<div class="select">${v(el.value)} ▾</div>` : `<div class="select is-placeholder">${h(el.format ?? 'YYYY.MM.DD')} ▾</div>`;
  },
  'date-range'(el) {
    return `<div class="row"><div class="select">${h(el.format ?? 'YYYY.MM.DD')}</div> ~ <div class="select">${h(el.format ?? 'YYYY.MM.DD')}</div></div>`;
  },
  upload(el) {
    return `<button class="btn">${v(el.label ?? D.chooseFile)}</button>${el.accept ? ` <span class="hint">${v(el.accept)}</span>` : ''}`;
  },
  image(el) {
    // a real picture when src names a file under assets/, the placeholder otherwise
    // an svg under assets/icons/ is an icon: a mask in the text colour, on no box of its own
    if (isIcon(el.src) && /(^|\/)icons\//.test(el.src)) return `<div class="img is-icon size-${h(el.size ?? 'md')}">${iconMask(el.src, 'ico-mask ico-fill')}</div>`;
    // without a file, the placeholder names what picture goes there: the alt text, else the src
    const pic = isAssetRef(el.src) ? `<img src="${h(el.src)}" alt="${h(el.alt ?? '')}">` : `<span class="img-name">${v(el.alt ?? (el.src ? String(el.src).split('/').pop() : D.image))}</span>`;
    return `<div class="img size-${h(el.size ?? 'md')} fit-${h(el.fit ?? 'cover')}">${pic}</div>`;
  },
  'kv-table'(el) {
    // `columns` is how many label–value pairs sit on one line; the pairs reflow to it
    const given = Array.isArray(el.rows) ? el.rows : [];
    const per = Number(el.columns) > 0 ? Number(el.columns) : 0;
    const flat = given.flatMap((row) => list(row));
    const rows = per ? Array.from({ length: Math.ceil(flat.length / per) }, (_, i) => flat.slice(i * per, i * per + per)) : given;
    const body = rows.map((r, i) => `<tr>${list(r).map((k) => `<th>${v(k)}</th><td>${h(sample(k, i))}</td>`).join('')}</tr>`).join('');
    return `${el.title ? `<div class="section-title">${v(el.title)}</div>` : ''}<table class="kv">${body || `<tr><td class="hint">${v(el.rows)}</td></tr>`}</table>`;
  },
  'detail-card'(el) {
    return `<table class="kv">${list(el.fields).map((f, i) => `<tr><th>${v(f)}</th><td>${h(sample(f, i))}</td></tr>`).join('')}</table>`;
  },
  'stat-strip'(el) {
    return `<div class="stats">${list(el.stats).map((s, i) => `<div class="stat"><div class="stat-v">${h(sample(s, i))}</div><div class="stat-l">${v(s)}</div></div>`).join('')}</div>`;
  },
  // each cell is the tile element when the grid names one, else a bare coloured cell
  'tile-grid'(el, r) {
    const n = Math.min(Number(el.per_page) || 25, 100);
    const tile = el.tile && typeof el.tile === 'object' && el.tile.kind ? el.tile : null;
    return `<div class="tiles" style="--cols:${Number(el.columns) || 10}">${Array.from({ length: n }, (_, i) => (tile ? r.element({ ...tile, id: `${el.id}-tile-${i}` }) : `<span class="tile t${i % 5}"></span>`)).join('')}</div>`;
  },
  tooltip(el) {
    return `<span class="hint" title="${h(list(el.items).join(' · '))}">${v(el.trigger ?? 'ⓘ')}</span>`;
  },
  // the drag handle says the rows can be reordered; a fixed list draws none
  'sortable-list'(el) {
    const handle = el.reorder === false ? '' : '⋮⋮ ';
    return `<div class="sortable">${Array.from({ length: 3 }, (_, i) => `<div class="sort-item">${handle}${v(el.item ?? 'item')} ${i + 1}</div>`).join('')}</div>`;
  },
  nav(el) {
    // an item is a label, or { group, items } — a heading over its items (a console's 상품 / 지점 / 설정)
    const flat = [];
    for (const i of list(el.items)) {
      if (i && typeof i === 'object' && !isTbd(i) && i.group !== undefined) {
        flat.push({ heading: i.group });
        for (const j of list(i.items)) flat.push({ item: j });
      } else flat.push({ item: i });
    }
    const leaves = flat.filter((f) => f.item !== undefined);
    const on = el.active === undefined ? leaves[0] : leaves.find((f) => String(label(f.item)) === String(el.active));
    const logo = el.logo !== undefined ? `<div class="nav-logo">${v(el.logo)}</div>` : '';
    return `<div class="nav">${logo}${flat.map((f) => (f.heading !== undefined ? `<div class="nav-group">${v(f.heading)}</div>` : `<div class="nav-item${f === on ? ' on' : ''}">${v(label(f.item))}</div>`)).join('') || `<div class="nav-item on">${D.menu}</div>`}</div>`;
  },
  checkbox(el) {
    return `<label class="chk-line"><span class="box${el.checked ? ' on' : ''}"></span>${v(el.label ?? el.text ?? el.id)}</label>`;
  },
  switch(el) {
    return `<span class="sw${el.on ? ' on' : ''}"></span> ${v(el.label ?? '')}`;
  },
  tag(el) {
    // a colour is a status word (success, warning, danger, info) or a colour token's name
    const color = el.color ? ` style="--tag:var(--color-${h(String(el.color).replace(/^color\./, '').replace(/\./g, '-'))})"` : '';
    return `<span class="tag${el.color ? ' tag-colored' : ''}"${color}>${v(el.text ?? el.label ?? el.id)}</span>`;
  },
  // mobile
  'app-bar'(el, r) {
    const actions = list(el.actions).map((a) => (typeof a === 'object' && a.kind ? r.element(a) : `<span class="ab-action">${v(a)}</span>`)).join('');
    return `<div class="ab-left">${el.back ? '<span class="ab-back">‹</span>' : ''}</div><div class="ab-title">${v(el.title)}</div><div class="ab-actions">${actions}</div>`;
  },
  // tabs over a panel: the active one underlined, as a page header's tabs are (it was a generic box)
  tabs(el) {
    const all = list(el.tabs);
    const active = el.active ?? all[0];
    return `<div class="tabs">${all.map((t) => `<span class="tab${String(label(t)) === String(label(active)) ? ' active' : ''}" data-ui-tab>${v(label(t))}</span>`).join('')}</div>`;
  },
  'tab-bar'(el) {
    return `<div class="tb">${list(el.tabs).map((t) => `<div class="tb-item${String(label(t)) === String(el.active ?? list(el.tabs)[0]) ? ' on' : ''}"><span class="tb-icon"></span>${v(label(t))}</div>`).join('')}</div>`;
  },
  'list-cell'(el) {
    return `<div class="cell">${el.thumbnail ? '<span class="cell-thumb"></span>' : ''}<div class="cell-body"><div class="cell-title">${v(el.title ?? el.label ?? el.id)}</div>${el.subtitle ? `<div class="cell-sub">${v(el.subtitle)}</div>` : ''}</div>${el.value !== undefined ? `<div class="cell-value">${v(el.value)}</div>` : ''}${el.trailing !== undefined ? `<div class="cell-trail">${v(el.trailing)}</div>` : ''}${el.chevron === false ? '' : '<span class="cell-chevron">›</span>'}</div>`;
  },
  'bottom-sheet'(el, r) {
    return `<div class="sheet"><div class="sheet-handle"></div>${el.title ? `<div class="sheet-title">${v(el.title)}</div>` : ''}<div class="sheet-body">${r.children(el)}</div></div>`;
  },
  fab(el) {
    return `<button class="fab" title="${h(el.label ?? '')}">${ico(el.icon ?? '+')}</button>`;
  },
  snackbar(el) {
    return `<div class="snack">${v(el.text)}${el.action ? `<span class="snack-action">${v(el.action)}</span>` : ''}</div>`;
  },
  chip(el) {
    return `<span class="chip${el.selected ? ' on' : ''}">${v(el.label ?? el.text ?? el.id)}</span>`;
  },
  'search-bar'(el) {
    return `<div class="search"><span class="search-icon">⌕</span><input readonly placeholder="${h(el.placeholder ?? D.select)}"></div>`;
  },
  // no selected is nothing chosen yet (a required option the person has not picked), not the first
  segment(el) {
    return `<div class="seg">${list(el.options).map((o) => `<span class="${el.selected !== undefined && el.selected !== null && String(o) === String(el.selected) ? 'on' : ''}">${v(o)}</span>`).join('')}</div>`;
  },
  stepper(el) {
    return `<div class="stepper"><span class="step-btn">−</span><span class="step-val">${v(el.value ?? 1)}</span><span class="step-btn">+</span></div>`;
  },
  'pull-to-refresh'(el) {
    return `<div class="ptr${el.active ? ' on' : ''}">${el.active ? '◌' : '↓'}</div>`;
  },
  'sheet-handle'() {
    return `<div class="sheet-handle"></div>`;
  },
  tile(el) {
    return `<span class="tile t${(String(el.status ?? el.id).length) % 5}" title="${h(el.label ?? el.id)}"></span>`;
  },
  // the fill is the value, as a percentage (0–100); with none, a sample fill
  progress(el) {
    const n = Number(el.value);
    const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 62;
    return `<div class="bar"><span style="width:${pct}%"></span></div>`;
  },
};
