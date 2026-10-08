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
| 16 | **No shared shell.** The owner's first look at the canvas: "why not the whole screen? the Figma frames are different" — the frames had only the page content. An admin console's sider + top bar had to be pasted into seven files (`sider` nav + `main` group), so a menu change is seven edits — the very thing the Figma shell component was made to stop (2026-09-23). Wanted: a `shell:` the conventions name once (nav items, top bar, content slot) that every screen of a type wears, with `except:` for the login-less ones | all admin screens | F |
| 17 | **`nav` has no group headers** (상품 / 지점 / 앱 / 설정 over their items), so the sider lists ten leaves | shell | D |
| 18 | **Patterns check the top level only.** Once the shell is the top level, list-frame and form-frame (header → body → footer order) cannot be checked; they were switched off and the order written as prose | patterns | lint |
| 19 | **`icon:` on a button takes an asset path; a bare name (`menu`) is drawn as its text.** Nothing says so until the picture shows "menu" | shell top bar | A |
| 20 | **`import tokens` has no MCP tool** (§9: one set, three surfaces) | tokens | verbs |
| 21 | **`reveals` is a hint line, not the revealed control.** "지정 지점 → a select of branches" draws as "펼쳐지는 것: 지정 지점"; to show the select the file had to put radio and select in one `group` as the control | 계정상세 관리지점 | F |
| 22 | **`serve` keeps the code it started with.** Edits to kinds.js/page.js showed up only after a restart — forty minutes of "why is the picture unchanged". A dev flag that re-imports on each request, or a line in the serve banner saying which build it runs | viewer | A |
| 23 | **A `select` is as wide as its value.** The handoff draws every control full-width in a vertical form; the tags select came out a third of the row | 계정상세 | F |

## Fixed on the owner's second look ("ㅈㄴ 다르잖아 피그마랑", 2026-10-08)

Side by side with the Figma frame, the content-only picture was wrong in nine places. Four were the file's (section headings, required marks, the branch radio, the soft button); five were vocabulary. Added, with the project's copies updated and 298 tests passing:

- `field.labels: top` — label over the control, caption under it (an admin form); `field.required` — a `*` after the label
- `page-header.back` — "← parent" over the title
- `nav.logo` and `nav.items` entries of `{ group, items }` — a word mark and headings over their items
- a `section` inside a card or fieldset is drawn as a heading (기본 정보 · 권한), not a label
- the project binds `page-header` `font-size`/`font-weight` to `font.size.xl` / `font.weight.bold`

Still apart from the handoff: the sider's icons and right border, the fixed footer toolbar, the top bar's bottom border, the tags select's width (#23).

## Not doan's

- The spec rows leave empty-field, format and confirm-dialog copy undefined. doan left five `$tbd`; the code invented its own. That is a planning gap the file made visible.
- The code's empty/error copy departs from the team's shared loading/empty/error rule; the file follows the rule. A diff the handoff spec can carry.
