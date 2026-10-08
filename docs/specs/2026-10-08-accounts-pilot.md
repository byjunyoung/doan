# Accounts pilot — what a real admin screen set asked of doan (2026-10-08)

A store-operations admin's "accounts & permissions, round 2" (ten screens: three lists, five forms, one modal, one notice) was drawn in doan from its spec rows alone, then compared with the Figma handoff and the React code that already existed for it. Project: a local git repo beside the frontend, `init --base antd --language ko`, tokens imported from the team's Figma Variables export. Comparison tables live with that project (`docs/2026-10-08-시안·코드-대조.md`).

## Done in this round

| What | Where |
|---|---|
| `import tokens <project> <variables-dir>` — a Figma Variables export (one JSON per collection) becomes the project's `tokens/`: primitives bare, every other collection under a prefix, a multi-mode collection a resolver modifier with one file per mode, and doan's own names (`color.bg`, `space.md`, `text.body`…) an alias layer paired by `--map` over a default guess | `src/import/tokens.js`, `test/import-tokens.test.js` |
| antd adapter: a table column whose `kind` is itself antd-mapped (tag) was a `renderToString` nested in the Table's render callback → "Invalid hook call" on every page that drew it. Cells are now drawn before the Table renders | `src/render/adapters/antd.js`, regression in `test/render.test.js` |

## Found, queued

Ranked by how often the pilot hit them. Cluster letters are the 2026-10-02 audit's.

| # | Gap | Hit where | Cluster |
|---|---|---|---|
| 1 | **No way to lock a field.** `field` has no `disabled`; only `button` and `group` do. A locked value had to become `control: { kind: input, readonly: true, text: … }`, which loses the radio/select it was | every form's "grouped" and "self" variants (7 places) | F |
| 2 | **No tag input / multi-select.** Email domains, branch picking, store picking were written as `select` + a `preview` of chips | 그룹상세 · 계정추가 · 계정상세 · 승인상세 · 가입신청 | D |
| 3 | **No grouped picker.** The spec wants branches chosen by branch group with a group header that selects the whole group; the handoff draws a picker modal | 계정추가 · 계정상세 · 승인상세 | D |
| 4 | **`input` has no password mode** | 비밀번호정하기 | D |
| 5 | **`page-header` has no breadcrumb, and its `tabs` cannot say which is active** (first is active). Used a separate `tabs` element under the header | all three lists | F |
| 6 | **A toast is not a state.** "Saved" toast after a form submit lives only in a flow's `when`; the handoff has it as a frame | 계정상세 → 계정목록 | F |
| 7 | **`refs.parent` is single.** A modal three screens share (temporary password) had to pick one parent and say the rest in flow `when`s | 임시비밀번호 | F |
| 8 | **`fieldset` has no `disabled`** — a submitting form locks its footer and lays an overlay instead | every form's Submitting | F |
| 9 | **Flow `from` must be an element of the Default state.** A button that exists only inside a state's `replace` cannot start a flow; `from: <container>, in: <state>, when: …` instead | 비밀번호정하기 Expired | lint |
| 10 | **Flow `via` must be an anchor** — a button inside a `group` is reached with `from: <button id>`, not `from: footer, via: save`. The error says so, but the first draft got it wrong ten times | all forms | docs |
| 11 | **Authoring traps, again.** `?` and `: ` inside a flow-style scalar, a `,` inside a flow map value, `id` pattern `^scr_[A-Za-z0-9]+$` (no `_`). The schema message names the rule; a `propose` pre-check that quotes or points at the exact scalar would save a round trip | first propose of 10 files: 8 refused | A |
| 12 | **`canvas` layout: section boxes overlap** when sections carry many variant rows (4 sections, 8 screens) | 계정관리 canvas at 5 % | viewer |
| 13 | **Arrow labels sit on frames** ('필수 값이 다 있으면', '계정 그룹 탭' over the top section) | 계정관리 canvas | viewer |
| 14 | **`import tokens` pairs names by guess.** Three pairings (muted → text/tertiary, border → border/tertiary, control.xl → space/700) are heuristics; a project should write its own `--map` and the import should print the pairing it chose | tokens | import |
| 15 | **Typography modes come through as a modifier (Default/Compact/Large)** — works, but the adapters theme from the default context only (§13) | tokens | known |

## Not doan's

- The spec rows leave empty-field, format and confirm-dialog copy undefined. doan left five `$tbd`; the code invented its own. That is a planning gap the file made visible.
- The code's empty/error copy departs from the team's shared loading/empty/error rule; the file follows the rule. A diff the handoff spec can carry.
