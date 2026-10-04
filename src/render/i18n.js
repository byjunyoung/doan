// The viewer's own words, in the language `conventions.meta.language` names. Screen content
// is the team's and is never translated; this is only the chrome around it — labels,
// buttons, hints — and the sample values that stand in for empty cells.

const EN = {
  screens: 'screens', compare: 'Compare states', paths: 'Paths', variants: 'variants',
  flows: 'Flows', notes: 'Notes', comments: 'Comments', open: 'open', references: 'References', none: 'none',
  waitingForPerson: 'Waiting for a person', proposal: 'proposal', screen: 'screen', tier: 'tier',
  decided: 'Decided before this version', noDecisions: 'No decisions recorded — the agent proposed without the interview',
  whatChanges: 'What changes', where: 'where', asisTobe: 'AS-IS · TO-BE', asis: 'AS-IS', tobe: 'TO-BE', notInAsis: 'not in AS-IS', removedInTobe: 'removed in TO-BE',
  apply: 'Apply', reject: 'Reject', yourName: 'Your name', toAccept: 'To accept', toDecline: 'To decline', noSummary: '(no summary)',
  item: 'item', decision: 'decision', why: 'why', blocking: 'blocking', warning: 'warning', clean: 'clean', states: 'states', openComments: 'open comments',
  comment: 'comment', commentsN: 'comments', tbd: '$tbd', components: 'components', on: 'on',
  sectionsN: 'sections', fitLabel: 'Fit', viewCanvas: 'Canvas', arrowsLabel: 'Arrows', searchTree: 'Search screens  \u2318F', shortcutsHint: 'Shift 1 fit \u00b7 Shift 2 zoom to selection \u00b7 Shift 0 100% \u00b7 \u2318\u00b1 zoom \u00b7 Esc clear', proto: 'Prototype', hotspots: 'Hotspots', back: 'Back',
  usedHere: 'Used in this project', unusedBundled: 'Bundled, not used here', propsAndStyle: 'Props and styles', catCompound: 'Made of parts', catAction: 'Actions', catInput: 'Inputs', catDisplay: 'Content', catContainer: 'Containers', catNav: 'Navigation', catFeedback: 'Feedback', catOther: 'Other', roleBase: 'Base', roleBrand: 'Brand', roleState: 'Status', roleSystem: 'System',
  propsTitle: 'Properties', layoutLabel: 'Layout', layFlow: 'direction', layColumn: '↓ top to bottom', layRow: '→ side by side', layGrid: '▦ in columns', layNone: 'none', layColumns: 'columns', layGap: 'gap', layPadding: 'padding', layAlign: 'align', laySize: 'width', layHug: 'fit content', layGrow: 'fills the height', laySend: 'Propose this layout', layOwner: 'Arranged by its component — change it in the component', laySent: 'Proposed — opening it…', layReset: 'Reset', layAuto: 'Inside', layAutoHint: 'how what it holds is arranged', layAlignHint: 'align — where what it holds gathers', laySizing: 'Size', layHeight: 'height', layFill: 'fill', layGrowFill: 'take the rest', layFixed: 'fixed', layPreview: 'Previewing — the canvas shows it now',
  goToComponent: 'Go to main component', selectIt: 'Select', sayWhatScreen: 'Say what should change on this screen', commonComments: 'Comments on the whole', sayWhatAll: 'A note on the whole — nothing needs to be selected',
  newFile: 'new', deletedFile: 'deleted', agreedBefore: 'Agreed before this version',
  foundations: 'Foundations', boardTab: 'Board', varsTab: 'Variables',
  style: 'Style', styleMeta: 'what the product looks like — every style in one place', textStyles: 'Text styles', colorsLabel: 'Colours', surfacesLabel: 'Surfaces', scalesLabel: 'Scales', componentsLabel: 'Components', sampleText: 'The quick brown fox jumps over the lazy dog 0123', noStyles: 'None defined — add text.* to the tokens', noSurfaces: 'None defined — add surface.* to the tokens',
  tokens: 'Tokens', assets: 'Assets', designSystem: 'Design system', nameLabel: 'name', typeLabel: 'type', valueLabel: 'value', cssVar: 'CSS variable', usedBy: 'used by', aliasLabel: 'alias', bundledSet: 'Bundled set — not in your files', noTokens: 'No token files: the bundled set is in use. doan init writes tokens/.', tokenProblems: 'Token problems', unusedFiles: 'Files nothing names', missingAssets: 'References to no file', noAssets: 'Put icons and pictures under assets/ and name them by path — src: assets/photos/menu.jpg on an image, icon: assets/icons/cart.svg on any kind with an icon.', unusedMark: 'unused', usesN: 'uses', filesN: 'files', sizeLabel: 'size', collections: 'Collections', groupsLabel: 'Groups', allTokens: 'All tokens', searchTokens: 'Search tokens', modeLabel: 'mode', chainLabel: 'resolves as',
  protoHelp: 'A prototype only follows flows: press a hotspot on the frame, or pick a flow below. Selecting elements is the canvas\'s job.', flowsFrom: 'Flows from this screen', chooseFlow: 'Which flow?', noFlowsFrom: 'No flow leaves this screen.',
  newScreen: 'A new screen — there is no AS-IS to compare.',
  breakpointsLabel: 'Breakpoints', baseWidth: 'base',
  menuLabel: 'Menu', panelLabel: 'Panel',
  spec: 'Spec', specFor: 'developer spec', acceptance: 'Acceptance', copyLabel: 'Copy', codeLabel: 'Code', elementsLabel: 'Elements', changesIn: 'changes in', statusLabel: 'status', statusDraft: 'draft', statusReady: 'ready for dev', statusDone: 'built', copyMarkdown: 'Copy as Markdown', accState: '{state}: {target} {change}', accFlow: '{from} {gesture} → {to}{when}', accCond: '{id} {cond}', accBp: 'at {bp} ({width}px): {target} {change}', accRequired: 'the screen has every state its type requires ({states})', chReplace: 'becomes {kind}', chSet: 'sets {what}', chHide: 'is hidden', chLayout: 'lays out {what}', condShow: 'is shown when {v}', condDisabled: 'is disabled when {v}', condReveals: 'reveals {v}', tokensUsed: 'Tokens used', usedAt: 'used at', openQuestions: 'Open questions', noneYet: 'none',
  decideHint: 'Apply this proposal?', fileLabel: 'file', closeProposal: 'Close the proposal', showCode: 'As code (paths and values)', askComments: 'Ask the agent to apply them', askWaiting: 'The agent is on it…', askNone: 'No open comments', askDone: 'Proposals in — reload', openCommentsN: '{n} open comment(s)',
  patterns: 'Patterns', patternsN: 'patterns', platformLabel: 'platform', allScreens: 'every screen', exceptLabel: 'except', anyKind: 'any kind', manyMark: 'one or more', optionalMark: 'optional', noneBound: 'No screen is bound yet', appliesLabel: 'binds', graduatedTo: 'became', skeletonLabel: 'skeleton — the top-level parts, in order (L29 checks it)', rulesLabel: 'rules — read, not checked', noPatterns: 'No patterns yet. A pattern says how the parts are arranged on this product\'s screens — one file per pattern under patterns/, and L29 checks the screens it binds.',
  pnComponent: 'Component', pnLayout: 'Layout', pnAutoLayout: 'Auto layout', pnProps: 'Properties', pnComments: 'Comments', pnFile: 'File', pnScreen: 'Screen', pnFlows: 'Flows', pnProposal: 'Proposal', pnChanges: 'Changes', pnDecisions: 'Decisions',
  anatomyLabel: 'Anatomy', whenLabel: 'When to use', notLabel: 'When not to use',
  library: 'Components', propsLabel: 'props', slotsLabel: 'slots', bindingsLabel: 'token bindings', compound: 'compound — drawn from its own elements', legacyKind: 'Still in conventions.kinds', noneOfKind: 'No components yet — doan migrate kinds, or add components/<kind>.yaml', requiredMark: 'required',
  // drawer (sent to the page as JSON)
  clickToInspect: 'Click an element to inspect it.', component: 'component', bundled: 'bundled default', samplesNote: 'Values shown in the picture are samples unless the file sets them',
  file: 'file', path: 'path', line: 'line', copy: 'Copy path:line', copied: 'Copied', noneOnElement: 'None on this element',
  sayWhat: 'Say what should change', send: 'Comment', liveOnly: 'Open the live viewer (doan serve) to comment', nameFirst: 'Your name first', close: '×',
  // bundled kinds
  undesigned: 'undesigned', nothingHere: 'Nothing here', wentWrong: 'Something went wrong', loading: 'Loading…', image: 'image', select: 'Select', chooseFile: 'Choose file', menu: 'menu', perPage: '/page',
  // samples
  s_item: (n) => `Item ${n}`, s_sample: (n) => `Sample ${n}`, s_stores: ['Gangnam', 'Seongsu', 'Pangyo'], s_status: ['Paid', 'Pending', 'Refunded'], s_method: ['Card', 'Mobile', 'Cash'],
  notDrawn: (p) => `not drawn — written in the file, not in the picture: ${p}`,
  askQueued: 'Queued — no agent connected', agentOn: '● agent connected', agentOff: '○ no agent connected — start one with the doan MCP server (README, “Connect your agent”); the request waits until then',
  lintPillTitle: (n) => `${n} blocking — show them`, lintFindings: 'Lint', undo: 'Undo', appliedHint: 'Applied. Undo puts the file back as it was.', appliedToast: 'Applied', undone: 'Undone', onlyInProposal: 'This section exists only in a pending proposal', onlyInProposalText: (s) => `“${s}” has no applied screen yet. Open the proposal to see it, and apply it to put it on a canvas.`, openProposal: 'Open the proposal', noDomain: 'No such section', noDomainText: (s) => `There is no section “${s}” in this project.`, backHome: 'Back to the canvas',
  s_duration: ['4m 12s', '3m 48s', '6m 01s'], rowTo: 'row →', revealsLabel: 'reveals:', noData: 'No data', perPageWord: '/page',
};

const KO = {
  ...EN,
  screens: '화면', compare: '상태 비교', paths: '경로', variants: '변형',
  flows: '흐름', notes: '메모', comments: '코멘트', open: '열림', references: '참조', none: '없음',
  waitingForPerson: '사람의 결정을 기다리는 제안', proposal: '제안', screen: '화면', tier: '종류',
  decided: '이 판 전에 정한 것', noDecisions: '기록된 결정이 없음 — 인터뷰 없이 제안됨',
  whatChanges: '바뀌는 것', where: '어디', asisTobe: 'AS-IS · TO-BE', notInAsis: 'AS-IS 에 없음', removedInTobe: 'TO-BE 에서 빠짐',
  apply: '적용', reject: '반려', yourName: '이름', toAccept: '적용하려면', toDecline: '반려하려면', noSummary: '(요약 없음)',
  item: '항목', decision: '결정', why: '이유', blocking: '차단', warning: '경고', clean: '이상 없음', states: '상태', openComments: '열린 코멘트',
  comment: '코멘트', commentsN: '코멘트', components: '컴포넌트', on: '·',
  sectionsN: '섹션', fitLabel: '맞춤', viewCanvas: '캔버스', arrowsLabel: '화살표', searchTree: '화면 검색  \u2318F', shortcutsHint: 'Shift 1 맞춤 \u00b7 Shift 2 선택에 맞춤 \u00b7 Shift 0 100% \u00b7 \u2318\u00b1 줌 \u00b7 Esc 해제', proto: '프로토타입', hotspots: '핫스팟', back: '뒤로',
  usedHere: '이 프로젝트에서 쓰는 것', unusedBundled: '안 쓰는 기본 컴포넌트', propsAndStyle: '속성·스타일', catCompound: '조합 컴포넌트', catAction: '액션', catInput: '입력', catDisplay: '표시', catContainer: '컨테이너', catNav: '탐색', catFeedback: '피드백', catOther: '기타', roleBase: '기본', roleBrand: '브랜드', roleState: '상태', roleSystem: '시스템',
  propsTitle: '속성', layoutLabel: '배치', layFlow: '방향', layColumn: '↓ 위아래로', layRow: '→ 옆으로', layGrid: '▦ 칸으로', layNone: '없음', layColumns: '칸 수', layGap: '사이 간격', layPadding: '안쪽 여백', layAlign: '정렬', laySize: '폭', layHug: '내용에 맞춤', layGrow: '남는 높이 채움', laySend: '배치 제안하기', layOwner: '컴포넌트가 정하는 배치 — 바꾸려면 원본 컴포넌트에서', laySent: '제안했어요 — 여는 중…', layReset: '되돌리기', layAuto: '안쪽 배치', layAutoHint: '안에 든 것들을 어떻게 놓을지', layAlignHint: '정렬 — 안에 든 것을 어디로 모을지', laySizing: '크기', layHeight: '높이', layFill: '꽉 채움', layGrowFill: '남는 만큼 늘림', layFixed: '고정', layPreview: '미리 보는 중 — 캔버스에 바로 반영돼요',
  goToComponent: '원본 컴포넌트로 이동', selectIt: '선택', sayWhatScreen: '이 화면에서 바꿀 점을 적어주세요', commonComments: '공통 의견', sayWhatAll: '전체에 대한 의견 — 아무것도 고르지 않아도 돼요',
  newFile: '새 파일', deletedFile: '삭제', agreedBefore: '이 판 전에 정한 것',
  foundations: '파운데이션', boardTab: '보드', varsTab: '변수',
  style: '스타일', styleMeta: '제품이 어떻게 생겼나 — 스타일 전부를 한 장에', textStyles: '텍스트 스타일', colorsLabel: '색', surfacesLabel: '면', scalesLabel: '스케일', componentsLabel: '컴포넌트', sampleText: '다람쥐 헌 쳇바퀴에 타고파 0123 ABC', noStyles: '정의 없음 — 토큰에 text.* 를 추가', noSurfaces: '정의 없음 — 토큰에 surface.* 를 추가',
  tokens: '토큰', assets: '에셋', designSystem: '디자인 시스템', nameLabel: '이름', typeLabel: '타입', valueLabel: '값', cssVar: 'CSS 변수', usedBy: '사용처', aliasLabel: '별칭', bundledSet: '기본 세트 — 파일에 없음', noTokens: '토큰 파일이 없어 기본 세트로 그립니다. doan init이 tokens/를 만듭니다.', tokenProblems: '토큰 문제', unusedFiles: '쓰이지 않는 파일', missingAssets: '파일이 없는 참조', noAssets: 'assets/ 아래에 아이콘·이미지를 넣고 경로로 부르면 여기 나옵니다 — 이미지는 src: assets/photos/menu.jpg, 아이콘은 icon: assets/icons/cart.svg.', unusedMark: '안 쓰임', usesN: '곳', filesN: '파일', sizeLabel: '크기', collections: '컬렉션', groupsLabel: '그룹', allTokens: '전체', searchTokens: '토큰 검색', modeLabel: '모드', chainLabel: '풀면',
  protoHelp: '프로토타입은 흐름만 따라갑니다. 프레임의 핫스팟을 누르거나 아래 흐름을 고르세요. 요소 선택은 캔버스에서.', flowsFrom: '이 화면에서 가는 곳', chooseFlow: '어느 흐름으로 갈까요?', noFlowsFrom: '이 화면에서 나가는 흐름이 없습니다.',
  newScreen: '새 화면 — 비교할 AS-IS가 없습니다.',
  breakpointsLabel: '브레이크포인트', baseWidth: '기본',
  menuLabel: '메뉴', panelLabel: '패널',
  spec: '스펙', specFor: '개발 스펙', acceptance: '수용 기준', copyLabel: '카피', codeLabel: '코드', elementsLabel: '요소', changesIn: '변경', statusLabel: '상태', statusDraft: '초안', statusReady: '개발 준비됨', statusDone: '구현됨', copyMarkdown: '마크다운으로 복사', accState: '{state}: {target}이(가) {change}', accFlow: '{from} {gesture} → {to}{when}', accCond: '{id} {cond}', accBp: '{bp}({width}px)에서 {target}이(가) {change}', accRequired: '타입이 요구하는 상태가 모두 있다 ({states})', chReplace: '{kind}로 바뀜', chSet: '{what}로 설정', chHide: '숨겨짐', chLayout: '배치 {what}', condShow: '{v}일 때 보임', condDisabled: '{v}일 때 비활성', condReveals: '{v}을(를) 드러냄', tokensUsed: '쓰인 토큰', usedAt: '쓰인 곳', openQuestions: '미결', noneYet: '없음',
  decideHint: '이 제안을 적용할까요?', fileLabel: '파일', closeProposal: '제안 닫기', showCode: '코드로 보기 (경로와 값)', askComments: '코멘트 반영 요청', askWaiting: '에이전트가 반영 중…', askNone: '열린 코멘트 없음', askDone: '제안 도착 — 새로고침', openCommentsN: '열린 코멘트 {n}개',
  patterns: '패턴', patternsN: '패턴', platformLabel: '플랫폼', allScreens: '모든 화면', exceptLabel: '제외', anyKind: '아무 kind', manyMark: '하나 이상', optionalMark: '없어도 됨', noneBound: '아직 묶인 화면 없음', appliesLabel: '적용', graduatedTo: '컴포넌트가 됨', skeletonLabel: '골격 — 화면 최상위 부품의 순서 (L29가 검사)', rulesLabel: '규칙 — 읽는 것, 검사하지 않음', noPatterns: '아직 패턴이 없습니다. 패턴은 이 제품의 화면에서 부품을 어떻게 배치하는지 정합니다 — patterns/ 아래 패턴 하나에 파일 하나, 묶인 화면은 L29가 검사합니다.',
  pnComponent: '컴포넌트', pnLayout: '레이아웃', pnAutoLayout: '오토 레이아웃', pnProps: '속성', pnComments: '코멘트', pnFile: '파일', pnScreen: '화면', pnFlows: '흐름', pnProposal: '제안', pnChanges: '바뀌는 것', pnDecisions: '정한 것',
  anatomyLabel: '구성', whenLabel: '언제 쓰나', notLabel: '이럴 땐 말고',
  library: '컴포넌트', propsLabel: '속성', slotsLabel: '슬롯', bindingsLabel: '토큰 바인딩', compound: '복합 — 자기 elements로 그림', legacyKind: '아직 conventions.kinds에 있음', noneOfKind: '컴포넌트 없음 — doan migrate kinds 또는 components/<kind>.yaml 추가', requiredMark: '필수',
  clickToInspect: '요소를 누르면 여기에 나옵니다.', component: '컴포넌트', bundled: '기본 세트', samplesNote: '그림의 값은 파일에 없으면 샘플입니다',
  file: '파일', path: '경로', line: '줄', copy: '경로:줄 복사', copied: '복사됨', noneOnElement: '이 요소에는 없음',
  sayWhat: '무엇을 바꿀지 적어 주세요', send: '코멘트 남기기', liveOnly: '코멘트는 살아있는 뷰어(doan serve)에서', nameFirst: '이름부터 적어 주세요',
  undesigned: '미설계', nothingHere: '비어 있음', wentWrong: '문제가 생겼습니다', loading: '불러오는 중…', image: '이미지', select: '선택', chooseFile: '파일 선택', menu: '메뉴', perPage: '/쪽',
  notDrawn: (p) => `그려지지 않음 — 파일에는 있는데 그림에 없는 속성: ${p}`,
  askQueued: '대기 중 — 연결된 에이전트 없음', agentOn: '● 에이전트 연결됨', agentOff: '○ 연결된 에이전트 없음 — doan MCP 서버로 에이전트를 연결하세요(README “에이전트 연결”). 그때까지 요청은 기다립니다',
  lintPillTitle: (n) => `차단 ${n}건 — 눌러서 보기`, lintFindings: 'Lint', undo: '되돌리기', appliedHint: '적용했습니다. 되돌리기를 누르면 파일이 적용 전으로 돌아갑니다.', appliedToast: '적용됨', undone: '되돌림', onlyInProposal: '아직 제안 안에만 있는 섹션입니다', onlyInProposalText: (s) => `“${s}”에는 적용된 화면이 아직 없습니다. 제안을 열어 보고, 적용하면 캔버스에 올라갑니다.`, openProposal: '제안 열기', noDomain: '없는 섹션', noDomainText: (s) => `이 프로젝트에는 “${s}” 섹션이 없습니다.`, backHome: '캔버스로 돌아가기',
  s_duration: ['4분 12초', '3분 48초', '6분 01초'], rowTo: '행 →', revealsLabel: '펼쳐지는 것:', noData: '데이터 없음', perPageWord: '/쪽',
  s_item: (n) => `항목 ${n}`, s_sample: (n) => `샘플 ${n}`, s_stores: ['강남', '성수', '판교'], s_status: ['결제완료', '대기', '환불'], s_method: ['카드', '모바일', '현금'],
};

const LANGS = { en: EN, ko: KO };

export function dictionary(lang) {
  return LANGS[lang] ?? EN;
}

export function languageOf(project) {
  return project?.conventions?.meta?.language ?? 'en';
}

// The subset the page's own JavaScript needs, as plain strings.
export function pageStrings(lang) {
  const d = dictionary(lang);
  const keys = ['pnComponent', 'pnLayout', 'pnAutoLayout', 'pnProps', 'pnComments', 'pnFile', 'pnScreen', 'pnFlows', 'propsTitle', 'layoutLabel', 'layFlow', 'layColumn', 'layRow', 'layGrid', 'layNone', 'layColumns', 'layGap', 'layPadding', 'layAlign', 'laySize', 'layHug', 'layGrow', 'laySend', 'layOwner', 'laySent', 'layReset', 'layAuto', 'layAutoHint', 'layAlignHint', 'laySizing', 'layHeight', 'layFill', 'layGrowFill', 'layFixed', 'layPreview', 'clickToInspect', 'codeLabel', 'specFor', 'goToComponent', 'selectIt', 'sayWhatScreen', 'commonComments', 'sayWhatAll', 'protoHelp', 'flowsFrom', 'chooseFlow', 'noFlowsFrom', 'screen', 'states', 'screen', 'proto', 'flows', 'none', 'shortcutsHint', 'component', 'bundled', 'samplesNote', 'file', 'path', 'line', 'copy', 'copied', 'noneOnElement', 'sayWhat', 'send', 'liveOnly', 'nameFirst', 'comments', 'yourName', 'appliedToast', 'undo', 'undone', 'lintFindings'];
  return Object.fromEntries(keys.map((k) => [k, d[k]]));
}
