# Trust round — design (2026-10-02)

Target version: 0.21.0. Status: spec reviewed 2026-10-04 (three decisions below, marked *2026-10-04*); ready to plan.

## Why this round

A product audit on 2026-10-02 (four strands: internal record, five product types drawn for real, a first-time
user clicking through the viewer, comparison with other tools) grouped about sixty findings into seven
clusters. This round takes the three that make doan untrustworthy before it can be made bigger:

| Cluster | What the person meets | Evidence |
|---|---|---|
| A — first five minutes | the command `init` prints 404s; the README's screen example fails `propose`; a proposal opens on the Sample canvas; a section not yet applied answers with raw JSON; "The agent is on it…" never goes away; the red lint badge does nothing; a person cannot undo in the viewer; every word is English | first-time-user strand |
| B — silently wrong | lint is green while the picture is broken or a value is ignored | internal record (named the deepest weakness), five-type strand (four of five types) |
| G — stale documents | DESIGN.md says Claude Design has no drag canvas (it has had one since 2026-06); `--help` says L01–L15; §9 lists `import html` as if it existed | external and internal strands |

Out of this round, ranked next: D (missing kinds: chart, drawer, slider, meter…), C (prototype that holds
values and conditions), E (hosted sharing, permissions), F (vocabulary depth). The "values + control" design
drafted for continuous controls is parked under C.

## B — the guarantee

B has two roots.

**B1 — a contract declares a prop the picture never reads.** L21 catches a prop the contract does *not*
declare; nothing catches a declared prop that no drawing path reads. Found: `card.overlay`, `progress.value`,
`group` disabled not reaching its controls, `empty-notice.title`, table column `kind` / `align`.

**B2 — a value of the wrong shape passes.** A grid track written `sm` becomes invalid CSS and the grid
collapses to one column; `320px` passes L13 although §4.1 says units are refused; a `scroll: vertical`
group wraps, pushing a skeleton into a second column.

### B1, layer 1 — contract coverage in CI

A test renders every contract once per declared prop: the contract's sample, with that one prop set to a
distinct value (an enum's non-default option, a string marker, a number, `true`). For each drawing path —
bundled set, `antd`, `mui` — the prop must be *read*. A path that does not read it fails the test, naming
contract, prop and path.

"Read" is recorded, not inferred from output: the element handed to the drawing function is wrapped in a
read-recording proxy (see layer 2). A prop also counts as read when the wrapper consumes it — an enum prop
that becomes `data-<prop>` for variant css, reserved keys (`show_when`, `disabled_when`, `reveals`,
`repeat`, `slots`, `slot`), layout.

A prop that is meant to be read by nothing (documentation only) is marked in the contract with
`drawn: false` and is skipped; the spec page lists it as "not drawn".

Every gap the test finds on day one is either fixed in the drawing path or marked `drawn: false` with a
reason. The five known gaps above are fixed, not marked.

*2026-10-04:* this holds for the library adapters too — every gap in `antd` and `mui` is fixed in this
round, not listed as known. Counted: the bundled set draws 134 declared props, `antd` 81 (adapter 102
lines), `mui` 71 (79 lines), so most of the day-one gaps are expected in the adapters. `drawn: false` is
per prop, not per path, so it is never used to excuse an adapter: marking a prop there would also drop it
from the bundled set's check.

### B1, layer 2 — what the person sees

`render` records, per element, which of the props written in the screen file the drawing path read
(same proxy, at the one call site `fn(drawn, r)` in `src/render/index.js`). A prop written in the file,
declared by the contract, and not read becomes:

- lint **L30 not-drawn** (warning): `prop "overlay" is written but card does not draw it`, file and line.
  Lint runs the bundled drawing functions to know this; library adapters are not run by lint (SSR cost) —
  their coverage is layer 1's job.
- a dot in the viewer like the existing `$tbd` / condition dots, tooltip "not drawn — written in the file,
  not in the picture". The viewer's dot comes from the render that actually drew the page, so in a project
  whose base is a library adapter the dot reflects the adapter.

Where L30 does not apply: a kind the project draws through a library adapter (lint skips it; layer 1 covers
the adapter), and an unknown kind drawn by `generic`, which lists every prop by design (L10 already warns).
Checked 2026-10-02: `generic` is the only drawing function that enumerates the whole element; no adapter
spreads or serialises it, so the proxy's record is trustworthy. Layer 1 adds a guard test that fails if a
drawing function other than `generic` enumerates the element.

This also covers a team's own copy of the set (`--base none`), which layer 1 cannot see.

### B2 — shapes

- L13 checks each grid track string: token names, `fr` values, `auto`, `minmax(a, b)` over those. Anything
  else is blocking, with the offending track named. A number with a unit (`320px`) is blocking, as §4.1 says.
- `scroll: vertical|horizontal` sets `flex-wrap: nowrap`; wrapping becomes opt-in.
- `group` with `disabled` (or matching `disabled_when` in a state patch) draws every control inside it
  disabled, as `group.yaml` already promises.

## A — first five minutes

| Finding | Change |
|---|---|
| `init` and the generated `design/README.md` print `npx doan …` (404) | print the published name, `npx @junyoung735/doan …` |
| README's screen example fails `propose` (no `id`, schema error, then the whole help) | the README example is the file a test proposes and lints; an error prints the one error and the hint `doan --help <verb>`, not the full help |
| a proposal link opens the canvas the person happens to be on | link to the proposal's own section canvas; a new screen whose section is not yet registered opens a proposal page that says so |
| a section not yet applied returns `{"error":"no domain …"}` | a page in the viewer's frame: "this section exists only in a pending proposal" with a link to it |
| after Apply the viewer goes to `/` (Sample) | go to the applied screen's frame |
| port 4870 in use → Node crash (`EADDRINUSE`) | with no `--port`, try the next free port and print it. *2026-10-04:* with `--port <n>` and `n` in use, do not move — print one line (`port n is in use`) and exit non-zero, never a stack trace |
| "The agent is on it…" with no agent, and after the request is done | the MCP server, while its process lives, rewrites a heartbeat file `.requests/agent.json` (`{pid, started, seen}`) every 20 s (*2026-10-04:* beside the queue it watches, not a new `.doan/` folder; `init` writes a `.gitignore` that leaves it out, since a file rewritten every 20 s would otherwise always show as changed); the viewer counts an agent as connected when `seen` is under 60 s old. With none: "No agent connected" and how to connect, and the request is still queued. When the request closes, the waiting text goes away. CLI gets `requests close <id>` |
| red lint badge has no title and no action | click opens the findings for that screen in the panel (rule, message, file:line) |
| no undo in the viewer | an "Undo" button on the last applied proposal (proposal page and the toast after Apply), calling the existing undo |
| everything English | cause: `language` defaults to `en`; the viewer's `ko` dictionary already exists and covers its words. Change: `init --language ko|en` writes the setting (default stays `en`), the Korean README's commands carry `--language ko`, and the `ko` words are extended to what is still English only — init output, CLI error messages, the generated README, the bundled sample values (table cells, error-state default title). Existing viewer terms are not reworded (2026-09-28 decision) |
| `patterns/` not created, step ② and ③ have no starting point | `init` creates `patterns/` with one example; the Patterns page says what to ask the agent |
| comments not readable from the CLI | `comments` verb (list), same as MCP `list_comments` |

## G — documents

- DESIGN.md §1 and the comparison table: Claude Design has drag, resize and align (2026-06-17) and lives
  inside Claude (2026-09-16); the difference that remains is states as required objects, lint for what is
  missing, git lifecycle, agent neutrality. Sources: https://claude.com/blog/claude-design-stays-on-brand-for-daily-work ,
  https://www.magicpatterns.com/blog/claude-design-now-lives-inside-claude
- `--help`: the rule range comes from the lint catalogue, not a literal.
- §9: `import html`, `rename`, `export <adapter>` marked "planned".
- §13: drop rows already shipped (line-height and letter-spacing slots; flow-diagram label placement);
  add L30 to §5.

## Done when

- `npm run check` passes, with the contract-coverage test in it — including `test/spec.test.js:112`
  (proposing `status: ready` should apply at once), which already failed on main at 0.20.3 before this round; every contract prop is read by every path
  or marked `drawn: false` with a reason.
- Each case that was silent in the audit has a minimal fixture under `test/fixtures/trust/` (fictional names)
  and a test that now reports or draws it: grid track `sm`, track `320px`, `scroll` group wrapping, `group`
  disabled reaching its controls, `card.overlay`, `progress.value`, table column `kind` / `align`,
  `empty-notice.title`. L30 and the stricter L13 have their own tests.
- The first-time-user strand repeated against the local build — init, serve, propose the README example,
  open the proposal, apply, undo, lint badge, Korean — with no step from its top-three list reproducing.
  Verified by clicking in Chrome, not by reading code.
- DESIGN.md, README (both languages) and CHANGELOG updated; version 0.21.0.

## Not in this round

New kinds (D), evaluating conditions or values in the prototype (C), hosting and permissions (E), and any
change to the viewer's existing wording (decided 2026-09-28: the viewer's terms stay).
