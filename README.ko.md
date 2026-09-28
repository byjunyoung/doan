<img src="docs/img/social-preview.png" alt="doan — 도안. 화면은 파일이다. 에이전트가 그리고, 당신은 무엇을 바꿀지 말한다." width="100%">

# doan

**한국어** · [English](README.md)

**도안** — 물건을 만드는 바탕이 되는 그림.

제품 화면을 YAML 파일로 적습니다. 파일은 AI 에이전트가 쓰고, 사람은 브라우저에서 보고 코멘트하고 **적용**을 누릅니다. 버전 관리는 git이 합니다. 제품 화면(웹·앱)에서 피그마를 대신하고, 덱·일러스트·마케팅은 대상이 아닙니다.

코드를 몰라도 됩니다. 쓰던 에이전트(Claude Code, Cursor, Codex)에게 말로 부탁하고 뷰어로 확인하면 됩니다.

<img src="docs/img/canvas.jpg" alt="캔버스: 섹션별 상태 프레임과 흐름 화살표, 왼쪽 레이어 트리, 오른쪽에 요소의 원본 컴포넌트와 파일 위치" width="100%">

## 흐름

```
① 시작 ─→ ② 파운데이션 ─→ ③ 그리기 ─→ ④ 보기 ─→ ⑤ 고치기 ─→ ⑥ 넘기기
                                         ↑          │
                                         └──────────┘
```

| 단계 | 사람이 하는 일 | doan이 하는 일 |
|---|---|---|
| ① 시작 | `init` 한 번 | 규칙·토큰·컴포넌트·화면 폴더를 만듦 |
| ② 파운데이션 | 레퍼런스를 보여 주고 질문에 답함 | 색·텍스트 스타일·면을 `tokens/`와 계약에 제안 |
| ③ 그리기 | "주문 목록, 행 누르면 상세" | 배치 규칙(`patterns/`)을 먼저 찾고, 정할 것을 하나씩 묻고 화면 파일을 제안 |
| ④ 보기 | 캔버스·프로토타입에서 확인 | 상태별 프레임, 흐름 화살표, 눌러 보는 프로토타입 |
| ⑤ 고치기 | 요소나 화면에 코멘트 → "반영해줘" | 제안 → AS-IS / TO-BE → 사람이 적용 |
| ⑥ 넘기기 | 개발 스펙 복사 | 수용 기준·요소·코드 대응·토큰을 한 장에 |

에이전트는 파일을 바로 고치지 못하고 **제안**만 합니다. 적용은 사람이 하고, 그사이 파일이 바뀌었으면 적용이 거절됩니다.

## 처음 5분

Node 20 이상.

```bash
npx @junyoung735/doan init design --base antd   # --base none: 컴포넌트 세트를 복사해 내 것으로
npx @junyoung735/doan serve design              # http://127.0.0.1:4870/
```

에이전트에 연결합니다. Claude Code는 프로젝트의 `.mcp.json`, Cursor는 `.cursor/mcp.json`:

```json
{ "mcpServers": { "doan": { "command": "npx", "args": ["-y", "@junyoung735/doan", "mcp", "design"] } } }
```

그다음 에이전트에게 화면 하나를 부탁하세요.

## 화면 파일

```yaml
screen: order-list
type: list                                  # list는 Empty·Loading·Error가 필수
elements:
  - { id: filter, kind: filter-form, fields: [period, branch, status] }
  - { id: table,  kind: table, columns: [order_no, branch, amount, status] }
states:                                     # 상태는 사본이 아니라 "무엇이 다른지"
  Empty:   [{ target: table, replace: { kind: empty-notice, text: "주문이 없어요" } }]
  Loading: [{ target: table, replace: { kind: skeleton, rows: 10 } }]
  Error:   [{ target: table, replace: { kind: error-notice, text: { $tbd: { owner: pm } } } }]
flows:
  - { from: table, via: row, to: order-detail }
```

빠진 상태나 정하지 않은 값(`$tbd`)은 `lint`가 파일과 줄 번호로 알려 주고, `main` 브랜치에서는 막습니다.

## 뷰어

<img src="docs/img/prototype.jpg" alt="프로토타입: 핫스팟을 눌러 흐름대로 화면을 넘겨 봄" width="100%">

**프로토타입** — 흐름대로 눌러 봅니다. 시간이 지나면 넘어가는 흐름은 저절로 재생됩니다.

<img src="docs/img/foundations.jpg" alt="파운데이션: 텍스트 스타일, 색 역할, 면을 한 장에" width="100%">

**파운데이션** — 텍스트 스타일·색·면·스케일을 한 장에 봅니다. 원자료는 변수 탭에 있습니다.

<img src="docs/img/components.jpg" alt="컴포넌트: 이 프로젝트에서 쓰는 것부터 분류별로" width="100%">

**컴포넌트** — 이 프로젝트에서 쓰는 것부터 분류별로 보여 줍니다. 캔버스에서 요소를 우클릭하면 원본 컴포넌트로 갑니다.

<img src="docs/img/spec.jpg" alt="개발 스펙: 파일에서 뽑은 수용 기준" width="100%">

**개발 스펙** — 수용 기준, 요소와 코드 대응, 상태·흐름, 쓰인 토큰. 마크다운으로 복사해 티켓에 붙입니다. 코딩 에이전트는 MCP `handoff`로 같은 내용을 받습니다.

## 명령

`npx @junyoung735/doan <동사>`. 전부 `--json`을 지원하고, MCP 서버도 같은 동사를 씁니다.

| 동사 | 하는 일 |
|---|---|
| `init` · `serve` · `render` | 시작, 살아 있는 뷰어, 정적 HTML |
| `lint` · `prep` · `diff` | 검사(차단 시 exit 1), 빠진 상태 채우기, AS-IS / TO-BE |
| `propose` · `apply` · `reject` · `undo` | 제안 루프 |
| `map figma` · `import figma` | 피그마 페이지를 화면 파일로 |

전체 목록은 `doan --help`. 설계 결정과 이유는 [DESIGN.md](DESIGN.md), 바뀐 것은 [CHANGELOG.md](CHANGELOG.md).

## 개발

```bash
npm test          # node:test
npm run check     # 테스트 + 예시 lint·렌더 (CI)
npm run demo      # examples/store-ops를 antd로
```

MIT · [김준영](https://github.com/byjunyoung)
