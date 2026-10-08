// import tokens: a Figma Variables export → the project's tokens/ (DTCG files + resolver).
//
// The source is the shape a variables export plugin writes, one JSON per collection:
//   { collection, modes: [..], variables: [{ name: 'color/brand/default', type: 'COLOR'|'FLOAT'|'STRING',
//     scopes: [..], values: { <mode>: { alias?, value } | <raw> } }] }
// (xds-tokens/tokens/*.json is this shape; `build-tokens.mjs` there resolves the aliases' values.)
//
// What comes out, and why:
// - The design system's names are kept — `color/text/primary` becomes `<prefix>.color.text.primary`.
//   A screen that names the token and the code that reads the export (`color['color/text/primary']`)
//   then meet on one name; only the prefix and the separator differ. Primitives (the collection the
//   others alias into) keep their names unprefixed: a screen never names them (L19).
// - A collection with one mode goes into one file. A collection with several modes becomes a
//   resolver modifier, one file per mode, so light/dark/high-contrast and Default/Compact/Large
//   are contexts the viewer can switch, not copies of the file.
// - doan's own vocabulary (`color.bg`, `space.md`, `text.body`, `surface.card`…) is what the bundled
//   set and the adapters read. It is written as a thin alias layer in semantic.tokens.json, each name
//   pointing at a design-system token. The pairing comes from `map` (a file the team keeps) over a
//   default that guesses common names; what nothing covers keeps the bundled value and is listed.
import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_TOKEN_FILES } from '../tokens.js';

const WEIGHTS = { thin: 100, hairline: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };
const DIMENSION_SCOPES = new Set(['GAP', 'CORNER_RADIUS', 'WIDTH_HEIGHT', 'STROKE_FLOAT', 'FONT_SIZE', 'LINE_HEIGHT', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT', 'LETTER_SPACING']);

const slug = (s) => String(s).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const pathOf = (name) => name.split('/').map((p) => p.trim()).filter(Boolean);

function srgb(hex) {
  const h = hex.replace('#', '');
  const components = [0, 2, 4].map((i) => Math.round((parseInt(h.slice(i, i + 2), 16) / 255) * 1000) / 1000);
  const out = { colorSpace: 'srgb', components, hex: `#${h.slice(0, 6).toLowerCase()}` };
  if (h.length === 8) out.alpha = Math.round((parseInt(h.slice(6, 8), 16) / 255) * 1000) / 1000;
  return out;
}

// one variable's $type from Figma's type and scopes
function typeOf(v) {
  if (v.type === 'COLOR') return 'color';
  if (v.type === 'BOOLEAN') return null;
  const scopes = new Set(v.scopes ?? []);
  if (v.type === 'STRING') return scopes.has('FONT_STYLE') ? 'fontWeight' : scopes.has('FONT_FAMILY') ? 'fontFamily' : null;
  if (scopes.has('OPACITY')) return 'number';
  if ([...scopes].some((s) => DIMENSION_SCOPES.has(s)) || scopes.size === 0 || scopes.has('ALL_SCOPES')) return 'dimension';
  return 'number';
}

function valueOf(type, raw, v) {
  if (type === 'color') return typeof raw === 'string' ? srgb(raw) : raw;
  if (type === 'dimension') return { value: Number(raw), unit: 'px' };
  if (type === 'number') return (v.scopes ?? []).includes('OPACITY') && Number(raw) > 1 ? Number(raw) / 100 : Number(raw);
  if (type === 'fontWeight') return WEIGHTS[slug(raw).replace(/-/g, '')] ?? (Number.isFinite(Number(raw)) ? Number(raw) : String(raw));
  return raw;
}

function setAt(doc, path, node) {
  let cur = doc;
  for (const p of path.slice(0, -1)) cur = cur[p] ??= {};
  cur[path.at(-1)] = node;
}

// Which collection is the primitive one: the one the other collections alias into. Falls back to
// a collection named primitive, then to none (every collection prefixed).
function primitiveOf(collections, wanted) {
  if (wanted) return collections.find((c) => slug(c.collection) === slug(wanted))?.collection ?? null;
  const byName = new Map();
  for (const c of collections) for (const v of c.variables) byName.set(v.name, c.collection);
  const targets = new Map();
  for (const c of collections)
    for (const v of c.variables)
      for (const m of Object.values(v.values ?? {})) {
        const owner = m && typeof m === 'object' && m.alias ? byName.get(m.alias) : null;
        if (owner && owner !== c.collection) targets.set(owner, (targets.get(owner) ?? 0) + 1);
      }
  if (targets.size) return [...targets.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return collections.find((c) => slug(c.collection) === 'primitive')?.collection ?? null;
}

// The default pairing of doan's vocabulary with a design system's names. Each entry is a list of
// candidates by design-system path (without the prefix); the first that exists wins. A team's
// `map` file overrides any entry with one name (or a literal value).
export const DEFAULT_MAP = {
  'color.bg': ['color.surface.base', 'color.bg.default', 'color.background.default', 'color.bg.primary', 'color.bg'],
  'color.surface': ['color.surface.raised', 'color.bg.subtle', 'color.surface.secondary', 'color.bg.secondary'],
  'color.border': ['color.border.tertiary', 'color.border.default', 'color.border.primary', 'color.border'],
  'color.text': ['color.text.primary', 'color.text.default', 'color.fg.default', 'color.text'],
  'color.muted': ['color.text.tertiary', 'color.text.secondary', 'color.text.muted', 'color.fg.muted'],
  'color.primary': ['color.brand.default', 'color.primary.default', 'color.accent.default', 'color.primary'],
  'color.primary-text': ['color.brand.on-solid', 'color.text.on-primary', 'color.text.inverse', 'color.static.white'],
  'color.danger': ['color.status.danger.default', 'color.danger.default', 'color.error.default', 'color.danger'],
  'color.success': ['color.status.success.default', 'color.success.default', 'color.success'],
  'color.placeholder': ['color.bg.subtle', 'color.bg.subtler', 'color.surface.raised'],
  'color.placeholder-border': ['color.border.secondary', 'color.border.default'],
  'color.tbd': ['color.status.caution.subtle', 'color.warning.subtle'],
  'color.tbd-border': ['color.status.caution.default', 'color.warning.default'],
  'space.xs': ['space.50', 'space.xs', 'spacing.xs', 'space.4'],
  'space.sm': ['space.100', 'space.sm', 'spacing.sm', 'space.8'],
  'space.md': ['space.200', 'space.md', 'spacing.md', 'space.16'],
  'space.lg': ['space.300', 'space.lg', 'spacing.lg', 'space.24'],
  'space.xl': ['space.400', 'space.xl', 'spacing.xl', 'space.32'],
  'radius.sm': ['radius.4', 'radius.sm', 'border-radius.sm'],
  'radius.md': ['radius.8', 'radius.md', 'border-radius.md'],
  'font.size.xs': ['font.size.body-xs', 'font.size.xs', 'typography.size.xs'],
  'font.size.sm': ['font.size.body-sm', 'font.size.sm', 'typography.size.sm'],
  'font.size.md': ['font.size.body-md', 'font.size.md', 'typography.size.md'],
  'font.size.lg': ['font.size.body-lg', 'font.size.lg', 'typography.size.lg'],
  'font.size.xl': ['font.size.heading-xs', 'font.size.xl', 'typography.size.xl'],
  'font.size.2xl': ['font.size.heading-md', 'font.size.2xl', 'typography.size.2xl'],
  'font.weight.regular': ['font.weight.regular', 'font.weight.normal'],
  'font.weight.medium': ['font.weight.medium'],
  'font.weight.bold': ['font.weight.bold', 'font.weight.semibold'],
  'control.sm': ['size.button-sm', 'size.control-sm', 'space.400'],
  'control.md': ['size.button-md', 'size.control-md', 'space.500'],
  'control.lg': ['size.button-lg', 'size.control-lg', 'space.600'],
  'control.xl': ['size.button-xl', 'size.control-xl', 'space.700'],
};
// text styles: size · line-height pair by design-system name, weight by doan name
const TEXT_STYLES = {
  display: { size: ['font.size.heading-xl', 'font.size.display'], weight: 'font.weight.bold' },
  heading: { size: ['font.size.heading-md', 'font.size.heading'], weight: 'font.weight.bold' },
  title: { size: ['font.size.heading-xs', 'font.size.title'], weight: 'font.weight.bold' },
  body: { size: ['font.size.body-md', 'font.size.body'], weight: 'font.weight.regular' },
  label: { size: ['font.size.body-sm', 'font.size.label'], weight: 'font.weight.medium' },
  caption: { size: ['font.size.body-xs', 'font.size.caption'], weight: 'font.weight.regular' },
};

export function importVariableFiles(collections, { prefix = 'ds', primitive: wantPrimitive = null, map = {}, family = null } = {}) {
  const primitive = primitiveOf(collections, wantPrimitive);
  const notes = [];
  // name → full dotted path, for aliases and for the map
  const pathByName = new Map();
  for (const c of collections) for (const v of c.variables) pathByName.set(v.name, (c.collection === primitive ? [] : [prefix]).concat(pathOf(v.name)).join('.'));
  const aliasTo = (name) => (pathByName.has(name) ? `{${pathByName.get(name)}}` : null);

  const files = {};
  const sets = { base: ['primitive.tokens.json'] };
  const modifiers = {};
  const counts = {};
  const dsNames = new Set();

  for (const c of collections) {
    const isPrimitive = c.collection === primitive;
    const modes = Array.isArray(c.modes) && c.modes.length ? c.modes : ['Value'];
    const multi = modes.length > 1;
    const key = slug(c.collection);
    const targets = multi ? modes.map((m) => ({ mode: m, file: `${key}-${slug(m)}.tokens.json` })) : [{ mode: modes[0], file: isPrimitive ? 'primitive.tokens.json' : `${key}.tokens.json` }];
    for (const t of targets)
      files[t.file] ??= {
        $description: isPrimitive
          ? `${c.collection}: the palette and the scale, as exported from Figma Variables. A screen never names these; the semantic files do.`
          : multi
            ? `${c.collection}, mode "${t.mode}", as exported from Figma Variables. Names are the design system's under "${prefix}." — a screen says ${prefix}.<name with / as .>.`
            : `${c.collection}, as exported from Figma Variables. Names are the design system's under "${prefix}." — a screen says ${prefix}.<name with / as .>.`,
      };
    let n = 0;
    for (const v of c.variables) {
      const type = typeOf(v);
      if (!type) {
        notes.push(`skipped ${c.collection}/${v.name}: ${v.type}${v.scopes?.length ? ` (${v.scopes.join(', ')})` : ''} has no DTCG type here`);
        continue;
      }
      const rel = pathOf(v.name);
      const path = isPrimitive ? rel : [prefix, ...rel];
      for (const t of targets) {
        const m = v.values?.[t.mode] ?? v.values?.[modes[0]];
        const raw = m && typeof m === 'object' && 'value' in m ? m.value : m;
        const al = m && typeof m === 'object' && m.alias ? aliasTo(m.alias) : null;
        const node = { $type: type, $value: al ?? valueOf(type, raw, v) };
        if (typeof v.description === 'string' && v.description.trim()) node.$description = v.description.trim();
        setAt(files[t.file], path, node);
      }
      if (!isPrimitive) dsNames.add(rel.join('.'));
      n++;
    }
    counts[c.collection] = n;
    if (multi) {
      const def = modes.find((m) => /^(light|default)$/i.test(m)) ?? modes.find((m) => /light|default/i.test(m)) ?? modes[0];
      modifiers[key] = { contexts: Object.fromEntries(targets.map((t) => [slug(t.mode), [{ $ref: t.file }]])), default: slug(def) };
    } else if (!isPrimitive) sets.base.push(targets[0].file);
  }

  // doan's vocabulary as aliases into the design system
  const dsRef = (candidates) => {
    for (const cand of [].concat(candidates)) if (dsNames.has(cand)) return `{${prefix}.${cand}}`;
    return null;
  };
  const semantic = { $description: `doan's own names — what the bundled set and the adapters read — each an alias into the design system ("${prefix}."). Change a pairing here, or in the map file import tokens takes, not the value.` };
  const defaults = DEFAULT_TOKEN_FILES;
  const kept = [];
  const resolveMapped = (doanName) => {
    const own = map[doanName];
    if (own !== undefined) return typeof own === 'string' && !own.startsWith('{') && !own.startsWith('#') && dsNames.has(own) ? `{${prefix}.${own}}` : own;
    return dsRef(DEFAULT_MAP[doanName] ?? []);
  };
  const putAlias = (doc, name, type, fallback) => {
    const value = resolveMapped(name);
    const node = { $type: type, $value: value ?? fallback };
    if (value === null) kept.push(name);
    setAt(doc, name.split('.'), node);
  };
  const defSem = defaults['semantic.tokens.json'];
  const defLight = defaults['light.tokens.json'];
  const litOf = (node) => {
    // a bundled alias such as {size.4} resolved to its literal, so the fallback stands on its own
    const v = node?.$value;
    if (typeof v === 'string' && v.startsWith('{')) {
      let cur = defaults['primitive.tokens.json'];
      for (const p of v.slice(1, -1).split('.')) cur = cur?.[p];
      return cur?.$value ?? v;
    }
    return v;
  };
  for (const k of ['xs', 'sm', 'md', 'lg', 'xl']) putAlias(semantic, `space.${k}`, 'dimension', litOf(defSem.space[k]));
  for (const k of ['sm', 'md']) putAlias(semantic, `radius.${k}`, 'dimension', litOf(defSem.radius[k]));
  const familyList = typeof family === 'string' ? family.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : family;
  setAt(semantic, ['font', 'family'], { $type: 'fontFamily', $value: familyList ?? litOf(defSem.font.family), ...(family ? {} : { $description: 'not a variable in the export — set with --family' }) });
  if (!family) kept.push('font.family');
  for (const k of ['xs', 'sm', 'md', 'lg', 'xl', '2xl']) putAlias(semantic, `font.size.${k}`, 'dimension', litOf(defSem.font.size[k]));
  for (const k of ['regular', 'medium', 'bold']) putAlias(semantic, `font.weight.${k}`, 'fontWeight', litOf(defSem.font.weight[k]));
  for (const k of ['sm', 'md', 'lg', 'xl']) putAlias(semantic, `control.${k}`, 'dimension', litOf(defSem.control[k]));
  const text = { $type: 'typography' };
  for (const [name, spec] of Object.entries(TEXT_STYLES)) {
    const size = map[`text.${name}.size`] ? `{${prefix}.${map[`text.${name}.size`]}}` : dsRef(spec.size);
    const lhName = size ? size.slice(1, -1).replace(`${prefix}.`, '').replace('.size.', '.line-height.') : null;
    const lh = lhName && dsNames.has(lhName) ? `{${prefix}.${lhName}}` : null;
    const def = defSem.text[name].$value;
    text[name] = { $value: { fontFamily: '{font.family}', fontSize: size ?? `{font.size.${{ display: '2xl', heading: 'xl', title: 'lg', body: 'md', label: 'md', caption: 'sm' }[name]}}`, fontWeight: `{${spec.weight}}`, lineHeight: lh ?? def.lineHeight } };
    if (!size) kept.push(`text.${name}`);
  }
  semantic.text = text;
  semantic.surface = structuredClone(defSem.surface);
  const color = { $type: 'color' };
  semantic.color = color;
  for (const k of ['bg', 'surface', 'border', 'text', 'muted', 'primary', 'primary-text', 'danger', 'success', 'placeholder', 'placeholder-border', 'tbd', 'tbd-border']) {
    const fallback = litOf(defLight.color[k] ?? { $value: '#888888' });
    putAlias(semantic, `color.${k}`, 'color', fallback);
  }
  semantic.shadow = structuredClone(defLight.shadow); // no export carries shadows; the bundled ones stay
  files['semantic.tokens.json'] = semantic;
  sets.base.push('semantic.tokens.json');

  const resolver = {
    name: 'theme',
    version: '2025.10',
    description: `Imported from a Figma Variables export (import tokens). Base: primitives, the single-mode collections, then doan's alias layer. Modifiers: ${Object.keys(modifiers).join(', ') || 'none'}.`,
    sets: { base: { sources: sets.base.map((f) => ({ $ref: f })) } },
    modifiers,
    resolutionOrder: [{ $ref: '#/sets/base' }, ...Object.keys(modifiers).map((m) => ({ $ref: `#/modifiers/${m}` }))],
  };
  files['theme.resolver.json'] = resolver;
  return { files, primitive, counts, modifiers: Object.fromEntries(Object.entries(modifiers).map(([k, m]) => [k, Object.keys(m.contexts)])), kept, notes };
}

export async function readVariableDir(srcDir) {
  const names = (await readdir(srcDir)).filter((f) => f.endsWith('.json')).sort();
  const out = [];
  for (const f of names) {
    let doc;
    try {
      doc = JSON.parse(await readFile(join(srcDir, f), 'utf8'));
    } catch {
      continue;
    }
    if (doc && Array.isArray(doc.variables)) out.push({ collection: doc.collection ?? f.replace(/\.json$/, ''), modes: doc.modes, variables: doc.variables });
  }
  if (!out.length) throw new Error(`no variables export in ${srcDir} — expected JSON files with { collection, modes, variables }`);
  return out;
}

// Writes tokens/ in the project: every file the import makes, and removes nothing else by hand —
// the resolver names what counts, so a stale light.tokens.json from init is simply not referenced.
export async function importTokens(dir, srcDir, { prefix = 'ds', primitive = null, map = null, family = null } = {}) {
  const collections = await readVariableDir(srcDir);
  const mapDoc = map ? JSON.parse(await readFile(map, 'utf8')) : {};
  const r = importVariableFiles(collections, { prefix, primitive, map: mapDoc, family });
  const out = join(dir, 'tokens');
  await mkdir(out, { recursive: true });
  const written = [];
  for (const [name, body] of Object.entries(r.files)) {
    await writeFile(join(out, name), JSON.stringify(body, null, 2) + '\n');
    written.push(`tokens/${name}`);
  }
  // the starter's files that the new resolver no longer names go, when they are still the starter's
  const removed = [];
  for (const [name, body] of Object.entries(DEFAULT_TOKEN_FILES)) {
    if (r.files[name]) continue;
    const file = join(out, name);
    try {
      if ((await readFile(file, 'utf8')) === JSON.stringify(body, null, 2) + '\n') {
        await rm(file);
        removed.push(`tokens/${name}`);
      }
    } catch {
      /* not there */
    }
  }
  return { ...r, written, removed };
}
