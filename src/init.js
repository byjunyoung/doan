import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { DEFAULT_TOKEN_FILES } from './tokens.js';

// A project starts by choosing what its screens are drawn with. Either a component library
// the team already uses — then each kind maps to one of its components — or nothing: the
// bundled set is copied into the project and becomes the team's own component library,
// theirs to edit, 100%. The tool never owns a team's components either way.

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export function componentBases() {
  return [
    { id: 'none', label: 'Self-built (100% yours)', status: 'ready', note: 'the bundled set is copied into your project and becomes your component library' },
    { id: 'antd', label: 'Ant Design', status: 'ready', note: 'kinds map to antd components, drawn server-side and themed from tokens/' },
    { id: 'mui', label: 'MUI', status: 'ready', note: 'kinds map to MUI components, drawn server-side through emotion and themed from tokens/' },
    { id: 'shadcn', label: 'shadcn/ui', status: 'n/a', note: 'shadcn is copied source in your repo, not a package: start with --base none and point render.components at your own module' },
  ];
}

const STARTER_SCREEN = `schema: doan/0.2
id: scr_SAMPLE1
screen: sample-list             # a first screen so the viewer is not empty. Delete it when a real one exists.
section: "00. Sample - delete me"
type: list                      # list screens must have Empty, Loading and Error states (conventions.yaml)
refs:
  prd: file:README.md           # point this at the spec entry the screen answers to

elements:
  - id: header
    kind: page-header
    title: Sample list
    actions: [{ id: create, kind: button, label: New item, variant: primary }]
  - id: filter
    kind: filter-form
    fields: [period, status]
  - id: table
    kind: table
    columns: [name, status, updated_at]
  - id: paging
    kind: pagination
    page_size: 10

layout:
  root: { kind: stack, direction: column, gap: space.lg, padding: space.xl }
  header: { align: space-between }
  paging: { align: end }

states:                         # what changes from Default, and nothing else
  Empty:
    - { target: table, replace: { kind: empty-notice, title: Nothing here yet, text: Create the first item. } }
    - { target: paging, hide: true }
  Loading:
    - { target: table, replace: { kind: skeleton, rows: 6 } }
  Error:
    - { target: table, replace: { kind: error-notice, text: { $tbd: { owner: you, note: "decide the error copy" } } } }

notes:
  - This screen was written by init. The $tbd above shows how an undecided value looks in lint and in the viewer.
`;

// the command a person types: the published name, which is scoped (a bare `doan` is not on npm)
export const NPX = 'npx @junyoung735/doan';

// The starter in Korean: the same screen, its words in the project's language. Only what a person
// reads is translated; ids, kinds and keys stay as the format writes them.
const STARTER_KO = (text) => text
  .replace('# a first screen so the viewer is not empty. Delete it when a real one exists.', '# 뷰어가 비어 있지 않게 둔 첫 화면. 실제 화면이 생기면 지우세요.')
  .replace('"00. Sample - delete me"', '"00. 샘플 - 지워도 됨"')
  .replace('# list screens must have Empty, Loading and Error states (conventions.yaml)', '# 목록 화면은 Empty·Loading·Error 상태가 있어야 합니다 (conventions.yaml)')
  .replace('# point this at the spec entry the screen answers to', '# 이 화면이 답하는 기획서 항목을 가리키세요')
  .replace('title: Sample list', 'title: 샘플 목록')
  .replace('label: New item', 'label: 새 항목')
  .replace('# what changes from Default, and nothing else', '# Default에서 바뀌는 것만')
  .replace('title: Nothing here yet, text: Create the first item.', 'title: 아직 항목이 없어요, text: 첫 항목을 만들어 보세요.')
  .replace('note: "decide the error copy"', 'note: "오류 문구 정하기"')
  .replace('This screen was written by init. The $tbd above shows how an undecided value looks in lint and in the viewer.', '이 화면은 init이 썼습니다. 위의 $tbd는 정하지 않은 값이 lint와 뷰어에서 어떻게 보이는지 보여 줍니다.');

// A first pattern, so step ② of the loop (how the parts are arranged) has a starting point: every
// list screen opens with its header and may close with paging. The starter screen follows it.
const STARTER_PATTERN = (ko) => `pattern: list-frame
description: ${ko ? '목록 화면은 머리말로 시작하고, 페이지 넘김으로 끝날 수 있다' : 'a list screen opens with its header and may close with paging'}
applies_to: { types: [list] }
skeleton:                                   # ${ko ? '최상위 요소의 순서 — L29가 검사' : 'the top-level elements, in order — L29 checks this'}
  - { role: header, kind: page-header }
  - { role: body, kind: any, many: true }
  - { role: paging, kind: pagination, optional: true }
notes:                                      # ${ko ? '말로 쓴 규칙 — 검사하지 않고 읽음' : 'rules in words — read, not checked'}
  - ${ko ? '주요 동작 버튼은 머리말 오른쪽에 둔다' : 'the primary action sits at the right of the header'}
`;

const PROJECT_README = (base, ko) => ko ? `# design

화면을 파일로. 화면 하나가 \`screens/\` 아래 YAML 하나입니다. 규칙은 \`conventions.yaml\`, 테마는 \`tokens/\`(DTCG 파일: 원시·시맨틱·라이트·다크·리졸버), 배치 규칙은 \`patterns/\`, 아이콘과 그림은 \`assets/\`에 두고 화면에서 경로로 부릅니다(\`src: assets/photos/menu.jpg\`).

컴포넌트 기반: **${base}**${base === 'none' ? ' — 컴포넌트 세트는 `components/kinds.js`에 있고 팀이 고쳐 쓰는 것입니다.' : ' — kind는 `components/<kind>.yaml`의 `maps_to`로 그 라이브러리에 연결됩니다.'}

\`\`\`bash
${NPX} lint .          # 빠진 것
${NPX} serve .         # 뷰어 http://127.0.0.1:4870/
${NPX} mcp .           # 같은 동사를 에이전트에게 (클라이언트 설정은 doan README)
\`\`\`

\`screens/sample-list.yaml\`과 \`patterns/list-frame.yaml\`은 출발점입니다. 실제 화면이 생기면 지우세요.
` : `# design

Screens as files. One YAML per screen under \`screens/\`; the rules in \`conventions.yaml\`; the theme in \`tokens/\` (DTCG files: primitives, semantic, light, dark, and the resolver); how the parts are arranged in \`patterns/\`; your icons and pictures in \`assets/\`, named by path from a screen (\`src: assets/photos/menu.jpg\`).

Component base: **${base}**${base === 'none' ? ' — the component set is in `components/kinds.js` and is yours to edit.' : ' — kinds map to that library through `maps_to` in `components/<kind>.yaml`.'}

\`\`\`bash
${NPX} lint .          # what is missing
${NPX} serve .         # the viewer at http://127.0.0.1:4870/
${NPX} mcp .           # the same verbs for an agent (see the doan README for client config)
\`\`\`

\`screens/sample-list.yaml\` and \`patterns/list-frame.yaml\` are starters; delete them when real ones exist.
`;

// what git should not carry: the agent's heartbeat is rewritten every 20 s (src/requests.js)
const GITIGNORE_LINES = ['.requests/agent.json'];

export async function initProject(dir, { base = 'none', language = 'en' } = {}) {
  if (!['en', 'ko'].includes(language)) throw new Error(`unknown language "${language}"; choose en or ko`);
  const ko = language === 'ko';
  const chosen = componentBases().find((b) => b.id === base);
  if (!chosen) throw new Error(`unknown base "${base}"; choose one of ${componentBases().map((b) => b.id).join(', ')}`);
  if (chosen.status !== 'ready') throw new Error(`base "${base}": ${chosen.note}`);
  if (existsSync(join(dir, 'conventions.yaml'))) throw new Error(`${dir} already has a conventions.yaml; init writes only into an empty project`);

  await mkdir(join(dir, 'screens'), { recursive: true });
  const created = [];

  // conventions: the example, with the render section set and, for self-built, no maps_to.
  const doc = parseDocument(await readFile(here('../conventions.example.yaml'), 'utf8'));
  doc.setIn(['render', 'base'], base);
  doc.setIn(['meta', 'language'], language);
  doc.setIn(['render', 'components'], base === 'none' ? './components/kinds.js' : null);
  if (doc.has('kinds')) doc.delete('kinds'); // kinds are files now (components/<kind>.yaml); the block is read only as legacy
  await writeFile(join(dir, 'conventions.yaml'), doc.toString({ lineWidth: 0 }));

  // components/: every bundled contract, its maps_to trimmed to the chosen base. From here on
  // the registry is the team's — a kind is a file they edit, not a row the tool owns.
  await mkdir(join(dir, 'components'), { recursive: true });
  for (const name of (await readdir(here('./contracts/'))).filter((n) => n.endsWith('.yaml')).sort()) {
    const cdoc = parseDocument(await readFile(here(`./contracts/${name}`), 'utf8'));
    const m = cdoc.get('maps_to');
    if (base === 'none') cdoc.delete('maps_to');
    else if (m && typeof m.get === 'function') {
      for (const k of [...m.items.map((i) => i.key.value)]) if (k !== base && k !== 'figma') m.delete(k);
      if (!m.items.length) cdoc.delete('maps_to');
    }
    await writeFile(join(dir, 'components', name), cdoc.toString({ lineWidth: 0 }));
  }
  created.push('components/<kind>.yaml');
  created.push('conventions.yaml');

  await writeFile(join(dir, 'sections.yaml'), ko ? '- "00. 샘플 - 지워도 됨"\n' : '- "00. Sample - delete me"\n');
  created.push('sections.yaml');
  // A first screen, so the viewer has something to show and the format has an example in
  // the project itself. Delete it once a real screen exists.
  await writeFile(join(dir, 'screens', 'sample-list.yaml'), ko ? STARTER_KO(STARTER_SCREEN) : STARTER_SCREEN);
  created.push('screens/sample-list.yaml');
  await mkdir(join(dir, 'patterns'), { recursive: true });
  await writeFile(join(dir, 'patterns', 'list-frame.yaml'), STARTER_PATTERN(ko));
  created.push('patterns/list-frame.yaml');
  await writeFile(join(dir, 'README.md'), PROJECT_README(base, ko));
  created.push('README.md');
  // .gitignore: added to, never duplicated, never replaced
  const ignore = join(dir, '.gitignore');
  const had = existsSync(ignore) ? await readFile(ignore, 'utf8') : '';
  const missing = GITIGNORE_LINES.filter((l) => !had.split(/\r?\n/).includes(l));
  if (missing.length) {
    await writeFile(ignore, `${had}${had && !had.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
    created.push('.gitignore');
  }
  // tokens/: DTCG files — primitives, the fixed semantic set, one colour file per theme, and
  // the resolver that says how they combine. Resolved for light this is the bundled default.
  // assets/: the person's icons and pictures, named by path from a screen (src/assets.js)
  await mkdir(join(dir, 'assets'), { recursive: true });
  await writeFile(join(dir, 'assets', '.gitkeep'), '');
  await mkdir(join(dir, 'tokens'), { recursive: true });
  for (const [name, body] of Object.entries(DEFAULT_TOKEN_FILES)) {
    await writeFile(join(dir, 'tokens', name), JSON.stringify(body, null, 2) + '\n');
    created.push(`tokens/${name}`);
  }

  if (base === 'none') {
    await mkdir(join(dir, 'components'), { recursive: true });
    await copyFile(here('./render/kinds.js'), join(dir, 'components', 'kinds.js'));
    await copyFile(here('./render/i18n.js'), join(dir, 'components', 'i18n.js')); // kinds.js imports it; the copy stays self-contained
    created.push('components/kinds.js');
  }
  return { dir, base, language, created };
}
