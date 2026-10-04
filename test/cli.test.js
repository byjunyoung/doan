import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const examples = fileURLToPath(new URL('../examples/orders', import.meta.url));

test('lint --json prints findings and a summary, exit 0 when nothing blocks', async () => {
  const { stdout } = await run('node', [cli, 'lint', examples, '--branch', 'feature/demo', '--today', '2026-09-23', '--json']);
  const out = JSON.parse(stdout);
  assert.equal(out.summary.blocking, 0);
  assert.ok(Array.isArray(out.findings));
  assert.ok(out.findings.every((f) => f.file && f.path && f.id));
});

test('lint text output ends with a summary line and exits 1 on the canonical branch with a $tbd', async () => {
  await assert.rejects(
    run('node', [cli, 'lint', examples, '--branch', 'main', '--today', '2026-09-23']),
    (err) => {
      assert.equal(err.code, 1);
      assert.match(err.stdout, /L11/);
      assert.match(err.stdout.trim().split('\n').at(-1), /blocking/);
      return true;
    },
  );
});

test('an unknown verb exits 2 with one line and where to read more', async () => {
  await assert.rejects(run('node', [cli, 'draw']), (err) => err.code === 2 && /unknown verb "draw"/.test(err.stderr) && /doan --help/.test(err.stderr));
});

test('prep via the CLI reports what it added and lint then counts the placeholders', async () => {
  const { mkdtempSync, writeFileSync, cpSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'dc-cli-'));
  cpSync(examples, dir, { recursive: true });
  const file = join(dir, 'screens', 'bare.yaml');
  writeFileSync(file, 'schema: doan/0.2\nid: scr_T9\nscreen: bare\nsection: "03. Orders - Order list"\ntype: list\nelements:\n  - id: table\n    kind: table\n');
  const { stdout } = await run('node', [cli, 'prep', file, '--owner', 'design']);
  assert.match(stdout, /Empty, Loading, Error/);
  const lint = await run('node', [cli, 'lint', dir, '--branch', 'x', '--today', '2026-09-23', '--json']);
  const out = JSON.parse(lint.stdout);
  assert.equal(out.findings.filter((f) => f.id === 'L08' && f.screen === 'bare').length, 3);
  assert.equal(out.summary.blocking, 0);
});

test('diff via the CLI prints an AS-IS / TO-BE table between two files, and JSON on request', async () => {
  const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'dc-diff-'));
  const a = join(dir, 'a.yaml');
  const b = join(dir, 'b.yaml');
  const src = readFileSync(join(examples, 'screens', 'order-list.yaml'), 'utf8');
  writeFileSync(a, src);
  writeFileSync(b, src.replace('columns: [order_no, branch, amount, status, ordered_at]', 'columns: [order_no, amount, status, ordered_at]'));
  const { stdout } = await run('node', [cli, 'diff', a, b]);
  assert.match(stdout, /\| elements\.table\.columns \|/);
  const json = await run('node', [cli, 'diff', a, b, '--json']);
  assert.equal(JSON.parse(json.stdout).changed.length, 1);
});

test('help and version exit 0; an unknown verb names itself', async () => {
  const h = await run('node', [cli, '--help']);
  assert.match(h.stdout, /usage: doan/);
  const v = await run('node', [cli, '--version']);
  assert.match(v.stdout, /^doan \d+\.\d+\.\d+/);
  await assert.rejects(run('node', [cli, 'draw']), (err) => err.code === 2 && /unknown verb "draw"/.test(err.stderr));
});

// The first five minutes (trust round, A)
const readmeScreen = fileURLToPath(new URL('./fixtures/trust/readme-screen.yaml', import.meta.url));

test('the README\'s screen example is the tested fixture, and it proposes and lints clean in a new project', async () => {
  const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8');
  const block = /## A screen file\n\n```yaml\n([\s\S]*?)```/.exec(readme)[1];
  assert.equal(block, readFileSync(readmeScreen, 'utf8'), 'README.md shows exactly test/fixtures/trust/readme-screen.yaml');
  const dir = join(mkdtempSync(join(tmpdir(), 'doan-readme-')), 'design');
  await run('node', [cli, 'init', dir]);
  appendFileSync(join(dir, 'sections.yaml'), '- "01. Orders - Order list"\n'); // as the example's comment says
  const { stdout } = await run('node', [cli, 'propose', dir, 'order-list', '--with', readmeScreen, '--json']);
  const p = JSON.parse(stdout);
  assert.equal(p.lint.after.blocking, 0);
  await run('node', [cli, 'apply', dir, p.id, '--by', 'tester']);
  const lint = JSON.parse((await run('node', [cli, 'lint', dir, '--branch', 'feature/x', '--json'])).stdout);
  assert.equal(lint.summary.blocking, 0);
});

test('an error is one line and a hint to the verb\'s help, never the whole help page; --help <verb> is that verb alone', async () => {
  await assert.rejects(run('node', [cli, 'lint', '/no/such/project']), (err) => {
    assert.match(err.stderr, /^error: /);
    assert.match(err.stderr, /more: doan --help lint/);
    assert.doesNotMatch(err.stderr, /usage: doan <verb>/);
    return true;
  });
  await assert.rejects(run('node', [cli, 'lint']), (err) => (assert.match(err.stderr, /^usage: doan lint <project-dir>/), assert.doesNotMatch(err.stderr, /\binit <project-dir>/), true));
  const { stdout } = await run('node', [cli, '--help', 'serve']);
  assert.match(stdout, /^usage: doan serve/);
  assert.doesNotMatch(stdout, /\blint <project-dir>/);
});

test('the help names the rule range the catalogue has', async () => {
  const { RULES } = await import('../src/lint.js');
  const last = RULES.filter((r) => /^L\d+$/.test(r)).sort().at(-1);
  const { stdout } = await run('node', [cli, '--help', 'lint']);
  assert.match(stdout, new RegExp(`run rules L01–${last}\\.`));
});

test('comments lists what people left in the viewer; requests close marks a request done', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'doan-cm-')), 'design');
  await run('node', [cli, 'init', dir]);
  const { addComment } = await import('../src/comments.js');
  await addComment(dir, { screen: 'sample-list', path: 'elements.0', element: 'header', text: 'Make the title shorter', author: 'kim' });
  assert.match((await run('node', [cli, 'comments', dir])).stdout, /sample-list\s+header\s+kim: Make the title shorter/);
  const { addRequest } = await import('../src/requests.js');
  const r = await addRequest(dir, { by: 'kim' });
  assert.match((await run('node', [cli, 'requests', 'close', dir, r.id, '--note', 'done'])).stdout, new RegExp(`${r.id}\\s+done`));
});

test('in a Korean project an error says itself in Korean; a path that is no project says so and how to start one', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'doan-ko-')), 'design');
  await run('node', [cli, 'init', dir, '--language', 'ko']);
  await assert.rejects(run('node', [cli, 'apply', dir, 'p_nope', '--by', 'me']), (err) => (assert.match(err.stderr, /^오류: "p_nope" 제안이 없습니다/), assert.match(err.stderr, /자세히: doan --help apply/), true));
  await assert.rejects(run('node', [cli, 'lint', '/no/where']), (err) => (assert.match(err.stderr, /^error: no conventions\.yaml in \/no\/where — it is not a doan project, or the path is wrong\. To start one: doan init \/no\/where/), true));
});

test('a message with no row passes through as it was', async () => {
  const { sayError } = await import('../src/cli-messages.js');
  assert.equal(sayError('something new went wrong', 'ko'), 'something new went wrong');
  assert.equal(sayError('port 4870 is in use', 'en'), 'port 4870 is in use');
});
