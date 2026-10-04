// A grid's columns written as the tracks themselves — `"1fr auto auto"` or `[md, 1fr]` — for a row
// whose cells must line up. A track is a size class (`sm`, the size scale), a `size.` or `space.`
// token, an `fr` share, `auto`, `min-content` / `max-content`, or `minmax(a, b)` over those. A number
// with a unit is refused, as everywhere in a layout (DESIGN.md §4.1): it was the one way a file could
// still carry a pixel, and a word css does not know collapsed the grid to one column without a word.

const KEYWORDS = new Set(['auto', 'min-content', 'max-content']);
const UNIT = /^-?\d+(\.\d+)?(px|rem|em|%|pt|vw|vh)$/;
const FR = /^\d+(\.\d+)?fr$/;

// the tracks of a `columns` value, or null when it is a count or `auto` (no tracks written)
export function tracksOf(columns) {
  if (Array.isArray(columns)) return columns.map(String);
  if (typeof columns === 'string' && columns !== 'auto') return splitTracks(columns);
  return null;
}

// split on spaces outside parentheses: "minmax(sm, 1fr) auto" → ["minmax(sm, 1fr)", "auto"]
function splitTracks(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text.trim()) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

// why a track is not one, or null when it is
export function trackProblem(track, sizeClasses = ['sm', 'md', 'lg', 'full']) {
  const t = String(track).trim();
  const mm = /^minmax\((.*)\)$/.exec(t);
  if (mm) {
    const parts = splitArgs(mm[1]);
    if (parts.length !== 2) return `"${t}" needs two values, minmax(a, b)`;
    for (const p of parts) {
      const why = trackProblem(p, sizeClasses);
      if (why) return why;
    }
    return null;
  }
  if (UNIT.test(t)) return `"${t}" is a number with a unit; use a size class (${sizeClasses.join(', ')}) or a size. token`;
  if (FR.test(t) || KEYWORDS.has(t) || sizeClasses.includes(t) || /^(size|space)\.[a-z0-9-]+$/.test(t)) return null;
  return `"${t}" is not a track: a size class (${sizeClasses.join(', ')}), a size. or space. token, Nfr, auto, or minmax(a, b)`;
}

function splitArgs(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

// the css for one track: a size class or token becomes its custom property
export function trackCss(track) {
  const t = String(track).trim();
  const mm = /^minmax\((.*)\)$/.exec(t);
  if (mm) return `minmax(${splitArgs(mm[1]).map(trackCss).join(',')})`;
  const tok = /^(size|space)\.([a-z0-9-]+)$/.exec(t);
  if (tok) return `var(--${tok[1]}-${tok[2]})`;
  if (FR.test(t) || KEYWORDS.has(t) || UNIT.test(t)) return t;
  return `var(--size-${t})`;
}
