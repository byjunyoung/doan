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
| 24 | **A table had no rows of its own.** Every table drew three rows of `샘플 1/2/3`, and a Korean column name (아이디 · 이메일 · 등록일) matched none of the English sample regexes; a status column drew the store set's 결제완료 · 대기 · 환불 on an accounts table. The owner's word for the result: "엉망". Fixed — `table.rows` (a list per row, or a map by column key; a cell may be `{ text, color }` for a tag column) | all four tables | F |
| 25 | **Author notes leaked into the picture.** `button.note` drew as small print beside the button ("메뉴 접기", "내 정보 · 비밀번호 변경 · 로그아웃" sat on the top bar as screen copy); `table.row_action` drew "행 → 계정 상세로" under the table. Fixed — both are a `title` on the element now; the inspector and the spec still carry them | top bar, every table | F |
| 26 | **A region has no colour of its own.** The handoff paints the content area page-grey under white cards and a white sider; a layout rule could not say so. Fixed — `surface:` on a layout rule (`surface: surface.page`); the bundled nav also wears `color.bg` and a right hairline | content, sider | layout |
| 27 | **An `icon` button under antd kept its border** — the contract's `border` token is bound onto every antd button, and antd's text button could not shed it. Fixed in page.js | top bar | adapter |
| 28 | ~~`propose` applies by itself?~~ By design: the project's `conventions.edit.auto_apply: [text]` applies a text-tier proposal as soon as it lints clean. `apply` then says "already applied" — the message could say *who* applied it | loop | docs |
| 29 | **`nav` items had no icon.** The console's sider draws one before every item. Fixed — an item may be `{ label, icon }`; the project exported the frontend's icon paths to `assets/icons/` | sider | F |
| 30 | **A layout `surface:` painted only the background.** The handoff's footer toolbar is a white bar with a shadow. Fixed — bg, border, radius, shadow, each falling back when the surface has no such slot | form footers | layout |
| 31 | **The canvas reads as overlapping at 6 %** — measured, the sections do not overlap; 240 px between 1440-wide frames is 14 px on screen. The gap could scale with the widest frame | canvas | viewer |

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

## Round 2 (2026-10-09, "go"): foundations first

The owner asked why the picture was so far from the handoff. Three causes, in order: the loop's ② foundations step was skipped (the console's shell, page types and form rules live in the Figma `[UI] 공통` / `[패턴]` pages and in the team's notes, not in the spec rows — only the spec rows were fed in); the bundled vocabulary did not know an admin console; the check was lint and the tool's own picture, never the handoff frame beside it.

Done: the eight handoff frames were pulled as PNGs and read; four patterns written from them (`shell-frame`, `list-frame`, `form-frame`, `auth-frame`) with the rules as prose; all nine screens regenerated to those rules (title + action + tabs + titled card + "조회결과 N건" + centred paging on lists; "← parent" + title + one card of headed sections + vertical labelled fields + footer 삭제 | 취소·저장 on forms; centred 480 form with title, subtitle, full-width button and a login line on the login-less pair). `field.labels: top` now also makes the control fill the row (#23, bundled and antd). Side by side with the handoff, every one of the nine now has the same bones.

Still apart from the handoff: sider icons and its right border, the fixed footer toolbar (ours sits under the card), the top bar's bottom border, tabs inside the page header (ours is a `tabs` element under it), page background grey vs white. All F — vocabulary and chrome, none of them structure.

Lesson for the loop: ② is not optional and it is not tokens alone. A team's shell, page types and form rules must be read from where they live (a Figma page, a notes file) and written into `patterns/` before ③. The `draw` prompt should refuse to draw a screen type that has no pattern.

## Round 3 (2026-10-09, "엉망인데"): the check was wrong, not only the picture

Round 2 reported "same bones, the rest is trim" from a 47 % canvas. At 100 %, beside the handoff PNG, the picture was a mess for reasons the element tree cannot show: three rows of `샘플 1` with payment statuses on an accounts table (#24), author notes drawn as screen copy on the top bar (#25), a white page where the handoff is grey (#26), bordered "text" buttons (#27). Fixed in doan (299 tests), then the project: handoff rows in all four tables, tag colours, `surface.page` on every content area, the nav's active item in the team's selected-blue, footers right-aligned or stacked as the handoff has them.

Still apart: sider item icons (an asset set the project does not have yet), the fixed footer toolbar (ours ends the page), the search bar's filled style, the chips' pill shape.

Rule for the check, now in memory: compare at the handoff's own scale with the handoff beside it, one of each page type, and put the pair in the reply — never "뼈대 일치" from a thumbnail.

## Round 4 (2026-10-09, "go"): the leftovers

Sider icons (#29), the footer toolbar (#30), the canvas measured rather than eyeballed (#31), #28 explained, and the five screens not yet seen at 100 % captured beside their frames — all five read as the handoff. 300 tests.

Still apart: the search bar's filled style, the chips' pill shape, the word mark's italic *brew*.
