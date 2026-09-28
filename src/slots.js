// The slots a contract may bind a token to, and the CSS property each one is in the picture.
// Seven since 0.4 — colour, radius, spacing — four since 0.12 (type size and weight, control
// height, shadow), and since 0.14 the rest of a text style (family, line height, letter
// spacing) plus two composite slots that bind a whole style at once:
//
//   font:    text.heading   → font-family · font-size · font-weight · line-height · letter-spacing
//                              · text-transform (since 0.20, a style's Case as Figma names it)
//   surface: surface.tile   → bg · border · radius · shadow · text · padding
//
// A binding becomes `--k-<kind>-<slot>` on the element's wrapper (src/render/index.js
// componentCss). L28 warns on a slot not listed here.
export const SLOT_CSS = {
  bg: 'background-color',
  text: 'color',
  border: 'border-color',
  radius: 'border-radius',
  padding: 'padding',
  gap: 'gap',
  accent: 'accent-color',
  'font-family': 'font-family',
  'font-size': 'font-size',
  'font-weight': 'font-weight',
  'line-height': 'line-height',
  'letter-spacing': 'letter-spacing',
  'text-transform': 'text-transform',
  'min-height': 'min-height',
  shadow: 'box-shadow',
};

export const TYPE_SLOTS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform'];
export const COMPOSITE = {
  font: TYPE_SLOTS,
  surface: ['bg', 'border', 'radius', 'shadow', 'text', 'padding'],
};

// `muted` is a second text colour eleven bundled kinds read for their small print (--k-<kind>-muted);
// `idle` is the fill of an option not chosen in a segment (--k-segment-idle): with `gap` bound too,
// the options stand apart as pills, the chosen one in `bg`. Neither is one css property, so an
// adapter root does not take them from outside.
export const SLOTS = [...Object.keys(SLOT_CSS), 'muted', 'idle', ...Object.keys(COMPOSITE)];

// One binding as the plain slots it stands for: `font: text.heading` is five, each bound to the
// part the style defines (`text.heading.font-size`); a part the style leaves out is left out.
export function expandBinding(slot, token, has) {
  const parts = COMPOSITE[slot];
  if (!parts) return [[slot, token]];
  return parts.filter((p) => has(`${token}.${p}`)).map((p) => [p, `${token}.${p}`]);
}
