// Page chrome for the viewer: the shell (sidebar · main · drawer), the state tabs and the
// compare toggle, the dots that stand in for meta information on the picture, and the one
// delegated click handler behind the drawer inspector. Sizes and colours come from tokens.
// NOTE: this file's strings are template literals — no backticks inside them, comments included.
export const CSS = `
:root { --size-sm: 240px; --size-md: 480px; --size-lg: 720px; --size-full: 100%; --side-w: 280px; --drawer-w: 280px; /* the two side panes are one width */ --ref-w: 1280px; }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; font: var(--font-size-md, var(--font-size, 14px))/1.45 var(--font-family); color: var(--color-text); background: var(--color-surface); }
/* what the project draws takes the project's type; the chrome around it keeps the viewer's */
.frame, .cv-frame, .proto-view, .lib-pic, .lib-variant, .board { font: var(--font-size-md, var(--font-size, 14px))/1.45 var(--font-family); color: var(--color-text); }
a { color: inherit; text-decoration: none; }
.shell { display: grid; grid-template-columns: var(--side-w) minmax(0, 1fr) 0; min-height: 100vh; transition: grid-template-columns .15s ease; }
.shell.drawer-open { grid-template-columns: var(--side-w) minmax(0, 1fr) var(--drawer-w); }

/* sidebar */
.side { background: var(--color-bg); border-right: 1px solid var(--color-border); padding: var(--space-md) 0; position: sticky; top: 0; height: 100vh; overflow: auto; font-size: 13px; }
.side .brand { padding: 0 var(--space-md) var(--space-md); font-weight: 600; font-size: 14px; display: flex; align-items: baseline; gap: var(--space-sm); }
.side .brand .hint { font-weight: 400; }
.side .sec { padding: var(--space-sm) var(--space-md) 2px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); }
.side-link { display: flex; align-items: center; gap: var(--space-xs); padding: 5px var(--space-md); color: var(--color-text); }
.side-link:hover { background: var(--color-surface); }
.side-link.current { background: var(--color-surface); font-weight: 600; box-shadow: inset 3px 0 0 var(--color-primary); }
.side-link .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pill { font-size: 10px; padding: 0 5px; border-radius: 8px; line-height: 15px; }
.pill.block { background: var(--color-danger); color: #fff; }
.pill.tbd { background: var(--color-tbd); border: 1px solid var(--color-tbd-border); }
.pill.cm { background: var(--color-primary); color: var(--color-primary-text); }
.side .base { margin-bottom: var(--space-md); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-sm); }

/* main */
.main { min-width: 0; padding: 0 var(--space-lg) var(--space-xl); }
.top { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: var(--space-sm); padding: var(--space-md) 0; position: sticky; top: 0; background: var(--color-surface); z-index: 5; }
.top .where { min-width: 0; display: flex; align-items: baseline; gap: var(--space-sm); white-space: nowrap; overflow: hidden; }
.top .where .meta { overflow: hidden; text-overflow: ellipsis; }
.top h1 { font-size: 18px; margin: 0; }
.meta, .hint { color: var(--color-muted); font-size: 12px; }
.toggle { font-size: 12px; color: var(--color-muted); display: inline-flex; align-items: center; gap: var(--space-xs); cursor: pointer; white-space: nowrap; padding: 4px 10px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-bg); }
.toggle input { margin: 0; }
.toggle select { font: inherit; color: inherit; border: 0; background: none; padding: 0; cursor: pointer; }
.toggle:has(input:checked) { color: var(--color-text); border-color: var(--color-primary); }
.tabs-row { display: flex; align-items: center; gap: var(--space-xs); flex-wrap: wrap; margin: var(--space-xs) 0 var(--space-md); }
.tabs-row .axis { font-size: 11px; color: var(--color-muted); margin-right: var(--space-xs); }
.tab { padding: 4px 10px; border-radius: 999px; font-size: 12px; color: var(--color-muted); cursor: pointer; border: 1px solid transparent; background: none; font: inherit; }
.tab:hover { background: var(--color-bg); }
.tab.active { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); font-weight: 600; }
.tab .n { font-size: 10px; color: var(--color-muted); margin-left: 4px; }
.states { display: block; }
.state { display: none; }
.state.active { display: block; }
.stage { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.frame { width: var(--ref-w); transform-origin: 0 0; }
.view-root { min-height: 160px; }
.state h3 { display: none; font-size: 12px; margin: 0 0 var(--space-xs); color: var(--color-muted); }
/* compare: every state visible, shrunk to share the width */
.states.compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: var(--space-md); align-items: start; }
.states.compare .state { display: block; min-width: 0; }
.states.compare .state h3 { display: block; }
.section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); margin: var(--space-lg) 0 var(--space-xs); }
.list { margin: 0; padding-left: var(--space-lg); font-size: 13px; }
.list li { margin: 2px 0; }
.list code { background: var(--color-bg); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
/* the style board (renderStyle) — drawn with the project's tokens */
.board { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 24px 28px; }
.board .section-title { font: 600 12px/1.4 system-ui, sans-serif; color: #6b7280; margin: 28px 0 12px; text-transform: none; } .board .section-title:first-child { margin-top: 0; }
.board .hint, .board code, .board .b-label, .board .b-scale-name { font-family: system-ui, sans-serif; }
.b-text { display: grid; grid-template-columns: 180px 1fr; gap: var(--space-md); align-items: baseline; padding: 12px 0; border-bottom: 1px solid var(--color-border); cursor: pointer; }
.b-label { font-size: 12px; } .b-label code { font-size: 12px; } .b-sample { color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-sm); margin-bottom: 12px; }
.b-swatch { font-size: 12px; cursor: pointer; } .b-swatch span { display: block; height: 48px; border-radius: 8px; border: 1px solid rgba(0,0,0,.08); margin-bottom: 6px; } .b-swatch code { font-size: 11px; }
.b-surfaces { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-md); padding: 16px; background: var(--color-surface); border-radius: 8px; }
.b-surface { min-height: 96px; border: 1px solid transparent; padding: 12px; font-size: 12px; cursor: pointer; }
.b-scale { display: flex; align-items: flex-end; gap: var(--space-md); flex-wrap: wrap; margin-bottom: 16px; } .b-scale-name { width: 60px; font-size: 12px; color: #6b7280; align-self: center; }
.b-step { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-xs); font-size: 11px; } .b-step code { font-size: 11px; }
.b-bar { display: block; height: 12px; background: var(--color-primary); border-radius: 2px; } .b-radius { display: block; width: 40px; height: 40px; border: 2px solid var(--color-text); }
.b-control { display: block; width: 40px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px; } .b-shadow { display: block; width: 56px; height: 40px; background: var(--color-bg); border-radius: 8px; }
.b-comp { border-top: 1px solid var(--color-border); padding: 16px 0; } .b-comp-head { font-size: 12px; margin-bottom: 8px; }
.b-comp-row { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: flex-start; } .b-cell { min-width: 120px; max-width: 360px; display: flex; flex-direction: column; gap: var(--space-xs); } .b-cell > .hint { font-size: 11px; }
main.bare { padding: 16px; }
.fdiff-pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); } .fdiff-pair > div { min-width: 0; }
.fdiff { font-size: 11px; line-height: 1.5; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 8px; overflow: auto; max-height: 420px; margin: 4px 0 0; } .fdiff .chg { background: #fff4d6; display: inline-block; width: 100%; }
.board-frame { width: 100%; height: 720px; border: 1px solid var(--color-border); border-radius: 8px; background: #fff; }
.acceptance { list-style: none; padding-left: 0; } .acceptance li { display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: baseline; margin: 4px 0; }
.acceptance label { display: inline-flex; gap: var(--space-sm); align-items: baseline; cursor: pointer; } .acceptance input { width: auto; margin: 0; padding: 0; }
.index td:last-child { overflow-wrap: anywhere; }
.dead { color: var(--color-danger); text-decoration: line-through; }
.backdrop { background: rgba(31,35,40,.45); padding: var(--space-md); display: flex; justify-content: center; min-height: 480px; }
.backdrop .modal-box { width: var(--size-md); } .backdrop .modal-box.size-sm { width: var(--size-sm); } .backdrop .modal-box.size-lg { width: var(--size-lg); }
.backdrop.by-element .view-root { border: 0; box-shadow: none; padding: 0; background: none; }
.backdrop .view-root { border: 0; box-shadow: 0 8px 32px rgba(0,0,0,.25); padding: var(--space-lg); background: var(--color-bg); border-radius: var(--radius-md); min-height: 0; }

/* device frames */
.frame.device-web { width: var(--ref-w); }
.frame.device-phone, .frame.device-tablet { width: var(--ref-w); background: var(--color-bg); border: 10px solid #1f2328; border-radius: 44px; overflow: hidden; margin: var(--space-md) auto; box-shadow: 0 12px 40px rgba(0,0,0,.25); display: flex; flex-direction: column; }
.frame.device-tablet { border-radius: 24px; }
/* a dialog on a device covers the whole screen and sits in its middle, whatever its height */
.frame.device-phone > .backdrop, .frame.device-tablet > .backdrop { flex: 1; min-height: 0; align-items: center; }
.view-root [style*="overflow-x:auto"] > .el { flex: 0 0 auto; }
.view-root [style*="overflow-x:auto"] > * { flex-wrap: nowrap; } .view-root [style*="overflow-x:auto"] > * > * { flex: 0 0 auto; } .view-root [style*="flex-wrap:wrap"] > * { flex-wrap: wrap; }
.frame.device-phone .view-root, .frame.device-tablet .view-root { flex: 1; min-height: 0; overflow: hidden; }
.frame[style*="--ref-h"] { height: var(--ref-h); }
.status-bar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 var(--space-lg); font-size: 12px; font-weight: 600; flex: 0 0 auto; }
.status-bar .notch { width: 120px; height: 28px; background: #1f2328; border-radius: 0 0 16px 16px; position: absolute; left: 50%; transform: translateX(-50%); top: 0; }
.status-bar { position: relative; }
.home-indicator { height: 20px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.home-indicator span { width: 134px; height: 5px; border-radius: 3px; background: var(--color-text); opacity: .8; }
.stage.stage-device { background: var(--color-surface); border: 0; display: flex; justify-content: flex-start; }
/* a device frame keeps its own width in a narrow stage — the fitter scales it down; letting flex shrink it would re-lay the screen at the stage's width (a tablet drawn as a tall strip) */
.stage.stage-device > .frame { flex: 0 0 auto; }
/* mobile kinds */
.el-app-bar { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; min-height: 44px; padding: 0 var(--space-sm); }
.ab-back { font-size: 26px; color: var(--color-primary); padding: 0 var(--space-xs); } .ab-title { text-align: center; font-weight: 600; } .ab-actions { display: flex; gap: var(--space-xs); justify-content: flex-end; }
.tb { display: flex; border-top: 1px solid var(--color-border); background: var(--color-bg); } .tb-item { flex: 1; text-align: center; font-size: 10px; padding: 6px 0 8px; color: var(--color-muted); display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); } .tb-item.on { color: var(--color-primary); } .tb-icon { width: 22px; height: 22px; border-radius: 6px; background: currentColor; opacity: .25; }
.el-tab-bar { margin-top: auto; }
.cell { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--color-border); } .cell-thumb { width: 44px; height: 44px; border-radius: var(--radius-sm); background: var(--color-surface); border: 1px solid var(--color-border); flex: 0 0 auto; } .cell-body { flex: 1; min-width: 0; } .cell-title { font-weight: 500; } .cell-sub { font-size: .85em; color: var(--color-muted); } .cell-trail { color: var(--color-muted); font-size: 13px; } .cell-chevron { color: var(--color-border); font-size: 20px; }
.el-list-cell .repeat { display: block; } .el-list-cell .rep { display: block; }
.sheet { background: var(--color-bg); border-radius: var(--radius-md) var(--radius-md) 0 0; box-shadow: 0 -8px 32px rgba(0,0,0,.15); padding: var(--space-sm) 0 var(--space-md); margin-top: auto; } .sheet-handle { width: 36px; height: 5px; border-radius: 3px; background: var(--color-border); margin: 0 auto var(--space-sm); } .sheet-title { font-weight: 600; text-align: center; margin-bottom: var(--space-sm); } .sheet-body { display: flex; flex-direction: column; gap: var(--space-md); padding: 0 var(--space-md); }
.el-bottom-sheet { margin-top: auto; }
.fab { position: absolute; right: var(--space-md); bottom: 72px; width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--color-primary); color: var(--color-primary-text); font-size: 24px; box-shadow: 0 6px 16px rgba(0,0,0,.25); }
.snack { margin: var(--space-sm) var(--space-md); padding: 10px 14px; border-radius: var(--radius-sm); background: var(--color-text); color: var(--color-bg); font-size: 13px; display: flex; justify-content: space-between; } .snack-action { color: #9bd1ff; font-weight: 600; }
.chip { display: inline-block; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--color-border); font-size: 12px; background: var(--color-bg); } .chip.on { background: var(--color-text); color: var(--color-bg); border-color: var(--color-text); }
.search { display: flex; align-items: center; gap: var(--space-xs); margin: 0 var(--space-md); padding: 0 var(--space-sm); background: var(--color-surface); border-radius: var(--radius-md); } .search input { border: 0; background: none; } .search-icon { color: var(--color-muted); }
.stepper { display: inline-flex; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin: 0 var(--space-md); min-height: var(--k-stepper-min-height, auto); } .step-btn { padding: 4px 12px; color: var(--color-primary); } .step-val { padding: 4px 12px; border-left: 1px solid var(--color-border); border-right: 1px solid var(--color-border); min-width: 32px; text-align: center; }
.ptr { text-align: center; color: var(--color-muted); font-size: 14px; height: 20px; } .ptr.on { color: var(--color-primary); }
.el-caption[data-props*='"style":"title"'] .caption { font-size: var(--k-caption-font-size, 20px); font-weight: var(--k-caption-font-weight, 600); } .el-caption[data-props*='"style":"strong"'] .caption { font-weight: var(--k-caption-font-weight, 600); }
.el-image .img.size-sm { height: 48px; width: 48px; } .el-image .img.size-lg { height: 160px; } .el-image .img.size-full { height: 240px; width: 100%; }
.el-button[data-props*='"size":"full"'] .btn, .el-button[data-size="full"] .btn { width: calc(100% - 2 * var(--space-md)); margin: 0 var(--space-md); padding: 12px; }
.el-button[data-props*='"variant":"icon"'] .btn { border: 0; background: none; color: var(--k-button-text, var(--color-primary)); padding: 4px; }
.gesture, .navkind { display: inline-block; font-size: 10px; padding: 0 5px; border-radius: 8px; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-muted); margin-left: 4px; }
/* index cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg); }
.scard { display: block; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-md); }
.scard:hover { border-color: var(--color-primary); }
.scard .t { font-weight: 600; margin-bottom: 2px; }
.scard .m { font-size: 12px; color: var(--color-muted); margin-bottom: var(--space-sm); }
.scard .pills { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.pill.ok { background: var(--color-surface); color: var(--color-muted); border: 1px solid var(--color-border); }
table.index { width: 100%; border-collapse: collapse; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; }
table.index th, table.index td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--color-border); }
table.index th { color: var(--color-muted); font-weight: 500; font-size: 12px; }
/* the right panel in sections, as Figma's: a head with the name, then titled sections divided edge to edge */
.pn-head { display: flex; align-items: baseline; gap: var(--space-xs); font-size: 14px; padding: 0 0 var(--space-md); } .pn-head .hint { font-size: 12px; } .pn-head .close { margin-left: auto; cursor: pointer; color: var(--color-muted); }
.pn-sec { margin: 0 calc(-1 * var(--space-md)); padding: var(--space-md); border-top: 1px solid var(--color-border); }
.pn-sec > h5 { margin: 0 0 var(--space-sm); font-size: 11px; font-weight: 600; color: var(--color-text); }
.pn-sec table { margin: 0; } .pn-sec ul { margin: 0 0 var(--space-sm); } .pn-sec textarea { margin: var(--space-xs) 0; }
.pn-line { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-sm); } .pn-line > :first-child { min-width: 0; }
.pn-link { color: #2f6fed; text-decoration: none; white-space: nowrap; background: none; border: 0; padding: 0; font: inherit; cursor: pointer; } .pn-link:hover { text-decoration: underline; }
.pn-code { margin: var(--space-xs) 0 0; } .pn-note { margin: var(--space-sm) 0 0; } .pn-actions { display: flex; align-items: center; gap: var(--space-sm); margin: var(--space-xs) 0 0; }
.pn-buttons { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
/* the panel's layout editor — Figma's auto layout panel: direction icons, fields with their icon inside, a small 3x3 alignment on the right, a chip for fill; the proposal appears once something changed */
.lay-dir { display: inline-grid; grid-auto-flow: column; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; }
.lay-dir button { border: 0; width: 30px; height: 26px; background: var(--color-bg); color: var(--color-muted); font: inherit; font-size: 13px; cursor: pointer; } .lay-dir button + button { border-left: 1px solid var(--color-border); }
.lay-dir button.on { background: var(--color-text); color: var(--color-bg); }
.lay-align { display: grid; grid-template-columns: repeat(3, 16px); grid-template-rows: repeat(3, 16px); gap: var(--space-xs); padding: var(--space-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); }
.lay-align button { border: 0; padding: 0; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; } .lay-align button i { width: 4px; height: 4px; border-radius: 50%; background: var(--color-border); }
.lay-align button:hover i { background: var(--color-muted); } .lay-align button.on i { width: 10px; height: 10px; border-radius: 2px; background: #2f6fed; }
.lay-send { margin: var(--space-md) 0 0; } .lay-send[hidden] { display: none; }
/* Figma's spacing overlay on the selected frame: padding hatched, gaps filled, each with its number */
.sp-ov { position: absolute; pointer-events: none; z-index: 30; display: flex; align-items: center; justify-content: center; }
.sp-pad { background: repeating-linear-gradient(45deg, rgba(236,72,153,.28) 0 2px, rgba(236,72,153,.08) 2px 7px); }
.sp-gap { background: rgba(236,72,153,.22); }
.sp-ov span { background: #ec4899; color: #fff; font: 600 11px/1 system-ui, sans-serif; padding: 2px 4px; border-radius: 3px; }
/* the alignment box: the chosen cell shows three item bars laid out in the frame's direction */
.lay-align .bars { display: none; gap: var(--bar-gap, 1px); } .lay-align button.on i { display: none; } .lay-align button.on .bars { display: flex; }
.lay-align .bars b { display: block; background: #2f6fed; border-radius: 1px; }
.fg[data-flow="column"] .lay-align .bars, .fg[data-flow=""] .lay-align .bars { flex-direction: column; } .fg[data-flow="column"] .lay-align .bars b { width: 10px; height: 2px; } .fg[data-flow="column"] .lay-align .bars b:nth-child(2) { width: 6px; }
.fg[data-flow="row"] .lay-align .bars { flex-direction: row; align-items: flex-end; } .fg[data-flow="row"] .lay-align .bars b { width: 2px; height: 10px; } .fg[data-flow="row"] .lay-align .bars b:nth-child(2) { height: 6px; }
.fg[data-flow="grid"] .lay-align .bars { display: none; } .fg[data-flow="grid"] .lay-align button.on i { display: block; }
.fg { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-sm); align-items: start; }
.fg-flow { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); padding: 2px; background: var(--color-surface); border-radius: var(--radius-sm); }
.fg-flow button { height: 28px; border: 0; border-radius: calc(var(--radius-sm) - 1px); background: none; color: var(--color-muted); font: inherit; font-size: 14px; cursor: pointer; }
.fg-flow button.on { background: var(--color-bg); color: var(--color-text); box-shadow: 0 0 0 1px var(--color-border); }
.fg-field { display: flex; align-items: center; gap: var(--space-sm); height: 32px; padding: 0 var(--space-sm); border-radius: var(--radius-sm); background: var(--color-surface); border: 1px solid transparent; position: relative; min-width: 0; } .fg-field[hidden] { display: none; }
.fg-field:hover { border-color: var(--color-border); } .fg-field:focus-within { border-color: #2f6fed; }
.fg-field::after { content: '⌄'; position: absolute; right: var(--space-sm); top: 6px; color: var(--color-muted); pointer-events: none; } .lay-cols::after { content: none; }
.fg-k { flex: 0 0 auto; min-width: 12px; color: var(--color-muted); font-size: 11px; display: inline-flex; align-items: center; }
.drawer .fg-field select, .drawer .fg-field input { flex: 1; min-width: 0; width: auto; margin: 0; border: 0; background: none; font: inherit; font-size: 12px; color: var(--color-text); -webkit-appearance: none; appearance: none; padding: 0 14px 0 0; cursor: pointer; }
.fg-stack { display: flex; flex-direction: column; gap: var(--space-sm); }
.fg .lay-align { width: 100%; height: 72px; box-sizing: border-box; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); padding: var(--space-xs); border: 0; }
.fg .lay-send { grid-column: 1 / -1; margin: var(--space-xs) 0 0; }

.lay-live { display: flex; align-items: center; gap: var(--space-xs); margin: 0 0 var(--space-xs); color: #2f6fed; } .lay-live i { width: 6px; height: 6px; border-radius: 50%; background: #2f6fed; }
/* a proposal on the canvas: its changed elements marked, the panel's list pointing at them */
.el.ch-mark { outline: 2px dashed var(--color-primary); outline-offset: 3px; }
@keyframes ch-flash { from { box-shadow: 0 0 0 6px rgba(47,111,237,.45); } to { box-shadow: 0 0 0 0 rgba(47,111,237,0); } } .el.ch-flash { animation: ch-flash 1.2s ease-out; }
.prop-panel h4 .close { text-decoration: none; } .prop-summary { font-size: 13px; font-weight: 600; margin: 0 0 var(--space-sm); line-height: 1.45; }
.prop-sides { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; margin: 0 0 var(--space-md); }
.prop-sides a { text-align: center; padding: 6px 0; color: var(--color-muted); text-decoration: none; font-weight: 600; } .prop-sides a.on { background: var(--color-text); color: var(--color-bg); }
.drawer .changes.prop-changes { padding: 0; margin: 0; } .drawer .changes.prop-changes li { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; gap: var(--space-xs); align-items: baseline; padding: 6px 10px; }
.drawer .changes.prop-changes .ch-what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .drawer .changes.prop-changes .ch-area { margin: 0; white-space: nowrap; }
.prop-decided > summary { cursor: pointer; font-size: 11px; font-weight: 600; }
.drawer .changes li { display: block; padding: 8px 10px; line-height: 1.5; } .drawer .changes li[data-el] { cursor: pointer; } .drawer .changes li[data-el]:hover { background: var(--color-surface); }
.drawer .changes .ch-area { margin: 0 6px; } .drawer .changes code { word-break: normal; overflow-wrap: anywhere; }
/* a proposal's what-changes list: one line per change, in words; the path table folded under it */
.changes { list-style: none; margin: 0 0 var(--space-sm); padding: 0; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; }
.changes li { display: grid; grid-template-columns: 64px 48px 1fr; gap: var(--space-sm); align-items: baseline; padding: 8px 12px; border-top: 1px solid var(--color-border); } .changes li:first-child { border-top: 0; }
.ch-op { font-weight: 600; font-size: 12px; } .ch-added .ch-op { color: #1a7f37; } .ch-removed .ch-op { color: var(--color-danger); } .ch-changed .ch-op, .ch-moved .ch-op { color: var(--color-primary); }
.ch-area { color: var(--color-muted); font-size: 12px; } .ch-how { color: var(--color-text); }
.raw-diff { margin: 0 0 var(--space-md); } .raw-diff > summary { cursor: pointer; color: var(--color-muted); font-size: 12px; margin: 0 0 var(--space-xs); }
/* a proposal's what-changes table: where · AS-IS · TO-BE in fixed shares, long values wrap in their own cell */
table.diff-table { table-layout: fixed; } table.diff-table th:nth-child(1) { width: 18%; } table.diff-table th:nth-child(2), table.diff-table th:nth-child(3) { width: 41%; }
table.diff-table td { vertical-align: top; overflow-wrap: anywhere; } table.diff-table td code { white-space: pre-wrap; }
/* the spec's element table: fixed shares, so one long cell (a JSON prop) cannot squeeze the rest; id and kind keep one line, the rest wrap */
table.spec-el { table-layout: fixed; }
table.spec-el th:nth-child(1) { width: 14%; } table.spec-el th:nth-child(2) { width: 11%; } table.spec-el th:nth-child(3) { width: 27%; } table.spec-el th:nth-child(4) { width: 28%; } table.spec-el th:nth-child(5) { width: 20%; }
table.spec-el td { vertical-align: top; overflow-wrap: anywhere; }
table.spec-el td:nth-child(1), table.spec-el td:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bad { color: var(--color-danger); font-weight: 600; }

/* the workspace: the canvas page keeps the panel open and the tree on the left */
.shell.workspace { grid-template-columns: var(--side-w) minmax(0, 1fr) var(--drawer-w); }
.shell.workspace .drawer { display: block; }
.views { display: flex; gap: var(--space-xs); }
.views a { padding: 4px 10px; border-radius: 999px; font-size: 12px; color: var(--color-muted); }
.views a.current { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); }
.tree-search { display: block; width: calc(100% - 2 * var(--space-md)); margin: 0 var(--space-md) var(--space-sm); padding: 5px 8px; font-size: 12px; }
.tools { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: var(--space-xs); min-width: 0; }
.tools select { max-width: 96px; }
.tree-domain-head { display: flex; align-items: center; gap: var(--space-xs); padding: 5px var(--space-md); font-weight: 600; }
.tree-domain-head .name { flex: 1; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-domain-head .hint { font-weight: 400; }
.tree-domain.current > .tree-domain-head { box-shadow: inset 3px 0 0 var(--color-primary); background: var(--color-surface); }
.tree-domain.solo > .tree-domain-head { display: none; }
.tree-domain > .tree-body { display: none; } .tree-domain.open > .tree-body { display: block; }
.caret { width: 12px; font-size: 9px; color: var(--color-muted); cursor: pointer; text-align: center; flex: 0 0 auto; }
.caret::before { content: '\\25B8'; } .open > .tree-domain-head .caret::before, .open > .tree-screen-head .caret::before { content: '\\25BE'; }
.tree-screen-head .name { color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-screen.current > .tree-screen-head .name { font-weight: 600; }
.tree-sec { padding: var(--space-sm) var(--space-md) 2px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); }
.tree-screen-head { display: flex; align-items: center; gap: var(--space-xs); padding: 4px var(--space-md) 4px 22px; }
.tree-screen-head .hint { margin-left: auto; }
.tree-screen > .tree-states { display: none; } .tree-screen.open > .tree-states { display: block; }
.tree-frame { display: block; padding: 3px var(--space-md) 3px 30px; color: var(--color-text); font-size: 12px; }
.tree-frame:hover { background: var(--color-surface); }
.tree-frame.current { background: var(--color-surface); font-weight: 600; box-shadow: inset 3px 0 0 var(--color-primary); }
.tree-el { display: flex; align-items: center; height: 22px; padding: 0 var(--space-md) 0 20px; font-size: 11px; color: var(--color-text); cursor: pointer; white-space: nowrap; overflow: hidden; }
.tree-el .lg { flex: 0 0 14px; align-self: stretch; margin-left: 6px; border-left: 1px solid var(--color-border); }
.tree-el[hidden] { display: none; }
.tree-el .lc { flex: 0 0 14px; text-align: center; color: var(--color-muted); font-size: 11px; } .tree-el .lc:hover { color: var(--color-text); }
.tree-el .lm { flex: 0 0 16px; text-align: center; color: var(--color-muted); font-size: 10px; }
.tree-el .ln { overflow: hidden; text-overflow: ellipsis; } .tree-el .lk { margin-left: 6px; color: var(--color-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; }
.tree-el:hover { background: var(--color-surface); } .tree-el.current { background: var(--color-surface); font-weight: 600; }
.cv-body .el.hover { outline: 1px solid var(--color-primary); outline-offset: 1px; }
.cv-frame.selected .cv-body { outline: 2px solid var(--color-primary); outline-offset: 4px; }
.cv-frame.selected .cv-frame-title { color: var(--color-primary); }
/* the domain canvas — sizes are canvas pixels, scaled with the zoom, so they read like fig's page values */
.cv-main { display: flex; flex-direction: column; height: 100vh; min-height: 0; box-sizing: border-box; padding-bottom: var(--space-md); }
.cv-wrap { position: relative; flex: 1; min-height: 0; overflow: hidden; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: grab; user-select: none; }
.cv-wrap.dragging { cursor: grabbing; }
.cv-canvas { position: absolute; left: 0; top: 0; transform-origin: 0 0; --cv-col: 280px; --cv-frame: 120px; --cv-sec: 240px; --cv-pad: 96px; }
.cv-domain { display: flex; gap: var(--cv-sec); align-items: flex-start; padding: 120px; width: max-content; }
.cv-section { position: relative; padding: 112px var(--cv-pad) var(--cv-pad); border: 1px dashed var(--color-border); border-radius: 48px; background: rgba(107,114,128,.04); width: max-content; }
.cv-section-title { position: absolute; top: 32px; left: 44px; font-size: 22px; letter-spacing: .04em; text-transform: uppercase; color: var(--color-muted); white-space: nowrap; }
.cv-row { display: flex; gap: var(--cv-col); align-items: flex-start; }
.cv-col { display: flex; flex-direction: column; gap: var(--cv-frame); }
.cv-frame { position: relative; width: max-content; }
.cv-frame-title { display: block; font-size: 18px; color: var(--color-muted); margin-bottom: 8px; text-decoration: none; white-space: nowrap; }
.cv-frame-title:hover { color: var(--color-primary); }
.cv-body { background: var(--color-bg); box-shadow: 0 2px 16px rgba(0,0,0,.08); }
/* a device frame draws its own rounded bezel: nothing square behind it, and the selection follows its curve */
.cv-body:has(> .cv-stage > .frame.device-tablet) { background: none; box-shadow: none; border-radius: 24px; }
.cv-body:has(> .cv-stage > .frame.device-phone) { background: none; box-shadow: none; border-radius: 44px; }
.cv-stage { display: block; } .cv-stage .frame { transform: none !important; margin: 0 !important; box-shadow: none; }
.cv-arrows { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.cv-arrow { fill: none; stroke: var(--color-muted); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.cv-arrow.conditional { stroke-dasharray: 12 8; }
.cv-hit { fill: none; stroke: transparent; stroke-width: 24; pointer-events: stroke; cursor: default; }
.cv-label { pointer-events: all; cursor: default; }
.cv-arrow.hot { stroke: var(--color-primary); stroke-width: 6; }
.cv-label.hot rect { stroke: var(--color-primary); stroke-width: 3; fill: #eef3ff; } .cv-label.hot text { fill: var(--color-primary); font-weight: 700; }
#cv-arrow-hot path { fill: var(--color-primary); }
.cv-chain { fill: none; stroke: var(--color-muted); stroke-width: 2; stroke-dasharray: 12 8; opacity: .6; }
.cv-label rect { fill: var(--color-bg); stroke: var(--color-border); rx: 8; } .cv-back rect { fill: var(--color-surface); stroke-dasharray: 5 4; } .cv-label text { font-size: 20px; font-weight: 500; fill: var(--color-muted); }
.cv-stub text { font-size: 20px; fill: var(--color-primary); } .cv-stub a { pointer-events: auto; }
#cv-arrow path { fill: var(--color-muted); }
body.cv-no-arrows .cv-arrows { display: none; }
.cv-bar .zoom { min-width: 56px; text-align: center; cursor: default; }
/* the click-through prototype */
.proto-bar .toggle select { max-width: 200px; }
.proto-stage { position: relative; }
.proto-view .stage { margin: 0 auto; }
.proto-overlay { position: fixed; inset: 0; background: rgba(31,35,40,.45); z-index: 20; display: flex; align-items: center; justify-content: center; padding: var(--space-xl); }
.proto-overlay[hidden] { display: none; }
.proto-choose { position: fixed; z-index: 30; display: flex; flex-direction: column; gap: var(--space-xs); padding: 6px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.proto-choose .btn { text-align: left; font-size: 12px; } .proto-choose .proto-cond { border-style: dashed; }
.proto-flows { display: flex; flex-direction: column; gap: var(--space-xs); } .proto-flows .btn { text-align: left; font-size: 12px; } .proto-flows .proto-cond { border-style: dashed; }
.proto-overlay .proto-view { width: min(92vw, 720px); max-height: 92vh; overflow: auto; }
.proto-overlay .proto-view .stage { box-shadow: 0 12px 40px rgba(0,0,0,.35); }
.hotspot { cursor: pointer; }
body.show-hotspots .hotspot { outline: 2px solid var(--color-primary); outline-offset: 2px; }
body.show-hotspots .hotspot-cond { outline-style: dashed; }
/* the foot of the right panel: a fixed strip under whatever the panel shows — the apply-comments ask */
.drawer-foot { display: none; }
.shell.workspace .drawer-foot { display: block; position: fixed; right: 0; bottom: 0; width: var(--drawer-w); box-sizing: border-box; padding: var(--space-sm) var(--space-md) var(--space-md); background: var(--color-bg); border-top: 1px solid var(--color-border); border-left: 1px solid var(--color-border); z-index: 5; }
.shell.workspace:has(.drawer-foot) .drawer { padding-bottom: 96px; }
.drawer-foot { font-size: 12px; } .drawer-foot .foot-row { display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-xs); } #verdict:empty { display: none; } .drawer-foot .hint { margin: 0 0 var(--space-xs); } .drawer-foot .btn { width: 100%; }
/* the patterns page: a card per pattern, its skeleton as the stack of parts a screen is made of */
.pat-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-lg); margin: 0 0 var(--space-lg); }
.pat-card h2 { font-size: 16px; margin: 0 0 var(--space-xs); } .pat-card p { margin: 0 0 var(--space-xs); }
.pat-skeleton { display: flex; flex-direction: column; max-width: 520px; border: 1.5px solid var(--color-text); border-radius: var(--radius-md); overflow: hidden; }
.pat-slot { display: grid; grid-template-columns: 90px 1fr auto; gap: var(--space-sm); align-items: center; padding: 10px 14px; border-top: 1px solid var(--color-border); }
.pat-slot:first-child { border-top: 0; } .pat-slot.many { padding: 22px 14px; background: var(--color-surface); } .pat-slot.optional { border-top-style: dashed; color: var(--color-muted); }
.pat-screens { display: flex; flex-wrap: wrap; gap: var(--space-xs); align-items: baseline; } .pat-break { flex-basis: 100%; }
.pat-empty pre { background: var(--color-surface); padding: var(--space-md); border-radius: var(--radius-md); }
/* the component library page */
.lib { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-md) var(--space-lg); margin-bottom: var(--space-md); }
.lib h3 { margin: 0 0 2px; font-size: 15px; } .lib-meta { margin-bottom: var(--space-sm); font-size: 12px; }
.lib-row { display: flex; gap: var(--space-lg); align-items: flex-start; flex-wrap: wrap; margin: var(--space-sm) 0; }
.lib-pic { padding: var(--space-md); background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-sm); min-width: 160px; max-width: 520px; }
.lib-pic .el-modal, .lib-pic .el-confirm, .lib-pic .el-bottom-sheet { max-width: 420px; }
.lib-variants { display: flex; gap: var(--space-md); flex-wrap: wrap; } .lib-variant .hint { font-size: 11px; margin-bottom: 4px; }
.lib table.props { font-size: 12px; width: auto; min-width: 360px; } .lib table.props td { vertical-align: top; }
/* elements */
.el { position: relative; }
.dots { position: absolute; top: 2px; right: 2px; display: flex; gap: var(--space-xs); z-index: 3; pointer-events: none; }
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.dot.cond { background: var(--color-muted); }
.dot.tbd { background: var(--color-tbd-border); }
.dot.undrawn { background: transparent; box-shadow: inset 0 0 0 1.5px var(--color-danger, #d93025); }
.dot.cm { background: var(--color-primary); }
.el-card:not([data-drawn]) { padding: var(--k-card-padding, var(--space-md)); border: 1px solid var(--k-card-border, var(--color-border)); border-radius: var(--k-card-radius, var(--radius-md)); background: var(--k-card-bg, var(--color-bg)); display: flex; flex-direction: column; gap: var(--k-card-gap, var(--space-md)); box-shadow: var(--k-card-shadow, none); min-height: var(--k-card-min-height, auto); }
.el-fieldset:not([data-drawn]) { padding: var(--k-fieldset-padding, var(--space-md)); border: 1px solid var(--k-fieldset-border, var(--color-border)); border-radius: var(--k-fieldset-radius, var(--radius-md)); background: var(--k-fieldset-bg, var(--color-bg)); display: flex; flex-direction: column; gap: var(--k-fieldset-gap, var(--space-md)); }
.el-section { display: flex; flex-direction: column; gap: var(--space-md); }
.card-title, .modal-title { font-weight: 600; }
.modal-body { display: flex; flex-direction: column; gap: var(--space-md); }
.el-page-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); }
.el-page-header h2 { font-size: var(--k-page-header-font-size, 16px); font-weight: var(--k-page-header-font-weight, inherit); margin: 0; }
.ph-actions { display: flex; gap: var(--space-sm); }
.tabs { display: flex; gap: var(--space-md); margin-top: var(--space-xs); }
.el-tabs .tabs { margin-top: 0; } .el-tabs .tab { color: var(--k-tabs-muted, var(--color-muted)); } .el-tabs .tab.active { color: var(--k-tabs-text, var(--color-text)); border-bottom-color: var(--k-tabs-border, var(--color-primary)); }
.tabs .tab { padding: 0 0 2px; border-radius: 0; border: 0; border-bottom: 2px solid transparent; } .tabs .tab.active { background: none; border-bottom-color: var(--color-primary); }
.el-filter-bar, .el-group { display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap; }
.el-filter-form { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: var(--space-sm); }
.fld { display: flex; flex-direction: column; font-size: var(--k-field-font-size, 12px); color: var(--color-muted); gap: var(--space-xs); }
.el-field { display: grid; grid-template-columns: 160px 1fr; gap: var(--space-sm); align-items: start; }
.fld-label { font-weight: 500; }
input, textarea, .select { width: 100%; padding: 6px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); font: inherit; color: var(--color-text); }
input.ro { background: var(--color-surface); color: var(--color-muted); }
.select { display: inline-block; width: auto; min-width: 120px; }
.err { color: var(--color-danger); font-size: 12px; }
/* --k-<kind>-<slot> come from the kind's contract (components/<kind>.yaml); the fallback is what the set drew before contracts existed */
.btn { padding: 6px 12px; border: 1px solid var(--k-button-border, var(--color-border)); border-radius: var(--k-button-radius, var(--radius-sm)); background: var(--k-button-bg, var(--color-bg)); color: var(--k-button-text, inherit); font: inherit; font-weight: var(--k-button-font-weight, inherit); min-height: var(--k-button-min-height, auto); box-shadow: var(--k-button-shadow, none); cursor: default; }
.btn-primary { background: var(--k-button-bg, var(--color-primary)); color: var(--k-button-text, var(--color-primary-text)); border-color: var(--k-button-border, var(--color-primary)); }
.btn-soft-primary { color: var(--k-button-text, var(--color-primary)); border-color: var(--k-button-border, var(--color-primary)); }
.btn-danger { color: var(--k-button-text, var(--color-danger)); border-color: var(--k-button-border, var(--color-danger)); }
.btn-icon { border: 0; background: none; color: var(--k-button-text, var(--color-primary)); padding: 4px; }
.btn[disabled], .is-disabled > .btn, .is-disabled input { opacity: .45; }
.seg { display: inline-flex; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; }
.seg span { padding: 4px 10px; display: inline-flex; align-items: center; min-height: var(--k-segment-min-height, auto); } .seg .on { background: var(--color-primary); color: var(--color-primary-text); }
.radio { display: flex; gap: var(--space-md); } .radio label { display: inline-flex; align-items: center; gap: var(--space-xs); }
.dot-r { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--color-border); display: inline-block; } .dot-r.on { border: 4px solid var(--color-primary); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--k-table-border, var(--color-border)); }
th { color: var(--k-table-muted, var(--color-muted)); font-weight: 500; }
td .sub { color: var(--color-muted); font-size: 11px; }
.chk { width: 24px; }
.kv th { width: 30%; }
.bar { height: 8px; background: var(--color-surface); border-radius: 4px; overflow: hidden; } .bar span { display: block; height: 100%; background: var(--color-primary); }
.pager { display: flex; gap: var(--space-sm); align-items: center; } .pager .on { color: var(--color-primary); font-weight: 600; }
.notice { text-align: center; padding: var(--space-xl) var(--space-md); color: var(--color-muted); }
.notice-icon { font-size: 24px; } .notice-title { color: var(--color-text); font-weight: 600; margin-top: var(--space-xs); }
.notice.error .notice-icon { color: var(--color-danger); }
.notice-inline { margin-top: var(--space-md); padding: var(--space-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.skel { height: 14px; margin: 8px 0; border-radius: 4px; background: linear-gradient(90deg, var(--color-surface), var(--color-border), var(--color-surface)); }
.overlay-box { padding: var(--space-md); text-align: center; background: rgba(255,255,255,.8); }
.toast { display: inline-block; padding: 6px 12px; border-radius: var(--radius-sm); background: var(--color-text); color: var(--color-bg); font-size: 12px; }
.toast.error { background: var(--color-danger); }
.el-placeholder { border: 2px dashed var(--color-placeholder-border); background: var(--color-placeholder); padding: var(--space-lg); text-align: center; color: var(--color-muted); }
.ph-label { text-transform: uppercase; font-size: 11px; letter-spacing: .06em; }
.tbd { display: inline-block; padding: 1px 6px; border: 1px dashed var(--color-tbd-border); background: var(--color-tbd); border-radius: var(--radius-sm); font-size: 11px; }
.el-unknown { border: 1px dashed var(--color-border); padding: var(--space-sm); border-radius: var(--radius-sm); }
.generic-head { font-size: 11px; color: var(--color-muted); text-transform: uppercase; }
.prop { display: flex; gap: var(--space-sm); font-size: 12px; } .prop .k { color: var(--color-muted); min-width: 80px; }
.stats { display: flex; gap: var(--space-lg); flex-wrap: wrap; } .stat-v { font-size: 20px; font-weight: 600; } .stat-l { font-size: 11px; color: var(--color-muted); }
.repeat { display: flex; flex-wrap: wrap; gap: var(--space-xs); } .rep { flex: 0 0 auto; }
.el-tile .tile { width: 36px; height: 36px; display: inline-block; }
.tiles { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: var(--space-xs); }
.tile { aspect-ratio: 1; border-radius: 2px; background: var(--color-border); } .t1 { background: #9bd1a5; } .t2 { background: #5aa86b; } .t3 { background: #e0b64a; } .t4 { background: #d1434b; }
.sortable { display: flex; flex-direction: column; gap: var(--space-xs); } .sort-item { padding: var(--space-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.img { position: relative; overflow: hidden; background: var(--color-surface); border: 1px solid var(--color-border); display: grid; place-items: center; height: 80px; color: var(--color-muted); box-shadow: var(--k-image-shadow, none); }
.img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; } .img.fit-contain img { object-fit: contain; }
.ico-img { width: 1em; height: 1em; vertical-align: -0.15em; }
.ico-mask { display: inline-block; width: 1em; height: 1em; vertical-align: -0.15em; background: currentColor; -webkit-mask: var(--ico) center / contain no-repeat; mask: var(--ico) center / contain no-repeat; }
.el-image .img.is-icon { background: none; border-color: transparent; box-shadow: none; color: inherit; } .ico-fill { width: 100%; height: 100%; vertical-align: top; }
/* the tokens page: a variables table per collection; the assets page: a card per file */
.tok { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: var(--space-lg); }
.tok th, .tok td { text-align: left; padding: 6px var(--space-sm); border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.tok th { color: var(--color-muted); font-weight: 500; white-space: nowrap; }
.tok tr[data-token] { cursor: pointer; } .tok tr[data-token]:hover, .tok tr.current { background: var(--color-surface); }
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--color-border); vertical-align: -3px; margin-right: var(--space-xs); }
.dim { display: inline-block; height: 8px; background: var(--color-primary); vertical-align: middle; margin-right: var(--space-xs); border-radius: 2px; max-width: 120px; }
.alias { font-size: 11px; color: var(--color-muted); }
.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg); }
.asset { display: block; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); padding: var(--space-sm); cursor: pointer; color: var(--color-text); }
.asset:hover, .asset.current { border-color: var(--color-primary); }
.asset-pic { height: 96px; display: grid; place-items: center; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: var(--space-sm); background-color: var(--color-surface); background-image: linear-gradient(45deg, rgba(0,0,0,.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.05) 75%), linear-gradient(45deg, rgba(0,0,0,.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,.05) 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; }
.asset-pic img { max-width: 100%; max-height: 100%; }
.asset .t { font-weight: 600; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset .m { font-size: 11px; color: var(--color-muted); }
.side-link.sub { padding-left: 22px; }
/* the tokens page laid out like Figma's variables modal: collections and groups left, the table right */
.vars { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: var(--space-lg); align-items: start; }
.vars-side { position: sticky; top: 64px; }
.vars-search { width: 100%; margin: 0 0 var(--space-sm); }
.tok .grp td { font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); background: var(--color-surface); padding-top: 10px; }
.ticon { display: inline-block; width: 16px; margin-right: var(--space-xs); color: var(--color-muted); font-size: 11px; text-align: center; }
.chip { display: inline-flex; align-items: center; gap: var(--space-xs); padding: 1px 8px 1px 4px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-bg); font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.chip .swatch { margin-right: 0; }
/* narrow windows: first the inspect panel becomes a toggle, then the sidebar folds behind a menu button */
.side-toggle, .panel-toggle { display: none; }
@media (max-width: 1180px) {
  .shell.workspace { grid-template-columns: var(--side-w) minmax(0, 1fr) 0; }
  .shell.workspace .drawer { display: none; }
  body.panel-open .shell.workspace .drawer { display: block; position: fixed; right: 0; top: 0; height: 100vh; width: min(var(--drawer-w), 90vw); z-index: 40; box-shadow: -8px 0 24px rgba(0,0,0,.12); }
  .panel-toggle { display: inline-flex; }
  /* the panel's foot follows the panel: hidden with it, over it when it slides in */
  .shell.workspace .drawer-foot { display: none; }
  body.panel-open .shell.workspace .drawer-foot { display: block; width: min(var(--drawer-w), 90vw); z-index: 41; }
}
@media (max-width: 860px) {
  .shell.workspace { grid-template-columns: minmax(0, 1fr) 0; }
  .shell.workspace .side { display: none; }
  body.side-open .shell.workspace .side { display: block; position: fixed; left: 0; top: 0; height: 100vh; width: min(var(--side-w), 85vw); z-index: 40; box-shadow: 8px 0 24px rgba(0,0,0,.12); }
  .side-toggle { display: inline-flex; }
  .top { grid-template-columns: minmax(0, 1fr) auto; }
  .top .where { grid-row: 1; grid-column: 1; }
  .top .tools { grid-row: 1; grid-column: 2; }
  .top .views { grid-row: 2; grid-column: 1 / -1; justify-self: center; }
  .vars { grid-template-columns: 1fr; } .vars-side { position: static; }
}
.nav { display: flex; flex-direction: column; gap: var(--space-xs); min-width: var(--size-sm); } .nav-item { padding: 6px 10px; border-radius: var(--radius-sm); color: var(--color-muted); } .nav-item.on { background: var(--color-surface); color: var(--color-text); }
.chk-line { display: inline-flex; align-items: center; gap: var(--space-xs); } .box { width: 14px; height: 14px; border: 1px solid var(--color-border); border-radius: 3px; display: inline-block; } .box.on { background: var(--color-primary); border-color: var(--color-primary); }
.sw { display: inline-block; width: 28px; height: 16px; border-radius: 8px; background: var(--color-border); vertical-align: middle; } .sw.on { background: var(--color-primary); }
.tag { display: inline-block; padding: 0 6px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 11px; background: var(--color-surface); }
.tag.tag-colored { border-color: var(--tag); color: var(--tag); background: color-mix(in srgb, var(--tag) 10%, var(--color-bg)); }
.btn-ico { margin-right: 4px; display: inline-flex; vertical-align: -2px; } .btn-note { margin-left: var(--space-xs); font-size: 11px; color: var(--color-muted); }
.caption.style-title { font-size: var(--font-size-lg, 16px); font-weight: 600; } .caption.style-strong { font-weight: 600; }
.el-card, .el-modal { position: relative; }
.box-overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(255,255,255,.72); border-radius: inherit; z-index: 2; }
.box-toast { position: absolute; left: 50%; bottom: var(--space-md); transform: translateX(-50%); z-index: 3; }
.el-modal[data-size="sm"] { max-width: var(--size-sm); } .el-modal[data-size="md"] { max-width: var(--size-md); } .el-modal[data-size="lg"] { max-width: var(--size-lg); }
tr.row-sel td { background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg)); }
.select.is-placeholder { color: var(--color-muted); }
.applied-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 50; display: flex; gap: var(--space-sm); align-items: center; padding: var(--space-sm) var(--space-sm) var(--space-sm) var(--space-md); border-radius: var(--radius-md); background: #1f2329; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
.agent-line { font-size: 11px; } .agent-line.on { color: var(--color-success, #1a7f37); }
.applied-toast .btn { color: var(--color-text); background: var(--color-bg); }
.lint-pill { cursor: pointer; border: 0; font: inherit; } .lint-panel li.is-block b { color: var(--color-danger); }
.notice-page { padding: var(--space-xl); max-width: 560px; } .notice-page p { margin: 0 0 var(--space-md); }
.img-name { font-size: 12px; padding: 0 var(--space-xs); text-align: center; }
.row { display: flex; gap: var(--space-sm); align-items: center; } .row.end { justify-content: flex-end; }
.el.selected { outline: 2px solid var(--color-primary); outline-offset: 2px; }
body.dev .el::before { content: attr(data-path); position: absolute; top: -8px; left: 0; font-size: 9px; background: var(--color-text); color: var(--color-bg); padding: 0 4px; border-radius: 2px; z-index: 2; pointer-events: none; }

/* contract bindings for the rest of the set: every slot a bundled contract declares is read here, scoped by kind, with the old value as fallback */
.el-page-header h2 { color: var(--k-page-header-text, inherit); }
.el-hint .hint { font-size: var(--k-hint-font-size, 12px); }
.cell-value { margin-left: auto; font-weight: 600; white-space: nowrap; }
.el-section > .section-title { color: var(--k-section-text, inherit); }
.el-segmented .seg { border-color: var(--k-segmented-border, var(--color-border)); border-radius: var(--k-segmented-radius, var(--radius-sm)); } .el-segmented .seg .on { background: var(--k-segmented-bg, var(--color-primary)); color: var(--k-segmented-text, var(--color-primary-text)); }
.el-button-group .seg { border-color: var(--k-button-group-border, var(--color-border)); } .el-button-group .seg .on { background: var(--k-button-group-bg, var(--color-primary)); color: var(--k-button-group-text, var(--color-primary-text)); }
.el-segment .seg { border-color: var(--k-segment-border, var(--color-border)); border-radius: var(--k-segment-radius, var(--radius-sm)); }
/* a segment's options: gap binds them apart, idle fills the ones not chosen, each takes the segment's radius — the chosen one reads as a pill */
.el-segment .seg { gap: var(--k-segment-gap, 0px); overflow: visible; flex-wrap: wrap; } .el-segment .seg span { background: var(--k-segment-idle, transparent); border-radius: var(--k-segment-radius, 0); justify-content: center; padding: 4px var(--k-segment-padding, 10px); white-space: nowrap; flex: 0 0 auto; }
/* an option not chosen reads the segment's second text colour */ .el-segment .seg span:not(.on) { color: var(--k-segment-muted, inherit); }
/* padding on a segment is each option's side margin — with a short label and a tall control, it is what keeps a pill a pill and not a circle */ .el-segment .seg .on { background: var(--k-segment-bg, var(--color-primary)); color: var(--k-segment-text, var(--color-primary-text)); }
.el-pagination .pager .on { color: var(--k-pagination-text, var(--color-primary)); }
.el-detail-card th, .el-detail-card td { border-bottom-color: var(--k-detail-card-border, var(--color-border)); } .el-detail-card th { color: var(--k-detail-card-muted, var(--color-muted)); }
.el-kv-table th, .el-kv-table td { border-bottom-color: var(--k-kv-table-border, var(--color-border)); } .el-kv-table th { color: var(--k-kv-table-muted, var(--color-muted)); }
.el-empty-notice .notice { color: var(--k-empty-notice-muted, var(--color-muted)); } .el-empty-notice .notice-title { color: var(--k-empty-notice-text, var(--color-text)); }
.el-error-notice .notice { color: var(--k-error-notice-muted, var(--color-muted)); } .el-error-notice .notice-title { color: var(--k-error-notice-text, var(--color-text)); } .el-error-notice .notice-icon { color: var(--k-error-notice-accent, var(--color-danger)); }
.el-skeleton .skel { background: linear-gradient(90deg, var(--k-skeleton-bg, var(--color-surface)), var(--k-skeleton-border, var(--color-border)), var(--k-skeleton-bg, var(--color-surface))); }
.el-overlay .overlay-box { background: var(--k-overlay-bg, rgba(255,255,255,.8)); color: var(--k-overlay-text, inherit); }
.el-toast .toast { background: var(--k-toast-bg, var(--color-text)); color: var(--k-toast-text, var(--color-bg)); border-radius: var(--k-toast-radius, var(--radius-sm)); } .el-toast .toast.error { background: var(--k-toast-bg, var(--color-danger)); }
/* only what grows may shrink: a row of buttons keeps its height when a list below scrolls */
.view-root .el { flex-shrink: 0; }
/* a full-width picture fills its row whatever the alignment of the box it sits in */
.el-image[data-size="full"] { align-self: stretch; }
/* a card or modal a library drew is one root inside its wrapper: it fills the wrapper; the layout's alignment is for its children (.lay-body) */
.el-card[data-drawn], .el-modal[data-drawn] { align-items: stretch !important; justify-content: flex-start !important; }
.ctx-menu { position: fixed; z-index: 1000; background: #fff; border: 1px solid #d9dbe0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.14); padding: 4px; display: flex; flex-direction: column; min-width: 180px; font: 13px/1.4 system-ui, sans-serif; }
.ctx-menu button { text-align: left; background: none; border: 0; padding: 6px 10px; border-radius: 4px; cursor: pointer; color: #1f2328; } .ctx-menu button:hover { background: #f1f3f5; }
.inst-path { font-size: 12px; } .inst-path a { color: #2f6fed; text-decoration: none; }
/* a component as a design system's page reads: name and code tag, what it is for, picture, anatomy, usage */
.lib-head { display: flex; align-items: baseline; gap: var(--space-sm); } .lib-head h3 { margin: 0; }
.lib-code { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-muted); background: var(--color-surface); padding: 2px 6px; border-radius: var(--radius-sm); }
.lib-desc { margin: var(--space-xs) 0 var(--space-md); font-size: 14px; color: var(--color-text); }
.lib-anat { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-xs) var(--space-md); margin: var(--space-md) 0 0; font-size: 13px; }
.lib-part { display: inline-flex; align-items: center; gap: var(--space-xs); } .lib-part i { font-style: normal; font-size: 11px; width: 16px; height: 16px; border-radius: 50%; background: var(--color-text); color: var(--color-bg); display: inline-flex; align-items: center; justify-content: center; }
.lib-usage { display: flex; flex-direction: column; gap: var(--space-xs); margin: var(--space-sm) 0 0; font-size: 13px; }
.lib-k { color: var(--color-muted); font-size: 12px; margin-right: var(--space-sm); min-width: 64px; display: inline-block; }
/* the components page in groups: used here first, by category; the bundled rest folded */
.lib-group { margin: 0 0 var(--space-lg); } .lib-group > h2, .lib-group > summary { font-size: 15px; margin: 0 0 var(--space-sm); cursor: pointer; } .lib-group > summary { list-style: none; } .lib-group > summary::before { content: '▸  '; color: var(--color-muted); } .lib-group[open] > summary::before { content: '▾  '; }
.lib-cat { font-size: 12px; font-weight: 600; color: var(--color-muted); margin: var(--space-lg) 0 var(--space-sm); padding-bottom: 4px; border-bottom: 1px solid var(--color-border); scroll-margin-top: 16px; }
.lib-cat .n { font-weight: 400; margin-left: 4px; }
.lib-more { margin-top: var(--space-sm); } .lib-more > summary { font-size: 12px; color: var(--color-muted); cursor: pointer; }
.side-link.subsub { padding-left: 40px; font-size: 12px; color: var(--color-muted); } .side-link.subsub:hover { color: var(--color-text); }
.b-role { font-size: 11px; color: #6b7280; margin: 12px 0 6px; font-family: system-ui, sans-serif; }
.board .section-title { scroll-margin-top: 16px; }
.lib:target { outline: 2px solid #2f6fed; outline-offset: 2px; scroll-margin-top: 16px; }
.lay-body, .el-modal:not([data-drawn]) > .modal-body { display: flex; flex-direction: var(--lay-dir, column); gap: var(--lay-gap, 0); align-items: var(--lay-align, stretch); }
.el-modal[data-drawn] > * { box-shadow: var(--k-modal-shadow, 0 8px 32px rgba(0,0,0,.25)); }
.el-modal:not([data-drawn]) { background: var(--k-modal-bg, var(--color-bg)); color: var(--k-modal-text, inherit); border-radius: var(--k-modal-radius, var(--radius-md)); padding: var(--k-modal-padding, 0); box-shadow: var(--k-modal-shadow, none); }
.el-confirm .confirm { background: var(--k-confirm-bg, var(--color-bg)); color: var(--k-confirm-text, inherit); border-radius: var(--k-confirm-radius, var(--radius-md)); }
.el-field .fld-label { color: var(--k-field-text, inherit); } .el-field .hint { color: var(--k-field-muted, var(--color-muted)); } .el-field .err { color: var(--k-field-accent, var(--color-danger)); }
.el-input input { background: var(--k-input-bg, var(--color-bg)); color: var(--k-input-text, var(--color-text)); border-color: var(--k-input-border, var(--color-border)); border-radius: var(--k-input-radius, var(--radius-sm)); }
.el-number input { background: var(--k-number-bg, var(--color-bg)); color: var(--k-number-text, var(--color-text)); border-color: var(--k-number-border, var(--color-border)); border-radius: var(--k-number-radius, var(--radius-sm)); }
.el-textarea textarea { background: var(--k-textarea-bg, var(--color-bg)); color: var(--k-textarea-text, var(--color-text)); border-color: var(--k-textarea-border, var(--color-border)); border-radius: var(--k-textarea-radius, var(--radius-sm)); }
.el-select .select { background: var(--k-select-bg, var(--color-bg)); color: var(--k-select-text, var(--color-text)); border-color: var(--k-select-border, var(--color-border)); border-radius: var(--k-select-radius, var(--radius-sm)); }
.el-date .select { background: var(--k-date-bg, var(--color-bg)); color: var(--k-date-text, var(--color-text)); border-color: var(--k-date-border, var(--color-border)); border-radius: var(--k-date-radius, var(--radius-sm)); }
.el-date-range .select { background: var(--k-date-range-bg, var(--color-bg)); color: var(--k-date-range-text, var(--color-text)); border-color: var(--k-date-range-border, var(--color-border)); border-radius: var(--k-date-range-radius, var(--radius-sm)); }
.el-upload .btn { background: var(--k-upload-bg, var(--color-bg)); color: var(--k-upload-text, inherit); border-color: var(--k-upload-border, var(--color-border)); border-radius: var(--k-upload-radius, var(--radius-sm)); }
.el-search-bar .search { background: var(--k-search-bar-bg, var(--color-surface)); color: var(--k-search-bar-text, inherit); border-radius: var(--k-search-bar-radius, var(--radius-md)); } .el-search-bar .search-icon { color: var(--k-search-bar-muted, var(--color-muted)); }
.el-radio { color: var(--k-radio-text, inherit); } .el-radio .dot-r { border-color: var(--k-radio-border, var(--color-border)); } .el-radio .dot-r.on { border-color: var(--k-radio-accent, var(--color-primary)); }
.el-nav .nav-item { color: var(--k-nav-muted, var(--color-muted)); border-radius: var(--k-nav-radius, var(--radius-sm)); } .el-nav .nav-item.on { background: var(--k-nav-bg, var(--color-surface)); color: var(--k-nav-text, var(--color-text)); }
.el-checkbox .box { border-color: var(--k-checkbox-border, var(--color-border)); } .el-checkbox .box.on { background: var(--k-checkbox-accent, var(--color-primary)); border-color: var(--k-checkbox-accent, var(--color-primary)); }
.el-switch .sw { background: var(--k-switch-border, var(--color-border)); } .el-switch .sw.on { background: var(--k-switch-accent, var(--color-primary)); }
.el-tag .tag { background: var(--k-tag-bg, var(--color-surface)); color: var(--k-tag-text, inherit); border-color: var(--k-tag-border, var(--color-border)); border-radius: var(--k-tag-radius, var(--radius-sm)); }
.el-caption .caption { color: var(--k-caption-text, inherit); }
.el-hint .hint { color: var(--k-hint-text, var(--color-muted)); }
.el-divider hr { border-color: var(--k-divider-border, var(--color-border)); }
.el-stat-strip .stat-v { color: var(--k-stat-strip-text, inherit); } .el-stat-strip .stat-l { color: var(--k-stat-strip-muted, var(--color-muted)); }
.el-tooltip .hint { color: var(--k-tooltip-text, var(--color-muted)); }
.el-image .img { background: var(--k-image-bg, var(--color-surface)); border-color: var(--k-image-border, var(--color-border)); }
.el-tile .tile.t0, .el-tile-grid .tile.t0 { background: var(--k-tile-border, var(--k-tile-grid-border, var(--color-border))); }
.el-placeholder { border-color: var(--k-placeholder-border, var(--color-placeholder-border)); background: var(--k-placeholder-bg, var(--color-placeholder)); color: var(--k-placeholder-text, var(--color-muted)); }
.el-sortable-list .sort-item { border-color: var(--k-sortable-list-border, var(--color-border)); border-radius: var(--k-sortable-list-radius, var(--radius-sm)); }
.el-progress .bar { background: var(--k-progress-bg, var(--color-surface)); } .el-progress .bar span { background: var(--k-progress-accent, var(--color-primary)); }
.el-app-bar { background: var(--k-app-bar-bg, transparent); color: var(--k-app-bar-text, inherit); } .el-app-bar .ab-back { color: var(--k-app-bar-accent, var(--color-primary)); }
.el-tab-bar .tb { background: var(--k-tab-bar-bg, var(--color-bg)); border-top-color: var(--k-tab-bar-border, var(--color-border)); } .el-tab-bar .tb-item { color: var(--k-tab-bar-muted, var(--color-muted)); } .el-tab-bar .tb-item.on { color: var(--k-tab-bar-accent, var(--color-primary)); }
.el-list-cell .cell { background: var(--k-list-cell-bg, transparent); color: var(--k-list-cell-text, inherit); border-bottom-color: var(--k-list-cell-border, var(--color-border)); } .el-list-cell .cell-sub { color: var(--k-list-cell-muted, var(--color-muted)); }
.el-bottom-sheet .sheet { background: var(--k-bottom-sheet-bg, var(--color-bg)); border-radius: var(--k-bottom-sheet-radius, var(--radius-md)) var(--k-bottom-sheet-radius, var(--radius-md)) 0 0; } .el-bottom-sheet .sheet-handle { background: var(--k-bottom-sheet-border, var(--color-border)); }
.el-fab .fab { background: var(--k-fab-bg, var(--color-primary)); color: var(--k-fab-text, var(--color-primary-text)); }
.el-snackbar .snack { background: var(--k-snackbar-bg, var(--color-text)); color: var(--k-snackbar-text, var(--color-bg)); border-radius: var(--k-snackbar-radius, var(--radius-sm)); }
.el-chip .chip { background: var(--k-chip-bg, var(--color-bg)); color: var(--k-chip-text, inherit); border-color: var(--k-chip-border, var(--color-border)); } .el-chip .chip.on { background: var(--k-chip-bg, var(--color-text)); color: var(--k-chip-text, var(--color-bg)); border-color: var(--k-chip-border, var(--color-text)); }
.el-stepper .stepper { border-color: var(--k-stepper-border, var(--color-border)); border-radius: var(--k-stepper-radius, var(--radius-sm)); } .el-stepper .step-btn { color: var(--k-stepper-text, var(--color-primary)); } .el-stepper .step-val { border-color: var(--k-stepper-border, var(--color-border)); }
.el-pull-to-refresh .ptr { color: var(--k-pull-to-refresh-text, var(--color-muted)); } .el-pull-to-refresh .ptr.on { color: var(--k-pull-to-refresh-accent, var(--color-primary)); }
.el-sheet-handle .sheet-handle { background: var(--k-sheet-handle-bg, var(--color-border)); }

/* drawer */
.drawer { position: sticky; top: 0; height: 100vh; overflow: auto; background: var(--color-bg); border-left: 1px solid var(--color-border); padding: var(--space-md); font-size: 12px; display: none; }
.shell.drawer-open .drawer { display: block; }
.drawer h4 { margin: 0 0 var(--space-xs); font-size: 13px; display: flex; align-items: center; gap: var(--space-sm); }
.drawer h4 .close { margin-left: auto; cursor: pointer; color: var(--color-muted); font-weight: 400; }
.drawer .k { color: var(--color-muted); }
/* fixed shares: a long JSON prop wraps inside its cell instead of widening the panel */
.drawer table { font-size: 12px; table-layout: fixed; } .drawer th { width: 34%; vertical-align: top; } .drawer td { overflow-wrap: anywhere; vertical-align: top; }
.drawer code { background: var(--color-surface); padding: 1px 4px; border-radius: 3px; word-break: break-all; }
.drawer textarea, .drawer input { width: 100%; margin: 4px 0; }
.drawer .cond-line { color: var(--color-muted); }
.drawer ul { padding-left: var(--space-md); margin: var(--space-xs) 0; }
`;

export const INSPECTOR_JS = `
(function () {
  var shell = document.querySelector('.shell');
  var panel = document.getElementById('inspector');
  // the file an element comes from: its frame's on the canvas, the page's on a screen page
  function fileOf(el) { var f = el && el.closest('[data-file]:not([data-file=""])'); return f ? f.getAttribute('data-file') : ''; }
  var api = window.DOAN_API === true;
  var comments = window.DOAN_COMMENTS || [];
  var T = window.DOAN_I18N || {};
  function t(k, d) { return T[k] || d; }
  var selected = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // fit: each stage scales its reference-width frame to the width it has
  function fit() {
    document.querySelectorAll('.stage').forEach(function (stage) {
      var frame = stage.querySelector('.frame'); if (!frame) return;
      frame.style.transform = 'none';
      var w = stage.clientWidth; var ref = frame.offsetWidth || 1280;
      var s = Math.min(1, w / ref);
      frame.style.transform = 'scale(' + s + ')';
      // a device frame sits in a margin the transform does not scale; the stage must hold the
      // frame *and* that margin or the bottom bezel is cut. Centre it by hand: scale() shrinks
      // from the top-left, so margin:auto would leave it off-centre.
      var cs = getComputedStyle(frame);
      var my = (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      if (frame.classList.contains('device-phone') || frame.classList.contains('device-tablet')) {
        var mx = Math.max(0, (w - ref * s) / 2) + 'px';
        frame.style.marginLeft = mx; frame.style.marginRight = mx;
      }
      stage.style.height = Math.ceil(frame.offsetHeight * s + my) + 'px';
    });
  }
  window.addEventListener('resize', fit);
  window.doanFit = fit; // the prototype page re-fits a view it has just shown

  // state tabs and compare toggle
  var states = document.querySelector('.states');
  document.querySelectorAll('.tab[data-state]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab[data-state]').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.state').forEach(function (s) { s.classList.remove('active'); });
      tab.classList.add('active');
      var target = document.getElementById(tab.getAttribute('data-target'));
      if (target) target.classList.add('active');
      fit();
    });
  });
  var compare = document.getElementById('compare');
  if (compare && states) compare.addEventListener('change', function () { states.classList.toggle('compare', compare.checked); fit(); });

  // mode selects: a token resolver axis (theme: light | dark) becomes data-<axis> on <html>,
  // which switches the custom properties to that context's set. Remembered per browser.
  document.querySelectorAll('select[data-mode]').forEach(function (sel) {
    var axis = sel.getAttribute('data-mode'); var key = 'doan.mode.' + axis; var saved = null;
    try { saved = localStorage.getItem(key); } catch (e) {}
    if (saved && Array.prototype.some.call(sel.options, function (o) { return o.value === saved; })) sel.value = saved;
    document.documentElement.setAttribute('data-' + axis, sel.value);
    sel.addEventListener('change', function () {
      document.documentElement.setAttribute('data-' + axis, sel.value);
      try { localStorage.setItem(key, sel.value); } catch (e) {}
    });
  });

  // comment dots on elements that have comments
  // a comment belongs to one screen; on a canvas that holds several, it lands only in that screen's frames
  function sameScreen(c, node) { if (!c.screen) return true; var f = node.closest('[data-screen]'); return !f || f.getAttribute('data-screen') === c.screen; }
  comments.forEach(function (c) {
    // by the element's id when the comment has one — a path moves, an id does not
    document.querySelectorAll(c.element ? '.el[data-id="' + c.element + '"]' : '.el[data-path="' + c.path + '"]').forEach(function (el) {
      if (!sameScreen(c, el)) return;
      var dots = el.querySelector(':scope > .dots'); if (!dots) { dots = document.createElement('span'); dots.className = 'dots'; el.appendChild(dots); }
      if (!dots.querySelector('.cm')) { var d = document.createElement('i'); d.className = 'dot cm'; d.title = c.author + ': ' + c.text; dots.appendChild(d); }
    });
  });

  // the instance chain, as Figma shows it: an element drawn inside a compound (card/label) lists the
  // compound first — each a link to its contract on the components page
  function instancePath(el) {
    var chain = [], n = el;
    while (n) {
      var kind = n.getAttribute('data-kind');
      if (kind) chain.unshift('<a href="components.html#k-' + esc(kind) + '">\u25c7 ' + esc(kind) + '</a>');
      var id = n.getAttribute('data-id') || '';
      if (id.indexOf('/') < 0) break;
      var owner = id.slice(0, id.lastIndexOf('/'));
      n = document.querySelector('.el[data-id="' + owner + '"]');
    }
    return chain.join(' \u203a ');
  }
  // right click on an element: go to its main component, select it, copy where it is written
  var ctx = null;
  function closeCtx() { if (ctx) { ctx.remove(); ctx = null; } }
  document.addEventListener('contextmenu', function (e) {
    if (document.body.getAttribute('data-mode') === 'proto') return;
    var el = e.target.closest && e.target.closest('.el[data-kind]');
    if (!el) return;
    e.preventDefault(); closeCtx();
    ctx = document.createElement('div'); ctx.className = 'ctx-menu';
    var items = [
      ['\u25c7 ' + t('goToComponent', 'Go to main component'), function () { location.href = 'components.html#k-' + el.getAttribute('data-kind'); }],
      [t('selectIt', 'Select'), function () { openDrawer(el); }],
      [t('copy', 'copy path:line'), function () { if (navigator.clipboard) navigator.clipboard.writeText(fileOf(el) + ':' + (el.getAttribute('data-line') || '') + '  ' + el.getAttribute('data-path')); }],
    ];
    items.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.textContent = it[0]; b.addEventListener('click', function (ev) { ev.stopPropagation(); closeCtx(); it[1](); }); ctx.appendChild(b); });
    ctx.style.left = e.clientX + 'px'; ctx.style.top = e.clientY + 'px';
    document.body.appendChild(ctx);
  });
  document.addEventListener('click', closeCtx);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCtx(); });
  // the layout of the selected element, as Figma's auto layout panel shows it: direction, gap,
  // padding, a 3x3 alignment, width and fill. Picking a value marks it changed; "Propose this layout"
  // turns the element's rule into a proposal (POST /api/layout) and opens it on the canvas, where
  // the person applies it as any other. A compound's parts are its component's to arrange.
  function sec(title, body) { return '<section class="pn-sec"><h5>' + title + '</h5>' + body + '</section>'; }
  function flowOf(r) { return r.kind === 'grid' || r.kind === 'columns' ? 'grid' : r.kind === 'row' || (r.kind === 'stack' && r.direction === 'row') ? 'row' : r.kind === 'stack' ? 'column' : ''; }
  // Layout as Figma UI3 draws it (Auto layout for a frame that holds others, Layout for any other
  // layer): the flow buttons (none · vertical · horizontal · grid) in one grey group; W and H as fields
  // showing Hug, Fill or the fixed width; the 3x3 alignment box beside the gap; horizontal and vertical
  // padding. Figma's words, untranslated. Values map onto the file: size, grow, kind, gap, padding.
  function layoutSection(el) {
    if (el.getAttribute('data-layout-owner') === 'component') return sec(t('pnLayout', 'Layout'), '<p class="hint">' + t('layOwner', 'arranged by its component') + '</p>');
    var raw = el.getAttribute('data-layout'); if (raw === null) return '';
    var r = {}; try { r = JSON.parse(raw || '{}'); } catch (_) {}
    var box = !!el.querySelector('.el');
    var space = window.DOAN_SPACE || [];
    function num(v) { return String(v || '').replace('px', ''); }
    function opts(cur) { return '<option value="0">0</option>' + space.map(function (s) { return '<option value="' + esc(s.name) + '"' + (s.name === cur ? ' selected' : '') + '>' + esc(num(s.value)) + '</option>'; }).join(''); }
    function px(z) { return num((getComputedStyle(document.documentElement).getPropertyValue('--size-' + z) || '').trim()) || z; }
    function fieldSel(k, icon, tip, inner) { return '<label class="fg-field" title="' + tip + '"><span class="fg-k">' + icon + '</span><select data-k="' + k + '">' + inner + '</select></label>'; }
    var w = r.size === 'full' ? 'fill' : r.size ? r.size : 'hug', hh = r.grow ? 'fill' : 'hug';
    var pad = [].concat(r.padding === undefined ? [] : r.padding), pv = pad.length ? String(pad[0]) : '0', ph = pad.length ? String(pad[pad.length > 1 ? 1 : 0]) : '0';
    var f = flowOf(r), cells = '', A = ['start', 'center', 'end'];
    for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) cells += '<button type="button" title="' + A[x] + ' ' + A[y] + '" data-a="' + A[x] + '" data-j="' + A[y] + '"' + (r.align === A[x] && r.justify === A[y] ? ' class="on"' : '') + '><i></i><span class="bars"><b></b><b></b><b></b></span></button>';
    var dirs = [['', '⁘', 'No auto layout'], ['column', '↓', 'Vertical layout'], ['row', '→', 'Horizontal layout'], ['grid', '▦', 'Grid']];
    var rows = '';
    if (box) rows += '<div class="fg-flow" data-k="flow">' + dirs.map(function (d) { return '<button type="button" data-v="' + d[0] + '" title="' + d[2] + '"' + (d[0] === f ? ' class="on"' : '') + '>' + d[1] + '</button>'; }).join('') + '</div>';
    rows += fieldSel('w', 'W', 'Width', '<option value="hug"' + (w === 'hug' ? ' selected' : '') + '>Hug</option><option value="fill"' + (w === 'fill' ? ' selected' : '') + '>Fill</option>' + ['sm', 'md', 'lg'].map(function (z) { return '<option value="' + z + '"' + (w === z ? ' selected' : '') + '>' + esc(px(z)) + '</option>'; }).join(''));
    rows += fieldSel('h', 'H', 'Height', '<option value="hug"' + (hh === 'hug' ? ' selected' : '') + '>Hug</option><option value="fill"' + (hh === 'fill' ? ' selected' : '') + '>Fill</option>');
    if (box) {
      rows += '<div class="lay-align" title="Alignment">' + cells + '</div>';
      rows += '<div class="fg-stack">' + fieldSel('gap', f === 'row' ? '⇆' : '⇅', 'Gap between items', opts(r.gap || '0')) + '<label class="fg-field lay-cols" title="Columns"' + (f === 'grid' ? '' : ' hidden') + '><span class="fg-k">≡</span><input type="number" min="1" max="12" data-k="columns" value="' + esc(typeof r.columns === 'number' ? r.columns : '') + '"></label></div>';
      rows += fieldSel('pad-h', '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="M1.5 1v10M10.5 1v10"/><rect x="4" y="4" width="4" height="4" rx="1"/></svg>', 'Horizontal padding', opts(ph)) + fieldSel('pad-v', '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="M1 1.5h10M1 10.5h10"/><rect x="4" y="4" width="4" height="4" rx="1"/></svg>', 'Vertical padding', opts(pv));
    }
    return sec(box ? t('pnAutoLayout', 'Auto layout') : t('pnLayout', 'Layout'), '<div id="lay-edit" class="fg" data-flow="' + (f || 'column') + '">' + rows +
      (api ? '<div class="lay-send" hidden><p class="lay-live"><i></i>' + t('layPreview', 'previewing') + '</p><div class="pn-actions"><button class="btn btn-primary" id="lay-send" type="button">' + t('laySend', 'Propose this layout') + '</button><button class="pn-link" id="lay-reset" type="button">' + t('layReset', 'reset') + '</button><span class="hint" id="lay-state"></span></div></div>' : '') +
      '</div>');
  }
  // Figma's spacing overlay: the selected frame's padding and the gaps between its items, drawn over the
  // picture with their sizes. Redrawn after a preview; gone when something else is selected.
  function clearSpacing() { document.querySelectorAll('.sp-ov').forEach(function (n) { n.remove(); }); }
  function drawSpacing(el) {
    clearSpacing();
    var kids = Array.prototype.filter.call(el.querySelectorAll('.el'), function (k) { return k.parentElement.closest('.el') === el; });
    if (!kids.length) return;
    // drawn on a layer of its own, never inside the picture: the canvas (so it pans and zooms with it),
    // else the stage, else the page — the element and its children are not touched
    var host = el.closest('.cv-canvas') || el.closest('.stage') || document.body;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var hr = host.getBoundingClientRect(), hs = hr.width / (host.offsetWidth || hr.width || 1);
    var er = el.getBoundingClientRect(), es = er.width / (el.offsetWidth || er.width || 1), cs = getComputedStyle(el);
    function band(x, y, w, h, label, cls) {
      if (w < 0.5 || h < 0.5) return;
      var d = document.createElement('div'); d.className = 'sp-ov ' + cls;
      d.style.left = (er.left - hr.left + x) / hs + 'px'; d.style.top = (er.top - hr.top + y) / hs + 'px';
      d.style.width = w / hs + 'px'; d.style.height = h / hs + 'px';
      if (label !== '') { var t2 = document.createElement('span'); t2.textContent = label; t2.style.transform = 'scale(' + (1 / hs) + ')'; d.appendChild(t2); }
      host.appendChild(d);
    }
    var W = er.width, H = er.height;
    var pt = (parseFloat(cs.paddingTop) || 0) * es, pr = (parseFloat(cs.paddingRight) || 0) * es, pb = (parseFloat(cs.paddingBottom) || 0) * es, pl = (parseFloat(cs.paddingLeft) || 0) * es;
    band(0, 0, W, pt, pt ? Math.round(pt / es) : '', 'sp-pad'); band(0, H - pb, W, pb, '', 'sp-pad');
    band(0, pt, pl, H - pt - pb, pl && !pt ? Math.round(pl / es) : '', 'sp-pad'); band(W - pr, pt, pr, H - pt - pb, '', 'sp-pad');
    var rects = kids.map(function (k) { var r = k.getBoundingClientRect(); return { x: r.left - er.left, y: r.top - er.top, w: r.width, h: r.height }; });
    var row = /row/.test(cs.flexDirection) && cs.display.indexOf('flex') >= 0;
    for (var i = 0; i + 1 < rects.length; i++) {
      var a = rects[i], b = rects[i + 1];
      if (row && b.x > a.x + a.w) band(a.x + a.w, pt, b.x - a.x - a.w, H - pt - pb, Math.round((b.x - a.x - a.w) / es), 'sp-gap');
      else if (!row && b.y > a.y + a.h) band(pl, a.y + a.h, W - pl - pr, b.y - a.y - a.h, Math.round((b.y - a.y - a.h) / es), 'sp-gap');
    }
  }
  function wireLayout(el) {
    var box = document.getElementById('lay-edit'); if (!box) return;
    var r = {}; try { r = JSON.parse(el.getAttribute('data-layout') || '{}'); } catch (_) {}
    var next = JSON.parse(JSON.stringify(r)), send = document.getElementById('lay-send'), bar = box.querySelector('.lay-send');
    // live preview: every copy of this element on the page (each state's frame) takes the style the rule draws
    function restore() { if (window.doanLayPrev) { window.doanLayPrev.forEach(function (p) { if (p[1] === null) p[0].removeAttribute('style'); else p[0].setAttribute('style', p[1]); }); window.doanLayPrev = null; } }
    restore();
    var scr = el.closest('[data-screen]') ? el.closest('[data-screen]').getAttribute('data-screen') : null;
    var copies = Array.prototype.slice.call(document.querySelectorAll((scr && document.querySelector('.cv-frame') ? '.cv-frame[data-screen="' + scr + '"] ' : '') + '.el[data-id="' + el.getAttribute('data-id') + '"]'));
    var holds = !!el.querySelector('.el'), timer = null;
    if (holds) drawSpacing(el); else clearSpacing();
    function preview() {
      if (!window.DOAN_API) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fetch('/api/layout-style', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rule: next, container: holds }) })
          .then(function (res) { return res.json(); }).then(function (j) {
            if (!window.doanLayPrev) window.doanLayPrev = copies.map(function (c) { return [c, c.getAttribute('style')]; });
            copies.forEach(function (c) { c.setAttribute('style', j.style || ''); });
            if (holds) setTimeout(function () { drawSpacing(el); }, 30);
          });
      }, 60);
    }
    function changed() { var same = JSON.stringify(next) === JSON.stringify(r); if (bar) bar.hidden = same; if (same) { restore(); if (holds) drawSpacing(el); } else preview(); }
    box.querySelectorAll('.fg-flow button').forEach(function (b) {
      b.addEventListener('click', function () {
        box.querySelectorAll('.fg-flow button').forEach(function (x) { x.classList.toggle('on', x === b); });
        var v = b.getAttribute('data-v');
        delete next.direction; delete next.columns;
        if (v === 'grid') { next.kind = 'grid'; next.columns = Number((box.querySelector('[data-k="columns"]') || {}).value) || 2; }
        else if (v === 'row') { next.kind = 'stack'; next.direction = 'row'; }
        else if (v === 'column') { next.kind = 'stack'; next.direction = 'column'; }
        else { delete next.kind; delete next.gap; delete next.padding; delete next.align; delete next.justify; }
        var cols = box.querySelector('.lay-cols'); if (cols) cols.hidden = v !== 'grid';
        box.setAttribute('data-flow', v);
        changed();
      });
    });
    box.querySelectorAll('select[data-k], input[data-k]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var k = inp.getAttribute('data-k'), v = inp.type === 'number' ? Number(inp.value) || null : inp.value;
        // W and H in Figma's words, onto the file's vocabulary: Fill container is size: full (W) or grow (H)
        if (k === 'w') { k = 'size'; v = v === 'hug' ? '' : v === 'fill' ? 'full' : v; }
        if (k === 'h') { k = 'grow'; v = v === 'fill' ? true : ''; }
        if (k === 'gap' && v === '0') v = '';
        // padding: Figma's horizontal and vertical fields onto one token, or [vertical, horizontal]
        if (k === 'pad-h' || k === 'pad-v') {
          var hv = box.querySelector('[data-k="pad-h"]').value, vv = box.querySelector('[data-k="pad-v"]').value;
          k = 'padding'; v = hv === '0' && vv === '0' ? '' : hv === vv ? hv : [vv, hv];
        }
        if (v === '' || v === null) delete next[k]; else next[k] = v;
        changed();
      });
    });
    box.querySelectorAll('.lay-seg2 button').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.parentNode, k = g.getAttribute('data-k'), v = b.getAttribute('data-v');
        g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
        if (k === 'size') { var fx = box.querySelector('[data-k="size-fixed"]'); if (fx) { fx.value = ''; fx.parentNode.classList.remove('on'); } }
        if (!v) delete next[k]; else next[k] = k === 'grow' ? true : v;
        changed();
      });
    });
    box.querySelectorAll('.lay-align button').forEach(function (b) {
      b.addEventListener('click', function () {
        box.querySelectorAll('.lay-align button').forEach(function (x) { x.className = x === b ? 'on' : ''; });
        next.align = b.getAttribute('data-a'); next.justify = b.getAttribute('data-j');
        changed();
      });
    });
    var reset = document.getElementById('lay-reset');
    if (reset) reset.addEventListener('click', function () { openDrawer(el); });
    if (send) send.addEventListener('click', function () {
      send.disabled = true;
      var screen = el.closest('[data-screen]') ? el.closest('[data-screen]').getAttribute('data-screen') : window.DOAN_SCREEN;
      fetch('/api/layout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ screen: screen, id: el.getAttribute('data-id'), rule: next }) })
        .then(function (res) { return res.json(); })
        .then(function (j) { var st = document.getElementById('lay-state'); if (j.error) { st.textContent = j.error; send.disabled = false; return; } st.textContent = t('laySent', 'proposed'); location.href = j.href; });
    });
  }

  // drawer inspector: one delegated click
  function openDrawer(el) {
    if (window.doanPanelOpen) window.doanPanelOpen();
    window.DOAN_CURRENT_EL = el; // the canvas holds many screens; a comment goes to the frame the element sits in
    if (selected) selected.classList.remove('selected');
    selected = el; el.classList.add('selected');
    var props = {}; try { props = JSON.parse(el.getAttribute('data-props') || '{}'); } catch (_) {}
    var rows = Object.keys(props).filter(function (k) { return ['id', 'kind', 'show_when', 'disabled_when', 'reveals'].indexOf(k) < 0; }).map(function (k) {
      return '<tr><th>' + esc(k) + '</th><td>' + esc(typeof props[k] === 'object' ? JSON.stringify(props[k]) : props[k]) + '</td></tr>';
    }).join('');
    var path = el.getAttribute('data-path'), line = el.getAttribute('data-line'), maps = el.getAttribute('data-maps');
    var conds = [];
    if (props.show_when) conds.push('shown when: ' + props.show_when);
    if (props.disabled_when) conds.push('disabled when: ' + props.disabled_when);
    if (props.reveals) conds.push('reveals: ' + Object.keys(props.reveals).join(', '));
    var id = el.getAttribute('data-id');
    var mine = comments.filter(function (c) { return (c.element ? c.element === id : c.path === path) && sameScreen(c, el); });
    // the panel in sections, as Figma's: what it is, how it is laid out, what it carries, what people
    // said — and where it lives in the file last, as one line for a developer
    panel.innerHTML =
      '<div class="pn-head"><b>' + esc(el.getAttribute('data-id')) + '</b><span class="hint">' + esc(el.getAttribute('data-kind')) + '</span><span class="close" id="close">×</span></div>' +
      sec(t('pnComponent', 'Component'),
        '<div class="pn-line"><span class="inst-path">' + instancePath(el) + '</span><a class="pn-link" href="components.html#k-' + esc(el.getAttribute('data-kind')) + '">' + t('goToComponent', 'Go to main component') + ' →</a></div>' +
        (el.getAttribute('data-code') ? '<div class="pn-code"><code>' + esc(el.getAttribute('data-code')) + '</code></div>' : '') +
        (maps ? '<div class="hint">' + esc(maps) + '</div>' : '')) +
      layoutSection(el) +
      (rows || conds.length ? sec(t('pnProps', 'Properties'),
        (rows ? '<table>' + rows + '</table>' : '') +
        (conds.length ? '<ul>' + conds.map(function (c) { return '<li class="cond-line">' + esc(c) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="hint pn-note">' + t('samplesNote', 'values shown in the picture are samples unless the file sets them') + '</p>') : '') +
      sec(t('pnComments', 'Comments'),
        (mine.length ? '<ul>' + mine.map(function (c) { return '<li><b>' + esc(c.author) + '</b> ' + esc(c.text) + '</li>'; }).join('') + '</ul>' : '<div class="hint">' + t('noneOnElement', 'none on this element') + '</div>') +
        (api ? '<textarea id="ctext" rows="3" placeholder="' + t('sayWhat', 'say what should change') + '"></textarea><div class="pn-actions"><button class="btn btn-primary" id="csend">' + t('send', 'Comment') + '</button> <span class="hint" id="cstate"></span></div>' : '<div class="hint">' + t('liveOnly', 'open the live viewer (doan serve) to comment') + '</div>')) +
      sec(t('pnFile', 'File'),
        '<div class="pn-line"><span><code>' + esc(fileOf(el)) + '</code> <span class="hint">' + esc(path) + (line ? ' · ' + t('line', 'line') + ' ' + esc(line) : '') + '</span></span><button class="pn-link" id="copy" type="button">' + t('copy', 'copy path:line') + '</button></div>');
    shell.classList.add('drawer-open');
    wireLayout(el);
    document.getElementById('close').addEventListener('click', function () { window.doanClearSelection(); });
    document.dispatchEvent(new CustomEvent('doan:select', { detail: { el: el } }));
    document.getElementById('copy').addEventListener('click', function () {
      var text = fileOf(el) + (line ? ':' + line : '') + '  ' + path;
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      document.getElementById('copy').textContent = t('copied', 'copied');
    });
    var send = document.getElementById('csend');
    if (send) send.addEventListener('click', function () {
      var text = document.getElementById('ctext').value.trim();
      if (!text) return;
      fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ screen: (window.DOAN_CURRENT_EL && window.DOAN_CURRENT_EL.closest('[data-screen]') ? window.DOAN_CURRENT_EL.closest('[data-screen]').getAttribute('data-screen') : window.DOAN_SCREEN), path: path, line: Number(line) || null, text: text }) })
        .then(function (r) { return r.ok ? location.reload() : r.json().then(function (j) { document.getElementById('cstate').textContent = j.error; }); });
    });
    fit();
  }
  // the workspace (a canvas page) keeps the panel open with an empty state instead of hiding it
  var emptyPanel = panel ? panel.innerHTML : '';
  // nothing selected: the panel holds the project's common comments — about the whole thing, no screen
  function general() {
    var box = document.getElementById('general');
    if (!box || !window.DOAN_API) return;
    fetch('/api/comments').then(function (r) { return r.json(); }).then(function (j) {
      var mine = (j.comments || []).filter(function (c) { return !c.screen; });
      box.innerHTML = '<section class="pn-sec"><h5>' + t('pnComments', 'Comments') + '</h5>' +
        (mine.length ? '<ul>' + mine.map(function (c) { return '<li><b>' + esc(c.author) + '</b> ' + esc(c.text) + '</li>'; }).join('') + '</ul>' : '') +
        '<textarea id="gtext" rows="3" placeholder="' + t('sayWhatAll', 'a note on the whole — nothing needs to be selected') + '"></textarea><button class="btn btn-primary" id="gsend">' + t('send', 'Comment') + '</button> <span class="hint" id="gstate"></span>';
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target || e.target.id !== 'gsend') return;
    var text = document.getElementById('gtext').value.trim();
    if (!text) return;
    fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) { return r.ok ? general() : r.json().then(function (j) { document.getElementById('gstate').textContent = j.error; }); });
  });
  general();
  // an anchor on this page (#f-color, #k-tile, a sidebar section link) opens the folded group it sits
  // in and scrolls to it — inside its pane when the pane scrolls, else the page
  function reveal() {
    var id = decodeURIComponent(location.hash.slice(1)); if (!id || id.indexOf(':') >= 0) return;
    var t = document.getElementById(id); if (!t) return;
    var d = t.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
    var c = t.parentElement;
    while (c && c !== document.body) { var o = getComputedStyle(c).overflowY; if ((o === 'auto' || o === 'scroll') && c.scrollHeight > c.clientHeight) break; c = c.parentElement; }
    if (c && c !== document.body) c.scrollTop += t.getBoundingClientRect().top - c.getBoundingClientRect().top - 12;
    else window.scrollTo(0, window.scrollY + t.getBoundingClientRect().top - 12);
  }
  window.addEventListener('hashchange', function () { setTimeout(reveal, 0); });
  window.addEventListener('load', function () { setTimeout(reveal, 0); });
  // Enter sends a comment, Shift+Enter breaks the line — in every comment box (element, frame, whole)
  document.addEventListener('keydown', function (e) {
    var send = { ctext: 'csend', ftext: 'fsend', gtext: 'gsend' }[e.target && e.target.id];
    if (!send || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    e.preventDefault();
    var btn = document.getElementById(send); if (btn) btn.click();
  });
  window.doanSelect = openDrawer;
  window.doanClearSelection = function () {
    clearSpacing();
    if (selected) selected.classList.remove('selected');
    selected = null;
    if (shell.classList.contains('workspace')) { panel.innerHTML = emptyPanel; general(); } else { shell.classList.remove('drawer-open'); }
    document.dispatchEvent(new CustomEvent('doan:select', { detail: { el: null } }));
    fit();
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('.el');
    if (document.body.getAttribute('data-mode') === 'proto') return;
    if (!el || e.target.closest('a') || e.target.closest('.drawer') || e.target.closest('.tab[data-state]')) return;
    e.preventDefault();
    openDrawer(el);
  });

  var dev = document.getElementById('dev');
  if (dev) dev.addEventListener('change', function () { document.body.classList.toggle('dev', dev.checked); });

  // the navigation tree every page carries: carets fold a domain or a screen, the search box
  // filters screens across every domain and opens what it finds. cmd/ctrl F goes to the box.
  document.querySelectorAll('.tree-domain-head .caret, .tree-screen-head .caret').forEach(function (c) {
    c.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); c.parentElement.parentElement.classList.toggle('open'); });
  });
  var treeSearch = document.getElementById('tree-search');
  if (treeSearch) {
    treeSearch.addEventListener('input', function () {
      var q = treeSearch.value.trim().toLowerCase();
      document.querySelectorAll('.tree-screen').forEach(function (s) {
        var hit = !q || s.getAttribute('data-screen').toLowerCase().indexOf(q) >= 0;
        s.hidden = !hit;
        if (q && hit) { s.classList.add('open'); var d = s.closest('.tree-domain'); if (d) d.classList.add('open'); }
      });
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); treeSearch.focus(); treeSearch.select(); }
    });
  }

  // a page whose place is only in its hash (proto.html#screen.State) folds
  // the tree the way a server-placed page arrives: that domain open and current, on the
  // prototype the screen and its state too. Pages the server placed (canvas, screen) keep theirs.
  // narrow windows (page.js media queries): the menu button shows the sidebar, the panel button
  // the inspect panel; a selection opens the panel by itself; Esc closes both; a tree link closes the menu
  var sideToggle = document.getElementById('side-toggle'), panelToggle = document.getElementById('panel-toggle');
  if (sideToggle) sideToggle.addEventListener('click', function () { document.body.classList.toggle('side-open'); });
  if (panelToggle) panelToggle.addEventListener('click', function () { document.body.classList.toggle('panel-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { document.body.classList.remove('side-open'); document.body.classList.remove('panel-open'); } });
  var sideNav = document.querySelector('.side');
  if (sideNav) sideNav.addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('side-open'); });
  window.doanPanelOpen = function () { if (window.matchMedia('(max-width: 1180px)').matches) document.body.classList.add('panel-open'); };
  var serverPlaced = !!document.querySelector('.tree-domain.current');
  var treeFollow = function () {
    if (serverPlaced) return;
    var hsh = decodeURIComponent(location.hash.slice(1)).split('/')[0];
    if (!hsh) return;
    var q = function (sel, v) { return document.querySelector(sel + '="' + v.replace(/"/g, '') + '"]'); };
    var dom = q('.tree-domain[data-domain', hsh), screen = null, state = 'Default';
    if (!dom) {
      var parts = hsh.split('.');
      screen = q('.tree-screen[data-screen', parts[0]);
      if (parts[1]) state = parts[1];
      if (screen) dom = screen.closest('.tree-domain');
    }
    if (!dom) return;
    document.querySelectorAll('.tree-domain.current, .tree-screen.current, .tree-frame.current').forEach(function (n) { n.classList.remove('current'); });
    dom.classList.add('open', 'current');
    var fr = null;
    if (screen) {
      screen.classList.add('open', 'current');
      fr = screen.querySelector('.tree-frame[data-state="' + state.replace(/"/g, '') + '"]');
      if (fr) fr.classList.add('current');
    }
    // the modes keep this place too: the canvas at the frame (or the domain), the prototype at this screen and state (or the domain's first screen)
    var views = document.querySelector('nav.views');
    if (!views) return;
    var cv = views.querySelector('a[href^="canvas-"]'), pr = views.querySelector('a[href^="proto.html"]');
    var here = fr || (screen && screen.querySelector('.tree-screen-head a.name')) || dom.querySelector('.tree-domain-head a.name');
    var firstScreen = screen || dom.querySelector('.tree-screen');
    if (cv && here) cv.setAttribute('href', here.getAttribute('href'));
    if (pr && firstScreen) pr.setAttribute('href', 'proto.html#' + firstScreen.getAttribute('data-screen') + (screen && state !== 'Default' ? '.' + state : ''));
  };
  window.doanTreeFollow = treeFollow;
  treeFollow();
  window.addEventListener('hashchange', treeFollow);

  // proposal page: apply / reject / undo. After Apply the viewer goes to the applied screen's frame,
  // which offers Undo in a toast; the server says where (j.href)
  var approve = document.getElementById('approve'), reject = document.getElementById('reject'), undoBtn = document.getElementById('undo');
  function verdict(kind, id) {
    var by = (document.getElementById('by') || {}).value || '';
    fetch('/api/proposals/' + id + '/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(kind === 'apply' ? { by: by } : { reason: by }) })
      .then(function (r) { return r.json(); }).then(function (j) { var v = document.getElementById('verdict'); if (v) v.textContent = j.error ? j.error : j.status; if (!j.error) setTimeout(function () { location.href = j.href || '/'; }, 400); });
  }
  if (approve) approve.addEventListener('click', function () { verdict('apply', approve.getAttribute('data-id')); });
  if (reject) reject.addEventListener('click', function () { verdict('reject', reject.getAttribute('data-id')); });
  if (undoBtn) undoBtn.addEventListener('click', function () { verdict('undo', undoBtn.getAttribute('data-id')); });
  // ?applied=<id>: a toast with Undo, on the page the Apply landed on
  var applied = new URLSearchParams(location.search).get('applied');
  if (applied && /^p_[a-z0-9]+$/.test(applied)) {
    var T = window.DOAN_I18N || {};
    var toast = document.createElement('div');
    toast.className = 'applied-toast';
    toast.innerHTML = '<span>' + (T.appliedToast || 'Applied') + '</span> <button class="btn" type="button">' + (T.undo || 'Undo') + '</button>';
    document.body.appendChild(toast);
    toast.querySelector('button').addEventListener('click', function () {
      fetch('/api/proposals/' + applied + '/undo', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.error) { toast.querySelector('span').textContent = j.error; return; }
        toast.querySelector('span').textContent = T.undone || 'Undone';
        setTimeout(function () { location.href = j.href || '/'; }, 400);
      });
    });
    history.replaceState(null, '', location.pathname + location.hash);
  }
  // the red lint count beside a screen: its findings in the panel — rule, message, file:line
  document.querySelectorAll('.lint-pill').forEach(function (b) {
    b.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var T = window.DOAN_I18N || {}, panel = document.getElementById('inspector'), shell = document.querySelector('.shell');
      if (!panel) return;
      var list = []; try { list = JSON.parse(b.getAttribute('data-findings') || '[]'); } catch (e) {}
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      panel.innerHTML = '<section class="pn-sec lint-panel"><h5>' + (T.lintFindings || 'Lint') + ' · ' + esc(b.getAttribute('data-screen')) + '</h5><ul class="list">' + list.map(function (f) {
        return '<li class="' + (f.severity === 'blocking' ? 'is-block' : 'is-warn') + '"><b>' + esc(f.id) + '</b> ' + esc(f.message) + '<div class="hint"><code>' + esc(f.where) + '</code></div></li>';
      }).join('') + '</ul></section>';
      if (shell) shell.classList.add('drawer-open');
    });
  });

  fit();
})();
`;

// The canvas showing a pending proposal: mark the elements it changes in every frame of its screen,
// open on that screen's Default frame without selecting it (the panel holds the proposal), and let
// a line of the panel's change list take you to its element. No template literal inside.
export const PROPOSAL_VIEW_JS = `
(function () {
  var P = window.DOAN_PROPOSAL || {}; if (!P.screen) return;
  function marks() {
    document.querySelectorAll('.cv-frame[data-screen="' + P.screen + '"]').forEach(function (f) {
      (P.changed || []).forEach(function (id) { f.querySelectorAll('.el[data-id="' + id + '"]').forEach(function (el) { el.classList.add('ch-mark'); }); });
    });
  }
  function go(node) { if (window.doanZoomTo && node) window.doanZoomTo(node, 120); }
  marks();
  setTimeout(function () { go(document.querySelector('.cv-frame[data-screen="' + P.screen + '"][data-state="Default"]')); }, 350);
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('.prop-panel .changes li[data-el]'); if (!li) return;
    var el = document.querySelector('.cv-frame[data-screen="' + P.screen + '"][data-state="Default"] .el[data-id="' + li.getAttribute('data-el') + '"]');
    if (!el) return; go(el); el.classList.remove('ch-flash'); void el.offsetWidth; el.classList.add('ch-flash');
  });
})();
`;

// The prototype page's own script: a stack of views, hotspots from the flows, hash routing.
// No template literal inside — this string is embedded into one.
export const PROTO_JS = `
(function () {
  var flows = window.DOAN_FLOWS || [];
  var views = Array.prototype.slice.call(document.querySelectorAll('.proto-view'));
  // the prototype selects nothing: the inspector's click handler stands down on this page
  document.body.setAttribute('data-mode', 'proto');
  var T = window.DOAN_I18N || {}, panel = document.getElementById('inspector');
  var screenSel = document.getElementById('proto-screen'), stateSel = document.getElementById('proto-state');
  var back = document.getElementById('proto-back'), hot = document.getElementById('proto-hot'), overlay = document.getElementById('proto-overlay');
  var stack = [];
  var bpSel = document.getElementById('proto-bp');
  function bpOf(v) { return v.getAttribute('data-bp') || ''; }
  function statesOf(screen) { return views.filter(function (v) { return v.getAttribute('data-screen') === screen && !bpOf(v); }).map(function (v) { return v.getAttribute('data-state'); }); }
  // the view for a screen and state at the chosen breakpoint; a screen with no view at that
  // breakpoint shows its base view, and a state it lacks falls back to its first view
  function viewOf(screen, state) {
    var bp = bpSel ? bpSel.value : '';
    var at = function (want, b) { return views.filter(function (v) { return v.getAttribute('data-screen') === screen && v.getAttribute('data-state') === want && bpOf(v) === b; })[0]; };
    return (bp && at(state, bp)) || at(state, '') || views.filter(function (v) { return v.getAttribute('data-screen') === screen && !bpOf(v); })[0] || null;
  }
  function top() { return stack[stack.length - 1]; }
  function lineOf(f) { return f.label + ' \\u2192 ' + f.to + (f.state !== 'Default' ? '.' + f.state : ''); }
  // one listener per element; an element several flows leave from asks which one
  // a flow with an in list leaves only from those states of its screen
  function leaves(f, screen, state) { return f.screen === screen && (!f.in || f.in.indexOf(state) >= 0); }
  function arm(root, screen, state) {
    var mine = flows.filter(function (f) { return leaves(f, screen, state) && f.gesture !== 'timeout'; });
    // a flow with via leaves from that part of a component (bar/primary), so two buttons in one bar are two hotspots
    var byFrom = {};
    mine.forEach(function (f) { var k = f.via ? f.from + '/' + f.via : f.from; (byFrom[k] = byFrom[k] || []).push(f); });
    Object.keys(byFrom).forEach(function (from) {
      var list = byFrom[from];
      var hits = root.querySelectorAll('.el[data-id="' + from + '"]');
      if (!hits.length && from.indexOf('/') > 0) hits = root.querySelectorAll('.el[data-id="' + from.split('/')[0] + '"]');
      hits.forEach(function (el) {
        if (el.getAttribute('data-disabled') === 'true') return;
        el.classList.add('hotspot');
        if (list.every(function (f) { return f.style === 'conditional'; })) el.classList.add('hotspot-cond');
        el.setAttribute('title', list.map(lineOf).join('\\n'));
        el.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          if (list.length === 1) return go(list[0]);
          choose(el, list);
        });
      });
    });
  }
  var chooser = null;
  function closeChooser() { if (chooser) { chooser.remove(); chooser = null; } }
  function choose(el, list) {
    closeChooser();
    chooser = document.createElement('div'); chooser.className = 'proto-choose';
    var head = document.createElement('div'); head.className = 'hint'; head.textContent = T.chooseFlow || 'Which flow?'; chooser.appendChild(head);
    list.forEach(function (f) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (f.style === 'conditional' ? ' proto-cond' : '');
      b.textContent = lineOf(f);
      b.addEventListener('click', function (e) { e.stopPropagation(); closeChooser(); go(f); });
      chooser.appendChild(b);
    });
    var r = el.getBoundingClientRect();
    chooser.style.left = Math.round(r.left) + 'px'; chooser.style.top = Math.round(r.bottom + 4) + 'px';
    document.body.appendChild(chooser);
  }
  document.addEventListener('click', function () { closeChooser(); }, true);
  function show() {
    var t = top(); if (!t) return;
    var bases = stack.filter(function (x) { return !x.overlay; }); var base = bases[bases.length - 1] || t;
    views.forEach(function (v) { v.hidden = true; });
    var bv = viewOf(base.screen, base.state); if (bv) bv.hidden = false;
    overlay.innerHTML = ''; overlay.hidden = true;
    if (t.overlay) {
      var ov = viewOf(t.screen, t.state);
      if (ov) { var c = ov.cloneNode(true); c.hidden = false; overlay.appendChild(c); overlay.hidden = false; arm(c, t.screen, t.state); }
    }
    screenSel.value = base.screen;
    stateSel.innerHTML = statesOf(base.screen).map(function (s) { return '<option value="' + s + '"' + (s === base.state ? ' selected' : '') + '>' + s + '</option>'; }).join('');
    var want = t.screen + (t.state !== 'Default' ? '.' + t.state : '');
    if (decodeURIComponent(location.hash.slice(1)) !== want) history.replaceState(null, '', '#' + want);
    // the panel: where the prototype is, and the flows that leave this screen, each a button
    if (panel) {
      var here = flows.filter(function (f) { return leaves(f, t.screen, t.state); });
      panel.innerHTML = '';
      var h3 = document.createElement('h3'); h3.textContent = t.screen + (t.state !== 'Default' ? ' · ' + t.state : ''); panel.appendChild(h3);
      var help = document.createElement('div'); help.className = 'hint'; help.textContent = T.protoHelp || ''; panel.appendChild(help);
      var title = document.createElement('div'); title.className = 'section-title'; title.textContent = T.flowsFrom || 'Flows'; panel.appendChild(title);
      if (!here.length) { var none = document.createElement('div'); none.className = 'hint'; none.textContent = T.noFlowsFrom || ''; panel.appendChild(none); }
      var box = document.createElement('div'); box.className = 'proto-flows'; panel.appendChild(box);
      here.forEach(function (f) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (f.style === 'conditional' ? ' proto-cond' : '');
        b.textContent = lineOf(f);
        b.addEventListener('click', function () { go(f); });
        box.appendChild(b);
      });
    }
    // a timeout flow plays by itself: the first one that leaves this state, after a short beat
    // (the design's own delay is in when; the prototype does not make you wait ten seconds)
    clearTimeout(timer);
    var auto = flows.filter(function (f) { return f.gesture === 'timeout' && leaves(f, t.screen, t.state); })[0];
    if (auto) {
      if (panel) { var chip = document.createElement('div'); chip.className = 'proto-auto hint'; chip.textContent = '\u23f1 ' + (auto.when || 'timeout') + ' \u2192 ' + auto.to + (auto.state !== 'Default' ? '.' + auto.state : ''); panel.insertBefore(chip, panel.children[1] || null); }
      timer = setTimeout(function () { go(auto); }, 4000);
    }
    if (typeof window.doanTreeFollow === 'function') window.doanTreeFollow();
    if (typeof window.doanFit === 'function') window.doanFit();
  }
  var timer = null;
  function go(f) {
    // dismiss and back leave the current view and land where the flow says — which may be a
    // state the screen underneath was not in (add → kiosk-menu.Selected)
    if (f.nav === 'dismiss' || f.nav === 'back') {
      if (stack.length > 1) stack.pop();
      var under = stack[stack.length - 1] || {};
      stack[Math.max(stack.length - 1, 0)] = { screen: f.to, state: f.state, overlay: !!under.overlay };
      return show();
    }
    var cur = top();
    var entry = { screen: f.to, state: f.state, overlay: f.nav === 'modal' || f.nav === 'sheet' };
    // a flow with no nav that stays on the current screen is a state change: same layer, no new entry
    if (!f.nav && cur && cur.screen === f.to) { entry.overlay = !!cur.overlay; stack.pop(); }
    else if (f.nav === 'replace' && stack.length) stack.pop();
    stack.push(entry);
    show();
  }
  function fromHash() {
    var hsh = decodeURIComponent(location.hash.slice(1)); if (!hsh) return null;
    if (statesOf(hsh).length) return { screen: hsh, state: 'Default' };
    var i = hsh.lastIndexOf('.'); if (i < 1) return null;
    var screen = hsh.slice(0, i), state = hsh.slice(i + 1);
    return viewOf(screen, state) ? { screen: screen, state: state } : null;
  }
  views.forEach(function (v) { arm(v, v.getAttribute('data-screen'), v.getAttribute('data-state')); });
  document.body.classList.toggle('show-hotspots', hot.checked);
  hot.addEventListener('change', function () { document.body.classList.toggle('show-hotspots', hot.checked); });
  screenSel.addEventListener('change', function () { stack = [{ screen: screenSel.value, state: 'Default' }]; show(); });
  if (bpSel) bpSel.addEventListener('change', show);
  stateSel.addEventListener('change', function () { var t = top(); if (!t) return; if (t.overlay) stack.pop(); top().state = stateSel.value; show(); });
  back.addEventListener('click', function () { if (stack.length > 1) { stack.pop(); show(); } });
  overlay.addEventListener('click', function (e) { if (e.target === overlay && stack.length > 1) { stack.pop(); show(); } });
  window.addEventListener('hashchange', function () { var t = fromHash(); var c = top(); if (t && (!c || t.screen !== c.screen || t.state !== c.state)) { stack = [t]; show(); } });
  var first = fromHash() || (screenSel.value ? { screen: screenSel.value, state: 'Default' } : null);
  if (first) { stack = [first]; show(); }
})();
`;

// The domain canvas page's own script: zoom and pan, and the arrows — measured off the frames
// and elements on the canvas, drawn by fig's rules. No template literal inside.
export const CANVAS_JS = `
(function () {
  var wrap = document.getElementById('cv-wrap'), canvas = document.getElementById('cv-canvas'), domain = document.getElementById('cv-domain'), svg = document.getElementById('cv-arrows');
  if (!wrap || !canvas || !domain || !svg) return;
  var zoomEl = document.getElementById('cv-zoom');
  var scale = 1, tx = 0, ty = 0;
  function apply() { canvas.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; if (zoomEl) zoomEl.textContent = Math.round(scale * 100) + '%'; }
  function fitAll() {
    var w = domain.offsetWidth || 1, h = domain.offsetHeight || 1, W = wrap.clientWidth, H = wrap.clientHeight;
    scale = Math.max(0.05, Math.min(1, (W - 40) / w, (H - 40) / h));
    tx = Math.round((W - w * scale) / 2); ty = Math.round((H - h * scale) / 2); apply();
  }
  function zoomAt(factor, cx, cy) {
    var next = Math.max(0.05, Math.min(4, scale * factor));
    tx = cx - (cx - tx) * (next / scale); ty = cy - (cy - ty) * (next / scale); scale = next; apply();
  }
  wrap.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = wrap.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    else { tx -= e.deltaX; ty -= e.deltaY; apply(); }
  }, { passive: false });
  var drag = null;
  wrap.addEventListener('mousedown', function (e) { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false }; });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; wrap.classList.add('dragging'); }
    if (drag.moved) { tx = drag.tx + dx; ty = drag.ty + dy; apply(); }
  });
  window.addEventListener('mouseup', function () {
    if (drag && drag.moved) {
      var swallow = function (e) { e.stopPropagation(); e.preventDefault(); window.removeEventListener('click', swallow, true); };
      window.addEventListener('click', swallow, true);
      setTimeout(function () { window.removeEventListener('click', swallow, true); }, 0);
    }
    wrap.classList.remove('dragging'); drag = null;
  });
  var b;
  if ((b = document.getElementById('cv-in'))) b.addEventListener('click', function () { zoomAt(1.25, wrap.clientWidth / 2, wrap.clientHeight / 2); });
  if ((b = document.getElementById('cv-out'))) b.addEventListener('click', function () { zoomAt(0.8, wrap.clientWidth / 2, wrap.clientHeight / 2); });
  if ((b = document.getElementById('cv-fit'))) b.addEventListener('click', fitAll);
  var showArrows = document.getElementById('cv-show-arrows');
  if (showArrows) showArrows.addEventListener('change', function () { document.body.classList.toggle('cv-no-arrows', !showArrows.checked); });

  // arrows: start at the source Default's right edge, at the trigger element's height when the
  // element is on the frame (fig's element anchor) else the edge midpoint; enter the target
  // state frame's left edge at its midpoint, a gap before the head; a flow that goes back climbs
  // into a corridor above both frames and comes down onto the target's top edge.
  var HEAD_GAP = 12, TRUNK = 120, CORRIDOR = 72;
  var NS = 'http://www.w3.org/2000/svg';
  function rectOf(node) { var r = node.getBoundingClientRect(), c = canvas.getBoundingClientRect(); return { x: (r.left - c.left) / scale, y: (r.top - c.top) / scale, w: r.width / scale, h: r.height / scale }; }
  function mk(tag, attrs, text) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (text !== undefined) n.textContent = text; return n; }
  function pathOf(points) { return points.map(function (p, i) { return (i ? 'L' : 'M') + Math.round(p.x) + ' ' + Math.round(p.y); }).join(' '); }
  // a label pill: centred in the space it belongs to (a gutter, the corridor), cut with … when it
  // would not fit, and moved down past any label or frame already there — never over a screen
  var placed = [], frameBoxes = [];
  function widthOf(text) { var w = 0; for (var i = 0; i < text.length; i++) w += text.charCodeAt(i) > 0x2e80 ? 20 : 11; return w + 20; }
  function hits(b) {
    return placed.concat(frameBoxes).some(function (o) { return b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y; });
  }
  function label(text, x, y, room) {
    var w = widthOf(text);
    if (room && w > room) { while (text.length > 2 && widthOf(text + '\u2026') > room) text = text.slice(0, -1); text += '\u2026'; w = widthOf(text); }
    var b = { x: x - w / 2, y: y - 16, w: w, h: 32 };
    for (var n = 0; n < 40 && hits(b); n++) b.y += 38;
    placed.push(b);
    var g = mk('g', { 'class': 'cv-label' });
    g.appendChild(mk('rect', { x: Math.round(b.x), y: Math.round(b.y), width: w, height: 32 }));
    g.appendChild(mk('text', { x: Math.round(b.x + w / 2), y: Math.round(b.y + 23), 'text-anchor': 'middle' }, text));
    return g;
  }
  function draw() {
    while (svg.lastChild && svg.lastChild.tagName !== 'defs') svg.removeChild(svg.lastChild);
    svg.setAttribute('width', domain.offsetWidth); svg.setAttribute('height', domain.offsetHeight);
    var frames = {}, cols = {};
    document.querySelectorAll('.cv-frame').forEach(function (f) {
      var screen = f.getAttribute('data-screen'), k = screen + '|' + f.getAttribute('data-state');
      frames[k] = { el: f, r: rectOf(f) };
      (cols[screen] = cols[screen] || []).push(frames[k]);
    });
    Object.keys(cols).forEach(function (s) {
      var list = cols[s];
      for (var i = 1; i < list.length; i++) { var a = list[i - 1].r, c2 = list[i].r; svg.appendChild(mk('path', { 'class': 'cv-chain', d: pathOf([{ x: a.x + a.w / 2, y: a.y + a.h }, { x: c2.x + c2.w / 2, y: c2.y }]) })); }
    });
    var here = (window.DOAN_CANVAS || {}).screens || [], elsewhere = window.DOAN_SCREEN_DOMAIN || {};
    // arrows keep to the gutters, as Figma's Autoflow does: out of the frame the flow leaves (its
    // first in: state, else Default), along the gutter right of it, and — when the target is not
    // the next column — up into a corridor above every frame, across, and down the gutter left of
    // the target. Each gutter and the corridor hand out lanes so no two arrows share a line.
    var all = Object.keys(frames).map(function (k) { return frames[k].r; });
    placed = []; frameBoxes = all.map(function (r) { return { x: r.x - 4, y: r.y - 28, w: r.w + 8, h: r.h + 32 }; });
    // the corridor runs above the section boxes, clear of their titles
    var secs = Array.prototype.slice.call(document.querySelectorAll('.cv-section')).map(function (n) { return rectOf(n).y; });
    var top = Math.min.apply(null, (secs.length ? secs : all.map(function (r) { return r.y; })));
    var colX = {}; Object.keys(cols).forEach(function (sc) { colX[sc] = cols[sc][0].r.x; });
    var order = Object.keys(colX).sort(function (p, q) { return colX[p] - colX[q]; });
    var lanesR = {}, lanesL = {}, corridor = 0, LANE = 16, GUT = 28;
    function next(screen) { var i = order.indexOf(screen); return i >= 0 ? order[i + 1] : null; }
    function laneR(sc) { lanesR[sc] = (lanesR[sc] || 0) + 1; return lanesR[sc] - 1; }
    function laneL(sc) { lanesL[sc] = (lanesL[sc] || 0) + 1; return lanesL[sc] - 1; }
    // a flow that goes back — to a screen left of where it starts (처음으로, 이전, a timeout home) —
    // is no line: it is one note under the frame it leaves, flows to the same screen merged. Only
    // what goes forward is drawn, so the corridor carries the few flows that skip a column.
    var backs = [], labels = [], flowN = 0;
    function isBack(f, src) { var t = cols[f.to]; return f.to !== f.screen && t && t[0].r.x < src.r.x; }
    var drawnPairs = {}, stubRows = {}, STUB_ROW = 30; // a stub label is 20px type; a row keeps them apart
    (window.DOAN_FLOWS || []).forEach(function (f) {
      if (here.indexOf(f.screen) < 0) return;
      var fromState = f.in && f.in.length ? f.in[0] : 'Default';
      var src0 = frames[f.screen + '|' + fromState] || frames[f.screen + '|Default'];
      if (src0 && isBack(f, src0)) { backs.push({ src: src0, f: f }); return; }
      var src = frames[f.screen + '|' + fromState] || frames[f.screen + '|Default'] || (cols[f.screen] || [])[0]; if (!src) return;
      var s = src.r, start = { x: s.x + s.w, y: s.y + s.h / 2 };
      var anchor = (f.via && src.el.querySelector('.el[data-id="' + f.from + '/' + f.via + '"]')) || src.el.querySelector('.el[data-id="' + f.from + '"]');
      if (anchor) { var ar = rectOf(anchor), ay = ar.y + ar.h / 2; if (ay > s.y && ay < s.y + s.h) start.y = ay; }
      // a short label: what it waits for when it says, else what is pressed; a timeout says so
      var text = (f.gesture === 'timeout' ? '⏱ ' : '') + (f.when || (f.from + (f.via ? '.' + f.via : '')));
      var cls = 'cv-arrow' + (f.style === 'conditional' ? ' conditional' : '');
      var tgt = frames[f.to + '|' + f.state] || frames[f.to + '|Default'] || (cols[f.to] || [])[0];
      if (!tgt) {
        var other = elsewhere[f.to], g = mk('g', { 'class': 'cv-stub' });
        // stubs leaving one frame from the same height (a header's menu items sit on one line) take a
        // row each, below the one before: the line leaves at its element and turns down into its row
        var key = f.screen + '|' + fromState, rows = stubRows[key] || (stubRows[key] = []), ry = start.y;
        while (rows.some(function (y) { return Math.abs(y - ry) < STUB_ROW; })) ry += STUB_ROW;
        rows.push(ry);
        var pts = ry === start.y ? [start, { x: start.x + 80, y: ry }] : [start, { x: start.x + 32, y: start.y }, { x: start.x + 32, y: ry }, { x: start.x + 80, y: ry }];
        g.appendChild(mk('path', { 'class': cls, d: pathOf(pts), 'marker-end': 'url(#cv-arrow)' }));
        var link = mk('a', { href: other ? 'canvas-' + other.slug + '.html' : f.to + '.html' });
        link.appendChild(mk('text', { x: Math.round(start.x + 92), y: Math.round(ry + 7) }, '→ ' + (other ? other.domain + ' / ' : '') + f.to + (f.state !== 'Default' ? '.' + f.state : '') + (text ? '  (' + text + ')' : '')));
        g.appendChild(link); svg.appendChild(g); return;
      }
      if (tgt === src) return;
      var pair = src.el.getAttribute('data-screen') + src.el.getAttribute('data-state') + '>' + tgt.el.getAttribute('data-screen') + tgt.el.getAttribute('data-state');
      if (drawnPairs[pair]) { var tn = drawnPairs[pair], rc = tn.previousSibling, nt = tn.textContent + ' \u00b7 ' + text, nw = widthOf(nt); rc.setAttribute('width', nw); rc.setAttribute('x', Math.round(+tn.getAttribute('x') - nw / 2)); tn.textContent = nt; return; }
      var t = tgt.r, points, lab;
      var gx = s.x + s.w + GUT + laneR(f.screen) * LANE;
      if (f.to === f.screen) {
        // another state of the same screen: along the right gutter, in at its right edge
        var endR = { x: t.x + t.w + HEAD_GAP, y: t.y + t.h / 2 };
        points = [start, { x: gx, y: start.y }, { x: gx, y: endR.y }, endR];
        var nx = (function () { var i = order.indexOf(f.screen), n = order[i + 1]; return n ? colX[n] : s.x + s.w + 280; })();
        lab = { x: (s.x + s.w + nx) / 2, y: (start.y + endR.y) / 2, room: nx - s.x - s.w - 16 };
      } else if (next(f.screen) === f.to) {
        // the next column: one gutter between them
        var end = { x: t.x - HEAD_GAP, y: t.y + t.h / 2 };
        points = [start, { x: gx, y: start.y }, { x: gx, y: end.y }, end];
        lab = { x: (s.x + s.w + t.x) / 2, y: (start.y + end.y) / 2, room: t.x - s.x - s.w - 16 };
      } else {
        // anywhere else: up the right gutter into the corridor above every frame, across, down
        // the gutter left of the target
        var cy = top - 24 - corridor * LANE; corridor++;
        var lx = t.x - GUT - laneL(f.to) * LANE;
        var end3 = { x: t.x - HEAD_GAP, y: t.y + t.h / 2 };
        points = [start, { x: gx, y: start.y }, { x: gx, y: cy }, { x: lx, y: cy }, { x: lx, y: end3.y }, end3];
        lab = { x: (gx + lx) / 2, y: cy, room: Math.abs(lx - gx) - 16 };
      }
      var fid = String(flowN++);
      svg.appendChild(mk('path', { 'class': cls, d: pathOf(points), 'marker-end': 'url(#cv-arrow)', 'data-flow': fid }));
      svg.appendChild(mk('path', { 'class': 'cv-hit', d: pathOf(points), 'data-flow': fid }));
      if (text) { var lg = label(text, lab.x, lab.y, lab.room); lg.setAttribute('data-flow', fid); drawnPairs[pair] = lg.querySelector('text'); labels.push(lg); }
    });
    labels.forEach(function (g) { svg.appendChild(g); });
    // the backward flows: one line under each frame, a chip per screen it returns to
    var byFrame = new Map();
    backs.forEach(function (b) { var list = byFrame.get(b.src) || []; list.push(b.f); byFrame.set(b.src, list); });
    byFrame.forEach(function (list, src) {
      var byTo = {};
      list.forEach(function (f) { var k = f.to + (f.state !== 'Default' ? '.' + f.state : ''); (byTo[k] = byTo[k] || []).push((f.gesture === 'timeout' ? '\u23f1 ' : '') + (f.when || f.from)); });
      var x = src.r.x, y = src.r.y + src.r.h + 30;
      Object.keys(byTo).forEach(function (k) {
        var text = '\u21a9 ' + k + '  ' + byTo[k].filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' \u00b7 ');
        var w = 0; for (var i = 0; i < text.length; i++) w += text.charCodeAt(i) > 0x2e80 ? 20 : 11; w += 24;
        var g = mk('g', { 'class': 'cv-label cv-back', 'data-flow': 'b' + (flowN++) });
        g.appendChild(mk('rect', { x: Math.round(x), y: Math.round(y - 16), width: w, height: 32 }));
        g.appendChild(mk('text', { x: Math.round(x + w / 2), y: Math.round(y + 7), 'text-anchor': 'middle' }, text));
        svg.appendChild(g);
        x += w + 12;
      });
    });
  }
  // --- the workspace: tree, selection, shortcuts, deep links
  var panel = document.getElementById('inspector');
  // the strings are set by an inline script that comes after this one on the canvas page, so read them when needed
  function t(k, d) { return (window.DOAN_I18N || {})[k] || d; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function frameOf(screen, state) { return document.querySelector('.cv-frame[data-screen="' + screen + '"][data-state="' + state + '"]'); }
  function zoomTo(node, pad) {
    var r = rectOf(node), W = wrap.clientWidth, H = wrap.clientHeight; pad = pad || 80;
    scale = Math.max(0.05, Math.min(1, (W - pad * 2) / r.w, (H - pad * 2) / r.h));
    tx = Math.round(W / 2 - (r.x + r.w / 2) * scale); ty = Math.round(H / 2 - (r.y + r.h / 2) * scale); apply();
  }
  window.doanZoomTo = zoomTo; // the proposal view takes the canvas to a frame or an element
  var selectedFrame = null;
  function markFrame(frame) {
    document.querySelectorAll('.cv-frame.selected').forEach(function (f) { f.classList.remove('selected'); });
    document.querySelectorAll('.tree-frame.current').forEach(function (a) { a.classList.remove('current'); });
    selectedFrame = frame;
    if (!frame) return;
    frame.classList.add('selected');
    var link = document.querySelector('.tree-frame[data-screen="' + frame.getAttribute('data-screen') + '"][data-state="' + frame.getAttribute('data-state') + '"]');
    if (link) { link.classList.add('current'); var scr = link.closest('.tree-screen'); if (scr) scr.classList.add('open'); }
    // the prototype mode opens on what is selected here
    var protoTab = document.querySelector('.views a[href^="proto.html"]');
    if (protoTab) protoTab.setAttribute('href', 'proto.html#' + frame.getAttribute('data-screen') + (frame.getAttribute('data-state') !== 'Default' ? '.' + frame.getAttribute('data-state') : ''));
    layersFor(frame);
  }
  function setHash(frame, el) {
    if (!frame) return;
    var want = frame.getAttribute('data-screen') + '.' + frame.getAttribute('data-state') + (el ? '/' + el.getAttribute('data-path') : '');
    if (decodeURIComponent(location.hash.slice(1)) !== want) history.replaceState(null, '', '#' + want);
  }
  function frameInfo(frame) {
    if (window.doanPanelOpen) window.doanPanelOpen();
    var screen = frame.getAttribute('data-screen'), state = frame.getAttribute('data-state');
    var mine = (window.DOAN_FLOWS || []).filter(function (f) { return f.screen === screen; });
    panel.innerHTML =
      '<div class="pn-head"><b>' + esc(screen) + '-' + esc(state) + '</b><span class="hint">' + esc(frame.getAttribute('data-type') || '') + ' \\u00b7 ' + esc(frame.getAttribute('data-platform') || '') + '</span><span class="close" id="close">\\u00d7</span></div>' +
      '<section class="pn-sec"><h5>' + t('pnScreen', 'Screen') + '</h5><div class="pn-buttons"><a class="btn" href="' + esc(screen) + '.html#state-' + esc(state) + '">' + t('screen', 'screen') + '</a><a class="btn" href="proto.html#' + esc(screen) + (state !== 'Default' ? '.' + esc(state) : '') + '">\\u25b6 ' + t('proto', 'Prototype') + '</a><a class="btn" href="spec-' + esc(screen) + '.html">' + t('specFor', 'developer spec') + '</a></div></section>' +
      frameComments(screen, state) +
      '<section class="pn-sec"><h5>' + t('pnFlows', 'Flows') + '</h5>' + (mine.length ? '<ul>' + mine.map(function (f) { return '<li><code>' + esc(f.from) + '</code> \\u2192 ' + esc(f.to) + (f.state !== 'Default' ? '.' + esc(f.state) : '') + (f.label ? ' <span class="hint">' + esc(f.label) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<div class="hint">' + t('none', 'none') + '</div>') + '</section>' +
      '<section class="pn-sec"><h5>' + t('pnFile', 'File') + '</h5><code>' + esc(frame.getAttribute('data-file') || '') + '</code></section>';
    var close = document.getElementById('close'); if (close) close.addEventListener('click', clearAll);
    var send = document.getElementById('fsend');
    if (send) send.addEventListener('click', function () {
      var text = document.getElementById('ftext').value.trim();
      if (!text) return;
      fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ screen: screen, path: '', state: state, text: text }) })
        .then(function (r) { return r.ok ? location.reload() : r.json().then(function (j) { document.getElementById('fstate').textContent = j.error; }); });
    });
  }
  // comments on a screen as a whole — no element — listed on its frame's panel, with a box to add one
  function frameComments(screen, state) {
    var mine = (window.DOAN_COMMENTS || []).filter(function (c) { return c.screen === screen && !c.element && !c.path; });
    return '<section class="pn-sec"><h5>' + t('pnComments', 'Comments') + '</h5>' +
      (mine.length ? '<ul>' + mine.map(function (c) { return '<li><b>' + esc(c.author) + '</b> ' + (c.state ? '<span class="hint">' + esc(c.state) + '</span> ' : '') + esc(c.text) + '</li>'; }).join('') + '</ul>' : '') +
      (window.DOAN_API ? '<textarea id="ftext" rows="3" placeholder="' + t('sayWhatScreen', 'say what should change on this screen') + '"></textarea><div class="pn-actions"><button class="btn btn-primary" id="fsend">' + t('send', 'Comment') + '</button> <span class="hint" id="fstate"></span></div>' : '') + '</section>';
  }
  // a frame whose screen has comments of its own carries a blue dot on its title
  (window.DOAN_COMMENTS || []).forEach(function (c) {
    if (c.element || c.path) return;
    document.querySelectorAll('.cv-frame[data-screen="' + c.screen + '"]' + (c.state ? '[data-state="' + c.state + '"]' : '') + ' > .cv-frame-title').forEach(function (title) {
      if (!title.querySelector('.dot.cm')) { var d = document.createElement('i'); d.className = 'dot cm'; d.title = c.author + ': ' + c.text; title.appendChild(d); }
    });
  });
  function selectFrame(frame, zoom) {
    if (window.doanClearSelection) window.doanClearSelection();
    markFrame(frame); frameInfo(frame); setHash(frame, null);
    if (zoom) zoomTo(frame);
  }
  function clearAll() { markFrame(null); if (window.doanClearSelection) window.doanClearSelection(); history.replaceState(null, '', location.pathname); }
  // the element layers of the selected frame, as Figma lists them: a row per element, a caret on
  // each one that holds others (click to fold, Alt+click to fold everything under it), a guide line
  // per level, a mark for what it is (▤ a box of others, ◇ a component, T text, ▨ a picture). Every
  // row starts folded, so a frame opens on its top-level layers; a selection opens the rows above it.
  var layerRows = [];
  var TEXT_KINDS = { caption: 1, hint: 1, text: 1, 'page-header': 0 };
  function layersFor(frame) {
    document.querySelectorAll('.tree-layers').forEach(function (n) { n.innerHTML = ''; });
    var box = document.querySelector('.tree-layers[data-screen="' + frame.getAttribute('data-screen') + '"][data-state="' + frame.getAttribute('data-state') + '"]');
    layerRows = [];
    if (!box) return;
    var els = Array.prototype.slice.call(frame.querySelectorAll('.el'));
    els.forEach(function (el) {
      var depth = 0, p = el.parentElement; while (p && p !== frame) { if (p.classList.contains('el')) depth++; p = p.parentElement; }
      var id = el.getAttribute('data-id') || '';
      var kids = el.querySelector('.el') !== null;
      var compound = kids && !!el.querySelector('.el[data-id^="' + id + '/"]');
      var kind = el.getAttribute('data-kind') || '';
      var mark = compound ? '◇' : kids ? '▤' : kind === 'image' ? '▨' : TEXT_KINDS[kind] ? 'T' : '◇';
      layerRows.push({ el: el, depth: depth, kids: kids, open: false, id: id, kind: kind, mark: mark });
    });
    var html = '';
    layerRows.forEach(function (r, i) {
      var guides = ''; for (var d = 0; d < r.depth; d++) guides += '<i class="lg"></i>';
      var name = r.id.indexOf('/') >= 0 ? r.id.slice(r.id.lastIndexOf('/') + 1) : r.id;
      html += '<div class="tree-el" data-i="' + i + '">' + guides + (r.kids ? '<span class="lc">' + (r.open ? '▾' : '▸') + '</span>' : '<span class="lc"></span>') +
        '<span class="lm">' + r.mark + '</span><span class="ln">' + esc(name) + '</span><span class="lk">' + esc(r.kind) + '</span></div>';
    });
    box.innerHTML = html;
    paintLayers(box);
    box.querySelectorAll('.tree-el').forEach(function (row) {
      var r = layerRows[+row.getAttribute('data-i')];
      row.addEventListener('mouseenter', function () { r.el.classList.add('hover'); });
      row.addEventListener('mouseleave', function () { r.el.classList.remove('hover'); });
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('lc') && r.kids) {
          e.stopPropagation();
          var to = !r.open; r.open = to;
          if (e.altKey) for (var j = +row.getAttribute('data-i') + 1; j < layerRows.length && layerRows[j].depth > r.depth; j++) if (layerRows[j].kids) layerRows[j].open = to;
          return paintLayers(box);
        }
        if (window.doanSelect) window.doanSelect(r.el); zoomTo(r.el, 160);
      });
    });
  }
  // show a row only when every row above it at a lower depth is open; carets follow
  function paintLayers(box) {
    var closedAt = Infinity;
    box.querySelectorAll('.tree-el').forEach(function (row) {
      var r = layerRows[+row.getAttribute('data-i')];
      if (r.depth <= closedAt) closedAt = Infinity;
      row.hidden = r.depth > closedAt;
      if (!row.hidden && r.kids && !r.open) closedAt = r.depth;
      var c = row.querySelector('.lc'); if (c && r.kids) c.textContent = r.open ? '▾' : '▸';
    });
  }
  // a selection opens every row above it
  function revealLayer(el) {
    var i = -1; for (var k = 0; k < layerRows.length; k++) if (layerRows[k].el === el) { i = k; break; }
    if (i < 0) return null;
    var need = layerRows[i].depth;
    for (var j = i - 1; j >= 0 && need > 0; j--) if (layerRows[j].depth < need) { layerRows[j].open = true; need = layerRows[j].depth; }
    var box = document.querySelector('.tree-layers .tree-el') ? document.querySelector('.tree-el').parentElement : null;
    if (box) paintLayers(box);
    return document.querySelector('.tree-el[data-i="' + i + '"]');
  }
  // hover on the canvas: only the innermost element lights up
  var hovered = null;
  wrap.addEventListener('mouseover', function (e) { var el = e.target.closest('.cv-body .el'); if (hovered && hovered !== el) hovered.classList.remove('hover'); hovered = el; if (el) el.classList.add('hover'); });
  wrap.addEventListener('mouseleave', function () { if (hovered) hovered.classList.remove('hover'); hovered = null; });
  // a click on a frame that is not on an element selects the frame
  wrap.addEventListener('click', function (e) {
    if (e.target.closest('.el') || e.target.closest('a')) return;
    var frame = e.target.closest('.cv-frame');
    if (frame) selectFrame(frame, false); else clearAll();
  });
  // an element selected by the inspector: sync the frame, the tree row and the hash
  document.addEventListener('doan:select', function (e) {
    var el = e.detail && e.detail.el; if (!el) return;
    var frame = el.closest('.cv-frame'); if (!frame) return;
    if (selectedFrame !== frame) markFrame(frame);
    document.querySelectorAll('.tree-el.current').forEach(function (r) { r.classList.remove('current'); });
    var row = revealLayer(el); if (row) { row.classList.add('current'); row.scrollIntoView({ block: 'nearest' }); }
    setHash(frame, el);
  });
  // the tree: a frame on this canvas is selected in place; a frame elsewhere is a link (the tree
  // itself — folding, search — belongs to every page and lives in the inspector script)
  document.querySelectorAll('.tree-frame').forEach(function (a) {
    a.addEventListener('click', function (e) { var f = frameOf(a.getAttribute('data-screen'), a.getAttribute('data-state')); if (f) { e.preventDefault(); selectFrame(f, true); } });
  });
  document.querySelectorAll('.tree-screen-head > a.name').forEach(function (a) {
    a.addEventListener('click', function (e) { var f = frameOf(a.closest('.tree-screen').getAttribute('data-screen'), 'Default'); if (f) { e.preventDefault(); selectFrame(f, true); } });
  });
  var search = document.getElementById('tree-search');
  // shortcuts: Shift+1 fit, Shift+2 zoom to selection, Shift+0 100%, cmd/ctrl +/- zoom, Esc clear, cmd/ctrl F search
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && search) { e.preventDefault(); search.focus(); search.select(); return; }
    if (typing) return;
    var sel = (window.DOAN_CURRENT_EL && document.contains(window.DOAN_CURRENT_EL) && document.querySelector('.el.selected')) || selectedFrame;
    if (e.shiftKey && e.key === '!') { e.preventDefault(); fitAll(); }
    else if (e.shiftKey && e.key === '@') { e.preventDefault(); if (sel) zoomTo(sel, sel.classList.contains('el') ? 160 : 80); }
    else if (e.shiftKey && e.key === ')') { e.preventDefault(); var W = wrap.clientWidth, H = wrap.clientHeight; if (sel) { var r = rectOf(sel); scale = 1; tx = Math.round(W / 2 - (r.x + r.w / 2)); ty = Math.round(H / 2 - (r.y + r.h / 2)); } else { var cx = (W / 2 - tx) / scale, cy = (H / 2 - ty) / scale; scale = 1; tx = Math.round(W / 2 - cx); ty = Math.round(H / 2 - cy); } apply(); }
    else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomAt(1.25, wrap.clientWidth / 2, wrap.clientHeight / 2); }
    else if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); zoomAt(0.8, wrap.clientWidth / 2, wrap.clientHeight / 2); }
    else if (e.key === 'Escape') { clearAll(); }
  });
  // deep link: #screen.State or #screen.State/elements.1
  function fromHash() {
    var hsh = decodeURIComponent(location.hash.slice(1)); if (!hsh) return false;
    var slash = hsh.indexOf('/'), head = slash > 0 ? hsh.slice(0, slash) : hsh, path = slash > 0 ? hsh.slice(slash + 1) : null;
    var dot = head.lastIndexOf('.'), screen = dot > 0 ? head.slice(0, dot) : head, state = dot > 0 ? head.slice(dot + 1) : 'Default';
    var frame = frameOf(screen, state) || frameOf(head, 'Default'); if (!frame) return false;
    if (frame.getAttribute('data-screen') === head) { state = 'Default'; }
    selectFrame(frame, true);
    if (path) { var el = frame.querySelector('.el[data-path="' + path + '"]'); if (el && window.doanSelect) { window.doanSelect(el); zoomTo(el, 160); } }
    return true;
  }

  // hover on an arrow or its label: the line, its head and its label light up together
  svg.addEventListener('mouseover', function (e) {
    var n = e.target.closest && e.target.closest('[data-flow]'); if (!n) return;
    var id = n.getAttribute('data-flow');
    svg.querySelectorAll('[data-flow="' + id + '"]').forEach(function (m) { m.classList.add('hot'); if (m.classList.contains('cv-arrow')) m.setAttribute('marker-end', 'url(#cv-arrow-hot)'); });
  });
  svg.addEventListener('mouseout', function (e) {
    var n = e.target.closest && e.target.closest('[data-flow]'); if (!n) return;
    svg.querySelectorAll('.hot').forEach(function (m) { m.classList.remove('hot'); if (m.classList.contains('cv-arrow')) m.setAttribute('marker-end', 'url(#cv-arrow)'); });
  });
  // the inspector script runs after this one; the first selection must wait for it
  function start() {
    if (!fromHash()) fitAll();
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    setTimeout(draw, 300);
    window.addEventListener('hashchange', fromHash);
    window.addEventListener('resize', function () { draw(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
`;
