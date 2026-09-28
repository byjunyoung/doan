# Changelog

## 0.19.0 — 2026-09-28

- **The right panel in sections, as Figma's** — a head with the name and ×, then titled sections divided edge to edge: component (with the way to the main one), layout, properties, comments, and the file last as one line with *copy*. The frame's panel (screen, comments, flows, file), the comments on the whole and the proposal panel follow the same rule.
- **Layout in the right panel, as Figma UI3 draws it** — *Auto layout* for a layer that holds others, *Layout* for any other: the flow buttons in one grey group (none · vertical · horizontal · grid), **W** and **H** fields showing Hug, Fill or the fixed width, the 3×3 alignment box beside the gap, and horizontal and vertical padding. Figma's words, untranslated, as are the panel's section titles (Component · Layout · Properties · Comments · File; Screen · Flows; Proposal · Changes · Decisions). A selected frame shows its spacing on the canvas — padding hatched, gaps filled in pink, each with its number — and the alignment box shows the items as bars in the frame's direction. A value picked is previewed at once on every copy of the element on the page, from the server's own drawing function (`/api/layout-style`), so the preview is the picture. *Propose this layout* makes a proposal that changes that one line, `layout.<id>`, the rest of the file byte for byte (checked on the parsed documents before it is written), and opens it on the canvas to be applied. A compound's parts say their component arranges them.
- **Padding may be `[vertical, horizontal]`** — Figma's two padding fields, CSS's two values — with `0` for a side that has none; lint checks each token as before.
- **A pending proposal is looked at on the canvas** — in the live viewer its sidebar link opens the canvas drawn as the proposal would leave it (TO-BE, or AS-IS one tab away), the elements it changes marked with a dashed outline and the view on its screen; the right panel holds the proposal — what it says, what was agreed, what changes (a line takes you to its element) — and the decision at its foot: a two-way TO-BE | AS-IS switch, one line per change (what, and which kind; the rest on hover; the line takes you to its element), what was agreed folded, × to close. The side-by-side proposal page is for a static render, where there is no canvas to draw on.
- **A proposal says what changes in words** — one line per change: added, removed, changed or moved; an element (a new wrapper once, with what it holds; a move says from where to where), layout ("stacked · gap space.md · across center"), states and variants patch by patch, flows as "from → to", notes line by line, any other field. The YAML path table is still there, folded under *as code*.
- **Apply and Reject sit at the foot of the right panel** on both proposal pages — the panel's place for what a page asks of the person, in the panel's own buttons, the same on both (they had drifted apart, and the files page's Reject was handled twice). A static render, which cannot apply, says how to from the CLI right under the summary.
- **AS-IS beside TO-BE draws each frame at its own width and scales it** — a device frame no longer shrinks to the column, which re-laid a tablet screen as a tall strip; the what-changes table keeps fixed column shares.

## 0.18.0 — 2026-09-28

- **Apply comments from the viewer** — the foot of the live viewer's right panel, fixed under whatever the panel shows, says how many comments are open and has *Ask the agent to apply them* (the viewer's own primary button, full width); pressing it writes a request (`.requests/requests.json`) for the agent watching the project, which proposes and closes it. The button waits while it is open and says when the proposals are in; the person applies them in the viewer. `list_requests` and `close_request` for an agent, `doan requests` (exit 3 while one is open) for a shell watcher. DESIGN.md §7.5.

## 0.17.0 — 2026-09-28

The layer between the parts and the screens: how the parts are arranged.

- **Patterns** — `patterns/<name>.yaml` says how the parts are arranged on this product's screens: what it binds (`applies_to` — types, platforms, screens, except), a **skeleton** of the screen's top-level elements in order (`many`, `optional`), rules in words (`notes`) and the component it became (`graduated_to`). DESIGN.md §4.8.
- **L29** warns where a screen breaks the skeleton of a pattern that binds it — one finding per screen and pattern, the first break; a pattern file that is not one blocks.
- **The patterns page** — Design system › Patterns, between foundations and components: each pattern's skeleton drawn as the stack of parts a screen is made of, its rules, the screens that follow it and the ones that break it and why.
- **Agents look up patterns first** — `list_patterns` (and `doan patterns`); the draw prompt's new step 1½ follows a pattern that binds the screen, writes down an unwritten one from two precedents, or proposes a new one on its own before drawing. `propose_files` takes `patterns/*.yaml`, and a proposal that changes a pattern lists the screens it would break.

## 0.16.1 — 2026-09-28

- **A flow's `via` picks the part of a component** — `{ from: bar, via: primary }` makes only the bar's primary button the prototype hotspot and the canvas arrow's origin, so two buttons in one bar are two hotspots. A `via` with no such part keeps the whole element, as before.
- **A dialog on a device covers the screen** — the backdrop fills a phone or tablet frame and the dialog sits in its middle, whatever its height.
- **Segments can stand apart** — a new slot `idle` fills the options not chosen; with `gap` bound too, the options are separate pills, the chosen one in `bg`. A segment with no `selected` has nothing chosen yet (it no longer picks the first), so a required option not yet picked can be drawn.
- **The drawer names the file on the canvas** — an element's file is its frame's (`kiosk-cart.yaml`), where the canvas page itself has none; *copy path:line* carries it too.
- **The spec's element table keeps its shape** — fixed column shares, so a long JSON prop wraps in its own cell instead of squeezing the path into one letter a line and pushing the table off the page. The drawer's props table does the same: a long prop (a header's `actions`) wraps in its cell and the panel keeps its width.

## 0.16.0 — 2026-09-28

- **No overview.** The viewer opens on the first domain's canvas (`index.html` forwards there, hash kept). The overview repeated the sidebar (domains, screens) and the canvas (the flow map); what only it had — the proposals waiting on a person — is in the sidebar on every page now, one link per proposal, while there is one. The flow map and its ELK layout leave the viewer; `layoutFlows` stays exported and `list_flows` still names flows to nowhere and screens no flow reaches.
- **The README is short** — the loop, five minutes, a screen file, the viewer in four pictures of the kiosk, the verbs. The long reference is in DESIGN.md and `doan --help`.

## 0.15.3 — 2026-09-28

- **`scroll: vertical`** — a list longer than the frame scrolls inside it (a kiosk menu board) and the bar below stays on screen. `grow` may now shrink; everything else keeps its height.
- **An element leads to its main component**, as in Figma — the drawer shows the instance chain (`◇ tile › ◇ caption` for a part of a compound), each a link, and a *Go to main component* button; a right click on any element offers the same, Select and copy path:line. The components page outlines the contract it was opened on.
- **The layer tree folds like Figma's** — a caret on every element that holds others (Alt+click folds all under it), a guide line per level, a mark for what each is (▤ ◇ T ▨); a frame opens with every layer folded, showing its top level; a selection opens the rows above it.
- **The design-system pages have levels** — Components: used in this project first, by category (made of parts, actions, inputs, content, containers, navigation, feedback; a contract's `category:` wins), the bundled rest folded; each card folds its props and styles. Foundations: colours by role (base, brand, status, system). The sidebar lists the sections of the page you are on; an anchor opens the folded group it sits in.
- **Canvas arrows keep to the gutters**, as Figma's Autoflow does — out of the state frame the flow leaves (its `in:`), along the gutter beside it, and for anything but the next column up into a corridor above the section boxes and down the gutter left of the target; every gutter and the corridor hand out lanes. A flow that goes back (처음으로, 이전, a timeout home) is no line but a chip under the frame it leaves, one per screen it returns to; arrows between the same two frames merge. Labels are short (the flow's `when`, ⏱ for a timeout), centred in their gutter, cut with … when they would not fit, moved past other labels and frames, and drawn above every line. The column gap is 280px, the frame gap 120px.
- **Canvas details** — hovering an arrow or its label lights the line, its head and its label together; a device frame (tablet, phone) has nothing square behind its rounded bezel and its selection follows the curve; the canvas area fits the window, so its four corners show.
- **A project of one domain has no domain row** — the sidebar starts at its sections; with two or more, each domain is a level as before.
- **The two side panes are one width** — the page list on the left and the inspect panel on the right are both 280px (were 232px and 340px).
- **A files proposal may carry screens** — one change across a screen and the rest (a section renamed and its screens moved) is one proposal, clean together where each alone would block.
- **Alignment reaches a drawn card's body** — `align: center` on a card antd drew centres what is inside it, and the card itself still fills its place. A full-width picture fills its row whatever the alignment around it.

## 0.15.2 — 2026-09-28

What the kiosk's comments and its prototype showed.

- **A flow names the states it leaves from** — `in: Loading` or `in: [Default, Error]`. Without it, as before, every state where the element is. The prototype arms a flow only in its states, lint (L16) names a state the screen lacks.
- **The prototype plays `timeout` flows by itself** — after a short beat, with the flow's `when` shown in the panel (the design's own delay, 10 seconds, stays in the file). A disabled element is no hotspot.
- **Layout reaches the children of a card or modal a library drew** — they sit one box further in (antd's card body); direction and gap now reach them there, and the bundled modal body too.
- **Enter sends a comment**, Shift+Enter breaks the line, in every comment box; `apply` from the CLI defaults `--by` to the git user as the viewer does. `maps_to.code` no longer shows as `code/[object Object]` among a kind's library names.

## 0.15.1 — 2026-09-28

- **No name to type.** The comment boxes and the Apply buttons ask for no name; the author and the approver are the project's git user (`git config user.name`), since the viewer has no login and one person uses it.
- **Comments on the whole.** With nothing selected the panel lists the project's common comments and takes one — no screen, no element. They live in `.comments/_project.json`, list and resolve like the rest.

## 0.15.0 — 2026-09-28

Foundations are the base of the design system, and the viewer says so (DESIGN.md §6.11).

- **Design system › Foundations · Components · Assets.** `style.html` is `foundations.html` (the old address redirects); the tokens table is its second tab, Variables, instead of a separate entry. The board shows text styles, colours, surfaces and scales; components stay on their own page, each sample in every variant. A files proposal's board still shows components, since a contract change is judged there.
- **The `style` prompt is `foundation`.**

## 0.14.1 — 2026-09-28

- The conventions schema knows `render.fonts` (added to the renderer in 0.14.0, not to the schema — a project that used it failed lint).
- A files proposal lints like the CLI: the schema of every file first, then the rules, before and after. It said 0 blocking for a change the CLI then blocked.

## 0.14.0 — 2026-09-28

The style stage, and the rest of the design through the edit loop (DESIGN.md §6.11, §7.4). A review found that only screens had an interview, a file, a page, lint and propose→apply; style, components and assets were written by hand.

- **Text styles and surfaces.** `text.*` are DTCG typography tokens — one token, five CSS values; `surface.*` are groups of bg, border, radius, shadow, text, padding. A contract binds a whole one: `font: text.heading`, `surface: surface.tile`, or on a part, `label.font: text.caption`. New slots `font-family`, `line-height`, `letter-spacing`. The bundled set and `init` ship six text styles and four surfaces.
- **Fonts** — `assets/fonts/<Family>-<Weight>.woff2` becomes `@font-face`; `conventions.render.fonts` URLs become stylesheet links.
- **The style board, `style.html`** — every text style in its own type, colours, surfaces, scales, and each component's sample in each variant, drawn with the project's tokens. First under "Design system".
- **`propose_files`** (MCP) and `propose <dir> --files path=local,…` (CLI) — tokens, contracts, svg assets, conventions in one proposal; linted on a temporary copy; the page shows the board AS-IS beside TO-BE and each file's text; apply and undo cover every file.
- **`style` and `component` prompts** — interviews before tokens and before a contract; `draw` sends you to `style` first when the look is still the bundled one.
- **Icons follow their element** — an svg icon is a mask in the text colour.
- **Comments on a frame** — the canvas frame panel lists a screen's own comments and takes one, with the state; the frame title carries a dot.

## 0.13.1 — 2026-09-27

Compound kinds that look like something (DESIGN.md §4.5).

- **A compound's bindings dress its wrapper.** A contract with `elements:` is drawn as the tree it declares; its `tokens` (bg, border, radius, padding, shadow, min-height, type) now paint the box around that tree, and its variants change it. A tile is a tile.
- **`child.slot` re-binds a part from outside** — `label.text: color.primary-text` under `variants.selected.true` turns the tile's caption white where the tile is selected. The child must be one the contract declares, the slot one the picture reads; L28 says otherwise. The child's own contract keeps the rest.
- A compound's wrapper takes its contract defaults, so `selected: false` is an attribute a variant can match; every declared prop is known to its conditions, so `show_when: hint` hides the part when no hint was given instead of leaving a condition on it. The component schema's layout rule is the screen's (`justify`, track lists). Image size classes: sm 48px square, md 80px, lg 160px, full 240px.

## 0.13.0 — 2026-09-27

Where things sit. The kiosk's frames looked unfinished not for their colours but for their composition, and composition was outside the layout vocabulary (DESIGN.md §4.7).

- **`align` is horizontal, `justify` is vertical — whatever the direction.** A column with `align: center` centres its children; a row with `justify: center` lines them up on their middle; `space-between` spreads along an axis, `stretch` fills across it; a leaf's rule places its own box and text. Before, `align` followed the flex main axis, so `align: center` on a column moved things down, not to the middle.
- **`columns` can be the tracks themselves** — `"1fr auto auto"` or `[1fr, auto, auto]` — for a row whose cells must line up: a cart line with its name, a stepper and a delete button.
- **`fit: contain`** on an image shows the whole picture instead of cropping it.
- **A screen whose one element is a modal** sits on a dimmed backdrop, the modal as the box, at its `size`.

## 0.12.2 — 2026-09-27

- **A project's tokens reach only what it draws.** They used to sit on `:root`, so a kiosk with a 20px body and 56px controls blew the viewer's own sidebar, tabs and buttons up with it — unseen while every project's tokens matched the bundled ones. The chrome now runs on the bundled defaults; the project's tokens, and the theme switch, apply inside a screen frame, a canvas frame, a prototype view and a library sample.

## 0.12.1 — 2026-09-26

What filling in a real project showed — the kiosk sample drawn with tokens, contracts and assets of its own (DESIGN.md §13).

- **The bundled set reads type from the contract** where it used to fix a size: the page-header title, a field label, a hint; a segment and a stepper take a control height; the box of card, fieldset and modal no longer wraps a root an adapter drew (a double frame). A list cell draws its `value` and hides its chevron when told.
- **antd** — `size: full` is a block button and sm/md are small/middle; an `icon` that names an asset is drawn; a card's and a modal's body add no padding of their own, the contract's padding slot is the padding; a segment draws its `selected` option; the modal shadow is css, so the `shadow` slot replaces it.
- **A proposal records its file relative to the project.** Applying one in a copy of the project — a scratch copy, a checkout elsewhere — wrote back into the directory it was proposed in. It lands in the copy now; a record from before still applies, by its file name.

## 0.12.0 — 2026-09-25

Four more slots, so a contract can make a kiosk look like a kiosk (DESIGN.md §4.5).

- **`font-size`, `font-weight`, `min-height`, `shadow`** join bg, text, border, radius, padding, gap and accent as slots a contract binds a token to — on the kind, or per variant option (`size: { full: { min-height: control.xl } }`). Type reaches a bundled piece by inheritance from its wrapper; height and shadow the bundled set reads for button, card, image and modal; a root antd or MUI drew gets every bound slot applied from outside. `src/slots.js` is the one list.
- **Tokens to bind them to** — `font.size` is a scale now (xs · sm · md · lg · xl · 2xl), with `font.weight` (regular · medium · bold), `control` heights (sm · md · lg · xl — antd's small, middle, large and one more) and `shadow` (sm · md · lg, per theme) beside it, in the bundled set and in the files `init` writes. A flat `tokens.json` that still says `font.size: 14px` reads as before. antd takes `control.md` as its control height. `tokens --format tailwind` writes fontWeight, minHeight and boxShadow.
- **L28 slot-unknown** — a binding to a slot the picture does not read is a warning that lists the slots there are. A typo was silent.

## 0.11.0 — 2026-09-25

Handoff: what a developer — or a developer's agent — builds from (DESIGN.md §6.10).

- **`spec-<screen>.html`, `doan spec`, MCP `handoff`** — one spec read off the file: elements with props and copy and the component each maps to in code, what every state, variant and breakpoint changes, the flows out, the tokens with their CSS variables, the assets, the open `$tbd` questions, and acceptance criteria — a checklist line per promise the file makes. JSON for an agent, Markdown for a ticket (a copy button on the page). The screen page and the canvas frame panel link to it; the inspector shows an element's code snippet. The canvas panel's labels now read the page language (they were English regardless).
- **`maps_to.code` in a contract** — Code Connect's counterpart: import, name, prop and value mapping, from which every element's snippet is written. Shown on the component library page.
- **`doan tokens --format css | tailwind`** — the resolved set as custom properties, a block per theme, or a `theme.extend`.
- **`status: draft | ready | done`** on a screen, in the overview and the tree; **L27** warns when a ready screen still holds a `$tbd`; `list_screens` carries it; the draw prompt proposes `ready` when the person says so.

## 0.10.1 — 2026-09-25

Two things the owner's review called out as against the tool's own principles.

- **The contract is the one truth about a kind.** Until now a kind had three: its `components/<kind>.yaml`, the bundled drawing with defaults of its own (`el.size ?? 'md'`), and a library adapter that read whatever props its code knew. Now every element is drawn with its contract applied first — a default for each prop it left out, an enum value the contract does not list replaced by the declared default (L22 still reports it) — for the bundled set and adapters alike; and a contract's token bindings reach a piece an adapter drew: the page themes the antd or MUI root from the same `--k-<kind>-<slot>` variables (`.el-<kind>[data-drawn] > *`). Change a default or a binding in the contract and every picture follows.
- **Comments are anchored by element id.** A comment used to point at a YAML path (`elements.1`), which moves the moment something is inserted above it. It now carries the element's id; the path and line are derived from where the element is on every read, a comment whose element is gone says `orphan`, and one from before ids gets its id on read. `add_comment` takes `element` (preferred) or a path; the viewer's dots and drawer match by id.

## 0.10.0 — 2026-09-25

Responsive, both ways: product screens that adapt to width, and a viewer that does (DESIGN.md §4.7, §6.8).

- **Breakpoints.** `conventions.breakpoints` names the widths; a screen opts in with a `breakpoints:` block — per name, the patches a state would use, applied last. The screen page draws a frame per breakpoint beside the state tabs; the prototype gets a breakpoint select; the canvas keeps the base width. `get_screen` takes `breakpoint`, `list_screens` says which a screen has, the draw prompt asks about it. L26 warns on a breakpoint the conventions do not name; L07 and L18 cover breakpoint patches like any other.
- **Layout that adapts on its own**: `columns: auto` + `min`, `wrap: true`, `scroll: horizontal` — the three the field test wanted (§12, row 6). They reach a leaf kind's own row too.
- **The viewer fits narrow windows**: under 1180px the inspect panel becomes a toggle, under 860px the sidebar folds behind a menu button, the top bar goes to two rows and the tokens page to one column.
- The store-ops example's home screen shows it: 25 tiles per row on desktop, 20 on tablet, 10 on mobile; the stat strip wraps, then scrolls.

## 0.9.3 — 2026-09-25

- **Applying a proposal resolves the comments it answers.** `propose` takes `comments` — the ids of the open comments this version answers — and counts any id mentioned in its summary or decisions (the draw prompt writes `why: 코멘트 c_…`). `apply` resolves them with the approver's name and the proposal id as the resolution; a text-only change that applies at once resolves them as `auto`; `undo` reopens them. Until now the loop's last step, closing the comment, was done by hand (the kiosk's first comment was). CLI: `propose … --comments <id,id>`.

## 0.9.2 — 2026-09-25

- **`propose` takes a new screen.** Name a screen the project does not have and the proposal creates `screens/<name>.yaml` — always pending, since a new file is never a text-only change; the name must pass `naming.screen_pattern` and the YAML must say the same `screen:`. `apply` writes it only while the file is still absent; `undo` removes the file. The proposal page shows the new screen against an empty AS-IS. Until now a new screen had to be written by hand outside the edit loop (the kiosk's done screen was).

## 0.9.1 — 2026-09-25

- **The prototype selects nothing.** On `proto.html` a click used to do two things at once — follow the flow *and* select the element into the inspect panel — and an element with several flows opened a bare menu on top of that (the owner: "클릭이랑 컴포넌트 선택이랑 액션이 겹쳐서 혼란스럽네"). Now the page is interaction-only, the way Figma's present mode is: the inspector's click handler stands down, the panel says where the prototype is and lists the flows that leave this screen as buttons, and the chooser for an element with several flows carries a heading. Selecting elements is the canvas's job.

## 0.9.0 — 2026-09-24

The design system, seen: a tokens page, and assets — the person's own files — named from screens and seen on a page of their own (DESIGN.md §4.6, §6.9).

- **`tokens.html`** — laid out like Figma's variables modal: collections on the left (a base set's file, or a resolver modifier such as `theme` whose contexts are its mode columns), the groups of the one shown under them, and its table on the right — a heading per group, the name with a type mark, the value per mode, an alias as a chip with its name and colour. Search and group filters. A row opens the token in the inspect panel with every mode's value, its alias chain, the CSS variable and who uses it (contracts through their bindings, screens through layout gap and padding); `#t:<name>` and `#c:<collection>` deep-link. A flat `tokens.json` is one collection; the bundled set comes last when a token lives only there; the resolver's problems are listed on top.
- **Assets** — files under `assets/` (svg, png, jpg, gif, webp, avif). A screen names one by path: `src: assets/photos/menu.jpg` on an image, `icon: assets/icons/cart.svg` on any kind with an icon; anything else in `icon` stays a glyph. The bundled set draws the file itself; `serve` serves `/assets/…` from the folder and nothing outside it; `render` copies the folder next to the pages. `doan init` creates the folder.
- **`assets.html`** — a card per file under its folder, with its size, its natural dimensions and who names it; then the references that name no file and the files nothing names. A card opens in the inspect panel; `#a:<path>` deep-links to it.
- **L25** (warning): a `src` or `icon` that names a path under `assets/` with no such file.
- **`doan assets <dir>`** and MCP **`list_assets`**: the same summary for a person or an agent.
- The sidebar's design system: 개요, then **디자인 시스템 — 토큰 · 컴포넌트 · 에셋**, then the tree, because the screens are built from them.

## 0.8.0 — 2026-09-24

The workspace: the canvas page becomes the window Figma's viewer is — measured against it, editing aside (DESIGN.md §6.7).

- **Left, a tree**: domain → section → screen → state; under the selected frame, its element layers, hovering a row outlines the element, clicking selects and zooms to it. ⌘F searches screens.
- **Right, the inspect panel stays open** — an empty state until something is selected; a frame shows its file, type, platform, the flows leaving it, and links to the screen page and the prototype at that state; an element shows what the drawer showed.
- **Selection**: hover outlines the innermost element; a click selects an element or, on empty frame space, the frame; Esc clears; the tree, the frame and the URL follow.
- **Keys**: Shift 1 fit · Shift 2 zoom to selection · Shift 0 100% · ⌘/ctrl ± zoom · Esc.
- **Deep links**: `canvas-<domain>.html#screen.State/elements.1` opens zoomed to that element, selected; a selection writes the hash, so a review can be sent as a link to the exact element.
- **Two navigations, not one twice.** The left sidebar is content — the overview and the component library first, because the screens are built from them, then the domain tree — and the top bar is the modes of looking at it: Canvas · Prototype, the way Figma keeps Design · Prototype up there. Switching a mode keeps the sidebar and the context: the prototype opens on the selected frame. The duplicate links in the sidebar are gone; the arrows toggle is called "arrows", not "flows".
- **Defined once, worn by every page** (DESIGN.md §6.8): the same left column, the same top bar in the same order — where you are · the two modes · this page's tools and the theme — and the inspect panel on every page. The overview, the screen page, the proposal page and the component library now use it too; a screen in the tree links to its frame on the canvas. The overview opened at a domain and the prototype fold the tree from their hash and point the modes at that place, so the tree and the modes follow the prototype as you click through it. The top bar's three slots hold their positions: the modes are centred in the bar and the two sides share the rest equally, so nothing beside them moves them — a long meta truncates (full text on hover), wide tools wrap, and the prototype's screen and state selects carry their labels as tooltips to stay narrow.
- **The flow map is a section of the overview, not a mode.** The canvas already draws a domain's flows, so a second flow view was one thing twice (the owner's question, 2026-09-24). `flows.html` is gone; the ELK map of every domain — with the flows to nowhere and the screens no flow reaches under it — sits on the overview below the domain cards, and `index.html#<domain>` lights that domain in it.

## 0.7.0 — 2026-09-24

The domain canvas: the page a Figma file had per domain, rebuilt from the files.

- **`canvas-<domain>.html`** — a domain is what a section name says before " - " (`NN. {domain} - {feature}`). Its sections side by side, each a box; inside, one column per screen with the happy path first and the screen's other states stacked under its Default; frames at real size; zoom (⌘/ctrl + wheel, pinch, buttons) and pan (wheel, drag). The viewer's first surface: the sidebar and the overview open with the domains (DESIGN.md §6.6).
- **Arrows on the canvas**, drawn by the page from what it measures, by fig's arrow rules: from the source Default's right edge at the trigger element's height, a right-angle elbow, a gap before the head, into the target state frame's left edge; a flow that goes back climbs into a corridor above and comes down beside the target; `[state]` dashed chains between stacked frames; conditional dashed; label pills; a flow to another domain is a stub with a link.
- A comment on the canvas goes to the screen whose frame the element sits in, and a comment dot shows only in that screen's frames — the same path exists on every screen of a domain.
- The flow map's section titles link to the domain canvases.

## 0.6.0 — 2026-09-24

The click-through prototype: the product's navigation, pressed, from the files alone.

- **`proto.html`** (static and served): every screen in every state, one shown at a time. The elements a flow leaves from are hotspots; pressing one lands on the flow's target screen and state. `modal` and `sheet` lay the target over the current screen, `dismiss` and `back` pop, `replace` swaps. Several flows from one element open a chooser, conditional ones dashed. Start anywhere with `#screen` or `#screen.State`; the flow map's ▶ and the screen page's button link there (DESIGN.md §6.5).
- Not in scope, on purpose: typing, validation, branching on input — that is `fig:proto`.
- Fixed: a phone or tablet frame lost its bottom bezel in the viewer — `fit()` sized the stage to the frame and forgot the frame's own margin; a scaled frame also sat off-centre. Both stages now hold the whole frame, centred.

## 0.5.0 — 2026-09-24

The flow map: the whole product on one page, drawn from the files.

- **`flows.html`** in the viewer (static and served): a box per section, a node per screen — Default scaled to the platform's proportions, one row per state — and a right-angle arrow per flow that lands on the row of the state it names; `style: conditional` dashed; the label is the flow as written. Dead ends and screens no flow reaches are listed under it (DESIGN.md §6.4).
- **Layout by ELK** (`elkjs`, optional dependency). Ports and orthogonal routing are why: the arrows follow the discipline `fig:arrows` drew by hand. Without it the page says so; nothing else needs it.
- **`list_flows`** MCP tool and **L24**: a screen no flow reaches or leaves, once the project has flows.
- Nodes are `div`s with a link in the head, because a thumbnail drawn by a library adapter may hold links of its own.

## 0.4.0 — 2026-09-24

Kinds are files. The component library lives next to the screens, as text.

- **`components/<kind>.yaml`** is a kind's contract: `props` (type, required, default, enum options), `slots`, `anchors`, `maps_to`, `tokens` (slot → semantic token), `variants` (bindings per option), `sample`. `init` writes one for every bundled kind; `conventions.kinds` is gone from the example and the examples, still reads as legacy, and **`doan migrate kinds <dir>`** moves a project's rows into files (DESIGN.md §4.5).
- **Bindings drive the picture.** A contract's `tokens` become `--k-<kind>-<slot>` on the element, a variant's on `data-<prop>="<option>"`; the bundled set reads them with fallbacks. Change `button.yaml` and every button changes.
- **Compound components.** A contract with `elements` is drawn as that tree: `$name` for a prop, `${name}` inside text, `{ slot: name }` for a slot, `show_when: soldout` settled from props. Expanded after the state merge, so `set: { soldout: true }` is what the tree sees; children are `<instance>/<child>` and cannot be patched from the screen.
- **L21** warns on a prop a contract does not declare; **L22** blocks a missing required prop, an option the kind lacks, a slot it does not declare; **L23** is one line per project for rows still in `conventions.kinds`. L06 and L10 read the registry. Contract bindings go through L18/L19 like a layout does.
- **Components page** in the viewer: every contract drawn from its sample, one picture per variant option, with props, slots and bindings. `doan components <dir>`; MCP `list_components`; the `draw` prompt reads it and `list_tokens` before naming a kind.
- `map figma --write` writes `maps_to.figma` into the component file; `import figma` resolves kinds through the registry.
- Fixed on the way: `display-settings` in `examples/store-ops` had an unquoted comma in a `tooltip` value (L21 found it); `button-group` declares its `option` anchor.

## 0.3.0 — 2026-09-24

Tokens as a design system, not a colour list.

- **`tokens/` holds DTCG 2025.10 files** — `$value`, `$type`, `{alias}`, `$extends`; colour objects and `{ value, unit }` dimensions become css strings. The flat `tokens.json` from before still reads.
- **Two tiers by file.** `primitive.tokens.json` is the palette and the scale; the other files name it by alias. `conventions.tokens.primitive` lists the primitive stems and **L19** blocks a screen that names one. Token names in screens are unchanged (`space.md`).
- **Modes through a DTCG Resolver** — `theme.resolver.json` with sets, modifiers and `resolutionOrder`. `render` emits one custom-property block per context and a `theme` select in the header; the bundled kinds and the chrome follow it. A library adapter keeps the default context (DESIGN.md §4.4).
- **`doan tokens <dir>`** and the MCP tool **`list_tokens`**: every token with its value, per-theme values, file and tier, for an agent to read before naming one.
- **L18** warns on a layout token that resolves to nothing; **L20** relays what the loader could not resolve — a broken alias, an unreadable `$ref`, a token one theme has and another lacks.
- `init` writes `tokens/` (primitive, semantic, light, dark, resolver) instead of `tokens.json`; resolved for light it is exactly the bundled default.
- The `draw` prompt has a **wireframe step** again: a text sketch of every state in the conversation, and a yes, before any YAML is written. The first cut had replaced it with the rendered proposal; that made people argue with a diff (DESIGN.md §7).

## 0.2.1 — 2026-09-24

- **`kiosk` platform removed.** It was a portrait frame and nothing else. Built-in platforms are `web`, `ios`, `android`, `tablet`; a team that needs another size adds it under `conventions.platforms` with frame `tablet` or `none`.

## 0.2.0 — 2026-09-24

**design-core is now doan (도안).** 도안 is the Korean word for a design drawing — the plan a thing is made from. Same repository (GitHub redirects the old address), same files, same verbs.

- The command is `doan`; the MCP server is `doan`; the package is `@junyoung735/doan` on npm (the registry refuses bare `doan` as too similar to `dot`, `docz` and friends).
- Screen files say `schema: doan/0.2`. `design-core/0.2` is still accepted, so nothing you wrote breaks.
- The page's runtime globals are `DOAN_*`.

## 0.1.3 — 2026-09-24

Not web-only.

- **Platforms** — `platform:` on a screen (`web`, `ios`, `android`, `tablet`, `kiosk`), a project default in `conventions.platforms`, built-in sizes a team can override. `render` draws each screen at its platform's width inside its frame: phone (status bar, home indicator), tablet, portrait kiosk, or none for web.
- **Twelve mobile kinds** in the bundled set: `app-bar`, `tab-bar`, `list-cell`, `bottom-sheet`, `fab`, `snackbar`, `chip`, `search-bar`, `segment`, `stepper`, `pull-to-refresh`, `sheet-handle`.
- **Flows carry `gesture` and `nav`**; `conventions.flows` names the vocabulary and L16 warns outside it. L17 warns on a platform the project does not list.
- `examples/mobile-app`: a feed, a detail pushed from a cell, a cart sheet — iOS.

## 0.1.2 — 2026-09-24

Generality, ahead of the first outside user.

- **MUI adapter** — `--base mui` draws mapped kinds with MUI components through emotion, themed from tokens. `bases` now says `antd` and `mui` are ready; `shadcn` is listed as not applicable with the reason (it is copied source, so `--base none` is its road).
- **Language** — `meta.language` in `conventions.yaml` (`en`, `ko`) switches the viewer's own words and the sample values. Screen content is never translated.
- **Frame name presets** for `import figma` — `naming.frame_pattern` takes a regex or `screen-state`, `screen/state`, `screen state`, `screen=state`.
- A self-built project's `components/` is self-contained again (its `kinds.js` brings `i18n.js` along).

## 0.1.1 — 2026-09-24

For anyone, not just the author's machine.

- Install without a clone: `npx -y github:byjunyoung/design-core …` for the CLI and as the MCP `command` for Claude Code, Cursor and Codex (config snippets in the README).
- `init` writes a starter screen and a project README, and prints what to do next, so `serve` is never empty.
- The default `screen_pattern` accepts letters in any script; a team whose screens are named in Korean or Japanese no longer trips L01 on its first lint.
- No company file keys in the docs; `<file-key>` explains itself.

## 0.1.0 — 2026-09-24

First usable version. Everything below runs locally from a clone; nothing is hosted yet.

- **Screen files** — one YAML per screen: elements, `layout` by token names, `states` as patches, `variants` by axis, `flows`, `refs`, `$tbd` for undecided values. JSON Schema for screens and for `conventions.yaml`.
- **`lint`** — schema check plus rules L01–L15: required states per screen type, dead flows, patches that target nothing, `$tbd` counts (blocking when overdue or on the canonical branch), layout outside the token vocabulary, variant shape. Every finding carries file, YAML path and line.
- **`prep`** — stubs the states a screen type requires as placeholders carrying `$tbd`, keeping the file's comments.
- **`diff`** — AS-IS / TO-BE between two versions of a screen (files or git refs); elements compared by id.
- **`render`** — static HTML: sidebar of screens, state tabs with a compare toggle, a drawer inspector (kind, mapped component, props, file · path · line), meta information as dots, sample values in empty cells. Bundled component set, or a library through an adapter (`antd` today), themed from `tokens.json`.
- **`init` / `bases`** — start a project with a library base or a self-built one (the bundled set copied into the project, yours to edit).
- **`propose` / `apply` / `reject` / `undo`** — the edit loop: a whole new version of a screen, with diff, lint before/after, a tier, and the decisions agreed before it; text-only changes that keep lint clean apply at once, structure waits for a person.
- **`serve`** — the live viewer: pages rendered from the files on every request, comments anchored to elements, Apply / Reject on a proposal page, `/api/*` for bots.
- **`mcp`** — the same verbs over MCP on stdio, plus `list_screens`, `get_screen`, `list_missing`, comments, and a `draw` prompt that walks an agent through deciding before proposing.
- **`map figma` / `import figma`** — bring a Figma page in: masters paired with kinds by name, frames named `{screen}-{state}` as screens with the other states as patches, auto-layout as layout, prototype links as flows, unresolved values as `$tbd`.
- Field-tested on six real admin screens (transcribed under generic names in `examples/store-ops`) and on two real Figma pages; what each taught the format is in `DESIGN.md` §12.
