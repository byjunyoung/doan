# Pivot spike — the team's code is the component set (2026-10-11)

## Why

Five rounds of the accounts pilot (`2026-10-08-accounts-pilot.md`) fixed 36 gaps, nearly all of them drawing vocabulary (cluster F), and each round of looking found four or five more. The frontend already had the pieces — `BrandLogo`, `ListSearchBar`, `FooterToolbar`, `PageHeader`, `Field`, `SectionTitle`, `Icon` — and doan rebuilt each from antd primitives, worse. DESIGN.md §6 says the page is built from the production library and the tool never owns a team's components; the build delivered an adapter per *library*, not per *codebase*.

The owner's 2026-09-23 premise was a light, agent-optimised tool that *manages* design inside an agent-driven plan → design → build loop, general enough to be a service, drawing included. Measured against it: the management engine (required states, lint, comment → proposal, lifecycle, handoff) exists but the pilot never exercised it; the drawing layer became the product and does not converge.

Decision (owner, 2026-10-11): keep drawing, change the pen. A `kind` names a real component of the project; the picture is drawn by the project's own build; the engine stays. Not v0.1 ("management only") — the agent still draws, with the team's components.

## The spike

One screen, the real components, nothing else.

- doan `serve`: `GET /api/screen?screen=&state=` returns the merged tree of a state (what `get_screen` gives the MCP), with CORS so a page on another port can read it.
- The frontend (a local branch, not pushed): a dev-only route `/__doan/:screen` inside the real `AppLayout`, `src/doan/Harness.tsx` — a registry from doan kinds to the app's components. `page-header` + the `tabs` after it → `PageHeader`; `search-bar` + the `filter-bar` after it → `ListSearchBar` with its chips; `card` → antd `Card`; `table` + the `pagination` after it → antd `Table`; `group#footer` of buttons → `FooterToolbar`; `section` → `SectionTitle`; `field` → `Field`; inputs → antd. `nav` and the top bar are skipped: the shell is the app's. A kind with no entry draws as a red dashed box and is counted.
- Nothing in the screen files changed.

## Result

| Screen | Kinds used | Unmapped | Beside the Figma frame |
|---|---|---|---|
| 계정 목록 | nav · group · button · page-header · tabs · card · search-bar · filter-bar · chip · caption · table · pagination | 0 | the same picture — word mark, sider (the app's own menu, which has no 상품 카테고리 yet), tabs inside the header, the search bar and chips as the product draws them, the table, `‹ 1 ›` |
| 계정 추가 | nav · group · button · page-header · card · section · field · input · select · radio | 0 | the same picture; the footer toolbar sits under the card rather than on its edge because the file keeps `footer` outside the card (the app puts `FooterToolbar` inside the form card) |

Harness: ~330 lines, written in one pass, no new vocabulary. What round 3–5 spent three days on — search bar, chips, logo, tag colours, pager — came for free, because the app's components are what the handoff was drawn from.

## What this says about the overhaul

1. The screen file already carries what the engine needs (states, flows, refs, `$tbd`, notes) and what a harness needs (kinds, props, rows, layout tokens). The format survives the pivot; the bundled drawings and the per-library adapters are what it leaves behind.
2. The mapping is per team and small. Nine composed components plus a UI library covered two page types with no gaps. A team writes this registry once; doan can generate its skeleton from the project's component files (TS types as contracts) and the team fills the sibling joins (`page-header`+`tabs`, `search-bar`+`filter-bar`, `table`+`pagination`) — those are the only non-trivial lines.
3. The viewer embeds instead of drawing: the canvas, the proto, the inspector, the comments stay, and each frame becomes an iframe of the project's harness at `/__doan/<screen>?state=…`. The inspector's anchor (element id) still works because the harness carries `data-doan-*` attributes.
4. Where there is no codebase yet, the bundled set stays as an explicit low-fidelity wireframe — a sketch, never a handoff.

## Next

- Move the harness out of the project into a package (`@junyoung735/doan-react`: the registry runtime, the sibling joins, the `data-doan-*` contract), so a team writes only its mapping table.
- `doan init --harness react` writes the mapping skeleton from the project's components.
- The viewer's frame = iframe of the harness; lint, comments and proposals unchanged.
- The real test, before any of the above is polished: **the next ticket's screen with no Figma yet, drawn from PRD rows, judged by whether a developer builds from it.**
