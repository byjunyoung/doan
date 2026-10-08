import React from 'react';
import { renderToString } from 'react-dom/server';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import * as antd from 'antd';
import dayjs from 'dayjs';
import { h, v, isTbd, sample, layers, cellOf, cellValue, rowCount, words } from '../kinds.js';
import { DEFAULT_TOKENS, mergeTokens, baseFontSize } from '../tokens.js';
import { isAssetRef } from '../../assets.js';

// Draws each mapped kind as the antd component its `maps_to.antd` names, server-side, with
// the styles antd generates extracted into the page. Children that the bundled renderer
// already produced are embedded as HTML, so a Card holds whatever is inside it. The theme
// comes from the project's tokens, which is how a team's design system reaches the picture.

const e = React.createElement;
const list = (x) => (Array.isArray(x) ? x : x === undefined ? [] : [x]);
const text = (x) => (isTbd(x) ? `TBD${x.$tbd?.owner ? ` (${x.$tbd.owner})` : ''}` : x === undefined || x === null ? '' : String(x));
const label = (c) => (typeof c === 'object' && c && !isTbd(c) ? c.label ?? c.key ?? c.id ?? JSON.stringify(c) : c);
const raw = (html) => e('div', { dangerouslySetInnerHTML: { __html: html } });
// the children of a container antd draws (card, modal): the box the screen's layout reaches (page.js)
const body = (html) => e('div', { className: 'lay-body', dangerouslySetInnerHTML: { __html: html } });
// what a state lays over a card or a dialog (overlay, toast, notice), drawn as the bundled set draws it
const over = (el, r) => (el.overlay !== undefined || el.toast !== undefined || el.notice !== undefined ? raw(layers(el, r)) : null);
// a line of small print beside a control: a button's note, an upload's accepted types, a counter
const note = (cls, x) => (x === undefined || x === null ? null : e('span', { className: cls }, text(x)));
const both = (...parts) => e(React.Fragment, null, ...parts.filter(Boolean));
const STATUS = { success: 'success', warning: 'warning', danger: 'error', error: 'error', info: 'processing' };
const dummyRows = (el, cols) => Array.from({ length: rowCount(el) }, (_, i) => Object.fromEntries([['key', i], ...cols.map((c, ci) => [c.dataIndex, v(cellValue(el, c.src, i, ci))])]));

function themeFrom(tokens) {
  const t = mergeTokens(DEFAULT_TOKENS, tokens);
  return {
    token: {
      colorPrimary: t.color.primary,
      colorError: t.color.danger,
      colorText: t.color.text,
      colorTextSecondary: t.color.muted,
      colorBorder: t.color.border,
      colorBgContainer: t.color.bg,
      borderRadius: parseInt(t.radius.md, 10) || 8,
      fontFamily: t.font.family,
      fontSize: parseInt(baseFontSize(t), 10) || 14,
      controlHeight: parseInt(t.control?.md, 10) || 32,
    },
  };
}

// One renderer per antd component name. `el` is the screen element, `r` the bundled renderer
// (for children), and each returns a React element.
const components = {
  // size: sm · md · full → antd small · middle · large, and full is a block button, as the bundled set draws it
  Button: (el) => e(antd.Button, { title: el.note !== undefined && el.note !== null ? text(el.note) : undefined, type: el.variant === 'primary' ? 'primary' : el.variant === 'icon' ? 'text' : 'default', danger: el.variant === 'danger', disabled: !!el.disabled || !!el.disabled_when, size: el.size === 'sm' ? 'small' : el.size === 'full' ? 'large' : 'middle', block: el.size === 'full', icon: /\.svg$/i.test(el.icon ?? '') && isAssetRef(el.icon) ? e('span', { className: 'ico-mask', role: 'img', style: { '--ico': `url('${el.icon}')` } }) : isAssetRef(el.icon) ? e('img', { src: el.icon, alt: '', className: 'ico-img' }) : el.icon ? e('span', { className: 'btn-ico' }, text(el.icon)) : undefined }, text(el.label ?? el.title ?? el.id)),
  // a column's align is antd's; a column's kind draws each cell as the bundled set draws that kind
  Table: (el, r) => {
    const ALIGN = { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right' };
    const cols = list(el.columns);
    const columns = cols.map((c, i) => {
      const obj = typeof c === 'object' && c ? c : {};
      return { title: text(label(c)), dataIndex: `c${i}`, sorter: !!obj.sortable, align: ALIGN[obj.align], src: c };
    });
    const rows = dummyRows(el, columns);
    columns.forEach((c) => delete c.src);
    // a column's kind is drawn per cell *before* the Table renders: a mapped kind (tag → antd Tag) is itself
    // a renderToString, and one nested inside the Table's render callback is an invalid hook call
    cols.forEach((c, i) => {
      if (!(typeof c === 'object' && c && c.kind)) return;
      const cells = rows.map((_, ri) => cellOf(el, c, ri, i, r));
      columns[i].render = (_, __, ri) => raw(cells[ri]);
    });
    const sel = el.selected_row === undefined || el.selected_row === null ? -1 : Number.isInteger(Number(el.selected_row)) ? Math.max(Number(el.selected_row) - 1, 0) : 0;
    const table = e(antd.Table, { size: 'small', columns, dataSource: rows, pagination: false, rowSelection: el.selectable ? {} : undefined, rowClassName: (_, i) => (i === sel ? 'row-sel' : '') });
    // what a tap on a row does is a title on the table (the inspector and the spec say it), not a caption antd would draw
    return el.row_action ? e('div', { title: `${words().rowTo} ${text(el.row_action)}` }, table) : table;
  },
  Pagination: (el) => e(antd.Pagination, { total: 50, pageSize: Number(el.page_size) || 10, size: 'small', showSizeChanger: false, simple: !!el.compact }),
  Empty: (el) => e(antd.Empty, { description: el.title !== undefined ? e('div', null, e('strong', null, text(el.title)), el.text !== undefined ? e('div', null, text(el.text)) : null) : text(el.text ?? words().noData) }),
  Result: (el) => e(antd.Result, { status: 'error', title: text(el.title ?? words().wentWrong), subTitle: text(el.text) }),
  Skeleton: (el) => e(antd.Skeleton, { active: false, paragraph: { rows: Math.min(Number(el.rows) || 3, 6) } }),
  Descriptions: (el) => {
    const rows = Array.isArray(el.rows) ? el.rows.flat() : list(el.fields);
    return e(antd.Descriptions, { size: 'small', bordered: true, column: Number(el.columns) || 2, title: el.title ? text(el.title) : undefined }, ...rows.map((k, i) => e(antd.Descriptions.Item, { key: i, label: text(k) }, sample(k, i))));
  },
  Segmented: (el) => e(antd.Segmented, { options: list(el.options).map(text), value: text(el.selected ?? list(el.options)[0]) }),
  Statistic: (el) => e(antd.Space, { size: 'large', wrap: true }, ...list(el.stats).map((s, i) => e(antd.Statistic, { key: i, title: text(s), value: sample(s, i) }))),
  Form: (el) => e(antd.Form, { layout: 'inline', size: 'small' }, ...list(el.fields).map((f, i) => e(antd.Form.Item, { key: i, label: text(label(f)) }, e(antd.Input, { placeholder: text(label(f)), readOnly: true })))),
  Input: (el) => e(antd.Input, { readOnly: true, value: text(el.text ?? el.value ?? ''), placeholder: text(el.placeholder), disabled: !!el.readonly }),
  'Input.TextArea': (el) => both(e(antd.Input.TextArea, { readOnly: true, rows: Math.min(Number(el.rows) || 2, 12), placeholder: text(el.placeholder), showCount: !!el.max, maxLength: el.max ? Number(el.max) : undefined }), el.counter !== undefined ? e('div', { className: 'hint' }, text(el.counter)) : null),
  InputNumber: (el) => e(antd.InputNumber, { readOnly: true, value: el.value }),
  // the chosen value; with none, the placeholder, else the first option
  Select: (el) => e(antd.Select, { style: { minWidth: 160 }, value: el.value !== undefined ? text(el.value) : el.placeholder !== undefined ? undefined : text(Array.isArray(el.options) ? el.options[0] : el.options ?? words().select), placeholder: el.placeholder !== undefined ? text(el.placeholder) : undefined, options: list(el.options).map((o) => ({ value: text(o) })) }),
  'Radio.Group': (el) => e(antd.Radio.Group, { value: text(el.value ?? list(el.options)[0]) }, ...list(el.options).map((o, i) => e(antd.Radio, { key: i, value: text(o) }, text(o)))),
  // a value antd can read as a date is the picked date; anything else (a $tbd, a phrase) shows as written
  DatePicker: (el) => {
    const day = typeof el.value === 'string' && dayjs(el.value).isValid() ? dayjs(el.value) : undefined;
    return e(antd.DatePicker, { format: el.format, value: day, placeholder: text(day ? el.format : el.value ?? el.format ?? 'YYYY.MM.DD') });
  },
  'DatePicker.RangePicker': (el) => e(antd.DatePicker.RangePicker, { format: el.format, placeholder: el.format ? [text(el.format), text(el.format)] : undefined }),
  Upload: (el) => both(e(antd.Button, {}, text(el.label ?? words().chooseFile)), el.accept ? note('hint', ` ${text(el.accept)}`) : null),
  Divider: () => e(antd.Divider, { style: { margin: '8px 0' } }),
  Alert: (el) => e(antd.Alert, { type: el.level === 'error' ? 'error' : 'info', message: text(el.text), showIcon: true }),
  message: (el) => e(antd.Alert, { type: el.level === 'error' ? 'error' : 'success', message: text(el.text), showIcon: true, banner: true }),
  Spin: (el) => e(antd.Spin, { tip: text(el.text ?? words().loading) }, e('div', { style: { height: 48 } })),
  Tag: (el) => e(antd.Tag, { color: el.color ? STATUS[el.color] ?? text(el.color) : undefined }, text(el.text ?? el.label)),
  Checkbox: (el) => e(antd.Checkbox, { checked: !!el.checked }, text(el.label ?? el.text ?? el.id)),
  Switch: (el) => both(e(antd.Switch, { checked: !!el.on }), el.label !== undefined ? e('span', { className: 'sw-label' }, ` ${text(el.label)}`) : null),
  // the contract's padding slot lands on the card root, so the body adds none of its own
  Card: (el, r) => {
    const title = el.title || el.hint ? e('span', null, text(el.title), el.hint ? e('span', { className: 'hint' }, ` ${text(el.hint)}`) : null) : undefined;
    return e(antd.Card, { size: 'small', title, styles: { body: { padding: 0 } } }, body(r.children(el)), over(el, r));
  },
  // the shadow is css (page.js .el-modal[data-drawn] > *), so a contract's shadow slot can replace it
  Modal: (el, r) => e(antd.Card, { title: text(el.title), styles: { body: { padding: 0 } } }, body(r.children(el)), over(el, r)),
  'Modal.confirm': (el) => e(antd.Card, { size: 'small', title: text(el.title) }, e('p', null, text(el.text)), e(antd.Space, null, ...list(el.buttons).map((b, i) => e(antd.Button, { key: i, type: i === list(el.buttons).length - 1 ? 'primary' : 'default' }, text(b))))),
  Tooltip: (el) => e(antd.Tag, { color: 'default', title: list(el.items).map(text).join(' · ') }, `ⓘ ${text(el.trigger ?? 'tooltip')}`),
};

export function create(project) {
  const cache = createCache();
  const theme = themeFrom(project.tokens);
  const mapped = {};
  for (const [kind, def] of Object.entries(project.components ?? project.conventions.kinds ?? {})) {
    const name = def?.maps_to?.antd;
    if (name && components[name]) mapped[kind] = name;
  }
  const kinds = {};
  for (const [kind, name] of Object.entries(mapped)) {
    kinds[kind] = (el, r) => renderToString(e(StyleProvider, { cache }, e(antd.ConfigProvider, { theme }, components[name](el, r))));
  }
  return {
    name: 'antd',
    kinds, // kind → fn(el, r) → html, same contract as the bundled set
    mapped, // kind → antd component name, for the inspector
    styles: () => extractStyle(cache), // call after the last element has rendered
  };
}
