import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadProject } from './project.js';
import { walkElements, findElement } from './elements.js';

// A comment is anchored to a screen and an element — by the element's id, because a YAML path
// (`elements.1`) moves the moment something is inserted above it, and a comment that points at
// the wrong element is worse than none. The path and line are derived from the id every time
// the comment is read, so they always say where the element is now; a comment whose element
// is gone keeps its last path and is marked orphan. A comment on something that is not an
// element (a state, a layout key) keeps its path as written. Comments live in
// <project>/.comments/<screen>.json: a file per screen, so they travel with the branch and the
// local viewer, the MCP server and a hosted viewer all read one store.

const dirOf = (dir) => join(dir, '.comments');
const fileOf = (dir, screen) => join(dirOf(dir), `${screen}.json`);
const newId = () => `c_${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
// a comment on the project as a whole — nothing selected — lives beside the per-screen files
const PROJECT = '_project';

// who is writing: the git author of the project, since the viewer has no login and asking for a
// name on every comment was friction for the one person who uses it
export function authorOf(dir) {
  try {
    return execFileSync('git', ['config', 'user.name'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

async function read(dir, screen) {
  const f = fileOf(dir, screen);
  return existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : [];
}
async function write(dir, screen, list) {
  await mkdir(dirOf(dir), { recursive: true });
  await writeFile(fileOf(dir, screen), JSON.stringify(list, null, 2));
}

// The element a YAML path points at in a screen's Default elements, or null.
function elementAtPath(screen, path) {
  if (!path) return null;
  for (const hit of walkElements(screen.doc.elements ?? [], ['elements'])) if (hit.path.join('.') === path) return hit.el.id;
  return null;
}

// Where an element is now: its path and line in the file as it stands.
function whereIs(screen, id) {
  const hit = findElement(screen.doc.elements ?? [], id);
  return hit ? { path: hit.path.join('.'), line: screen.lineOf(hit.path) } : null;
}

// A comment as the reader should see it: path and line from the element's current place,
// `orphan` when the element is gone, and an element id filled in for a comment from before
// ids were kept.
function refresh(screen, c) {
  const out = { ...c };
  if (!out.element && screen) out.element = elementAtPath(screen, out.path);
  if (out.element && screen) {
    const now = whereIs(screen, out.element);
    if (now) Object.assign(out, now, { orphan: false });
    else out.orphan = true;
  }
  return out;
}

// A comment with no element is on the screen as a whole — a frame on the canvas — and may name
// the state it was left on.
export async function addComment(dir, { screen = null, path, element = null, text, author, line = null, state = null }) {
  if (!text) throw new Error('a comment needs a text');
  if (!screen) {
    const comment = { id: newId(), screen: null, element: null, path: '', line: null, text, author: author || authorOf(dir), created: new Date().toISOString(), resolved: false };
    const list = await read(dir, PROJECT);
    list.push(comment);
    await write(dir, PROJECT, list);
    return comment;
  }
  const project = await loadProject(dir);
  const found = project.screens.find((s) => s.doc.screen === screen);
  if (!found) throw new Error(`no screen named "${screen}" in ${dir}`);
  // given an element, the path follows from it; given a path, the element follows when the
  // path names one
  let id = element;
  if (id && !findElement(found.doc.elements ?? [], id)) throw new Error(`no element "${id}" on screen "${screen}"`);
  if (!id) id = elementAtPath(found, path ?? '');
  const at = id ? whereIs(found, id) : { path: path ?? '', line };
  const comment = { id: newId(), screen, element: id, path: at.path, line: at.line ?? line, ...(state && !id ? { state: String(state) } : {}), text, author: author || authorOf(dir), created: new Date().toISOString(), resolved: false };
  const list = await read(dir, screen);
  list.push(comment);
  await write(dir, screen, list);
  return comment;
}

export async function listComments(dir, { screen = null, status = 'open' } = {}) {
  const project = await loadProject(dir);
  const screens = screen ? project.screens.filter((s) => s.doc.screen === screen) : project.screens;
  const all = [];
  for (const s of screens) all.push(...(await read(dir, s.doc.screen)).map((c) => refresh(s, c)));
  if (!screen) all.push(...(await read(dir, PROJECT)));
  return all.filter((c) => status === 'all' || (status === 'open' ? !c.resolved : c.resolved)).sort((a, b) => a.created.localeCompare(b.created));
}

export async function resolveComment(dir, { id, by, note = '' }) {
  const project = await loadProject(dir);
  for (const s of [...project.screens, { doc: { screen: PROJECT, elements: [] }, lineOf: () => null }]) {
    const list = await read(dir, s.doc.screen);
    const c = list.find((x) => x.id === id);
    if (!c) continue;
    if (c.resolved) throw new Error(`comment "${id}" is already resolved`);
    Object.assign(c, { resolved: true, resolved_by: by || authorOf(dir), resolved_at: new Date().toISOString(), resolution: note });
    await write(dir, s.doc.screen, list);
    return refresh(s, c);
  }
  throw new Error(`no comment "${id}"`);
}

// The opposite, for a proposal that is undone: the comment it answered is open again, and the
// record keeps when it was reopened.
export async function reopenComment(dir, { id }) {
  const project = await loadProject(dir);
  for (const s of [...project.screens, { doc: { screen: PROJECT, elements: [] }, lineOf: () => null }]) {
    const list = await read(dir, s.doc.screen);
    const c = list.find((x) => x.id === id);
    if (!c) continue;
    if (!c.resolved) throw new Error(`comment "${id}" is not resolved`);
    Object.assign(c, { resolved: false, reopened_at: new Date().toISOString() });
    delete c.resolved_by;
    delete c.resolved_at;
    delete c.resolution;
    await write(dir, s.doc.screen, list);
    return refresh(s, c);
  }
  throw new Error(`no comment "${id}"`);
}
