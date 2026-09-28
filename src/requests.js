import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

// A request from the viewer to whichever agent is watching: a person pressed "apply comments"
// and does not want to go to a terminal to say so. The viewer cannot call an agent; it writes the
// request down, and the agent — a live session watching <project>/.requests/, or the next one to
// start — takes it, turns the open comments into proposals and closes it. The person applies those
// in the viewer as ever. One open request per kind: pressing twice asks once.

const fileOf = (dir) => join(dir, '.requests', 'requests.json');
const newId = () => `r_${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
export const REQUEST_KINDS = ['apply-comments'];

async function read(dir) {
  const f = fileOf(dir);
  return existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : [];
}
async function write(dir, list) {
  await mkdir(join(dir, '.requests'), { recursive: true });
  await writeFile(fileOf(dir), JSON.stringify(list, null, 2));
}

export async function listRequests(dir, { status = 'open' } = {}) {
  const all = await read(dir);
  return status === 'all' ? all : all.filter((r) => r.status === status);
}

export async function addRequest(dir, { kind = 'apply-comments', by = null, note = '' } = {}) {
  if (!REQUEST_KINDS.includes(kind)) throw new Error(`"${kind}" is not a request the viewer makes (${REQUEST_KINDS.join(', ')})`);
  const all = await read(dir);
  const open = all.find((r) => r.kind === kind && r.status === 'open');
  if (open) return open;
  const r = { id: newId(), kind, status: 'open', by, note, created: new Date().toISOString() };
  all.push(r);
  await write(dir, all);
  return r;
}

// The agent is done with it: what it made (proposal ids) and a line on what it did.
export async function closeRequest(dir, { id, by = null, note = '', proposals = [] }) {
  const all = await read(dir);
  const r = all.find((x) => x.id === id);
  if (!r) throw new Error(`no request "${id}"`);
  if (r.status !== 'open') throw new Error(`request "${id}" is already ${r.status}`);
  Object.assign(r, { status: 'done', closed: { by, note, proposals, at: new Date().toISOString() } });
  await write(dir, all);
  return r;
}
