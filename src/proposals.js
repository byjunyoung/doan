import { readFile, writeFile, mkdir, readdir, unlink, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, relative, isAbsolute, basename } from 'node:path';
import { loadProject, parseScreenText } from './project.js';
import { validateScreen } from './validate.js';
import { lint, summarize } from './lint.js';
import { diffScreens, renderDiffMarkdown } from './diff.js';
import { listComments, resolveComment, reopenComment } from './comments.js';
import { parseDocument } from 'yaml';

// The edit loop's write half (DESIGN.md §7). An agent proposes a whole new version of one
// screen file — or a screen that does not exist yet, which the proposal creates as
// screens/<name>.yaml. The proposal carries the diff, the lint result before and after, and
// a tier. A text-only change that keeps lint clean applies at once with undo; everything
// else, a new screen always, waits for a person to apply or reject it. Proposals live in
// <project>/.proposals/ so the CLI, the MCP server and the viewer see the same queue.
// A proposal names the comments it answers; applying it resolves them, undoing reopens them.

const TEXT_PROPS = new Set(['text', 'label', 'title', 'placeholder', 'caption', 'counter', 'hint', 'note', 'notes', 'when', 'status']);
const COMMENT_ID = /\bc_[a-z0-9]{6,}\b/g;
const dirOf = (dir) => join(dir, '.proposals');
const sha = (text) => createHash('sha1').update(text).digest('hex');
const newId = () => `p_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;

function tierOf(diff) {
  const entries = [...diff.changed, ...diff.added, ...diff.removed];
  if (!entries.length) return 'none';
  const textual = entries.every((e) => {
    const last = e.path[e.path.length - 1];
    return TEXT_PROPS.has(String(last)) || e.path[0] === 'notes';
  });
  return textual ? 'text' : 'structure';
}

// lint the project as it would be with `text` standing in for the screen at `file` — replacing
// the screen when the project has it, added to the project when it does not
async function lintWith(project, file, text, opts) {
  const replaced = parseScreenText(text, file);
  const has = project.screens.some((s) => s.file === file);
  const screens = has ? project.screens.map((s) => (s.file === file ? replaced : s)) : [...project.screens, replaced];
  const findings = lint({ ...project, screens }, opts);
  return { ...summarize(findings), findings: findings.filter((f) => f.file === file) };
}

// the comments a proposal answers: the ids it was given, plus any id mentioned in its summary
// or decisions (the draw prompt writes "why: 코멘트 c_…"). Given ids must be open comments on
// the screen; mentioned ones that are not are simply not counted.
async function answersOf(dir, screen, { comments = [], summary = '', decisions = [] }) {
  const open = new Set((await listComments(dir, { screen, status: 'open' })).map((c) => c.id));
  for (const id of comments) if (!open.has(id)) throw new Error(`no open comment "${id}" on screen "${screen}"`);
  const text = [summary, ...decisions.flatMap((d) => [d.item, d.decision, d.why ?? ''])].join('\n');
  const mentioned = (text.match(COMMENT_ID) ?? []).filter((id) => open.has(id));
  return [...new Set([...comments, ...mentioned])];
}

// resolve the comments a proposal answers, once it is on disk; a comment resolved by hand in
// the meantime is left alone
async function settle(dir, proposal, by) {
  const done = [];
  for (const id of proposal.comments ?? []) {
    try {
      await resolveComment(dir, { id, by, note: `${proposal.id} applied${proposal.summary ? `: ${proposal.summary}` : ''}` });
      done.push(id);
    } catch {
      /* already resolved or gone */
    }
  }
  return done;
}

async function store(dir, proposal) {
  await mkdir(dirOf(dir), { recursive: true });
  await writeFile(join(dirOf(dir), `${proposal.id}.json`), JSON.stringify(proposal, null, 2));
  return proposal;
}

async function load(dir, id) {
  const file = join(dirOf(dir), `${id}.json`);
  if (!existsSync(file)) throw new Error(`no proposal "${id}"`);
  return JSON.parse(await readFile(file, 'utf8'));
}

// The screen's file, under the project the call names. A proposal records its file relative
// to the project (`screens/<name>.yaml`) so that a copy of the project — a scratch copy, a
// checkout elsewhere — applies into itself, never back into the directory it was proposed in.
// A record from before 0.12.1 holds an absolute path; its basename still names the file.
const fileOf = (dir, p) => join(dir, isAbsolute(p.file) ? join('screens', basename(p.file)) : p.file);

async function write(dir, proposal, text) {
  await mkdir(join(dir, 'screens'), { recursive: true });
  await writeFile(fileOf(dir, proposal), text);
}

// A layout picked in the viewer's panel: the screen file with only layout.<id> changed — the rest of
// the file, its comments and order, as they were — proposed like any other change. The panel is a
// way to say it, not a way around the loop: the person still applies it (DESIGN.md §6.12).
// A layout rule as one flow line, the way the files write them: { kind: stack, gap: space.md }
function flowLine(rule) {
  const v = (x) => (Array.isArray(x) ? `[${x.map(v).join(', ')}]` : typeof x === 'string' ? (/^[\p{L}\p{N}_.-]+$/u.test(x) ? x : JSON.stringify(x)) : String(x));
  return `{ ${Object.entries(rule).map(([k, x]) => `${k}: ${v(x)}`).join(', ')} }`;
}
// Change one key under the top-level `layout:` block by editing its lines only — the rest of the
// file stays byte for byte as the person wrote it (a YAML round trip re-spaces comments and lists).
function replaceLayoutLine(text, id, rule) {
  const lines = text.split('\n');
  const top = (l) => /^[^\s#-][^:]*:/.test(l);
  let start = lines.findIndex((l) => /^layout:\s*(#.*)?$/.test(l));
  const want = Object.keys(rule).length ? `  ${id}: ${flowLine(rule)}` : null;
  if (start < 0) {
    if (!want) return text;
    let at = lines.findIndex((l) => /^(states|variants|breakpoints|flows|notes|refs):/.test(l));
    if (at < 0) at = lines.length;
    lines.splice(at, 0, 'layout:', want, '');
    return lines.join('\n');
  }
  let end = start + 1;
  while (end < lines.length && !top(lines[end])) end++;
  // the block's last content line, so an addition goes before the blank line that ends it
  let last = end - 1;
  while (last > start && lines[last].trim() === '') last--;
  const keyAt = lines.findIndex((l, n) => n > start && n < end && new RegExp(`^  ${id.replace(/[-]/g, '\\-')}:(\\s|$)`).test(l));
  if (keyAt < 0) {
    if (want) lines.splice(last + 1, 0, want);
    return lines.join('\n');
  }
  let stop = keyAt + 1;
  while (stop < end && (lines[stop].startsWith('   ') || lines[stop].trim() === '') && stop <= last) stop++;
  const tail = /\s+#.*$/.exec(lines[keyAt]);
  const keep = stop === keyAt + 1 && tail && !lines[keyAt].slice(0, tail.index).includes('#') ? tail[0] : '';
  lines.splice(keyAt, stop - keyAt, ...(want ? [want + keep] : []));
  return lines.join('\n');
}
const LAYOUT_KEYS = ['kind', 'direction', 'columns', 'gap', 'padding', 'align', 'justify', 'size', 'grow', 'wrap', 'scroll', 'min'];
export async function proposeLayout(dir, { screen, id, rule, lang = 'en' }, opts = {}) {
  if (!/^[\p{L}\p{N}_-]+$/u.test(String(id ?? ''))) throw new Error(`"${id}" is not an element id a layout can name`);
  const project = await loadProject(dir);
  const s = project.screens.find((x) => x.doc.screen === screen);
  if (!s) throw new Error(`no screen "${screen}"`);
  const clean = Object.fromEntries(Object.entries(rule ?? {}).filter(([k, v]) => LAYOUT_KEYS.includes(k) && v !== '' && v !== null && v !== undefined && v !== false));
  // a padding pair's none is the number 0, as YAML reads it back
  if (Array.isArray(clean.padding)) clean.padding = clean.padding.map((x) => (String(x) === '0' ? 0 : x));
  const text = await readFile(s.file, 'utf8');
  const after = replaceLayoutLine(text, id, clean);
  // the edit touched one rule and nothing else — checked on the parsed documents, not trusted
  const was = parseDocument(text).toJS() ?? {}, now = parseDocument(after).toJS() ?? {};
  const without = (d) => { const c = JSON.parse(JSON.stringify(d)); if (c.layout) delete c.layout[id]; if (c.layout && !Object.keys(c.layout).length) delete c.layout; return c; };
  if (JSON.stringify(without(was)) !== JSON.stringify(without(now)) || JSON.stringify(now.layout?.[id] ?? null) !== JSON.stringify(Object.keys(clean).length ? clean : null))
    throw new Error(`could not change layout.${id} alone in ${basename(s.file)} — ask the agent instead`);
  const { layoutInWords } = await import('./render/changes.js');
  const words = Object.keys(clean).length ? layoutInWords(clean, lang) : lang === 'ko' ? '규칙 없음' : 'no rule';
  return propose(dir, {
    screen,
    after,
    summary: lang === 'ko' ? `배치 — ${id}: ${words}` : `Layout — ${id}: ${words}`,
    decisions: [{ item: lang === 'ko' ? `${id} 배치` : `${id} layout`, decision: words, why: lang === 'ko' ? '뷰어 패널에서 값을 골라 제안' : 'picked in the viewer panel' }],
  }, opts);
}

export async function propose(dir, { screen, after, summary = '', decisions = [], comments = [] }, opts = {}) {
  const project = await loadProject(dir);
  const found = project.screens.find((s) => s.doc.screen === screen);
  // a screen the project does not have yet: the proposal creates screens/<name>.yaml, and the
  // name must pass the project's own pattern before anything is parsed
  const creates = !found;
  if (creates) {
    const pattern = project.conventions.naming?.screen_pattern;
    if (pattern && !new RegExp(pattern, 'u').test(screen)) throw new Error(`"${screen}" does not match naming.screen_pattern ${pattern}`);
    if (existsSync(join(dir, 'screens', `${screen}.yaml`))) throw new Error(`screens/${screen}.yaml exists but is not a screen the project loads; fix or remove it first`);
  }
  const file = found ? found.file : join(dir, 'screens', `${screen}.yaml`);

  const parsed = parseScreenText(after, file);
  if (parsed.errors.length) throw new Error(`proposed YAML does not parse: ${parsed.errors[0]}`);
  const schema = validateScreen(parsed.doc);
  if (!schema.ok) throw new Error(`proposed screen fails the schema: ${schema.errors.map((e) => e.message).join('; ')}`);
  // a new file must be the screen it was proposed as; in an existing file a renamed `screen:`
  // is a change like any other, and lint (L01, L05) is what judges it
  if (creates && parsed.doc.screen !== screen) throw new Error(`the proposed YAML names screen "${parsed.doc.screen}", not "${screen}"`);
  const answers = creates ? [] : await answersOf(dir, screen, { comments, summary, decisions });

  const before = found ? await readFile(found.file, 'utf8') : '';
  const diff = diffScreens(found ? found.doc : {}, parsed.doc);
  // a new file is never a text-only change, whatever the diff says
  const tier = creates ? 'structure' : tierOf(diff);
  const lintBefore = creates ? { ...summarize(lint(project, opts)), findings: [] } : await lintWith(project, file, before, opts);
  const lintAfter = await lintWith(project, file, after, opts);
  const auto = !creates && (project.conventions.edit?.auto_apply ?? []).includes(tier) && lintAfter.blocking === 0;

  const proposal = {
    id: newId(),
    screen,
    // the section the new version puts the screen in: where the viewer shows it before it exists
    section: parsed.doc.section ?? null,
    file: relative(dir, file),
    creates, // true when applying writes a file the project did not have; undo removes it
    summary,
    decisions, // what was agreed before this version was written: [{ item, decision, why? }]
    comments: answers, // the open comments this version answers; resolved on apply, reopened on undo
    created: new Date().toISOString(),
    tier,
    status: tier === 'none' ? 'empty' : auto ? 'applied' : 'pending',
    auto,
    base_hash: sha(before),
    before,
    after,
    diff,
    markdown: renderDiffMarkdown(diff, { screen }),
    lint: { before: { blocking: lintBefore.blocking, warning: lintBefore.warning }, after: { blocking: lintAfter.blocking, warning: lintAfter.warning, findings: lintAfter.findings } },
  };
  if (tier === 'none') return proposal;
  if (auto) {
    await write(dir, proposal, after);
    proposal.applied_at = proposal.created;
    proposal.comments_resolved = await settle(dir, proposal, 'auto');
  }
  return store(dir, proposal);
}

// --- files: the style, the components, the assets -------------------------------------------
// The edit loop reaches the rest of the design the same way it reaches a screen (DESIGN.md §7.4):
// a proposal carries whole new texts for files under tokens/, components/, assets/ (svg) and
// conventions.yaml; lint runs on the project as it would be; nothing is written until a person
// applies it; undo puts every file back. Always pending — a style change is never "text only".
// screens too, when one change spans a screen and the rest (a section renamed and the screens moved into it)
const EDITABLE = /^(screens\/[^/]+\.yaml|tokens\.json|tokens\/[^/].*\.json|components\/[^/]+\.yaml|patterns\/[^/]+\.yaml|assets\/.+\.svg|conventions\.yaml|sections\.yaml)$/;

function cleanPath(p) {
  const n = normalize(String(p ?? '')).split('\\').join('/');
  if (n.startsWith('..') || n.startsWith('/') || !EDITABLE.test(n)) throw new Error(`"${p}" is not a file a proposal may change (screens/*.yaml, tokens.json, tokens/*.json, components/*.yaml, patterns/*.yaml, assets/**/*.svg, conventions.yaml, sections.yaml)`);
  return n;
}

// The project as it would be with these files — a copy in a temporary directory, loaded.
export async function projectWith(dir, files) {
  const tmp = await mkdtemp(join(tmpdir(), 'doan-files-'));
  await cp(dir, tmp, { recursive: true, filter: (src) => !/[\\/]\.(proposals|comments|requests)([\\/]|$)/.test(src.slice(dir.length)) });
  for (const f of files) {
    const at = join(tmp, f.path);
    if (f.after === null) await rm(at, { force: true });
    else {
      await mkdir(dirname(at), { recursive: true });
      await writeFile(at, f.after);
    }
  }
  const project = await loadProject(tmp);
  return { project, tmp };
}

const problemsOf = (project) => [...(project.componentSet?.problems ?? []), ...(project.tokenSet?.problems ?? [])].map((p) => ({ id: 'SCHEMA', severity: 'blocking', file: p.file ?? null, message: p.message }));

export async function proposeFiles(dir, { files, summary = '', decisions = [], comments = [] }, opts = {}) {
  if (!Array.isArray(files) || !files.length) throw new Error('propose files needs at least one { path, content }');
  const list = [];
  for (const f of files) {
    const path = cleanPath(f.path);
    if (list.some((x) => x.path === path)) throw new Error(`"${path}" is named twice`);
    const at = join(dir, path);
    const before = existsSync(at) ? await readFile(at, 'utf8') : null;
    const after = f.content === null || f.delete ? null : String(f.content);
    if (path.endsWith('.json') && after !== null) {
      try { JSON.parse(after); } catch (e) { throw new Error(`${path} is not JSON: ${e.message}`); }
    }
    if (before === after) continue;
    list.push({ path, before, after, creates: before === null });
  }
  if (!list.length) throw new Error('nothing changes: every file is as it is');
  const now = await loadProject(dir);
  const { project: next, tmp } = await projectWith(dir, list);
  try {
    // the whole check the CLI runs — schema of every file first, then the rules — before and after
    const { lintProject } = await import('./verbs.js');
    const lintBefore = summarize((await lintProject(dir, { ...opts, cwd: dir })).findings);
    const afterFindings = (await lintProject(tmp, { ...opts, cwd: tmp })).findings.map((f) => ({ ...f, file: f.file ?? null }));
    const proposal = {
      id: newId(),
      kind: 'files',
      screen: null,
      label: list.length === 1 ? list[0].path : `${list[0].path} +${list.length - 1}`,
      files: list,
      summary,
      decisions,
      comments: [...new Set(comments)],
      created: new Date().toISOString(),
      tier: 'structure',
      status: 'pending',
      auto: false,
      lint: { before: lintBefore, after: { ...summarize(afterFindings), findings: afterFindings.filter((f) => f.severity === 'blocking' || list.some((x) => f.file === x.path) || (f.id === 'L29' && list.some((x) => x.path.startsWith('patterns/')))) } },
    };
    return store(dir, proposal);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function writeFiles(dir, files, side) {
  for (const f of files) {
    const at = join(dir, f.path);
    const text = f[side];
    if (text === null) await rm(at, { force: true });
    else {
      await mkdir(dirname(at), { recursive: true });
      await writeFile(at, text);
    }
  }
}

async function readOrNull(at) {
  return existsSync(at) ? readFile(at, 'utf8') : null;
}

export async function applyProposal(dir, { id, approved_by }) {
  if (!approved_by) throw new Error('apply needs approved_by: the person who said yes');
  const p = await load(dir, id);
  if (p.status !== 'pending') throw new Error(`proposal "${id}" is ${p.status}, not pending`);
  if (p.kind === 'files') {
    for (const f of p.files) if ((await readOrNull(join(dir, f.path))) !== f.before) throw new Error(`"${f.path}" changed since the proposal was made; propose again`);
    await writeFiles(dir, p.files, 'after');
    Object.assign(p, { status: 'applied', approved_by, applied_at: new Date().toISOString() });
    p.comments_resolved = await settle(dir, p, approved_by);
    return store(dir, p);
  }
  // a file the proposal creates must still be absent; an existing one must be as it was
  const current = existsSync(fileOf(dir, p)) ? await readFile(fileOf(dir, p), 'utf8') : '';
  if (sha(current) !== p.base_hash) throw new Error(`"${p.screen}" changed since the proposal was made; propose again`);
  await write(dir, p, p.after);
  Object.assign(p, { status: 'applied', approved_by, applied_at: new Date().toISOString() });
  p.comments_resolved = await settle(dir, p, approved_by);
  return store(dir, p);
}

export async function rejectProposal(dir, { id, reason = '' }) {
  const p = await load(dir, id);
  if (p.status !== 'pending') throw new Error(`proposal "${id}" is ${p.status}, not pending`);
  await unlink(join(dirOf(dir), `${id}.json`));
  return { ...p, status: 'rejected', reason, before: undefined, after: undefined };
}

export async function undoProposal(dir, { id }) {
  const p = await load(dir, id);
  if (p.status !== 'applied') throw new Error(`proposal "${id}" is ${p.status}, not applied`);
  if (p.kind === 'files') {
    for (const f of p.files) if ((await readOrNull(join(dir, f.path))) !== f.after) throw new Error(`"${f.path}" changed after the proposal was applied; undo by hand`);
    await writeFiles(dir, p.files, 'before');
    for (const cid of p.comments_resolved ?? []) {
      try {
        await reopenComment(dir, { id: cid });
      } catch {
        /* resolved again by hand since, or gone */
      }
    }
    Object.assign(p, { status: 'undone', undone_at: new Date().toISOString() });
    return store(dir, p);
  }
  const current = await readFile(fileOf(dir, p), 'utf8');
  if (sha(current) !== sha(p.after)) throw new Error(`"${p.screen}" changed after the proposal was applied; undo by hand`);
  // undoing a proposal that created the file removes the file, not writes an empty one
  if (p.creates) await unlink(fileOf(dir, p));
  else await write(dir, p, p.before);
  // the comments it had resolved are open again
  for (const cid of p.comments_resolved ?? []) {
    try {
      await reopenComment(dir, { id: cid });
    } catch {
      /* resolved again by hand since, or gone */
    }
  }
  Object.assign(p, { status: 'undone', undone_at: new Date().toISOString() });
  return store(dir, p);
}

export async function listProposals(dir, { status = 'pending' } = {}) {
  if (!existsSync(dirOf(dir))) return [];
  const names = (await readdir(dirOf(dir))).filter((n) => n.endsWith('.json'));
  const all = await Promise.all(names.map((n) => load(dir, n.slice(0, -5))));
  return all
    .filter((p) => status === 'all' || p.status === status)
    .sort((a, b) => a.created.localeCompare(b.created))
    .map(({ before, after, ...rest }) => (rest.files ? { ...rest, files: rest.files.map((f) => ({ path: f.path, creates: f.creates, deletes: f.after === null })) } : rest));
}
