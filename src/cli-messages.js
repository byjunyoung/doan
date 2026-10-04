// What the CLI says when something goes wrong, in the project's language. The errors are thrown in
// English deep in the verbs (an agent reads those over MCP, and they stay as they are); here the ones
// a person meets from a terminal are said again — the cause first, then what to do. A message with no
// row passes through unchanged.

const ROWS = [
  {
    re: /^ENOENT: no such file or directory, open '(.+?)\/conventions\.yaml'$/,
    en: (m) => `no conventions.yaml in ${m[1]} — it is not a doan project, or the path is wrong. To start one: doan init ${m[1]}`,
    ko: (m) => `${m[1]}에 conventions.yaml이 없습니다 — doan 프로젝트가 아니거나 경로가 틀렸습니다. 새로 만들려면: doan init ${m[1]}`,
  },
  { re: /^port (\d+) is in use$/, ko: (m) => `포트 ${m[1]}은(는) 이미 쓰고 있습니다 — --port 없이 실행하면 빈 포트로 옮겨 갑니다` },
  { re: /^unknown language "(.*)"; choose en or ko$/, ko: (m) => `"${m[1]}"은(는) 고를 수 있는 언어가 아닙니다 — en 또는 ko` },
  { re: /^unknown base "(.*)"; choose one of (.+)$/, ko: (m) => `"${m[1]}"은(는) 없는 기반입니다 — ${m[2]} 중에서 고르세요` },
  { re: /^(.+) already has a conventions\.yaml; init writes only into an empty project$/, ko: (m) => `${m[1]}에는 이미 conventions.yaml이 있습니다 — init은 빈 폴더에만 씁니다` },
  { re: /^proposed YAML does not parse: ([\s\S]+)$/, ko: (m) => `제안한 YAML을 읽을 수 없습니다: ${m[1]}` },
  { re: /^proposed screen fails the schema: ([\s\S]+)$/, ko: (m) => `제안한 화면이 형식(스키마)에 맞지 않습니다: ${m[1]}` },
  { re: /^the proposed YAML names screen "(.*)", not "(.*)"$/, ko: (m) => `제안한 YAML의 화면 이름은 "${m[1]}"인데, 명령에서는 "${m[2]}"라고 했습니다` },
  { re: /^"(.*)" does not match naming\.screen_pattern (.+)$/, ko: (m) => `"${m[1]}"은(는) 화면 이름 규칙(naming.screen_pattern ${m[2]})에 맞지 않습니다` },
  { re: /^no screen named "(.*)" in (.+)$/, ko: (m) => `${m[2]}에 "${m[1]}" 화면이 없습니다` },
  { re: /^no screen "(.*)"$/, ko: (m) => `"${m[1]}" 화면이 없습니다` },
  { re: /^no proposal "(.*)"$/, ko: (m) => `"${m[1]}" 제안이 없습니다 — doan proposals로 목록을 보세요` },
  { re: /^proposal "(.*)" is (\w+), not (pending|applied)$/, ko: (m) => `제안 "${m[1]}"은(는) 지금 ${m[2]} 상태라 ${m[3] === 'pending' ? '적용·반려할' : '되돌릴'} 수 없습니다` },
  { re: /^"(.*)" changed since the proposal was made; propose again$/, ko: (m) => `제안을 만든 뒤 "${m[1]}"이(가) 바뀌었습니다 — 다시 제안하세요` },
  { re: /^"(.*)" changed after the proposal was applied; undo by hand$/, ko: (m) => `적용한 뒤 "${m[1]}"이(가) 또 바뀌어서 자동으로 되돌릴 수 없습니다 — 직접 되돌리세요` },
  { re: /^apply needs approved_by: the person who said yes$/, ko: () => `적용하려면 누가 승인했는지가 필요합니다 — --by <이름>` },
  { re: /^no request "(.*)"$/, ko: (m) => `"${m[1]}" 요청이 없습니다 — doan requests --all로 목록을 보세요` },
  { re: /^request "(.*)" is already (\w+)$/, ko: (m) => `요청 "${m[1]}"은(는) 이미 ${m[2]} 상태입니다` },
  { re: /^no open comment "(.*)" on screen "(.*)"$/, ko: (m) => `"${m[2]}" 화면에 열린 코멘트 "${m[1]}"이(가) 없습니다` },
];

export function sayError(message, lang = 'en') {
  const text = String(message ?? '');
  for (const row of ROWS) {
    const m = row.re.exec(text);
    if (!m) continue;
    const say = lang === 'ko' ? row.ko : row.en;
    return say ? say(m) : text;
  }
  return text;
}
