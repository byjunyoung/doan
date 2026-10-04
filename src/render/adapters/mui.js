import React from 'react';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import * as mui from '@mui/material';
import { h, v, isTbd, sample, layers, cellOf, words } from '../kinds.js';
import { DEFAULT_TOKENS, mergeTokens, baseFontSize } from '../tokens.js';

// The second adapter, and the model for the next one: same contract as antd.js — a map of
// component names to renderers, a theme built from tokens, styles extracted after the last
// element rendered. MUI styles through emotion, so the cache is emotion's.

const e = React.createElement;
const list = (x) => (Array.isArray(x) ? x : x === undefined ? [] : [x]);
const text = (x) => (isTbd(x) ? `TBD${x.$tbd?.owner ? ` (${x.$tbd.owner})` : ''}` : x === undefined || x === null ? '' : String(x));
const label = (c) => (typeof c === 'object' && c && !isTbd(c) ? c.label ?? c.key ?? c.id ?? JSON.stringify(c) : c);
const raw = (html) => e('div', { dangerouslySetInnerHTML: { __html: html } });
const over = (el, r) => (el.overlay !== undefined || el.toast !== undefined || el.notice !== undefined ? raw(layers(el, r)) : null);
const note = (cls, x) => (x === undefined || x === null ? null : e('span', { className: cls }, text(x)));
const both = (...parts) => e(React.Fragment, null, ...parts.filter(Boolean));
const STATUS = { success: 'success', warning: 'warning', danger: 'error', error: 'error', info: 'info', primary: 'primary' };
const selRow = (el) => (el.selected_row === undefined || el.selected_row === null ? -1 : Number.isInteger(Number(el.selected_row)) ? Math.max(Number(el.selected_row) - 1, 0) : 0);

function themeFrom(tokens) {
  const t = mergeTokens(DEFAULT_TOKENS, tokens);
  return createTheme({
    palette: { primary: { main: t.color.primary, contrastText: t.color['primary-text'] }, error: { main: t.color.danger }, text: { primary: t.color.text, secondary: t.color.muted }, divider: t.color.border, background: { paper: t.color.bg, default: t.color.surface } },
    shape: { borderRadius: parseInt(t.radius.md, 10) || 8 },
    typography: { fontFamily: t.font.family, fontSize: parseInt(baseFontSize(t), 10) || 14 },
  });
}

const components = {
  // size: sm · md · full → small · medium · a full-width large button, as the bundled set draws it
  Button: (el) => both(e(mui.Button, { variant: el.variant === 'primary' ? 'contained' : 'outlined', color: el.variant === 'danger' ? 'error' : 'primary', size: el.size === 'sm' ? 'small' : el.size === 'full' ? 'large' : 'medium', fullWidth: el.size === 'full', disabled: !!el.disabled || !!el.disabled_when, startIcon: el.icon ? e('span', { className: 'btn-ico' }, text(el.icon)) : undefined }, text(el.label ?? el.title ?? el.id)), note('btn-note', el.note), el.accept ? note('hint', ` ${text(el.accept)}`) : null), // an upload maps here too: its accepted types beside it
  // a column's align is the cell's; a column's kind draws each cell as the bundled set draws that kind
  Table: (el, r) => {
    const cols = list(el.columns);
    const sel = selRow(el);
    const ALIGN = { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right' };
    const align = (c) => (typeof c === 'object' && c ? ALIGN[c.align] : undefined);
    const cell = (c, row, i) => (typeof c === 'object' && c?.kind ? raw(cellOf(el, c, row, i, r)) : sample(c, row));
    return both(e(mui.Table, { size: 'small' },
      e(mui.TableHead, null, e(mui.TableRow, null, ...(el.selectable ? [e(mui.TableCell, { key: 'c', padding: 'checkbox' }, e(mui.Checkbox, { size: 'small' }))] : []), ...cols.map((c, i) => e(mui.TableCell, { key: i, align: align(c) }, text(label(c)))))),
      e(mui.TableBody, null, ...Array.from({ length: 3 }, (_, r) => e(mui.TableRow, { key: r, selected: r === sel, className: r === sel ? 'row-sel' : undefined }, ...(el.selectable ? [e(mui.TableCell, { key: 'c', padding: 'checkbox' }, e(mui.Checkbox, { size: 'small' }))] : []), ...cols.map((c, i) => e(mui.TableCell, { key: i, align: align(c) }, cell(c, r, i)))))),
    ), el.row_action ? e('div', { className: 'hint' }, `${words().rowTo} ${text(el.row_action)}`) : null);
  },
  // compact is the arrows and the page alone; page_size is the rows a page holds, beside it
  Pagination: (el) => both(el.compact ? e('span', { className: 'pager' }, '‹ 1 / 5 ›') : e(mui.Pagination, { count: 5, page: 1, size: 'small' }), el.page_size ? note('hint', ` ${text(el.page_size)}${words().perPageWord}`) : null),
  Alert: (el) => e(mui.Alert, { severity: el.kind === 'error-notice' || el.level === 'error' ? 'error' : 'info' }, text(el.text ?? el.title ?? '')),
  Skeleton: (el) => e('div', null, ...Array.from({ length: Math.min(Number(el.rows) || 3, 6) }, (_, i) => e(mui.Skeleton, { key: i, variant: 'text' }))),
  ToggleButtonGroup: (el) => e(mui.ToggleButtonGroup, { size: 'small', exclusive: true, value: text(el.selected ?? list(el.options)[0]) }, ...list(el.options).map((o, i) => e(mui.ToggleButton, { key: i, value: text(o) }, text(o)))),
  // a read-only input is drawn disabled, as antd draws it; a textarea takes its rows and its counter
  TextField: (el) => both(e(mui.TextField, { size: 'small', fullWidth: true, select: el.kind === 'select', multiline: el.kind === 'textarea', rows: el.kind === 'textarea' ? Math.min(Number(el.rows) || 2, 12) : undefined, disabled: !!el.readonly, type: el.kind === 'number' ? 'number' : 'text', placeholder: text(el.placeholder ?? el.format ?? ''), value: text(el.text ?? el.value ?? (el.kind === 'select' ? list(el.options)[0] : '') ?? ''), slotProps: { input: { readOnly: true } } }, ...(el.kind === 'select' ? list(el.options).map((o, i) => e(mui.MenuItem, { key: i, value: text(o) }, text(o))) : [])), el.counter !== undefined ? e('div', { className: 'hint' }, text(el.counter)) : null),
  RadioGroup: (el) => e(mui.RadioGroup, { row: true, value: text(el.value ?? list(el.options)[0]) }, ...list(el.options).map((o, i) => e(mui.FormControlLabel, { key: i, value: text(o), control: e(mui.Radio, { size: 'small' }), label: text(o) }))),
  Checkbox: (el) => e(mui.FormControlLabel, { control: e(mui.Checkbox, { size: 'small', checked: !!el.checked }), label: text(el.label ?? el.text ?? el.id) }),
  Switch: (el) => (el.label !== undefined ? e(mui.FormControlLabel, { control: e(mui.Switch, { size: 'small', checked: !!el.on }), label: text(el.label) }) : e(mui.Switch, { size: 'small', checked: !!el.on })),
  // a status word is a palette colour; any other colour is drawn as the chip's own
  Chip: (el) => e(mui.Chip, { size: 'small', label: text(el.text ?? el.label ?? el.id), variant: el.color ? 'outlined' : undefined, color: STATUS[el.color] ?? undefined, sx: el.color && !STATUS[el.color] ? { color: text(el.color), borderColor: text(el.color) } : undefined }),
  Divider: () => e(mui.Divider),
  Card: (el, r) => e(mui.Card, { variant: 'outlined' }, e(mui.CardContent, null, ...(el.title || el.hint ? [e(mui.Typography, { variant: 'subtitle1', gutterBottom: true }, text(el.title), el.hint ? e('span', { className: 'hint' }, ` ${text(el.hint)}`) : null)] : []), raw(r.children(el)), over(el, r))),
  Tooltip: (el) => e(mui.Chip, { size: 'small', variant: 'outlined', title: list(el.items).map(text).join(' · '), label: `ⓘ ${text(el.trigger ?? 'tooltip')}` }),
  // an overlay's words sit under the spinner
  CircularProgress: (el) => e('div', { style: { textAlign: 'center', padding: 16 } }, e(mui.CircularProgress, { size: 24 }), el.text !== undefined ? e('div', { className: 'hint' }, text(el.text)) : null),
  LinearProgress: (el) => {
    const n = Number(el.value);
    return e(mui.LinearProgress, { variant: 'determinate', value: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 62 });
  },
};

export function create(project) {
  const cache = createCache({ key: 'dc' });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);
  const theme = themeFrom(project.tokens);
  const mapped = {};
  for (const [kind, def] of Object.entries(project.components ?? project.conventions.kinds ?? {})) {
    const name = def?.maps_to?.mui;
    if (name && components[name]) mapped[kind] = name;
  }
  const kinds = {};
  const rendered = [];
  for (const [kind, name] of Object.entries(mapped)) {
    kinds[kind] = (el, r) => {
      const html = renderToString(e(CacheProvider, { value: cache }, e(ThemeProvider, { theme }, components[name](el, r))));
      rendered.push(html);
      return html;
    };
  }
  return {
    name: 'mui',
    kinds,
    mapped,
    styles: () => constructStyleTagsFromChunks(extractCriticalToChunks(rendered.join(''))),
  };
}
