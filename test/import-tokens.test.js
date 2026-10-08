import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importVariableFiles, importTokens } from '../src/import/tokens.js';
import { initProject } from '../src/init.js';
import { loadTokens } from '../src/tokens.js';

// the shape xds-tokens/tokens/*.json has: one file per collection, values per mode, aliases into primitives
const primitive = {
  collection: 'Primitive',
  modes: ['Value'],
  variables: [
    { name: 'common/white', type: 'COLOR', values: { Value: '#FFFFFF' }, scopes: ['ALL_FILLS'] },
    { name: 'blue/50', type: 'COLOR', values: { Value: '#2F6FED' }, scopes: ['ALL_FILLS'] },
    { name: 'blue/98', type: 'COLOR', values: { Value: '#EBF3FF' }, scopes: ['ALL_FILLS'] },
    { name: 'neutral/20', type: 'COLOR', values: { Value: '#1F2328' }, scopes: ['ALL_FILLS'] },
    { name: 'opacity/50', type: 'FLOAT', values: { Value: 50 }, scopes: ['OPACITY'] },
  ],
};
const color = {
  collection: 'Color',
  modes: ['dark', 'light'],
  variables: [
    { name: 'color/brand/default', type: 'COLOR', description: '브랜드 면.', values: { dark: { alias: 'blue/98', value: '#EBF3FF' }, light: { alias: 'blue/50', value: '#2F6FED' } } },
    { name: 'color/surface/base', type: 'COLOR', values: { dark: { alias: 'neutral/20', value: '#1F2328' }, light: { alias: 'common/white', value: '#FFFFFF' } } },
    { name: 'color/text/primary', type: 'COLOR', values: { dark: { alias: 'common/white', value: '#FFFFFF' }, light: { alias: 'neutral/20', value: '#1F2328' } } },
    { name: 'color/dim/default', type: 'COLOR', values: { dark: { value: '#787E8780' }, light: { value: '#787E8780' } } },
  ],
};
const dimension = {
  collection: 'Dimension',
  modes: ['Value'],
  variables: [
    { name: 'space/200', type: 'FLOAT', values: { Value: 16 }, scopes: ['GAP'] },
    { name: 'radius/8', type: 'FLOAT', values: { Value: 8 }, scopes: ['CORNER_RADIUS'] },
    { name: 'size/button-md', type: 'FLOAT', values: { Value: 40 }, scopes: ['WIDTH_HEIGHT'] },
  ],
};
const typography = {
  collection: 'Typography',
  modes: ['Default', 'Compact'],
  variables: [
    { name: 'font/weight/semibold', type: 'STRING', values: { Default: 'semibold', Compact: 'semibold' }, scopes: ['FONT_STYLE'] },
    { name: 'font/size/body-md', type: 'FLOAT', values: { Default: 16, Compact: 14 }, scopes: ['FONT_SIZE'] },
    { name: 'font/line-height/body-md', type: 'FLOAT', values: { Default: 22, Compact: 20 }, scopes: ['LINE_HEIGHT'] },
  ],
};

test('the design system keeps its names under the prefix; primitives stay bare; aliases follow', () => {
  const r = importVariableFiles([color, primitive, dimension, typography], { prefix: 'xds' });
  assert.equal(r.primitive, 'Primitive', 'the collection the others alias into is the primitive one');
  assert.deepEqual(r.files['primitive.tokens.json'].blue[50].$value.hex, '#2f6fed');
  assert.equal(r.files['primitive.tokens.json'].opacity[50].$value, 0.5, 'an OPACITY float of 50 is 0.5');
  const light = r.files['color-light.tokens.json'];
  assert.equal(light.xds.color.brand.default.$value, '{blue.50}', 'an aliased mode value is the alias, not the hex');
  assert.equal(light.xds.color.brand.default.$description, '브랜드 면.');
  assert.equal(light.xds.color.dim.default.$value.alpha, 0.502, 'an 8-digit hex carries its alpha');
  assert.deepEqual(r.modifiers, { color: ['dark', 'light'], typography: ['default', 'compact'] });
  assert.equal(r.files['theme.resolver.json'].modifiers.color.default, 'light');
  assert.equal(r.files['dimension.tokens.json'].xds.space[200].$value.value, 16);
  assert.equal(r.files['typography-default.tokens.json'].xds.font.weight.semibold.$value, 600, 'a weight word becomes its number');
});

test("doan's vocabulary is an alias layer into the design system, by the default pairing or the map; what nothing covers keeps the bundled value", () => {
  const r = importVariableFiles([color, primitive, dimension, typography], { prefix: 'xds', map: { 'color.muted': 'color.text.primary', 'space.xs': '#literal-not-a-name' } });
  const s = r.files['semantic.tokens.json'];
  assert.equal(s.color.bg.$value, '{xds.color.surface.base}');
  assert.equal(s.color.primary.$value, '{xds.color.brand.default}');
  assert.equal(s.color.muted.$value, '{xds.color.text.primary}', 'the map wins over the default pairing');
  assert.equal(s.space.md.$value, '{xds.space.200}');
  assert.equal(s.control.md.$value, '{xds.size.button-md}');
  assert.equal(s.font.size.md.$value, '{xds.font.size.body-md}');
  assert.equal(s.text.body.$value.fontSize, '{xds.font.size.body-md}');
  assert.equal(s.text.body.$value.lineHeight, '{xds.font.line-height.body-md}', 'a text style takes the line-height that pairs with its size');
  assert.ok(r.kept.includes('color.border'), 'nothing in the export is a border — the bundled value stays and it is reported');
  assert.ok(r.kept.includes('font.family'));
  assert.deepEqual(s.space.sm.$value, { value: 8, unit: 'px' }, 'a kept value is the bundled literal, not an alias into files that are gone');
});

test('written into a project, the import resolves per context and the viewer reads doan names', async () => {
  const src = await mkdtemp(join(tmpdir(), 'doan-vars-'));
  for (const c of [primitive, color, dimension, typography]) await writeFile(join(src, `${c.collection.toLowerCase()}.json`), JSON.stringify(c));
  const dir = await mkdtemp(join(tmpdir(), 'doan-import-tokens-'));
  await initProject(dir, { base: 'antd' });
  const r = await importTokens(dir, src, { prefix: 'xds', family: 'Pretendard, sans-serif' });
  assert.ok(r.removed.includes('tokens/light.tokens.json'), "the starter's theme files the resolver no longer names are removed");
  const t = await loadTokens(dir);
  assert.deepEqual(t.problems.filter((p) => p.severity === 'blocking'), []);
  assert.equal(t.tokens.color.bg, '#ffffff');
  assert.equal(t.tokens.color.primary, '#2f6fed');
  assert.equal(t.tokens.xds.color.brand.default, '#2f6fed', 'the design-system name resolves too');
  assert.equal(t.tokens.font.family, 'Pretendard, sans-serif');
  assert.equal(t.tokens.font.weight.bold, '600', 'bold pairs with semibold when the export has no bold');
  assert.equal(t.contexts.color.dark.color.bg, '#1f2328', 'the dark context recolours doan names through the aliases');
  assert.equal(t.contexts.typography.compact.font.size.md, '14px');
});
