# Trust round (0.21.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make a green lint and a drawn picture mean what they say (B), take the first five minutes past every wall a first-time user hit (A), and bring the documents up to date (G).

**Architecture:** one read-recording proxy wraps the element at the single drawing call site (`fn(drawn, r)` in `src/render/index.js`); a CI test drives every contract prop through every drawing path with it, lint L30 and a viewer dot read the same record per element. A-cluster changes are local to `init`, `cli`, `serve`, `mcp`, `requests` and the page script. G is documents only.

**Tech Stack:** Node ≥20 ESM, `node:test`, `yaml`, `ajv`, optional `antd` 6 / `@mui/material` + React 19 SSR, `elkjs`.

**Spec:** `docs/specs/2026-10-02-trust-round.md` (reviewed 2026-10-04 — read it beside this plan).

## Global Constraints

- Version after the round: `0.21.0` (package.json, CHANGELOG, MCP server version).
- Commit cadence: no commit per task — the working tree accumulates and the round is committed once at the end (project rule). Steps below say "checkpoint" where a commit would be: run the suite instead.
- Public repo: fixtures and examples use fictional names only (store, unit, item, material); no company or product names.
- Viewer wording: existing viewer terms are not reworded (2026-09-28). New strings go into both `en` and `ko` dictionaries in `src/render/i18n.js`.
- Layout values are token names; a number with a unit is refused (§4.1).
- `drawn: false` is per prop and never used to excuse a library adapter (2026-10-04).
- Heartbeat lives at `<project>/.requests/agent.json`; `init` writes `.gitignore` leaving it out (2026-10-04).
- `serve` with no `--port` moves to the next free port; with `--port n` busy it prints `port n is in use` and exits non-zero (2026-10-04).
- `npm run check` is the gate for every task; it must end green, including `test/spec.test.js:112`.

## Review Focus

1. A prop read only to test presence (`if (el.overlay)`) counts as read although nothing is drawn → the coverage test also compares output with and without the prop's distinct value; a read whose output does not change fails as "read but not drawn". (Task 2)
2. A `$tbd` value for a declared prop — the proxy must still record it read when the path draws the TBD chip, and L30 must not fire on it. (Task 6)
3. A compound (`$expanded`) element drawn through `kinds.group` — its own props are consumed by expansion, not by the drawing function; L30 must not report them. (Task 6)
4. `serve` started twice from two terminals on the same project — the second takes 4871 and both print their address; the heartbeat file is shared and must not be deleted by a viewer. (Tasks 10, 11)
5. A grid `columns` written as a number, `auto`, an array of tokens, or a single string — the stricter L13 must keep accepting every form the examples and §4.1 already use. (Task 7)

---

### Task 0: Restore the failing baseline test

**Files:** Modify: whichever of `src/proposals.js` / `src/spec.js` decides the tier for `status:` · Test: `test/spec.test.js:112`

- [ ] Run `node --test test/spec.test.js` — expect the one failure (`'pending' !== 'applied'`).
- [ ] Find why a proposal changing only `status: ready` is tiered `structure` (or blocked by lint, e.g. L27 open `$tbd`) instead of `text`; fix the cause, not the test, unless the test's fixture is what drifted.
- [ ] `npm test` → 261/261.

### Task 1: Read-recording proxy at the drawing call site

**Files:** Create: `src/render/reads.js` · Modify: `src/render/index.js` (`makeRenderer`) · Test: `test/reads.test.js`

**Interfaces — Produces:**
- `recordReads(el) → { el: Proxy, reads: Set<string>, enumerated: boolean }` — `get`/`has` on a top-level key add it to `reads`; `ownKeys` sets `enumerated = true` (spread, `Object.entries`, `JSON.stringify`).
- `makeRenderer(...)` returns `r` with `r.reads: Map<elementId, { written: string[], read: Set<string>, enumerated: boolean, kind, path, line }>`. "Written" = keys present in the screen element (not contract defaults), minus reserved keys and `$`-keys. Keys also counted as read: reserved keys, enum/boolean props turned into `data-<prop>` by `enumAttrs`, `layout`.
- `renderScreen` / `renderView` expose the record so lint and the viewer can consume it: `renderView(...)` returns `{ html, reads }` internally; public `drawReads(project, screen, merged, adapter)` in `src/render/index.js` returns the `Map`.

- [ ] Test: a fake kind fn that reads `el.title` only → `reads` has `title`, not `hint`; a fn that spreads `{...el}` → `enumerated: true`; nested `children` reads do not leak into the parent's record.
- [ ] Implement; wrap `drawn` (not `el`) so contract defaults are visible but only screen-written keys are judged.
- [ ] Guard test: render every bundled kind's contract sample; assert `enumerated === false` for every kind except `generic`.
- [ ] `npm test` green.

### Task 2: Contract coverage test (CI)

**Files:** Create: `test/coverage.test.js`, `test/fixtures/trust/` · Modify: `schema/component.schema.json` (allow `drawn: false` + `drawn_reason` on a prop), `src/spec.js` / library page ("not drawn" label)

**Interfaces — Consumes:** `recordReads`, the adapters' `create(project)`, `kinds` from `src/render/kinds.js`, `loadComponents`.

- [ ] For each `src/contracts/*.yaml`, each prop without `drawn: false`, build `{ id: 'x', kind, ...sample, [prop]: distinct(def) }` where `distinct` = enum's first non-default option, string `"⟨prop⟩-marker"`, number `7`, boolean `!default`, element `{ id: 'ov', kind: 'caption', text: 'overlay-marker' }`, list → one item.
- [ ] Paths: bundled always; `antd` when `maps_to.antd` and the adapter maps it; `mui` likewise (skip both with a note when the optional deps are absent — CI installs them).
- [ ] Assert per (contract, prop, path): read **and** output differs from the sample render. Failure message names all three.
- [ ] Run it; record the day-one gap list in the task notes (expected: the five known bundled gaps + many adapter gaps). Tasks 3–5 drive it to zero.

### Task 3: Close the bundled set's gaps (and B2 `group` disabled)

**Files:** Modify: `src/render/kinds.js`, `src/render/index.js` (card overlay layer, group disabled), contracts that legitimately document-only (`drawn: false` + reason) · Test: `test/coverage.test.js`, `test/fixtures/trust/*.yaml` + `test/trust.test.js`

- [ ] Fixtures + tests that fail first: `card.overlay` drawn over the card; `progress.value` sets the bar width; `group disabled: true` (and `disabled_when` matched in a state patch) draws every control inside disabled; `empty-notice.title` drawn; table column `kind` / `align` change the cell.
- [ ] Fix each in the bundled set; remaining bundled gaps from Task 2 fixed or marked `drawn: false` with reason.
- [ ] Coverage test: zero bundled failures.

### Task 4: Close the antd adapter's gaps

**Files:** Modify: `src/render/adapters/antd.js` · Test: `test/coverage.test.js`

- [ ] For each failing (contract, prop, antd): map the prop to the antd component's prop or children (e.g. `progress.value → percent`, `card.overlay → Spin/overlay child`). Where antd has no such prop, draw it the way the bundled set does inside the antd root.
- [ ] Zero antd failures; `npm test` green.

### Task 5: Close the MUI adapter's gaps

**Files:** Modify: `src/render/adapters/mui.js` · Test: `test/coverage.test.js`

- [ ] Same as Task 4 for MUI (`progress.value → LinearProgress variant="determinate" value`).
- [ ] Zero MUI failures; coverage test fully green.

### Task 6: L30 not-drawn + viewer dot

**Files:** Modify: `src/lint.js` (L30, catalogue), `src/render/index.js` (`dots`: blue-grey "not drawn" dot from the record), `src/render/i18n.js` (en/ko tooltip), `DESIGN.md §5` · Test: `test/lint.test.js`, `test/render.test.js`

- [ ] Test: a screen writing `card.hint` with a bundled kind fn stubbed to ignore it → L30 warning `prop "hint" is written but card does not draw it`, file + line. A `$tbd` value drawn as a chip → no L30. A kind drawn by a library adapter → lint skips. `generic` → no L30 (L10 covers it). `$expanded` compound → no L30 on its own props.
- [ ] Lint runs bundled fns through `drawReads` (no adapter); the viewer's dot comes from the render that drew the page.
- [ ] `npm test` green.

### Task 7: B2 shapes — grid tracks, units, scroll

**Files:** Modify: `src/lint.js` (L13), `src/render/index.js` (`layoutStyle`) · Test: `test/lint.test.js`, `test/render.test.js`, `test/fixtures/trust/`

- [ ] L13: each grid track (array item or whitespace-split string) must be a size/space token name, `Nfr`, `auto`, or `minmax(a, b)` over those; else blocking naming the track. `320px` blocking. Number/`auto` columns still pass (Review Focus 5).
- [ ] `scroll: vertical|horizontal` → `flex-wrap:nowrap`; wrap only with `wrap: true`.
- [ ] Every example project still lints 0 blocking; `npm run check` green.

### Task 8: init — name, language, .gitignore, patterns/

**Files:** Modify: `src/init.js`, `src/cli.js`, `src/render/i18n.js` (init output, CLI errors, generated README, sample values in `ko`), templates for README · Test: `test/init.test.js`

- [ ] `init` output and `design/README.md` say `npx @junyoung735/doan …`.
- [ ] `init --language ko|en` writes `meta.language`; default `en`.
- [ ] `init` writes `.gitignore` with `.requests/agent.json` (append if one exists, never duplicate).
- [ ] `init` creates `patterns/` with one example that lints clean.
- [ ] `ko` covers init output, CLI error lines, generated README, bundled sample values (table cells, error-state default title).

### Task 9: CLI — one error, README example tested, `comments`, `requests close`

**Files:** Modify: `src/cli.js`, `src/verbs.js`, `README.md`, `README.ko.md` · Create: `test/fixtures/trust/readme-screen.yaml` · Test: `test/cli.test.js`

- [ ] The README's screen example is extracted (or kept in sync) from a fixture a test proposes and lints 0 blocking.
- [ ] A verb error prints the one error and `doan --help <verb>`, not the whole help.
- [ ] `doan comments <dir>` lists open comments (same data as MCP `list_comments`); `doan requests close <id>` closes a request.
- [ ] `--help` rule range comes from the lint catalogue.

### Task 10: serve — ports, proposal links, pending sections, Apply/Undo, lint badge

**Files:** Modify: `src/serve.js`, `src/cli.js`, `src/render/page.js`, `src/render/index.js`, `src/render/i18n.js` · Test: `test/serve.test.js`

- [ ] Port: default busy → next free, printed; `--port n` busy → `port n is in use`, exit 1, no stack.
- [ ] A proposal link opens the proposal's own section canvas; a section existing only in a pending proposal renders a viewer page saying so with a link (no raw JSON).
- [ ] After Apply → the applied screen's frame, not `/`.
- [ ] Undo button on the last applied proposal (proposal page + post-Apply toast) → existing undo.
- [ ] Red lint badge → opens the screen's findings in the panel (rule, message, file:line), with a title.

### Task 11: Agent heartbeat

**Files:** Modify: `src/mcp.js`, `src/requests.js` (`readHeartbeat`, `writeHeartbeat`), `src/serve.js` (`/api/agent`), `src/render/page.js`, `src/render/i18n.js` · Test: `test/requests.test.js`, `test/mcp.test.js`

- [ ] MCP server writes `.requests/agent.json` `{pid, started, seen}` on start and every 20 s (unref'd timer).
- [ ] Viewer: connected when `seen` < 60 s; otherwise "No agent connected" + how to connect, request stays queued; waiting text goes away when the request closes.

### Task 12: Documents and version

**Files:** Modify: `DESIGN.md` (§1, comparison table, §5 L30, §9 planned verbs, §13), `README.md`, `README.ko.md`, `CHANGELOG.md`, `package.json`, MCP version

- [ ] Claude Design facts with the two sources from the spec; §9 `import html`, `rename`, `export <adapter>` marked planned; §13 shipped rows dropped; version 0.21.0.

### Task 13: First-time-user pass in Chrome

- [ ] Fresh temp dir: `init --language ko`, `serve`, propose the README example, open the proposal, Apply, Undo, click the lint badge, check Korean, start a second `serve` (port move). Click in Chrome, at desktop and narrow width. No step from the audit's top-three list reproduces.
- [ ] `npm run check` green → commit the round once.
