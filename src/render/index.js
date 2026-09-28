import { mergeState } from '../merge.js';
import { walkElements } from '../elements.js';
import { lint, summarize, bindingsOf } from '../lint.js';
import { tokenNames, getToken, hasToken, getGroup } from '../tokens.js';
import { assetsSummary } from '../assets.js';
import { resolveFlowTarget } from '../flows.js';
import { kinds, h, v, isTbd, setLanguage } from './kinds.js';
import { dictionary, languageOf, pageStrings } from './i18n.js';
import { DEFAULT_TOKENS, mergeTokens, tokenVar, tokensToCss } from './tokens.js';
import { CSS, INSPECTOR_JS, PROTO_JS, CANVAS_JS, PROPOSAL_VIEW_JS } from './page.js';
import { parseScreenText } from '../project.js';
import { enumAttrs } from '../components.js';
import { expandComponents } from '../expand.js';
import { flowGraph } from '../flowmap.js';
import { canvasPages } from '../canvas.js';
import { appliesTo, matchSkeleton } from '../patterns.js';
import { describeChanges, OP_MARK, opWord } from './changes.js';
import { specOf, specMarkdown, codeOf } from '../spec.js';
import { SLOT_CSS, TYPE_SLOTS, expandBinding } from '../slots.js';

// render draws a screen file with the bundled component set or the team's own. It is the
// product surface (DESIGN.md §6): what a reviewer opens, what a developer inspects, what a
// comment anchors to. The shell is sidebar · main · drawer; states are tabs, or side by side
// when "compare" is on; meta information is a dot on the picture and text in the drawer.
//
// Finite by rule: the states tabs render each state with no variant chosen; each variant
// axis renders every option in the Default state. No cross product.

const ALIGN = { start: 'flex-start', end: 'flex-end', center: 'center', 'space-between': 'space-between', 'space-around': 'space-around', stretch: 'stretch' };

// Where things sit, in two words on fixed axes: `align` is horizontal, `justify` is vertical,
// whatever the container's direction — that is how a person reads a screen (0.13.0). A column
// with `align: center` centres its children; a row with `justify: center` lines them up on
// their middle; `space-between` spreads along an axis, `stretch` fills across it. A leaf's
// rule aligns the leaf's own box and its text.
function axisCss(rule) {
  const s = [];
  const a = rule.align ? ALIGN[rule.align] ?? rule.align : null;
  const j = rule.justify ? ALIGN[rule.justify] ?? rule.justify : null;
  const grid = rule.kind === 'grid' || rule.kind === 'columns';
  const row = rule.kind === 'row' || (rule.kind === 'stack' && rule.direction === 'row');
  if (grid) {
    if (a) s.push(`justify-items:${a}`, `justify-content:${a}`);
    if (j) s.push(`align-items:${j}`, `align-content:${j}`);
  } else if (row) {
    if (a) s.push(`justify-content:${a}`);
    if (j) s.push(`align-items:${j}`);
  } else if (rule.kind === 'stack') {
    if (a) s.push(`align-items:${a}`, `--lay-align:${a}`);
    if (j) s.push(`justify-content:${j}`);
  } else {
    if (a) s.push('display:flex', `justify-content:${a}`, ...(['start', 'end', 'center'].includes(rule.align) ? [`text-align:${rule.align}`] : []));
    if (j) s.push('display:flex', `align-items:${j}`);
  }
  return s;
}

// `columns` is a count, `auto` (as many as fit, each at least `min` wide), or the columns
// themselves as a css track list — `"1fr auto auto"` or `[1fr, auto, auto]` — for a row whose
// cells must line up: a cart line with its name, a stepper and a delete button.
function gridColumns(rule) {
  const c = rule.columns;
  if (c === 'auto') return `grid-template-columns:repeat(auto-fill,minmax(var(--size-${rule.min ?? 'sm'}),1fr))`;
  if (Array.isArray(c)) return `grid-template-columns:${c.join(' ')}`;
  if (typeof c === 'string') return `grid-template-columns:${c}`;
  return `grid-template-columns:repeat(${c ?? 2},minmax(0,1fr))`;
}

// A layout rule's container part (stack/grid) applies only to elements that hold children;
// a leaf kind (a table, a tile grid) draws its own inside and only takes gap/padding/size.
export function layoutStyle(rule, { container = true } = {}) {
  if (!rule) return '';
  const s = [];
  if (container) {
    if (rule.kind === 'stack') s.push('display:flex', `flex-direction:${rule.direction ?? 'column'}`);
    if (rule.kind === 'row') s.push('display:flex', 'flex-direction:row', 'align-items:center');
    // `columns: auto` fits as many as the width allows, each at least `min` wide — the grid
    // adapts on its own, before any breakpoint says so
    if (rule.kind === 'grid' || rule.kind === 'columns') s.push('display:grid', gridColumns(rule));
    if (rule.gap) s.push(`gap:${tokenVar(rule.gap)}`);
    // a container a library adapter drew keeps its children one box further in (a card's body);
    // the same direction and gap reach them there through these (page.js .lay-body)
    if (rule.kind === 'stack' || rule.kind === 'row') s.push(`--lay-dir:${rule.kind === 'row' ? 'row' : rule.direction ?? 'column'}`);
    if (rule.gap) s.push(`--lay-gap:${tokenVar(rule.gap)}`);
  }
  // a container places its children; a leaf's rule places the leaf's own box and text
  if (container || !rule.kind) s.push(...axisCss(rule));
  // wrapping and sideways scrolling apply to a leaf kind that draws its own row — a stat strip —
  // as much as to a container: page.js passes them down to the kind's inner row
  if (rule.wrap) s.push('flex-wrap:wrap');
  if (rule.scroll === 'horizontal') s.push('overflow-x:auto', 'flex-wrap:nowrap');
  // a list that is longer than the frame scrolls inside it — a kiosk menu board — and whatever
  // grows toward it may shrink, so the bar below stays on the screen
  if (rule.scroll === 'vertical') s.push('overflow-y:auto', 'min-height:0');
  // one token for every side, or [vertical, horizontal] as Figma's two padding fields
  if (rule.padding) s.push(`padding:${[].concat(rule.padding).map((x) => (String(x) === '0' ? '0' : tokenVar(x))).join(' ')}`);
  if (rule.grow) s.push('flex:1 1 auto', 'min-height:0');
  if (rule.size) s.push(`width:var(--size-${rule.size})`);
  return s.filter(Boolean).join(';');
}

// Meta information stays off the picture: a dot per fact, the fact itself in the title and
// in the drawer. Grey = a condition, yellow = an undecided value somewhere in the element.
function dots(el) {
  const out = [];
  if (el.show_when) out.push(`<i class="dot cond" title="shown when: ${h(el.show_when)}"></i>`);
  if (el.disabled_when) out.push(`<i class="dot cond" title="disabled when: ${h(el.disabled_when)}"></i>`);
  if (el.reveals) out.push(`<i class="dot cond" title="reveals: ${h(Object.keys(el.reveals).join(', '))}"></i>`);
  if (JSON.stringify(Object.fromEntries(Object.entries(el).filter(([k]) => k !== 'children'))).includes('"$tbd"')) out.push(`<i class="dot tbd" title="an undecided value ($tbd)"></i>`);
  return out.length ? `<span class="dots">${out.join('')}</span>` : '';
}

function makeRenderer(screen, layout, maps, adapter = null, components = {}) {
  const lines = new Map();
  for (const { el, path } of walkElements(screen.doc.elements ?? [], ['elements'])) lines.set(el.id, { path: path.join('.'), line: screen.lineOf(path) });

  const r = {
    element(el, path = null) {
      // an expanded compound (src/expand.js) draws as a container of the tree its contract declared;
      // its children point the inspector at the component file, not the screen
      const contract = components[el.kind];
      // the contract is the one truth about a kind: its defaults fill what the element left out
      // and an enum value it does not declare falls back to the declared default, for the bundled
      // set and a library adapter alike — nothing draws from a default of its own
      // a compound's wrapper takes its defaults too, so a variant on it (selected: false) is an attribute
      const drawn = contract ? withContract(contract, el) : el;
      const byAdapter = !el.$expanded && !!adapter?.kinds?.[el.kind];
      const fn = el.$expanded ? kinds.group : (adapter?.kinds?.[el.kind] ?? kinds[el.kind] ?? kinds.generic);
      const known = lines.get(el.id) ?? (el.$from ? { path: `${el.$from.file} › ${el.$from.path}`, line: null } : undefined);
      const style = layoutStyle(layout[el.id], { container: !!el.children?.length });
      // the panel's layout editor reads the rule; a compound's parts are arranged by its contract, not the screen
      const layoutAttr = el.$from || String(el.id).includes('/') ? ' data-layout-owner="component"' : ` data-layout="${h(JSON.stringify(layout[el.id] ?? {}))}"`;
      const propsJson = h(JSON.stringify(Object.fromEntries(Object.entries(el).filter(([k]) => k !== 'children' && !k.startsWith('$')))));
      const cls = ['el', `el-${el.kind}`, kinds[el.kind] || el.$expanded ? '' : 'el-unknown', el.disabled_when ? 'is-disabled' : ''].filter(Boolean).join(' ');
      // `repeat: N` (what an import writes for a run of identical instances) draws the element N times in a row.
      const once = fn(drawn, r);
      const inner = el.repeat > 1 ? `<div class="repeat">${Array.from({ length: Math.min(Number(el.repeat), 200) }, () => `<div class="rep">${once}</div>`).join('')}</div>` : once;
      // each enum prop the contract declares becomes data-<prop>, which is what a variant's css binds to
      const code = contract && !el.$expanded ? codeOf(contract, el) : null;
      const attrs = Object.entries(enumAttrs(contract, drawn)).map(([k, val]) => ` data-${attrName(k)}="${h(val)}"`).join('') + (byAdapter ? ` data-drawn="${h(adapter.name)}"` : '') + (code ? ` data-code="${h(code.snippet)}"` : '');
      return `<div class="${cls}" data-id="${h(el.id)}" data-kind="${h(el.kind)}" data-path="${h(known?.path ?? path ?? '')}" data-line="${known?.line ?? ''}" data-maps="${h(maps[el.kind] ?? '')}" data-props="${propsJson}"${layoutAttr}${attrs}${style ? ` style="${style}"` : ''}>${dots(el)}${inner}</div>`;
    },
    children(el) {
      return (el.children ?? []).map((c) => r.element(c)).join('');
    },
  };
  return r;
}

// One drawn view of a screen: a stage (what the page gives it) holding a frame at the
// reference width; the page scales the frame to fit.
// Which platform a screen is drawn as: the screen's own `platform`, else the project default.
const DEFAULT_PLATFORMS = {
  web: { width: 1280, frame: 'none' },
  ios: { width: 390, height: 844, frame: 'phone' },
  android: { width: 412, height: 915, frame: 'phone' },
  tablet: { width: 1024, height: 768, frame: 'tablet' },
};
export function platformOf(project, screen) {
  const table = { ...DEFAULT_PLATFORMS, ...(project.conventions.platforms ?? {}) };
  const name = screen.doc.platform ?? table.default ?? 'web';
  const spec = table[name] ?? DEFAULT_PLATFORMS.web;
  return { name, width: spec.width ?? 1280, height: spec.height ?? null, frame: spec.frame ?? 'none' };
}

function renderView(project, screen, merged, maps, adapter = null, { width = null } = {}) {
  const view = expandComponents(merged, project.components ?? {});
  const r = makeRenderer(screen, view.layout, maps, adapter, project.components ?? {});
  const body = view.elements.map((el) => r.element(el)).join('');
  const root = layoutStyle(view.layout.root);
  const inner = `<div class="view-root" style="${root}">${body}</div>`;
  const platform = platformOf(project, screen);
  // a modal screen, or a screen whose one element is a modal, sits on a dimmed backdrop; when
  // the element is the box, the view root draws none of its own
  const only = screen.doc.type !== 'modal' && view.elements.length === 1 && view.elements[0].kind === 'modal' ? view.elements[0] : null;
  const content = screen.doc.type === 'modal' || only ? `<div class="backdrop${only ? ' by-element' : ''}"><div class="modal-box size-${h(only?.size ?? 'md')}">${inner}</div></div>` : inner;
  const device = platform.frame && platform.frame !== 'none';
  const chrome = platform.frame === 'phone' ? { top: `<div class="status-bar"><span>9:41</span><span class="notch"></span><span>●●●</span></div>`, bottom: `<div class="home-indicator"><span></span></div>` } : { top: '', bottom: '' };
  // a breakpoint draws the same screen narrower: the width is the breakpoint's, the frame the platform's
  const style = `--ref-w:${width ?? platform.width}px${platform.height ? `;--ref-h:${platform.height}px` : ''}`;
  return `<div class="stage${device ? ' stage-device' : ''}"><div class="frame device-${h(platform.frame === 'none' ? 'web' : platform.frame)}" style="${style}">${chrome.top}${content}${chrome.bottom}</div></div>`;
}

function mapsFor(project) {
  const out = {};
  for (const [kind, def] of Object.entries(project.components ?? project.conventions.kinds ?? {})) {
    const m = def?.maps_to;
    if (m && typeof m === 'object') out[kind] = Object.entries(m).filter(([ds, name]) => ds !== 'figma' && (typeof name === 'string' || Array.isArray(name))).map(([ds, name]) => `${ds}/${[].concat(name).join('|')}`).join(', ');
  }
  return out;
}

function stateOrder(project, screen) {
  const known = project.conventions.states?.known ?? [];
  const present = Object.keys(screen.doc.states ?? {});
  return ['Default', ...known.filter((s) => s !== 'Default' && present.includes(s)), ...present.filter((s) => !known.includes(s))];
}

function flowLink(project, screen, flow) {
  const target = resolveFlowTarget(flow.to, project.screens);
  if (!target) return `<span class="dead">${h(flow.to)}</span>`;
  const same = target.screen === screen.doc.screen;
  const href = `${same ? '' : `${target.screen}.html`}${target.state ? `#state-${target.state}` : ''}` || `${target.screen}.html`;
  return `<a href="${h(href)}"><u>${h(flow.to)}</u></a>`;
}

// The sidebar every page shares: sections → screens, each with what a reviewer wants to
// know before opening it — blocking findings, undecided values, open comments.
// ---------------------------------------------------------------------------------------------
// The navigation, defined once and worn by every page (DESIGN.md §6.8):
//
//   left   content — the project; proposals waiting, then the design system (tokens · components ·
//          assets) since the screens are built from them; then a search box and the domain tree (domain › section
//          › screen › state; the current domain open, the others folded). Never modes.
//   top    [where you are] [the modes: canvas · prototype] [this page's tools · theme]
//          in that order on every page; a mode that does not apply is simply not lit.
//   right  the inspect panel, always there — an empty state until something is selected.
//
// A page differs from another only in its title, its tools and its content. Nothing else moves.

// The domain a screen sits in, by its section name.
function placeOf(project, screenName, state = null) {
  const s = project.screens.find((x) => x.doc.screen === screenName);
  const spec = s ? canvasPages(project).find((p) => p.sections.some((sec) => sec.name === s.doc.section)) : null;
  return { domain: spec?.slug ?? null, screen: screenName ?? null, state };
}

// where a pending proposal is looked at in the live viewer: the canvas of the domain its screen is in
function proposalHref(project, p) {
  const pages = canvasPages(project);
  const slug = (p.screen && placeOf(project, p.screen).domain) || pages[0]?.slug;
  return slug ? `canvas-${h(slug)}.html?proposal=${h(p.id)}` : `proposal-${h(p.id)}.html`;
}

function navSidebar(project, D, place = {}, { findings = null, comments = [], proposals = [] } = {}) {
  const found = findings ?? lint(project, { branch: null });
  const pillsOf = (screen) => {
    const s = project.screens.find((x) => x.doc.screen === screen);
    const mine = found.filter((f) => f.file === s?.file);
    const block = mine.filter((f) => f.severity === 'blocking').length;
    const tbd = mine.filter((f) => f.id === 'L08').length;
    const open = comments.filter((c) => c.screen === screen).length;
    const st = s?.doc.status;
    return [st === 'ready' || st === 'done' ? `<span class="pill ok">${st}</span>` : '', block ? `<span class="pill block">${block}</span>` : '', tbd ? `<span class="pill tbd">${tbd}</span>` : '', open ? `<span class="pill cm">${open}</span>` : ''].join('');
  };
  // one domain is no level of its own: its sections stand at the top of the tree
  const pages = canvasPages(project);
  const solo = pages.length === 1;
  const tree = pages
    .map((p) => {
      const cur = p.slug === place.domain;
      const n = p.sections.reduce((k, s) => k + s.screens.length, 0);
      const body = p.sections
        .map(
          (sec) =>
            `<div class="tree-sec">${h(sec.name)}</div>` +
            sec.screens
              .map((s) => {
                const curScreen = cur && place.screen === s.screen;
                const states = s.states
                  .map(
                    (st) =>
                      `<a class="tree-frame${curScreen && place.state === st ? ' current' : ''}" data-screen="${h(s.screen)}" data-state="${h(st)}" href="canvas-${h(p.slug)}.html#${h(s.screen)}.${h(st)}">${h(st)}</a><div class="tree-layers" data-screen="${h(s.screen)}" data-state="${h(st)}"></div>`,
                  )
                  .join('');
                return `<div class="tree-screen${curScreen ? ' open current' : ''}" data-screen="${h(s.screen)}"><div class="tree-screen-head"><span class="caret"></span><a class="name" href="canvas-${h(p.slug)}.html#${h(s.screen)}">${h(s.screen)}</a><span class="hint">${h(s.type ?? '')}</span>${pillsOf(s.screen)}</div><div class="tree-states">${states}</div></div>`;
              })
              .join(''),
        )
        .join('');
      return `<div class="tree-domain${solo ? ' solo open' : ''}${cur ? ' open current' : ''}" data-domain="${h(p.slug)}"><div class="tree-domain-head"><span class="caret"></span><a class="name" href="canvas-${h(p.slug)}.html">${h(p.domain)}</a><span class="hint">${n}</span></div><div class="tree-body">${body}</div></div>`;
    })
    .join('');
  const nComponents = Object.keys(project.components ?? {}).length;
  // what waits on a person and the design system — tokens, components, assets — sit above the tree:
  // the screens are built from them
  const nTokens = tokenNames(mergeTokens(DEFAULT_TOKENS, project.tokens)).length;
  const nAssets = (project.assets ?? []).length;
  // the sections of the page you are on, one level under its entry
  const subs = (list) => (list ?? []).map((x) => `<a class="side-link subsub" href="${h(x.href)}"><span class="name">${h(x.label)}</span>${x.n !== undefined ? `<span class="hint">${x.n}</span>` : ''}</a>`).join('');
  const link = (page, href, label, hint) => `<a class="side-link${page === 'index' ? '' : ' sub'}${place.page === page ? ' current' : ''}" href="${href}"><span class="name">${label}</span>${hint}</a>`;
  // what waits on a person: every pending proposal, on every page, while there is one
  const pending = proposals.length ? proposals : project.pending ?? [];
  const waiting = pending.length
    ? `<div class="tree-sec">${D.waitingForPerson} <span class="pill cm">${pending.length}</span></div>` +
      pending.map((p) => `<a class="side-link sub${place.proposal === p.id ? ' current' : ''}" href="${project.live ? proposalHref(project, p) : `proposal-${h(p.id)}.html`}"><span class="name">${h(p.screen ?? p.label ?? p.id)}</span><span class="hint">${h(p.id)}</span></a>`).join('')
    : '';
  const base = `<div class="base">${waiting}<div class="tree-sec">${D.designSystem}</div>${link('foundations', 'foundations.html', D.foundations, `<span class="hint">${nTokens}</span>`)}${place.page === 'foundations' || place.page === 'tokens' ? subs(place.sub) : ''}${link('patterns', 'patterns.html', D.patterns, `<span class="hint">${Object.keys(project.patterns ?? {}).length}</span>`)}${place.page === 'patterns' ? subs(place.sub) : ''}${link('components', 'components.html', D.library, `<span class="hint">${nComponents}</span>`)}${place.page === 'components' ? subs(place.sub) : ''}${link('assets', 'assets.html', D.assets, `<span class="hint">${nAssets}</span>`)}</div>`;
  return `<nav class="side"><div class="brand">${h(basenameOf(project.dir ?? 'design'))} <span class="hint">${project.screens.length} ${D.screens}</span></div>${base}<input class="tree-search" id="tree-search" type="search" placeholder="${h(D.searchTree)}"><div class="tree">${tree}</div></nav>`;
}

function topBar(project, D, { title, meta = '', mode = null, place = {}, tools = '' }) {
  const screenRef = place.screen ? place.screen + (place.state && place.state !== 'Default' ? `.${place.state}` : '') : null;
  // three fixed slots, not a flex row: the modes sit at the same x on every page whatever the
  // title or the tools beside them; a long meta truncates (its full text on hover)
  return `<header class="top"><div class="where" title="${h(String(meta).replace(/<[^>]+>/g, ''))}"><button class="btn side-toggle" id="side-toggle" type="button" aria-label="${h(D.menuLabel)}">☰</button><h1>${title}</h1><span class="meta">${meta}</span></div>${viewTabs(project, mode, D, { domain: place.domain ?? null, screen: screenRef })}<div class="tools"><button class="btn panel-toggle" id="panel-toggle" type="button">${D.panelLabel}</button>${tools}${modeControls(project)}</div></header>`;
}

// "Apply comments" at the foot of the right panel, on every page of the live viewer — beside where
// comments are written. The viewer cannot call an agent, so the button writes a request
// (src/requests.js) that the watching agent takes; while it is open the button is off and says the
// agent is at it, and when the agent closes it the button says the proposals are in (DESIGN.md §7.5).
// It is the viewer's own primary button, as "Leave comment" is, only full width.
// what a proposal changes, one line per change: a mark, the area, what, and how (src/render/changes.js)
function changeList(rows, lang) {
  if (!rows.length) return '';
  return `<ul class="changes">${rows.map((r) => `<li class="ch-${r.op}"${r.id ? ` data-el="${h(r.id)}"` : ''}><span class="ch-op">${OP_MARK[r.op]} ${h(opWord(r.op, lang))}</span><span class="ch-area">${h(r.area)}</span><span class="ch-what">${r.subject}${r.detail ? ` <span class="ch-how">— ${r.detail}</span>` : ''}</span></li>`).join('')}</ul>`;
}

// A pending proposal's decision at the foot of the right panel — the panel's place for what the page
// asks of the person, in the panel's own buttons (the page script posts it, INSPECTOR_JS)
function decisionFoot(D, id) {
  return `<div class="drawer-foot"><div class="hint">${D.decideHint}</div><div class="foot-row"><button class="btn btn-danger" id="reject" type="button" data-id="${h(id)}">${D.reject}</button><button class="btn btn-primary" id="approve" type="button" data-id="${h(id)}">${D.apply}</button></div><div class="hint" id="verdict"></div></div>`;
}

function askFoot(project, D) {
  if (!project.live) return '';
  const n = project.live.openComments ?? 0;
  const open = (project.live.requests ?? []).find((r) => r.kind === 'apply-comments' && r.status === 'open');
  return `<div class="drawer-foot"><div class="hint" id="ask-count">${n ? `${D.openCommentsN.replace('{n}', n)}` : D.askNone}</div><button class="btn btn-primary" id="ask-comments" type="button"${open || !n ? ' disabled' : ''} data-request="${open ? h(open.id) : ''}">${h(open ? D.askWaiting : D.askComments)}</button><script>(function () {
  var b = document.getElementById('ask-comments'); if (!b) return;
  var T = ${JSON.stringify({ waiting: D.askWaiting, done: D.askDone })};
  function wait(id) {
    b.disabled = true; b.textContent = T.waiting;
    var t = setInterval(function () {
      fetch('/api/requests?status=all').then(function (r) { return r.json(); }).then(function (j) {
        var r = (j.requests || []).filter(function (x) { return x.id === id; })[0];
        if (!r || r.status === 'open') return;
        clearInterval(t); b.disabled = false; b.textContent = T.done;
        b.onclick = function () { location.reload(); };
      }).catch(function () {});
    }, 4000);
  }
  if (b.getAttribute('data-request')) wait(b.getAttribute('data-request'));
  b.addEventListener('click', function () {
    if (b.onclick) return;
    fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'apply-comments' }) })
      .then(function (r) { return r.json(); }).then(function (r) { wait(r.id); });
  });
})();</script></div>`;
}

function shellOf(project, D, { title, meta = '', mode = null, place = {}, tools = '', content, mainClass = '', panel = null, findings = null, comments = [], proposals = [], foot = null }) {
  // the zoom keys exist only on the canvas; the other pages keep the same empty panel without the hint.
  // The prototype selects nothing — its panel says so and lists the flows instead (PROTO_JS)
  const empty = mode === 'proto' ? `<div class="hint">${D.protoHelp}</div>` : `<div class="hint">${D.clickToInspect}</div>${mode === 'canvas' ? `<p class="hint">${D.shortcutsHint}</p>` : ''}<div id="general"></div>`;
  return `<div class="shell workspace">
${navSidebar(project, D, place, { findings, comments, proposals })}
<main class="main${mainClass ? ` ${mainClass}` : ''}">
${topBar(project, D, { title, meta, mode, place, tools })}
${content}
</main>
<aside id="inspector" class="drawer">${panel ?? empty}</aside>
${foot ?? askFoot(project, D)}
</div>`;
}

// Modes. Every modifier axis of the project's token resolver (theme: light | dark …) becomes
// a data attribute on <html> and a select in the header: `data-theme="dark"` swaps the custom
// properties for that context's set. The bundled kinds and the page chrome follow at once; a
// component library's own pieces keep the default context, since their theme was baked in
// server-side. No resolver, no controls.
const attrName = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

// The project's tokens reach only what the project draws — a screen frame, a canvas frame, a
// prototype view, a library sample — never the viewer's own chrome. The chrome runs on the
// bundled defaults (`:root`), so a kiosk with a 20px body and 56px controls does not blow the
// sidebar and the tabs up with it (found the first time a project had a type scale of its own).
export const PRODUCT_ROOTS = '.frame, .cv-frame, .proto-view, .lib-pic, .lib-variant, .board';
const productCss = (tokens) => tokensToCss(tokens).replace(/^:root/, PRODUCT_ROOTS);

function modeCss(project) {
  const contexts = project.tokenSet?.contexts ?? {};
  return Object.entries(contexts)
    .flatMap(([axis, byCtx]) => Object.entries(byCtx).map(([ctx, t]) => tokensToCss(mergeTokens(DEFAULT_TOKENS, t)).replace(/^:root/, `:root[data-${attrName(axis)}="${h(ctx)}"] :is(${PRODUCT_ROOTS})`)))
    .join('\n');
}

function modeControls(project) {
  const contexts = project.tokenSet?.contexts ?? {};
  const defaults = project.tokenSet?.defaults ?? {};
  return Object.entries(contexts)
    .map(([axis, byCtx]) => `<label class="toggle">${h(axis)} <select data-mode="${attrName(axis)}">${Object.keys(byCtx).map((c) => `<option value="${h(c)}"${c === defaults[axis] ? ' selected' : ''}>${h(c)}</option>`).join('')}</select></label>`)
    .join('');
}

// Component bindings. A contract's `tokens:` become custom properties scoped to the element's
// wrapper — `--k-button-bg: var(--color-primary)` — and a variant's overrides sit on the
// wrapper's data attribute for that prop. Namespaced by kind, so a card's padding never leaks
// into the button inside it; written as var(--token), so a theme switch flows through.
// The element with its contract applied: a default for every prop it left out, and an enum
// value the contract does not list replaced by the declared default (lint L22 reports it; the
// picture must still be the contract's). A `$tbd` value is left as it is.
const contractDefaults = new WeakMap();
function withContract(contract, el) {
  let defaults = contractDefaults.get(contract);
  if (!defaults) {
    defaults = Object.fromEntries(Object.entries(contract.props ?? {}).filter(([, d]) => d && d.default !== undefined).map(([k, d]) => [k, d.default]));
    contractDefaults.set(contract, defaults);
  }
  const out = { ...defaults, ...el };
  for (const [name, def] of Object.entries(contract.props ?? {})) {
    if (def?.type !== 'enum' || !Array.isArray(def.options)) continue;
    const v = out[name];
    if (typeof v === 'string' && !def.options.includes(v)) out[name] = def.default ?? def.options[0];
  }
  return out;
}

// what a contract's token slots mean in CSS, for a piece a library adapter drew: the bundled
// set reads --k-<kind>-<slot> itself; an antd or MUI root gets these applied from outside

// The kind of a child a compound contract declares, by its id, at any depth.
export function childKindOf(contract, id) {
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (n && n.id === id && n.kind) return n.kind;
      const deep = walk(n?.children);
      if (deep) return deep;
    }
    return null;
  };
  return walk(contract.elements);
}

// Fonts the project ships: files under assets/fonts/ named <Family>-<Weight>[Italic].<ext>
// become @font-face rules (Pretendard-Bold.woff2 → family Pretendard, weight 700); a stylesheet
// URL in conventions.render.fonts (a webfont CDN) becomes a link. Nothing else loads a font.
const WEIGHTS = { thin: 100, extralight: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
export function fontFaces(project) {
  const fmt = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
  return (project.assets ?? [])
    .filter((a) => /^assets\/fonts\/[^/]+\.(woff2?|ttf|otf)$/i.test(a.path))
    .map((a) => {
      const base = a.path.split('/').pop().replace(/\.[^.]+$/, '');
      const m = /^(.+?)-([A-Za-z]+?)(Italic)?$/.exec(base);
      const family = m && (WEIGHTS[m[2].toLowerCase()] || m[3]) ? m[1] : base;
      const weight = m ? WEIGHTS[m[2].toLowerCase()] ?? 400 : 400;
      const ext = a.path.split('.').pop().toLowerCase();
      return `@font-face { font-family: "${family}"; src: url("${a.path}") format("${fmt[ext]}"); font-weight: ${weight}; font-style: ${m?.[3] ? 'italic' : 'normal'}; font-display: swap; }`;
    })
    .join('\n');
}
export const fontLinks = (project) =>
  [].concat(project.conventions?.render?.fonts ?? []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).map((u) => `<link rel="stylesheet" href="${h(u)}">`).join('');

function componentCss(project) {
  const rules = [fontFaces(project)];
  const all = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const has = (name) => getToken(all, name) !== undefined;
  for (const c of Object.values(project.components ?? {})) {
    const compound = Array.isArray(c.elements) && c.elements.length > 0;
    const kind = attrName(c.kind);
    // a binding is `slot: token` on the kind itself, or `child.slot: token` — a part of a compound,
    // re-bound from outside (a tile's label turns white when the tile is selected): the child's own
    // variable, set on that child with more weight than the child's contract gives it
    const split = (b) => {
      const own = [], parts = [];
      // `font:` and `surface:` bind a whole style — they stand for the plain slots it defines
      for (const [key, token] of Object.entries(b ?? {})) {
        const dot = key.indexOf('.');
        if (dot < 0) own.push(...expandBinding(key, token, has));
        else for (const [slot, t] of expandBinding(key.slice(dot + 1), token, has)) parts.push([key.slice(0, dot), slot, t]);
      }
      return { own, parts };
    };
    const decl = (own) => own.map(([slot, token]) => `--k-${kind}-${attrName(slot)}: ${tokenVar(token)}`).join('; ');
    const partRules = (selector, parts) =>
      parts.map(([child, slot, token]) => {
        const ck = childKindOf(c, child);
        return ck ? `${selector} [data-id$="/${attrName(child)}"] { --k-${attrName(ck)}-${attrName(slot)}: ${tokenVar(token)}; }` : '';
      }).filter(Boolean);
    const base = split(c.tokens);
    if (base.own.length) rules.push(`.el-${kind} { ${decl(base.own)}; }`);
    rules.push(...partRules(`.el-${kind}`, base.parts));
    for (const [prop, options] of Object.entries(c.variants ?? {}))
      for (const [opt, b] of Object.entries(options ?? {})) {
        const v = split(b);
        const selector = `.el-${kind}[data-${attrName(prop)}="${h(opt)}"]`;
        if (v.own.length) rules.push(`${selector} { ${decl(v.own)}; }`);
        rules.push(...partRules(selector, v.parts));
      }
    // a compound is drawn as the tree it declares, its wrapper a plain box: the bindings dress the box
    if (compound) {
      const bound = [...new Set([...base.own, ...Object.values(c.variants ?? {}).flatMap((o) => Object.values(o ?? {}).flatMap((b) => split(b).own))].map(([s]) => s))].filter((s) => SLOT_CSS[s]);
      if (bound.length) rules.push(`.el-${kind} { ${bound.map((s) => (s === 'border' ? `border: 1px solid var(--k-${kind}-border)` : `${SLOT_CSS[s]}: var(--k-${kind}-${attrName(s)})`)).join('; ')}; }`);
    }
    // the same bindings reach a piece an adapter drew, so the contract themes antd and MUI too
    const slots = [...new Set([...split(c.tokens).own, ...Object.values(c.variants ?? {}).flatMap((o) => Object.values(o ?? {}).flatMap((b) => split(b).own))].map(([s]) => s))].filter((s) => SLOT_CSS[s]);
    if (slots.length) rules.push(`.el-${attrName(c.kind)}[data-drawn] > * { ${slots.map((s) => `${SLOT_CSS[s]}: var(--k-${attrName(c.kind)}-${attrName(s)})`).join('; ')}; }`);
    // type reaches a bundled piece by inheritance from its wrapper (the set draws with `font: inherit`);
    // height and shadow it reads itself, kind by kind, in the bundled css
    const type = slots.filter((s) => TYPE_SLOTS.includes(s));
    if (type.length) rules.push(`.el-${attrName(c.kind)}:not([data-drawn]) { ${type.map((s) => `${SLOT_CSS[s]}: var(--k-${attrName(c.kind)}-${attrName(s)})`).join('; ')}; }`);
  }
  return rules.join('\n');
}

function page({ title, tokens, modeCss = '', componentCss = '', extraCss = '', fonts = '', file = '', body, api = false, screen = '', comments = [], lang = 'en' }) {
  return `<!doctype html>
<html lang="${h(lang)}"><head><meta charset="utf-8"><title>${h(title)}</title>
<style>${tokensToCss(DEFAULT_TOKENS)}\n${productCss(tokens)}\n${modeCss}\n${componentCss}\n${CSS}</style>${fonts}${extraCss}</head>
<body data-file="${h(file)}">
${body}
<script>window.DOAN_SPACE = ${JSON.stringify(Object.entries(tokens?.space ?? {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => ({ name: `space.${k}`, value: v })))}; window.DOAN_API = ${api ? 'true' : 'false'}; window.DOAN_SCREEN = ${JSON.stringify(screen)}; window.DOAN_COMMENTS = ${JSON.stringify(comments.map((c) => ({ id: c.id, screen: c.screen, element: c.element ?? null, path: c.path, state: c.state ?? null, author: c.author, text: c.text })))}; window.DOAN_I18N = ${JSON.stringify(pageStrings(lang))};</script>
<script>${INSPECTOR_JS}</script>
</body></html>`;
}

export function renderScreen(project, screen, { branch = null, adapter = null, api = false, comments = [] } = {}) {
  const doc = screen.doc;
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const maps = mapsFor(project);
  const findings = lint(project, { branch });

  const order = stateOrder(project, screen);
  const stateTabs = order.map((state, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-state="${h(state)}" data-target="state-${h(state)}">${h(state)}${state !== 'Default' ? `<span class="n">${(doc.states?.[state] ?? []).length}</span>` : ''}</button>`).join('');
  const variantTabs = Object.entries(doc.variants ?? {})
    .map(([axis, options]) => `<span class="axis">${h(axis)}</span>${Object.keys(options ?? {}).map((opt) => `<button class="tab" data-state="${h(axis)}=${h(opt)}" data-target="variant-${h(axis)}-${h(opt)}">${h(opt)}</button>`).join('')}`)
    .join('');
  const statePanels = order
    .map((state, i) => `<section class="state${i === 0 ? ' active' : ''}" id="state-${h(state)}"><h3>${h(state)}</h3>${renderView(project, screen, mergeState(doc, state), maps, adapter)}</section>`)
    .join('');
  const variantPanels = Object.entries(doc.variants ?? {})
    .map(([axis, options]) => Object.keys(options ?? {}).map((opt) => `<section class="state" id="variant-${h(axis)}-${h(opt)}"><h3>${h(axis)} · ${h(opt)}</h3>${renderView(project, screen, mergeState(doc, 'Default', { [axis]: opt }), maps, adapter)}</section>`).join(''))
    .join('');

  // a screen with a breakpoints block is drawn once per named width, its patches for that
  // name applied over Default — the frame per breakpoint a Figma file kept by hand
  const bpTable = doc.breakpoints ? project.conventions.breakpoints ?? {} : {};
  const bpNames = Object.keys(bpTable);
  const bpTabs = bpNames.map((bp) => `<button class="tab" data-state="bp=${h(bp)}" data-target="bp-${h(bp)}">${h(bp)} <span class="n">${bpTable[bp]}</span></button>`).join('');
  const bpPanels = bpNames
    .map((bp) => `<section class="state" id="bp-${h(bp)}"><h3>${h(bp)} · ${bpTable[bp]}px</h3>${renderView(project, screen, mergeState(doc, 'Default', {}, bp), maps, adapter, { width: bpTable[bp] })}</section>`)
    .join('');

  const flows = (doc.flows ?? [])
    .map((f) => `<li><code>${h(f.from)}${f.via ? `.${h(f.via)}` : ''}</code>${f.gesture ? ` <span class="gesture gesture-${h(f.gesture)}">${h(f.gesture)}</span>` : ''} → ${flowLink(project, screen, f)}${f.nav ? ` <span class="navkind nav-${h(f.nav)}">${h(f.nav)}</span>` : ''}${f.when ? ` <span class="hint">when ${v(f.when)}</span>` : ''}${f.style === 'conditional' ? ' <span class="hint">(conditional)</span>' : ''}</li>`)
    .join('');
  const notes = (doc.notes ?? []).map((n) => `<li>${v(n)}</li>`).join('');
  const refs = Object.entries(doc.refs ?? {}).map(([k, u]) => `<span><span class="hint">${h(k)}</span> <code>${h(u)}</code></span>`).join(' · ');
  const commentList = comments.map((c) => `<li data-comment="${h(c.id)}"><b>${h(c.author)}</b> on <code>${h(c.path)}</code>: ${h(c.text)}</li>`).join('');

  const body = shellOf(project, D, {
    title: h(doc.screen),
    meta: `${h(doc.section)} · ${h(doc.type)} · ${h(platformOf(project, screen).name)}${adapter ? ` · ${h(adapter.name)} ${D.components}` : ''}${branch ? ` · ${h(branch)}` : ''}`,
    place: placeOf(project, doc.screen, 'Default'),
    tools: `<a class="btn" href="spec-${h(doc.screen)}.html">${D.specFor}</a><label class="toggle"><input type="checkbox" id="compare"> ${D.compare}</label><label class="toggle"><input type="checkbox" id="dev"> ${D.paths}</label>`,
    findings,
    comments: api ? comments : [],
    content: `<div class="tabs-row">${stateTabs}${variantTabs ? `<span class="axis" style="margin-left:var(--space-md)">${D.variants}</span>${variantTabs}` : ''}${bpTabs ? `<span class="axis" style="margin-left:var(--space-md)">${D.breakpointsLabel}</span>${bpTabs}` : ''}</div>
<div class="states">${statePanels}${variantPanels}${bpPanels}</div>
<div class="section-title">${D.flows}</div><ul class="list">${flows || `<li class="hint">${D.none}</li>`}</ul>
<div class="section-title">${D.notes}</div><ul class="list">${notes || `<li class="hint">${D.none}</li>`}</ul>
<div class="section-title">${D.comments} <span class="hint">${comments.length} ${D.open}</span></div><ul class="list" id="comments">${commentList || `<li class="hint">${D.none}</li>`}</ul>
${refs ? `<div class="section-title">${D.references}</div><div class="hint" style="font-size:12px">${refs}</div>` : ''}`,
  });
  return page({ title: doc.screen, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss: adapter?.styles ? adapter.styles() : '', file: screen.file, body, api, screen: doc.screen, comments, lang });
}

export async function renderIndex(project) {
  const [first] = canvasPages(project);
  const to = first ? `canvas-${first.slug}.html` : 'foundations.html';
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${h(to)}"><script>location.replace(${JSON.stringify(to)} + location.hash)</script><a href="${h(to)}">${h(to)}</a>`;
}

// A pending proposal drawn as a decision page: what was agreed, what changes, and every
// state AS-IS beside TO-BE. This is the sketch step of DESIGN.md §7 — nothing is written
// until a person has seen the screen it would produce.
// The library: every contract in the registry, drawn from its own sample — one picture, and
// one more per option of every prop that carries variant bindings — with its props, slots and
// bindings beside it. What a Figma library page was: the design system, seen whole.
// the category a bundled kind sits in on the components page; a contract may say its own
const KIND_CATEGORY = {
  button: 'action', 'button-group': 'action', fab: 'action', chip: 'action',
  input: 'input', textarea: 'input', select: 'input', number: 'input', date: 'input', 'date-range': 'input', checkbox: 'input', radio: 'input', switch: 'input', segment: 'input', segmented: 'input', stepper: 'input', field: 'input', fieldset: 'input', 'filter-form': 'input', 'filter-bar': 'input', 'search-bar': 'input', upload: 'input',
  caption: 'display', hint: 'display', image: 'display', tag: 'display', table: 'display', 'kv-table': 'display', 'list-cell': 'display', 'stat-strip': 'display', 'tile-grid': 'display', divider: 'display', placeholder: 'display', 'sortable-list': 'display', tile: 'display', progress: 'display',
  card: 'container', section: 'container', group: 'container', modal: 'container', 'bottom-sheet': 'container', 'detail-card': 'container', 'sheet-handle': 'container', overlay: 'container',
  'page-header': 'nav', 'app-bar': 'nav', 'tab-bar': 'nav', tabs: 'nav', nav: 'nav', pagination: 'nav',
  'empty-notice': 'feedback', 'error-notice': 'feedback', skeleton: 'feedback', toast: 'feedback', snackbar: 'feedback', tooltip: 'feedback', confirm: 'feedback', 'pull-to-refresh': 'feedback',
};
// every kind the screens name — in elements, in state and variant patches — and the parts of the compounds among them
function usedKinds(project) {
  const out = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      if (typeof v.kind === 'string') out.add(v.kind);
      Object.values(v).forEach(walk);
    }
  };
  for (const s of project.screens) walk(s.doc);
  for (const k of [...out]) walk(project.components?.[k]?.elements);
  return out;
}
// a link to #k-<kind> inside a folded group opens the group first
const OPEN_TARGET_SCRIPT = `<script>(function(){function go(){var id=decodeURIComponent(location.hash.slice(1));if(!id)return;var t=document.getElementById(id);if(!t)return;var d=t.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details');}t.scrollIntoView();}window.addEventListener('hashchange',go);go();})();</script>`;

export function renderLibrary(project, { branch = null, adapter = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const maps = mapsFor(project);
  const registry = project.components ?? {};
  const stub = { doc: { elements: [] }, lineOf: () => null };
  const picture = (contract, el) => {
    const view = expandComponents({ elements: [el], layout: {} }, registry);
    const r = makeRenderer(stub, view.layout, maps, adapter, registry);
    return `<div class="lib-pic">${view.elements.map((x) => r.element(x)).join('')}</div>`;
  };
  const propRow = ([name, def]) => {
    const type = def?.type ?? 'any';
    const detail = type === 'enum' ? (def.options ?? []).join(' · ') : def?.default !== undefined ? `= ${v(def.default)}` : '';
    return `<tr><td><code>${h(name)}</code>${def?.required ? ` <span class="pill tbd">${D.requiredMark}</span>` : ''}</td><td class="hint">${h(type)}</td><td>${h(detail)}</td><td class="hint">${h(def?.description ?? '')}</td></tr>`;
  };
  const bindingRows = (contract) => {
    const rows = Object.entries(contract.tokens ?? {}).map(([slot, t]) => `<tr><td><code>${h(slot)}</code></td><td><code>${h(t)}</code></td></tr>`);
    for (const [prop, options] of Object.entries(contract.variants ?? {}))
      for (const [opt, b] of Object.entries(options ?? {})) for (const [slot, t] of Object.entries(b ?? {})) rows.push(`<tr><td><code>${h(slot)}</code> <span class="hint">${h(prop)}=${h(opt)}</span></td><td><code>${h(t)}</code></td></tr>`);
    return rows.join('');
  };
  const section = (c) => {
      const sample = { id: `sample-${c.kind}`, kind: c.kind, ...(c.sample ?? {}) };
      const variantPics = Object.entries(c.variants ?? {})
        .flatMap(([prop, options]) => Object.keys(options ?? {}).map((opt) => `<div class="lib-variant"><div class="hint">${h(prop)} = ${h(opt)}</div>${picture(c, { ...sample, id: `${sample.id}-${prop}-${opt}`, [prop]: c.props?.[prop]?.type === 'boolean' ? opt === 'true' : opt })}</div>`))
        .join('');
      const compound = Array.isArray(c.elements) && c.elements.length;
      // as a design system's page reads: the name and what it is for, the picture, its parts, when to use it;
      // the code name a small tag, the file and the library names in the fold with the props
      const code = c.maps_to?.code && typeof c.maps_to.code === 'object' ? c.maps_to.code : null;
      const codeTag = code ? `<span class="lib-code" title="${h([code.import, code.name ?? c.kind].filter(Boolean).join(' '))}">${h(code.name ?? c.kind)}</span>` : '';
      const partIds = compound ? c.elements.flatMap(function walk(e) { return e && e.id ? [e.id, ...(e.children ?? []).flatMap(walk)] : []; }) : [];
      const parts = c.anatomy ? Object.values(c.anatomy) : [];
      const anatomy = parts.length ? `<div class="lib-anat"><span class="lib-k">${D.anatomyLabel}</span>${parts.map((p, i) => `<span class="lib-part"><i>${i + 1}</i>${h(p)}</span>`).join('')}</div>` : '';
      const usage = c.usage?.when || c.usage?.not ? `<div class="lib-usage">${c.usage.when ? `<div><span class="lib-k">${D.whenLabel}</span>${h(c.usage.when)}</div>` : ''}${c.usage.not ? `<div><span class="lib-k">${D.notLabel}</span>${h(c.usage.not)}</div>` : ''}</div>` : '';
      const where = [c.file ? `components/${h(basenameOf(c.file))}` : `<span class="bad">${D.legacyKind}</span>`, maps[c.kind] ? h(maps[c.kind]) : '', code ? h([code.import, code.name ?? c.kind].filter(Boolean).join(' ')) : '', partIds.length && !parts.length ? partIds.map((p) => `<code>${h(p)}</code>`).join(' ') : ''].filter(Boolean).join(' · ');
      const props = Object.entries(c.props ?? {});
      return `<section class="lib" id="k-${h(c.kind)}">
<div class="lib-head"><h3>${h(c.kind)}</h3>${codeTag}</div>${c.description ? `<p class="lib-desc">${h(c.description)}</p>` : ''}
<div class="lib-row">${picture(c, sample)}${variantPics ? `<div class="lib-variants">${variantPics}</div>` : ''}</div>
${anatomy}${usage}
<details class="lib-more"><summary>${D.propsAndStyle} <span class="hint">· ${where}</span></summary>
${props.length ? `<div class="section-title">${D.propsLabel}</div><table class="props">${props.map(propRow).join('')}</table>` : ''}
${c.slots?.length ? `<div class="section-title">${D.slotsLabel}</div><div class="hint">${c.slots.map((s) => `<code>${h(s)}</code>`).join(' ')}</div>` : ''}
${c.tokens || c.variants ? `<div class="section-title">${D.bindingsLabel}</div><table class="props">${bindingRows(c)}</table>` : ''}
</details>
</section>`;
  };
  // two levels, as a design system's page reads: what this project uses, then the bundled rest
  // folded; inside each, by category — a contract's own category: wins, a compound is "made of parts"
  const used = usedKinds(project);
  const catOf = (c) => c.category ?? (Array.isArray(c.elements) && c.elements.length ? 'compound' : KIND_CATEGORY[c.kind] ?? 'other');
  const CATS = ['compound', 'action', 'input', 'display', 'container', 'nav', 'feedback', 'other'];
  const catLabel = (k) => D[`cat${k[0].toUpperCase()}${k.slice(1)}`] ?? k;
  // a team's own category: gets its own heading, after the known ones
  for (const c of Object.values(registry)) if (!CATS.includes(catOf(c))) CATS.splice(CATS.length - 1, 0, catOf(c));
  const byCat = (list, prefix) =>
    CATS.map((k) => [k, list.filter((c) => catOf(c) === k)]).filter(([, l]) => l.length)
      .map(([k, l]) => `<h3 class="lib-cat" id="${prefix}-${k}">${h(catLabel(k))}<span class="n">${l.length}</span></h3>${l.sort((a, b) => a.kind.localeCompare(b.kind)).map(section).join('')}`).join('');
  const all = Object.values(registry);
  const mine = all.filter((c) => used.has(c.kind)), rest = all.filter((c) => !used.has(c.kind));
  const sections = (mine.length ? `<div class="lib-group"><h2>${D.usedHere} <span class="hint">${mine.length}</span></h2>${byCat(mine, 'used')}</div>` : '') +
    (rest.length ? `<details class="lib-group" id="unused"${mine.length ? '' : ' open'}><summary>${D.unusedBundled} <span class="hint">${rest.length}</span></summary>${byCat(rest, 'rest')}</details>` : '');
  const sub = CATS.filter((k) => mine.some((c) => catOf(c) === k)).map((k) => ({ href: `#used-${k}`, label: catLabel(k), n: mine.filter((c) => catOf(c) === k).length }));
  if (rest.length) sub.push({ href: '#unused', label: D.unusedBundled, n: rest.length });
  const body = shellOf(project, D, {
    title: D.library,
    meta: `${Object.keys(registry).length}${branch ? ` · ${h(branch)}` : ''}`,
    place: { page: 'components', sub },
    content: (sections || `<div class="hint">${D.noneOfKind}</div>`) + OPEN_TARGET_SCRIPT,
  });
  return page({ title: D.library, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss: adapter?.styles ? adapter.styles() : '', body, api, screen: '', comments: [], lang });
}
const basenameOf = (p) => String(p).split('/').pop();

// The domain canvas (src/canvas.js): the page a Figma file had per domain. Sections side by
// side, each a box; inside, one column per screen — Default on top, the other states under
// it — at real size. Zoom and pan are the page's; the arrows are drawn by the page too, from
// the frames and elements it measures, by fig's arrow rules (edge midpoint or the trigger
// element's height, right-angle elbow, a gap before the head, a corridor above for a flow that
// goes back). A flow to another domain becomes a stub with a link.
// The modes of looking at the same content — canvas · prototype — on the top bar, the way
// Figma keeps Design / Prototype / Dev Mode there. They keep their context: the canvas opens
// on this domain, the prototype on this screen. Content navigation (domains, the component
// library) is the left sidebar's, never duplicated up here.
function viewTabs(project, current, D, { domain = null, screen = null } = {}) {
  const pages = canvasPages(project);
  const spec = pages.find((p) => p.slug === domain) ?? pages[0];
  const canvas = spec ? `canvas-${spec.slug}.html${screen ? `#${screen}` : ''}` : 'index.html';
  const proto = `proto.html${screen ? `#${screen}` : spec?.sections[0]?.screens[0] ? `#${spec.sections[0].screens[0].screen}` : ''}`;
  const tab = (key, href, label) => `<a class="${current === key ? 'current' : ''}" href="${h(href)}">${label}</a>`;
  return `<nav class="views">${tab('canvas', canvas, D.viewCanvas)}${tab('proto', proto, D.proto)}</nav>`;
}

// A pending proposal seen where the screens are: the canvas drawn as the proposal would leave it
// (TO-BE) or as it is (AS-IS), the changed elements marked, and the right panel holding the
// proposal — what it says, what was agreed, what changes (a line points at its element) and the
// decision at the panel's foot. The side-by-side proposal page stays, one link away.
function proposalPanel(project, proposal, { side, lang, D, slug }) {
  const base = `canvas-${h(slug)}.html?proposal=${h(proposal.id)}`;
  const plain = (html) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  let rows = [];
  if (proposal.kind === 'files') rows = (proposal.files ?? []).map((f) => ({ op: f.creates ? 'added' : f.after === null ? 'removed' : 'changed', area: D.fileLabel, subject: `<code>${h(f.path)}</code>`, detail: '' }));
  else {
    const before = proposal.before ? parseScreenText(proposal.before, proposal.file).doc : { elements: [] };
    rows = describeChanges(before, parseScreenText(proposal.after, proposal.file).doc, lang);
  }
  // one line per change — what, and which kind of change; the rest on hover, the line takes you to its element
  const list = rows.length
    ? `<ul class="changes prop-changes">${rows.map((r) => `<li class="ch-${r.op}"${r.id ? ` data-el="${h(r.id)}"` : ''} title="${h(plain(`${r.subject} ${r.detail ? `— ${r.detail}` : ''}`).trim())}"><span class="ch-op">${OP_MARK[r.op]}</span><span class="ch-what">${r.subject}</span><span class="ch-area">${h(r.area)} ${h(opWord(r.op, lang))}</span></li>`).join('')}</ul>`
    : '';
  const decisions = (proposal.decisions ?? []).map((d) => `<li><b>${h(d.item)}</b> — ${h(d.decision)}</li>`).join('');
  return `<div class="prop-panel" data-screen="${h(proposal.screen ?? '')}"><div class="pn-head"><b>${D.pnProposal}</b><span class="hint">${h(proposal.screen ?? proposal.label ?? proposal.id)}</span><a class="close" href="canvas-${h(slug)}.html" title="${h(D.closeProposal)}">×</a></div>
<p class="prop-summary">${h(proposal.summary || D.noSummary)}</p>
<div class="prop-sides"><a class="${side === 'tobe' ? 'on' : ''}" href="${base}">TO-BE</a><a class="${side === 'asis' ? 'on' : ''}" href="${base}&amp;side=asis">AS-IS</a></div>
<section class="pn-sec"><h5>${D.pnChanges} <span class="hint">${rows.length}</span></h5>${list}</section>
${decisions ? `<section class="pn-sec"><details class="prop-decided"><summary>${D.pnDecisions} <span class="hint">${(proposal.decisions ?? []).length}</span></summary><ul class="list">${decisions}</ul></details></section>` : ''}</div>`;
}

export function changedIds(proposal, lang = 'en') {
  if (proposal.kind === 'files' || !proposal.after) return [];
  const before = proposal.before ? parseScreenText(proposal.before, proposal.file).doc : { elements: [] };
  return [...new Set(describeChanges(before, parseScreenText(proposal.after, proposal.file).doc, lang).filter((r) => r.id && r.area !== (lang === 'ko' ? '배치' : 'layout')).map((r) => r.id))];
}

export function renderCanvas(project, pageSpec, { branch = null, adapter = null, api = false, comments = [], proposalView = null } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const maps = mapsFor(project);
  const graph = flowGraph(project);
  const inDomain = pageSpec.sections.flatMap((s) => s.screens.map((x) => x.screen));
  const frame = (screen, state) => {
    const s = project.screens.find((x) => x.doc.screen === screen);
    const html = renderView(project, s, mergeState(s.doc, state), maps, adapter).replace('<div class="stage', '<div class="cv-stage');
    const platform = platformOf(project, s);
    return `<div class="cv-frame" data-screen="${h(screen)}" data-state="${h(state)}" data-type="${h(s.doc.type)}" data-platform="${h(platform.name)}" data-file="${h(project.screenName(s))}"><a class="cv-frame-title" href="${h(screen)}.html#state-${h(state)}">${h(screen)}-${h(state)}</a><div class="cv-body">${html}</div></div>`;
  };
  const sections = pageSpec.sections
    .map((sec) => `<div class="cv-section" data-section="${h(sec.name)}"><div class="cv-section-title">${h(sec.name)}</div><div class="cv-row">${sec.screens.map((s) => `<div class="cv-col" data-screen="${h(s.screen)}">${s.states.map((st) => frame(s.screen, st)).join('')}</div>`).join('')}</div></div>`)
    .join('');
  const flows = graph.edges.map((e) => ({ screen: e.screen, from: e.from, via: e.via, to: e.target, state: e.state, nav: e.nav, gesture: e.gesture, style: e.style, in: e.in, when: e.when, label: e.label, when: e.when }));
  const others = canvasPages(project).filter((p) => p.slug !== pageSpec.slug);
  const screenDomain = Object.fromEntries(others.flatMap((p) => p.sections.flatMap((s) => s.screens.map((x) => [x.screen, { domain: p.domain, slug: p.slug }]))));
  const nScreens = inDomain.length;
  const body =
    shellOf(project, D, {
      title: h(pageSpec.domain),
      meta: `${proposalView ? `${D.proposal} · ${proposalView.side === 'asis' ? 'AS-IS' : 'TO-BE'} · ` : ''}${pageSpec.sections.length} ${D.sectionsN} · ${nScreens} ${D.screens}${branch ? ` · ${h(branch)}` : ''}`,
      mode: 'canvas',
      place: { domain: pageSpec.slug, ...(proposalView ? { proposal: proposalView.proposal.id } : {}) },
      panel: proposalView ? proposalPanel(project, proposalView.proposal, { side: proposalView.side, lang, D, slug: pageSpec.slug }) : null,
      foot: proposalView ? decisionFoot(D, proposalView.proposal.id) : null,
      tools: `<button class="toggle" id="cv-out" type="button">−</button><span class="toggle zoom" id="cv-zoom">100%</span><button class="toggle" id="cv-in" type="button">+</button><button class="toggle" id="cv-fit" type="button">${D.fitLabel}</button><label class="toggle"><input type="checkbox" id="cv-show-arrows" checked> ${D.arrowsLabel}</label>`,
      mainClass: 'cv-main',
      comments: api ? comments : [],
      content: `<div class="cv-wrap" id="cv-wrap"><div class="cv-canvas" id="cv-canvas"><div class="cv-domain" id="cv-domain">${sections}</div><svg class="cv-arrows" id="cv-arrows"><defs><marker id="cv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker><marker id="cv-arrow-hot" class="hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs></svg></div></div>`,
    }) +
    `
<script>window.DOAN_FLOWS = ${JSON.stringify(flows)}; window.DOAN_CANVAS = ${JSON.stringify({ domain: pageSpec.domain, screens: inDomain })}; window.DOAN_SCREEN_DOMAIN = ${JSON.stringify(screenDomain)};</script>
<script>${CANVAS_JS}</script>${proposalView ? `<script>window.DOAN_PROPOSAL = ${JSON.stringify({ screen: proposalView.proposal.screen ?? null, changed: proposalView.changed ?? [] })};</script><script>${PROPOSAL_VIEW_JS}</script>` : ''}`;
  return page({ title: pageSpec.domain, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss: adapter?.styles ? adapter.styles() : '', body, api, screen: '', comments, lang });
}

// The click-through prototype: every screen in every state on one page, one shown at a time;
// the elements a flow leaves from are hotspots, and pressing one lands on the flow's target
// screen and state. A `modal` or `sheet` flow lays its target over the current screen;
// `dismiss` and `back` pop. Nothing is typed, nothing validates — that is `fig:proto`'s job;
// this is the product's navigation, pressed, from the files alone. Deep link: #screen.State.
export function renderProto(project, { branch = null, adapter = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const maps = mapsFor(project);
  const graph = flowGraph(project);
  const order = [...project.sections, ...project.screens.map((s) => s.doc.section).filter((x) => !project.sections.includes(x))];
  const screens = [...project.screens].sort((a, b) => order.indexOf(a.doc.section) - order.indexOf(b.doc.section) || a.doc.screen.localeCompare(b.doc.screen));
  const views = screens
    .flatMap((s) => {
      // a screen with breakpoints gets a view per breakpoint on top of its base views; the
      // prototype's breakpoint select picks among them, the base is the fallback
      const bps = s.doc.breakpoints ? Object.entries(project.conventions.breakpoints ?? {}) : [];
      return stateOrder(project, s).flatMap((state) => [
        `<section class="proto-view" data-screen="${h(s.doc.screen)}" data-state="${h(state)}" hidden>${renderView(project, s, mergeState(s.doc, state), maps, adapter)}</section>`,
        ...bps.map(([bp, width]) => `<section class="proto-view" data-screen="${h(s.doc.screen)}" data-state="${h(state)}" data-bp="${h(bp)}" hidden>${renderView(project, s, mergeState(s.doc, state, {}, bp), maps, adapter, { width })}</section>`),
      ]);
    })
    .join('');
  const flows = graph.edges.map((e) => ({ screen: e.screen, from: e.from, via: e.via, to: e.target, state: e.state, nav: e.nav, gesture: e.gesture, style: e.style, in: e.in, when: e.when, label: e.label }));
  const body =
    shellOf(project, D, {
      title: D.proto,
      meta: `${flows.length} ${D.flows.toLowerCase()}${branch ? ` · ${h(branch)}` : ''}`,
      mode: 'proto',
      tools: `${project.screens.some((s) => s.doc.breakpoints) ? `<label class="toggle" title="${D.breakpointsLabel}"><select id="proto-bp" aria-label="${D.breakpointsLabel}"><option value="">${D.baseWidth}</option>${Object.entries(project.conventions.breakpoints ?? {}).map(([bp, w]) => `<option value="${h(bp)}">${h(bp)} ${w}</option>`).join('')}</select></label>` : ''}<label class="toggle" title="${D.screen}"><select id="proto-screen" aria-label="${D.screen}">${screens.map((s) => `<option value="${h(s.doc.screen)}">${h(s.doc.screen)}</option>`).join('')}</select></label><label class="toggle" title="${D.states}"><select id="proto-state" aria-label="${D.states}"></select></label><button class="toggle" id="proto-back" type="button">‹ ${D.back}</button><label class="toggle"><input type="checkbox" id="proto-hot" checked> ${D.hotspots}</label>`,
      mainClass: 'proto-main',
      content: `<div class="proto-stage" id="proto-stage">${views || `<div class="hint">${D.none}</div>`}</div>
<div class="proto-overlay" id="proto-overlay" hidden></div>`,
    }) +
    `
<script>window.DOAN_FLOWS = ${JSON.stringify(flows)};</script>
<script>${PROTO_JS}</script>`;
  return page({ title: D.proto, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss: adapter?.styles ? adapter.styles() : '', body, api, screen: '', comments: [], lang });
}

// A proposal of files — tokens, contracts, assets: what was agreed, each file's text AS-IS beside
// TO-BE with the changed lines marked, and the style board as it is beside the board as it
// would be, each in its own frame so the two token sets never meet (DESIGN.md §7.4).
export function renderFilesProposal(project, proposal, { after = null, branch = null, adapter = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const lines = (t) => (t === null || t === undefined ? [] : String(t).split('\n'));
  const side = (mine, other) => {
    const others = new Set(other);
    return `<pre class="fdiff">${mine.map((l) => `<span class="${others.has(l) ? '' : 'chg'}">${h(l) || ' '}</span>`).join('\n')}</pre>`;
  };
  const files = proposal.files
    .map((f) => `<div class="section-title"><code>${h(f.path)}</code> ${f.creates ? `<span class="pill cm">${D.newFile}</span>` : f.after === null ? `<span class="pill bad">${D.deletedFile}</span>` : ''}</div><div class="fdiff-pair"><div><div class="hint">AS-IS</div>${side(lines(f.before), lines(f.after))}</div><div><div class="hint">TO-BE</div>${side(lines(f.after), lines(f.before))}</div></div>`)
    .join('');
  const decisions = proposal.decisions?.length ? `<div class="section-title">${D.agreedBefore}</div><table class="index"><thead><tr><th>${D.item}</th><th>${D.decision}</th><th>${D.why}</th></tr></thead><tbody>${proposal.decisions.map((d) => `<tr><td>${h(d.item)}</td><td>${h(d.decision)}</td><td>${h(d.why ?? '')}</td></tr>`).join('')}</tbody></table>` : '';
  const board = (p) => `<iframe class="board-frame" srcdoc="${h(renderFoundations(p, { adapter, bare: true }))}"></iframe>`;
  const boards = after ? `<div class="section-title">${D.foundations}</div><div class="fdiff-pair"><div><div class="hint">AS-IS</div>${board(project)}</div><div><div class="hint">TO-BE</div>${board(after)}</div></div>` : '';
  const la = proposal.lint?.after ?? {};
  const findings = (la.findings ?? []).length ? `<ul class="list">${la.findings.map((f) => `<li><span class="${f.severity === 'blocking' ? 'bad' : 'hint'}">${h(f.id)}</span> <code>${h(f.file ?? '')}</code> ${h(f.message)}</li>`).join('')}</ul>` : '';
  const pending = proposal.status === 'pending' && api;
  const content = `<p>${h(proposal.summary)}</p>${decisions}<div class="section-title">lint</div><p class="hint">${proposal.lint?.before?.blocking ?? 0} → <b class="${la.blocking ? 'bad' : ''}">${la.blocking ?? 0}</b> ${D.blocking}, ${la.warning ?? 0} ${D.warning}</p>${findings}${boards}${files}`;
  const body = shellOf(project, D, {
    title: `${h(proposal.label)} <span class="hint">${D.proposal}</span>`,
    meta: `${h(proposal.status)} · ${proposal.files.length} ${D.filesN}${branch ? ` · ${h(branch)}` : ''}`,
    place: { page: 'proposal', proposal: proposal.id },
    foot: pending ? decisionFoot(D, proposal.id) : null,
    content,
  });
  return page({ title: `${D.proposal} ${proposal.id}`, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), body, api, lang });
}

export function renderProposal(project, proposal, { branch = null, adapter = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const maps = mapsFor(project);
  // a proposal that creates the screen has no AS-IS: an empty document stands in, and the
  // AS-IS side says so instead of drawing nothing
  const creates = !!proposal.creates || !proposal.before;
  const before = creates ? { file: proposal.file, doc: { screen: proposal.screen, elements: [], layout: {}, states: {} }, lineOf: () => null, errors: [] } : parseScreenText(proposal.before, proposal.file);
  const after = parseScreenText(proposal.after, proposal.file);
  const known = project.conventions.states?.known ?? [];
  const present = [...new Set([...Object.keys(before.doc.states ?? {}), ...Object.keys(after.doc.states ?? {})])];
  const states = ['Default', ...known.filter((k) => k !== 'Default' && present.includes(k)), ...present.filter((k) => !known.includes(k))];

  const tabs = states.map((s, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-state="${h(s)}" data-target="pair-${h(s)}">${h(s)}</button>`).join('');
  const panels = states
    .map((state, i) => {
      const a = creates ? `<div class="hint">${D.newScreen}</div>` : before.doc.states?.[state] || state === 'Default' ? renderView(project, before, mergeState(before.doc, state), maps, adapter) : `<div class="hint">${D.notInAsis}</div>`;
      const b = after.doc.states?.[state] || state === 'Default' ? renderView(project, after, mergeState(after.doc, state), maps, adapter) : `<div class="hint">${D.removedInTobe}</div>`;
      return `<section class="state${i === 0 ? ' active' : ''}" id="pair-${h(state)}"><div class="states compare"><div class="state active" id="asis-${h(state)}" style="display:block"><h3 style="display:block">${D.asis}</h3>${a}</div><div class="state active" id="tobe-${h(state)}" style="display:block"><h3 style="display:block">${D.tobe}</h3>${b}</div></div></section>`;
    })
    .join('');

  const decisions = (proposal.decisions ?? []).length
    ? `<table class="index"><thead><tr><th>${D.item}</th><th>${D.decision}</th><th>${D.why}</th></tr></thead><tbody>${proposal.decisions.map((d) => `<tr><td>${h(d.item)}</td><td>${h(d.decision)}</td><td>${h(d.why ?? '')}</td></tr>`).join('')}</tbody></table>`
    : `<div class="hint">${D.noDecisions}</div>`;
  const cell = (x) => (x === undefined ? '' : `<code>${h(JSON.stringify(x))}</code>`);
  const rows = [
    ...proposal.diff.changed.map((e) => [e.path.join('.'), e.before, e.after]),
    ...proposal.diff.added.map((e) => [e.path.join('.'), undefined, e.after]),
    ...proposal.diff.removed.map((e) => [e.path.join('.'), e.before, undefined]),
  ];
  const diff = `<table class="index diff-table"><thead><tr><th>${D.where}</th><th>${D.asis}</th><th>${D.tobe}</th></tr></thead><tbody>${rows.map(([w, a, b]) => `<tr><td>${h(w)}</td><td>${cell(a)}</td><td>${cell(b)}</td></tr>`).join('')}</tbody></table>`;
  const lintLine = `lint ${proposal.lint.before.blocking}→${proposal.lint.after.blocking} ${D.blocking}, ${proposal.lint.before.warning}→${proposal.lint.after.warning} ${D.warning}`;
  const verdict =
    api && proposal.status === 'pending'
      ? ''
      : `<p class="hint">${D.toAccept}: <code>doan apply &lt;project&gt; ${h(proposal.id)} --by &lt;you&gt;</code> · ${D.toDecline}: <code>doan reject &lt;project&gt; ${h(proposal.id)} --reason "…"</code></p>`;

  const body = shellOf(project, D, {
    title: `${h(proposal.screen)} <span class="hint">${D.proposal}</span>`,
    meta: `${h(proposal.status)} · ${D.tier} ${h(proposal.tier)} · ${h(lintLine)}${branch ? ` · ${h(branch)}` : ''}`,
    place: { ...placeOf(project, proposal.screen), proposal: proposal.id },
    tools: `<label class="toggle"><input type="checkbox" id="dev"> ${D.paths}</label>`,
    foot: api && proposal.status === 'pending' ? decisionFoot(D, proposal.id) : null,
    content: `<p style="font-size:15px;margin:0 0 var(--space-md)">${h(proposal.summary || D.noSummary)}</p>${api && proposal.status === 'pending' ? '' : verdict}
<div class="section-title">${D.decided}</div>${decisions}
<div class="section-title">${D.whatChanges}</div>${changeList(describeChanges(before.doc, after.doc, lang), lang)}<details class="raw-diff"><summary>${D.showCode}</summary>${diff}</details>
<div class="section-title">${D.asisTobe}</div>
<div class="tabs-row">${tabs}</div>
<div class="states">${panels}</div>`,
  });
  return page({ title: `${D.proposal} ${proposal.id}`, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss: adapter?.styles ? adapter.styles() : '', file: proposal.file, body, api, screen: proposal.screen, comments: [], lang });
}

// The tokens page: Figma's variables modal, as near as the files allow. Left, the collections
// and the groups of the one shown; right, its table — a row per token under its group's
// heading, the name with a type mark, then the value, or a column per mode when the collection
// has modes. A collection is a base set's file (one value column) or a resolver modifier (its
// contexts are its modes — `theme` with light and dark, the way a Figma collection carries its
// modes); the bundled set comes last when a token lives only there. A value written as an
// alias shows as a chip with the alias's name and colour, the way Figma shows a linked
// variable. A row opens the token in the inspect panel — every mode's value, the alias chain,
// the CSS variable and who uses it (contracts through their bindings, screens through layout
// gap and padding); `#t:<name>` deep-links to it, `#c:<collection>` to a collection. A flat
// tokens.json is one collection.
export function renderTokens(project, { branch = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const set = project.tokenSet ?? { source: 'none', files: [], contexts: {}, contextMeta: {}, sets: {}, modifiers: {}, defaults: {}, origins: {}, meta: {}, problems: [] };
  const merged = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const meta = set.meta ?? {};
  // a flat file declares no $type: read it off the value
  const typeOf = (name, value) =>
    meta[name]?.type ?? (/^(#|rgba?\(|hsla?\(|color\()/.test(String(value)) ? 'color' : /^-?[\d.]+(px|rem|em|%)$/.test(String(value)) ? 'dimension' : 'string');
  const MARK = { color: '●', dimension: '#', number: '#', string: 'T', fontFamily: 'Aa', typography: 'Aa', fontWeight: 'B', duration: '⏱', shadow: '▱', boolean: '◐' };
  const swatch = (css) => `<span class="swatch" style="background:${h(css)}"></span>`;
  // a cell: the alias as a chip with its name and, for a colour, its swatch; else the value
  const cell = (name, type, tokens, m) => {
    const value = getToken(tokens, name);
    if (value === undefined || value === null) return '<span class="hint">—</span>';
    const alias = m?.[name]?.alias;
    if (alias) return `<span class="chip">${type === 'color' ? swatch(value) : ''}${h(alias)}</span>`;
    if (type === 'color') return `${swatch(value)}<code>${h(value)}</code>`;
    if (type === 'dimension' && /^[\d.]+px$/.test(String(value))) return `<span class="dim" style="width:${h(value)}"></span><code>${h(value)}</code>`;
    return `<code>${h(value)}</code>`;
  };
  const cssVar = (name) => `--${name.replace(/\./g, '-')}`;
  const used = {};
  const note = (name, key, who) => (used[name] ??= { components: new Set(), screens: new Set() })[key].add(who);
  for (const c of Object.values(project.components ?? {})) for (const { token } of bindingsOf(c)) note(token, 'components', c.kind);
  const layoutRefs = (rule, screen) => {
    for (const k of ['gap', 'padding']) if (typeof rule?.[k] === 'string' && hasToken(merged, rule[k])) note(rule[k], 'screens', screen);
  };
  for (const s of project.screens) {
    for (const rule of Object.values(s.doc.layout ?? {})) layoutRefs(rule, s.doc.screen);
    for (const patches of Object.values(s.doc.states ?? {})) for (const p of Array.isArray(patches) ? patches : []) layoutRefs(p?.layout, s.doc.screen);
  }
  const chainOf = (name) => {
    const out = [name];
    for (let cur = meta[name]?.alias; cur && !out.includes(cur); cur = meta[cur]?.alias) out.push(cur);
    return out;
  };
  // collections: the base sets' files in order, then each modifier, then the bundled set
  const setsOf = set.sets ?? {};
  const modsOf = set.modifiers ?? {};
  const fileOf = (name) => set.origins?.[name] ?? (set.source === 'flat' && getToken(set.tokens, name) !== undefined ? set.files?.[0] : null);
  const modifierOfFile = (file) => Object.entries(modsOf).find(([, m]) => Object.values(m.contexts).some((files) => files.includes(file)))?.[0] ?? null;
  const byColl = new Map([...Object.values(setsOf).flat().map((f) => basenameOf(f)), ...Object.keys(modsOf)].map((k) => [k, []]));
  for (const name of tokenNames(merged)) {
    const file = fileOf(name);
    const key = file ? (modifierOfFile(file) ?? basenameOf(file)) : '';
    if (!byColl.has(key)) byColl.set(key, []);
    byColl.get(key).push(name);
  }
  const bundledOnly = byColl.get('') ?? [];
  byColl.delete('');
  const modesOf = (key) =>
    modsOf[key]
      ? Object.keys(modsOf[key].contexts)
          .sort((a, b) => (a === modsOf[key].default ? -1 : b === modsOf[key].default ? 1 : 0))
          .map((ctx) => ({ axis: key, ctx, tokens: set.contexts?.[key]?.[ctx] ?? merged, meta: set.contextMeta?.[key]?.[ctx] ?? meta }))
      : [];
  const collections = [...byColl.entries()].filter(([, names]) => names.length).map(([key, names]) => ({ key, label: key, names, modes: modesOf(key) }));
  if (bundledOnly.length) collections.push({ key: 'bundled', label: D.bundledSet, names: bundledOnly, modes: [] });
  const collOf = (name) => collections.find((c) => c.names.includes(name));
  const groupOf = (name) => name.split('.')[0];
  const panelOf = (name, type, value) => {
    const u = used[name] ?? { components: new Set(), screens: new Set() };
    const modes = collOf(name)?.modes ?? [];
    const per = modes.length
      ? modes.map((m) => `<tr><td class="hint">${h(m.ctx)} <span class="hint">${h(m.axis)}</span></td><td>${cell(name, type, m.tokens, m.meta)}</td></tr>`).join('')
      : `<tr><td class="hint">${D.valueLabel}</td><td>${cell(name, type, merged, meta)}</td></tr>`;
    const chain = chainOf(name);
    return `<h3><code>${h(name)}</code></h3><div class="hint">${h(type)}${set.origins?.[name] ? ` · ${h(basenameOf(set.origins[name]))}` : ''}</div>${meta[name]?.description ? `<p class="hint">${h(meta[name].description)}</p>` : ''}<table class="props">${per}${chain.length > 1 ? `<tr><td class="hint">${D.chainLabel}</td><td>${chain.map((c) => `<code>${h(c)}</code>`).join(' → ')}</td></tr>` : ''}<tr><td class="hint">CSS</td><td><code>var(${h(cssVar(name))})</code></td></tr></table><div class="section-title">${D.usedBy}</div>${u.components.size || u.screens.size ? `<ul class="list">${[...u.components].map((k) => `<li><a href="components.html#k-${h(k)}"><u>${h(k)}</u></a> <span class="hint">${D.component}</span></li>`).join('')}${[...u.screens].map((s) => `<li>${screenLinkOf(project, s)} <span class="hint">${D.screen}</span></li>`).join('')}</ul>` : `<div class="hint">${D.none}</div>`}`;
  };
  const rowsOf = (coll) => {
    const cols = 1 + Math.max(coll.modes.length, 1);
    const groups = new Map();
    for (const name of coll.names) {
      const g = groupOf(name);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(name);
    }
    return [...groups.entries()]
      .map(
        ([g, names]) =>
          `<tr class="grp" data-group="${h(g)}"><td colspan="${cols}">${h(g)}</td></tr>` +
          names
            .map((name) => {
              const value = getToken(merged, name);
              const type = typeOf(name, value);
              const leaf = name.length > g.length ? name.slice(g.length + 1) : name;
              const cells = coll.modes.length ? coll.modes.map((m) => `<td>${cell(name, type, m.tokens, m.meta)}</td>`).join('') : `<td>${cell(name, type, merged, meta)}</td>`;
              return `<tr data-token="${h(name)}" data-group="${h(g)}" data-panel="${h(panelOf(name, type, value))}"><td><span class="ticon" title="${h(type)}">${MARK[type] ?? '·'}</span><code>${h(leaf)}</code></td>${cells}</tr>`;
            })
            .join(''),
      )
      .join('');
  };
  const headOf = (coll) => `<thead><tr><th>${D.nameLabel}</th>${coll.modes.length ? coll.modes.map((m) => `<th>${h(m.ctx)} <span class="hint">${h(m.axis)}</span></th>`).join('') : `<th>${D.valueLabel}</th>`}</tr></thead>`;
  const tables = collections.map((c, i) => `<table class="tok" data-coll="${h(c.key)}"${i ? ' hidden' : ''}>${headOf(c)}<tbody>${rowsOf(c)}</tbody></table>`).join('');
  const groupLinks = (c) => {
    const gs = [...new Set(c.names.map(groupOf))];
    return `<a class="side-link vars-group current" href="#" data-group=""><span class="name">${D.allTokens}</span><span class="hint">${c.names.length}</span></a>${gs.map((g) => `<a class="side-link vars-group sub" href="#" data-group="${h(g)}"><span class="name">${h(g)}</span><span class="hint">${c.names.filter((n) => groupOf(n) === g).length}</span></a>`).join('')}`;
  };
  const side = `<div class="vars-side"><div class="tree-sec">${D.collections}</div>${collections.map((c, i) => `<a class="side-link vars-coll${i ? '' : ' current'}" href="#c:${h(c.key)}" data-coll="${h(c.key)}"><span class="name">${h(c.label)}</span><span class="hint">${c.names.length}</span></a>`).join('')}<div class="tree-sec">${D.groupsLabel}</div><div class="vars-groups">${collections.map((c, i) => `<div data-coll="${h(c.key)}"${i ? ' hidden' : ''}>${groupLinks(c)}</div>`).join('')}</div></div>`;
  const main = `<div class="vars-main"><input class="tree-search vars-search" type="search" placeholder="${h(D.searchTokens)}">${tables}</div>`;
  const problems = (set.problems ?? []).length
    ? `<div class="section-title">${D.tokenProblems}</div><ul class="list">${set.problems.map((p) => `<li class="${p.severity === 'blocking' ? 'bad' : ''}">${h(p.path ?? '')}${p.context ? ` <span class="hint">${h(p.context)}</span>` : ''} — ${h(p.message)}</li>`).join('')}</ul>`
    : '';
  const content = problems + (set.source === 'none' ? `<div class="hint">${D.noTokens}</div>` : '') + `<div class="vars">${side}${main}</div>`;
  const body =
    shellOf(project, D, {
      title: D.foundations,
      meta: `${tokenNames(merged).length} · ${h(set.source)}${set.resolver ? ` · ${h(set.resolver)}` : ''}${branch ? ` · ${h(branch)}` : ''}`,
      place: { page: 'foundations' },
      content: foundationTabs(D, 'vars') + content,
    }) +
    VARS_SCRIPT +
    PICK_SCRIPT;
  return page({ title: D.tokens, tokens: merged, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), body, api, screen: '', comments: [], lang });
}

// The variables layout's own behaviour: one collection shown at a time, its groups filter the
// rows, the search box filters by name; `#c:<collection>` opens a collection, `#t:<name>`
// opens the collection that holds the token (the shared script then selects the row).
const VARS_SCRIPT = `
<script>(function () {
  var colls = document.querySelectorAll('.vars-coll'), tables = document.querySelectorAll('table.tok[data-coll]'), boxes = document.querySelectorAll('.vars-groups > div[data-coll]'), search = document.querySelector('.vars-search');
  var group = '';
  function apply() {
    var q = search ? search.value.trim().toLowerCase() : '';
    tables.forEach(function (t) {
      if (t.hidden) return;
      var seen = {};
      t.querySelectorAll('tr[data-token]').forEach(function (tr) {
        var g = tr.getAttribute('data-group');
        var ok = (!group || g === group) && (!q || tr.getAttribute('data-token').toLowerCase().indexOf(q) >= 0);
        tr.hidden = !ok;
        if (ok) seen[g] = true;
      });
      t.querySelectorAll('tr.grp').forEach(function (tr) { tr.hidden = !seen[tr.getAttribute('data-group')]; });
    });
  }
  function show(key) {
    colls.forEach(function (a) { a.classList.toggle('current', a.getAttribute('data-coll') === key); });
    tables.forEach(function (t) { t.hidden = t.getAttribute('data-coll') !== key; });
    boxes.forEach(function (b) { b.hidden = b.getAttribute('data-coll') !== key; });
    group = '';
    document.querySelectorAll('.vars-group').forEach(function (a) { a.classList.toggle('current', a.getAttribute('data-group') === ''); });
    apply();
  }
  colls.forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(a.getAttribute('data-coll')); history.replaceState(null, '', '#c:' + a.getAttribute('data-coll')); });
  });
  document.querySelectorAll('.vars-group').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      group = a.getAttribute('data-group');
      a.parentElement.querySelectorAll('.vars-group').forEach(function (x) { x.classList.toggle('current', x === a); });
      apply();
    });
  });
  if (search) search.addEventListener('input', apply);
  var m = decodeURIComponent(location.hash.slice(1)).match(/^([tc]):(.+)$/);
  if (m && m[1] === 'c') show(m[2]);
  else if (m && m[1] === 't') { var row = document.querySelector('tr[data-token="' + m[2].replace(/"/g, '') + '"]'); if (row) show(row.closest('table').getAttribute('data-coll')); }
})();</script>`;

// The assets page: a card per file under assets/, grouped by folder, with its size, its
// natural dimensions (the browser reads them) and who names it; then the references that
// name no file and the files nothing names. A card selects into the inspect panel;
// `#a:<path>` deep-links to it.
// The patterns page: how the parts are arranged on this product's screens (src/patterns.js). One
// card per pattern — what it binds, its skeleton drawn as the stack of parts a screen is made of,
// the rules in words, and which screens follow it and which break it and where (L29).
export function renderPatterns(project, { branch = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const list = Object.values(project.patterns ?? {}).sort((a, b) => a.pattern.localeCompare(b.pattern));
  const names = (x) => [].concat(x ?? []);
  const scopeOf = (a = {}) => {
    const parts = [];
    if (a.types) parts.push(`${D.typeLabel} ${names(a.types).map((t) => `<code>${h(t)}</code>`).join(' ')}`);
    if (a.platforms) parts.push(`${D.platformLabel} ${names(a.platforms).map((t) => `<code>${h(t)}</code>`).join(' ')}`);
    if (a.screens) parts.push(names(a.screens).map((t) => screenLinkOf(project, t)).join(' '));
    if (!parts.length) parts.push(D.allScreens);
    if (a.except) parts.push(`${D.exceptLabel} ${names(a.except).map((t) => screenLinkOf(project, t)).join(' ')}`);
    return parts.join(' · ');
  };
  const kindCell = (k) => names(k ?? 'any').map((x) => (x === 'any' ? `<span class="hint">${D.anyKind}</span>` : project.components?.[x] ? `<a href="components.html#k-${h(x)}"><code>${h(x)}</code></a>` : `<code>${h(x)}</code>`)).join(' | ');
  const card = (p) => {
    const rows = (p.skeleton ?? []).map((slot) => `<div class="pat-slot${slot.many ? ' many' : ''}${slot.optional ? ' optional' : ''}"><b>${h(slot.role)}</b><span>${kindCell(slot.kind)}</span><span class="hint">${[slot.many ? D.manyMark : '', slot.optional ? D.optionalMark : '', slot.note ? h(slot.note) : ''].filter(Boolean).join(' · ')}</span></div>`).join('');
    const bound = project.screens.filter((s) => appliesTo(p, s, project.conventions));
    const follow = [], brk = [];
    for (const s of bound) {
      const m = Array.isArray(p.skeleton) ? matchSkeleton(p.skeleton, s.doc.elements) : [];
      (m.length ? brk : follow).push({ s, m: m[0] });
    }
    const screens = `${follow.map(({ s }) => `<span class="pill ok">✓ ${screenLinkOf(project, s.doc.screen)}</span>`).join(' ')} ${brk.map(({ s, m }) => `<div class="pat-break"><span class="pill tbd">⚠ ${screenLinkOf(project, s.doc.screen)}</span> <span class="hint">${h(m.message)}</span></div>`).join('')}` || `<span class="hint">${D.noneBound}</span>`;
    return `<section class="pat-card" id="p-${h(p.pattern)}"><h2>${h(p.pattern)}</h2>${p.description ? `<p>${h(p.description)}</p>` : ''}<div class="hint">${D.appliesLabel} ${scopeOf(p.applies_to)} · <code>patterns/${h(basenameOf(p.file ?? ""))}</code>${p.graduated_to ? ` · ${D.graduatedTo} <a href="components.html#k-${h(p.graduated_to)}">◇ ${h(p.graduated_to)}</a>` : ''}</div>
<div class="section-title">${D.skeletonLabel}</div><div class="pat-skeleton">${rows}</div>
${p.notes?.length ? `<div class="section-title">${D.rulesLabel}</div><ul class="list">${p.notes.map((n) => `<li>${h(n)}</li>`).join('')}</ul>` : ''}
<div class="section-title">${D.screens} <span class="hint">${follow.length} ✓ · ${brk.length} ⚠</span></div><div class="pat-screens">${screens}</div></section>`;
  };
  const body = shellOf(project, D, {
    title: D.patterns,
    meta: `${list.length} ${D.patternsN}${branch ? ` · ${h(branch)}` : ''}`,
    place: { page: 'patterns', sub: list.map((p) => ({ href: `#p-${p.pattern}`, label: p.pattern })) },
    content: list.length ? list.map(card).join('') : `<div class="pat-empty"><p>${D.noPatterns}</p><pre>patterns/screen-frame.yaml
pattern: screen-frame
skeleton:
  - { role: header, kind: page-header }
  - { role: body, kind: any, many: true }
  - { role: bar, kind: action-bar }</pre></div>`,
  });
  return page({ title: D.patterns, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), body, api, screen: '', comments: [], lang });
}

export function renderAssets(project, { branch = null, api = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const { assets, missing, unused } = assetsSummary(project);
  const kb = (n) => (n >= 1024 ? `${Math.round(n / 102.4) / 10} KB` : `${n} B`);
  const who = (r) => (r.screen ? `${screenLinkOf(project, r.screen)} <span class="hint">${h(r.at.join('.'))}</span>` : `<a href="components.html#k-${h(r.component)}"><u>${h(r.component)}</u></a> <span class="hint">${h(r.at.join('.'))}</span>`);
  const panelOf = (a) => `<h3>${h(basenameOf(a.path))}</h3><div class="hint">${h(a.path)}</div><table class="props"><tr><td class="hint">${D.sizeLabel}</td><td>${kb(a.bytes)}</td></tr><tr><td class="hint">${D.typeLabel}</td><td><code>${h(a.type)}</code></td></tr></table><div class="section-title">${D.usedBy}</div>${a.usedBy.length ? `<ul class="list">${a.usedBy.map((r) => `<li>${who(r)}</li>`).join('')}</ul>` : `<div class="hint">${D.unusedMark}</div>`}`;
  const card = (a) =>
    `<a class="asset" data-asset="${h(a.path)}" data-panel="${h(panelOf(a))}" href="#a:${h(a.path)}"><div class="asset-pic"><img src="${h(a.path)}" alt=""></div><div class="t" title="${h(a.path)}">${h(basenameOf(a.path))}</div><div class="m">${h(a.path.split('.').pop().toLowerCase())} · ${kb(a.bytes)} · <span class="dim-of"></span></div><div class="pills">${a.usedBy.length ? `<span class="pill ok">${a.usedBy.length} ${D.usesN}</span>` : `<span class="pill tbd">${D.unusedMark}</span>`}</div></a>`;
  const folders = new Map();
  for (const a of assets) {
    const folder = a.path.split('/').slice(1, -1).join('/') || 'assets/';
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push(a);
  }
  const grid = [...folders.entries()].map(([folder, list]) => `<div class="section-title"><code>${h(folder)}</code> <span class="hint">${list.length} ${D.filesN}</span></div><div class="asset-grid">${list.map(card).join('')}</div>`).join('');
  const lists = `${missing.length ? `<div class="section-title">${D.missingAssets}</div><ul class="list">${missing.map((r) => `<li><code class="bad">${h(r.path)}</code> — ${who(r)}</li>`).join('')}</ul>` : ''}${unused.length ? `<div class="section-title">${D.unusedFiles}</div><ul class="list">${unused.map((p) => `<li><a href="#a:${h(p)}"><code>${h(p)}</code></a></li>`).join('')}</ul>` : ''}`;
  const body =
    shellOf(project, D, {
      title: D.assets,
      meta: `${assets.length} ${D.filesN}${missing.length ? ` · <span class="bad">${missing.length} ${D.missingAssets.toLowerCase()}</span>` : ''}${branch ? ` · ${h(branch)}` : ''}`,
      place: { page: 'assets' },
      content: (grid || `<div class="hint">${D.noAssets}</div>`) + lists,
    }) + PICK_SCRIPT;
  return page({ title: D.assets, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), body, api, screen: '', comments: [], lang });
}

// The foundations board: what the product looks like, on one page — every text style set in its own
// type, the colours by group, the surfaces as boxes, the scales, and every component's sample in
// each of its variants. All of it inside `.board`, one of the product roots, so it is drawn with
// the project's tokens while the page around it keeps the viewer's (DESIGN.md §6.11).
// the two faces of the foundations — the board, and the variables it is drawn from
const foundationTabs = (D, on) => `<div class="tabs-row fnd-tabs"><a class="tab${on === 'board' ? ' active' : ''}" href="foundations.html">${D.boardTab}</a><a class="tab${on === 'vars' ? ' active' : ''}" href="tokens.html">${D.varsTab}</a></div>`;

export function renderFoundations(project, { branch = null, adapter = null, api = false, bare = false } = {}) {
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const own = project.tokens ?? {};
  const pick = (group) => Object.entries(tokens[group] ?? {});
  const origin = (name) => (getToken(own, name) !== undefined || getGroup(own, name) ? '' : ` <span class="hint">${D.bundled}</span>`);
  const panel = (title, rows) => `<h3><code>${h(title)}</code></h3><table class="props">${rows.map(([k, v]) => `<tr><td class="hint">${h(k)}</td><td><code>${h(v)}</code></td></tr>`).join('')}</table>`;
  const cssv = (name) => `var(--${name.replace(/\./g, '-')})`;

  const texts = pick('text').filter(([, v]) => v && typeof v === 'object');
  const textRows = texts.length
    ? texts.map(([name, v]) => {
        const style = Object.keys(v).map((p) => `${p}:${cssv(`text.${name}.${p}`)}`).join(';');
        return `<div class="b-text" data-panel="${h(panel(`text.${name}`, Object.entries(v)))}"><div class="b-label"><code>text.${h(name)}</code>${origin(`text.${name}`)}<div class="hint">${h([v['font-size'], v['font-weight'], v['line-height']].filter(Boolean).join(' · '))}</div></div><div class="b-sample" style="${style}">${h(D.sampleText)}</div></div>`;
      }).join('')
    : `<div class="hint">${D.noStyles}</div>`;

  // colours by role, the way a palette page reads: base surfaces and text, the brand, status, the tool's own
  const roleOf = (n) => {
    const leaf = n.split('.').slice(1).join('.');
    if (/^(bg|surface|border|text|muted)$/.test(leaf)) return 'Base';
    if (/^(danger|success|warning|info|error)/.test(leaf)) return 'State';
    if (/^(placeholder|tbd|none)/.test(leaf)) return 'System';
    return 'Brand';
  };
  const colorNames = tokenNames(tokens.color ?? {}, ['color']);
  const swatch = (n) => `<div class="b-swatch" data-panel="${h(panel(n, [['value', getToken(tokens, n)], ['css', `--${n.replace(/\./g, '-')}`]]))}"><span style="background:${cssv(n)}"></span><code>${h(n.replace(/^color\./, ''))}</code><div class="hint">${h(getToken(tokens, n))}</div></div>`;
  const colours = ['Base', 'Brand', 'State', 'System']
    .map((r) => [r, colorNames.filter((n) => roleOf(n) === r)])
    .filter(([, l]) => l.length)
    .map(([r, l]) => `<div class="b-role">${D[`role${r}`]}</div><div class="b-swatches">${l.map(swatch).join('')}</div>`)
    .join('');

  const surfaces = pick('surface').filter(([, v]) => v && typeof v === 'object');
  const surfaceBoxes = surfaces.length
    ? `<div class="b-surfaces">${surfaces.map(([name, v]) => {
        const map = { bg: 'background', border: 'border-color', radius: 'border-radius', shadow: 'box-shadow', text: 'color', padding: 'padding' };
        const style = Object.keys(v).filter((k) => map[k]).map((k) => `${map[k]}:${cssv(`surface.${name}.${k}`)}`).join(';');
        return `<div class="b-surface" style="${style}" data-panel="${h(panel(`surface.${name}`, Object.entries(v)))}"><code>surface.${h(name)}</code>${origin(`surface.${name}`)}</div>`;
      }).join('')}</div>`
    : `<div class="hint">${D.noSurfaces}</div>`;

  const scale = (group, draw) => {
    const names = tokenNames(tokens[group] ?? {}, [group]);
    return names.length ? `<div class="b-scale"><div class="b-scale-name">${h(group)}</div>${names.map((n) => `<div class="b-step" title="${h(n)} ${h(getToken(tokens, n))}">${draw(n)}<code>${h(n.split('.').pop())}</code><span class="hint">${h(getToken(tokens, n))}</span></div>`).join('')}</div>` : '';
  };
  const scales =
    scale('space', (n) => `<i class="b-bar" style="width:${cssv(n)}"></i>`) +
    scale('radius', (n) => `<i class="b-radius" style="border-radius:${cssv(n)}"></i>`) +
    scale('control', (n) => `<i class="b-control" style="height:${cssv(n)}"></i>`) +
    scale('shadow', (n) => `<i class="b-shadow" style="box-shadow:${cssv(n)}"></i>`);

  // every component: its sample, and the sample in each option of each variant axis
  const maps = mapsFor(project);
  const registry = project.components ?? {};
  const stub = { doc: { elements: [] }, lineOf: () => null };
  const draw = (el) => {
    const view = expandComponents({ elements: [el], layout: {} }, registry);
    const r = makeRenderer(stub, view.layout, maps, adapter, registry);
    return view.elements.map((x) => r.element(x)).join('');
  };
  const comps = Object.values(registry)
    .filter((c) => c.file && c.sample && typeof c.sample === 'object')
    .sort((a, b) => a.kind.localeCompare(b.kind))
    .map((c) => {
      const base = { id: 'sample', kind: c.kind, ...c.sample };
      const variants = Object.keys(c.variants ?? {}).flatMap((prop) => (c.props?.[prop]?.options ?? Object.keys(c.variants[prop] ?? {})).map((opt) => [prop, opt]));
      const cells = [['', base], ...variants.map(([prop, opt]) => [`${prop} = ${opt}`, { ...base, id: `sample-${prop}-${opt}`, [prop]: c.props?.[prop]?.type === 'boolean' ? opt === 'true' : opt }])];
      return `<div class="b-comp"><div class="b-comp-head"><a href="components.html#k-${h(c.kind)}"><code>${h(c.kind)}</code></a></div><div class="b-comp-row">${cells.map(([label, el]) => `<div class="b-cell">${draw(el)}${label ? `<div class="hint">${h(label)}</div>` : ''}</div>`).join('')}</div></div>`;
    })
    .join('');

  const content = `<div class="board">
<div class="section-title" id="f-text">${D.textStyles}</div>${textRows}
<div class="section-title" id="f-color">${D.colorsLabel}</div>${colours}
<div class="section-title" id="f-surface">${D.surfacesLabel}</div>${surfaceBoxes}
<div class="section-title" id="f-scale">${D.scalesLabel}</div>${scales}
${bare ? `<div class="section-title">${D.componentsLabel}</div>${comps}` : ''}
</div>`;
  const extraCss = adapter?.styles ? adapter.styles() : '';
  if (bare) return page({ title: D.foundations, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss, body: `<main class="bare">${content}</main>`, api, lang });
  const body =
    shellOf(project, D, { title: D.foundations, meta: `${h(D.styleMeta)}${branch ? ` · ${h(branch)}` : ''}`, place: { page: 'foundations', sub: [{ href: '#f-text', label: D.textStyles, n: texts.length }, { href: '#f-color', label: D.colorsLabel, n: colorNames.length }, { href: '#f-surface', label: D.surfacesLabel, n: surfaces.length }, { href: '#f-scale', label: D.scalesLabel }] }, content: foundationTabs(D, 'board') + content }) + PICK_SCRIPT;
  return page({ title: D.foundations, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), extraCss, body, api, screen: '', comments: [], lang });
}

const screenLinkOf = (project, screen) => {
  const p = placeOf(project, screen);
  return `<a href="${p.domain ? `canvas-${h(p.domain)}.html#${h(screen)}` : `${h(screen)}.html`}"><u>${h(screen)}</u></a>`;
};

// Shared by the tokens and assets pages: a click on a row or a card puts its pre-rendered
// detail into the inspect panel and writes the deep link; the hash on load selects; an asset
// card learns its natural size from the picture once it has loaded.
const PICK_SCRIPT = `
<script>(function () {
  var panel = document.getElementById('inspector');
  function pick(el) {
    if (window.doanPanelOpen) window.doanPanelOpen();
    document.querySelectorAll('.current[data-panel]').forEach(function (n) { n.classList.remove('current'); });
    el.classList.add('current');
    if (panel) panel.innerHTML = el.getAttribute('data-panel');
  }
  document.querySelectorAll('[data-panel]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target.closest('a[href]') && e.target.closest('a[href]') !== el) return;
      e.preventDefault();
      pick(el);
      var key = el.hasAttribute('data-token') ? 't:' + el.getAttribute('data-token') : 'a:' + el.getAttribute('data-asset');
      history.replaceState(null, '', '#' + key);
    });
  });
  var m = decodeURIComponent(location.hash.slice(1)).match(/^([ta]):(.+)$/);
  if (m) {
    var el = document.querySelector(m[1] === 't' ? '[data-token="' + m[2].replace(/"/g, '') + '"]' : '[data-asset="' + m[2].replace(/"/g, '') + '"]');
    if (el) { pick(el); el.scrollIntoView({ block: 'center' }); }
  }
  document.querySelectorAll('.asset-pic img').forEach(function (img) {
    var fill = function () { var d = img.closest('.asset').querySelector('.dim-of'); if (d) d.textContent = img.naturalWidth + '×' + img.naturalHeight; };
    if (img.complete) fill(); else img.addEventListener('load', fill);
  });
})();</script>`;

// The developer spec page: one screen, everything a person building it needs, read off the
// file by src/spec.js — acceptance criteria first, then elements with their code, states,
// flows, copy, tokens, components, assets, open questions. The same spec is embedded as JSON
// and as Markdown (the copy button), and the MCP `handoff` tool serves it to an agent.
export function renderSpec(project, screen, { branch = null, api = false } = {}) {
  const doc = screen.doc;
  const lang = languageOf(project);
  const D = dictionary(lang);
  setLanguage(lang);
  const tokens = mergeTokens(DEFAULT_TOKENS, project.tokens);
  const spec = specOf(project, screen, { branch });
  const md = specMarkdown(spec, lang);
  const place = placeOf(project, doc.screen, 'Default');
  const at = (path) => (place.domain ? `canvas-${h(place.domain)}.html#${h(doc.screen)}.Default/${h(path)}` : `${h(doc.screen)}.html`);
  const table = (head, rows, cls = '') =>
    rows.length
      ? `<table class="index${cls ? ` ${cls}` : ''}"><thead><tr>${head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : `<div class="hint">${D.noneYet}</div>`;
  const kv = (o) => Object.entries(o).map(([k, val]) => `<code>${h(k)}</code> ${h(typeof val === 'string' ? val : JSON.stringify(val))}`).join('<br>');
  const changes = (list) => list.map((c) => `<li><code>${h(c.target)}</code> ${h(c.change)}</li>`).join('');
  const statusLabel = { draft: D.statusDraft, ready: D.statusReady, done: D.statusDone }[spec.status] ?? h(spec.status);
  const swatch = (t) => (/^(#|rgba?\(|hsla?\()/.test(String(t.value)) ? `<span class="swatch" style="background:${h(t.value)}"></span>` : '');
  const content = `
<div class="section-title">${D.acceptance} <span class="hint">${spec.acceptance.length}</span></div>
${spec.acceptance.length ? `<ul class="list acceptance">${spec.acceptance.map((a) => `<li><label><input type="checkbox"> ${h(a.text)}</label> <span class="hint">${h(a.source)}</span></li>`).join('')}</ul>` : `<div class="hint">${D.noneYet}</div>`}
<div class="section-title">${D.elementsLabel} <span class="hint">${spec.elements.length}</span></div>
${table(['id', 'kind', D.codeLabel, 'props', D.path], spec.elements.map((e) => [`<a href="${at(e.path)}"><code>${h(e.id)}</code></a>${e.parent ? `<div class="hint">↳ ${h(e.parent)}</div>` : ''}`, h(e.kind), e.code ? `<code>${h(e.code.snippet)}</code>${e.code.import ? `<div class="hint">${h(e.code.import)}</div>` : ''}` : `<span class="hint">${h(Object.entries(e.component?.maps_to ?? {}).filter(([k]) => k !== 'code').map(([k, v]) => `${k}/${v}`).join(', ') || D.bundled)}</span>`, kv(e.props) + (Object.keys(e.conditions).length ? `<div class="hint">${kv(e.conditions)}</div>` : ''), `<code>${h(e.path)}${e.line ? `:${e.line}` : ''}</code>`]), 'spec-el')}
<div class="section-title">${D.states}</div>
${spec.states.length ? `<ul class="list">${spec.states.map((s) => `<li><b>${h(s.name)}</b>${s.required ? ` <span class="pill tbd">${D.requiredMark}</span>` : ''}<ul>${changes(s.changes) || `<li class="hint">${D.noneYet}</li>`}</ul></li>`).join('')}</ul>` : `<div class="hint">${D.noneYet}</div>`}
${spec.variants.length ? `<div class="section-title">${D.variants}</div><ul class="list">${spec.variants.flatMap((v) => v.options.map((o) => `<li><b>${h(v.axis)} = ${h(o.name)}</b><ul>${changes(o.changes) || `<li class="hint">${D.noneYet}</li>`}</ul></li>`)).join('')}</ul>` : ''}
${spec.breakpoints.length ? `<div class="section-title">${D.breakpointsLabel}</div><ul class="list">${spec.breakpoints.map((b) => `<li><b>${h(b.name)}</b> <span class="hint">${b.width ?? '?'}px</span><ul>${changes(b.changes) || `<li class="hint">${D.noneYet}</li>`}</ul></li>`).join('')}</ul>` : ''}
<div class="section-title">${D.flows}</div>
${table(['from', 'gesture', 'nav', 'to', 'when'], spec.flows.map((f) => [`<code>${h(f.via ? `${f.from}.${f.via}` : f.from)}</code>`, h(f.gesture ?? ''), h(f.nav ?? ''), `<code>${h(f.to)}</code>`, h(f.when ?? '')]))}
<div class="section-title">${D.copyLabel} <span class="hint">${spec.copy.length}</span></div>
${table(['element', 'prop', 'text'], spec.copy.map((c) => [`<code>${h(c.element)}</code>`, `<code>${h(c.prop)}</code>`, h(c.text)]))}
<div class="section-title">${D.tokensUsed} <span class="hint">${spec.tokens.length}</span></div>
${table(['token', 'CSS', D.valueLabel, D.usedAt], spec.tokens.map((t) => [`<a href="tokens.html#t:${h(t.name)}"><code>${h(t.name)}</code></a>`, `<code>var(${h(t.css)})</code>`, `${swatch(t)}<code>${h(t.value)}</code>`, `<span class="hint">${h(t.usedAt.join(', '))}</span>`]))}
<div class="section-title">${D.components}</div>
${table(['kind', 'n', 'maps_to', D.file], spec.components.map((c) => [`<a href="components.html#k-${h(c.kind)}"><code>${h(c.kind)}</code></a>`, c.count, h(Object.entries(c.maps_to).map(([k, v]) => `${k}: ${typeof v === 'object' ? `${v.import ?? ''} ${v.name ?? ''}`.trim() : v}`).join(', ')), `<span class="hint">${h(c.file ? basenameOf(c.file) : D.bundled)}</span>`]))}
${spec.assets.length ? `<div class="section-title">${D.assets}</div><ul class="list">${spec.assets.map((a) => `<li><a href="assets.html#a:${h(a.path)}"><code>${h(a.path)}</code></a> <span class="hint">${h(a.at)}</span></li>`).join('')}</ul>` : ''}
<div class="section-title">${D.openQuestions} <span class="hint">${spec.tbd.length}</span></div>
${spec.tbd.length ? `<ul class="list">${spec.tbd.map((t) => `<li><code>${h(t.path)}</code>${t.owner ? ` <span class="pill tbd">${h(t.owner)}${t.due ? ` · ${h(t.due)}` : ''}</span>` : ''}${t.note ? ` ${h(t.note)}` : ''}</li>`).join('')}</ul>` : `<div class="hint">${D.noneYet}</div>`}
${spec.notes.length ? `<div class="section-title">${D.notes}</div><ul class="list">${spec.notes.map((n) => `<li>${v(n)}</li>`).join('')}</ul>` : ''}
<div class="section-title">lint</div><div class="hint">${spec.lint.blocking} ${D.blocking}, ${spec.lint.warning} ${D.warning}</div>
<template id="spec-md">${h(md)}</template>
<script type="application/json" id="spec-json">${JSON.stringify(spec).replace(/</g, '\\u003c')}</script>`;
  const body =
    shellOf(project, D, {
      title: `${h(doc.screen)} <span class="hint">${D.spec}</span>`,
      meta: `${h(doc.section)} · ${h(doc.type)} · ${h(spec.platform)} · ${statusLabel}${branch ? ` · ${h(branch)}` : ''}`,
      place,
      tools: `<button class="btn" id="spec-copy-md" type="button">${D.copyMarkdown}</button><a class="btn" href="${h(doc.screen)}.html">${D.screen}</a>`,
      content,
    }) +
    `
<script>(function () { var b = document.getElementById('spec-copy-md'), t = document.getElementById('spec-md'); if (!b || !t) return; b.addEventListener('click', function () { var text = t.content ? t.content.textContent : t.textContent; navigator.clipboard.writeText(text).then(function () { var was = b.textContent; b.textContent = '✓'; setTimeout(function () { b.textContent = was; }, 1200); }); }); })();</script>`;
  return page({ title: `${doc.screen} · ${D.spec}`, tokens, modeCss: modeCss(project), componentCss: componentCss(project), fonts: fontLinks(project), body, api, screen: doc.screen, comments: [], lang });
}

// the page was called the style board in 0.14
export const renderStyle = renderFoundations;
