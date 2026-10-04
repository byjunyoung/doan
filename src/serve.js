import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProject } from './project.js';
import { renderFilesProposal, renderNotice, appliedHref } from './render/index.js';
import { layoutStyle, changedIds, renderPatterns, renderScreen, renderIndex, renderProposal, renderLibrary, renderProto, renderCanvas, renderTokens, renderAssets, renderSpec, renderFoundations } from './render/index.js';
import { canvasPages, domainOf, slugOf } from './canvas.js';
import { assetFile, assetType } from './assets.js';
import { resolveAdapter } from './render/adapters/index.js';
import { lintProject, currentBranch, specScreen } from './verbs.js';
import { listProposals, applyProposal, rejectProposal, undoProposal, projectWith, proposeLayout } from './proposals.js';
import { rm } from 'node:fs/promises';
import { authorOf, addComment, listComments, resolveComment } from './comments.js';
import { addRequest, listRequests, closeRequest, agentStatus } from './requests.js';
import { languageOf } from './render/i18n.js';

// The local viewer: the same pages `render` writes, served live from the files, plus the
// three things a static page cannot do — take a comment, apply or reject a proposal, and
// answer a bot. It is the seed of the hosted service (DESIGN.md §10): put this behind a URL
// per branch and the layer table there is what you get.

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const html = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
};
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('body is not JSON'));
      }
    });
  });

// `strict`: the person named the port (--port), so a port in use is an error to say, not a reason to move.
// Without it the default moves to the next free port, up to twenty along, and says where it went.
export async function startServer(dir, { port = 4870, host = '127.0.0.1', branch = null, today = null, components = null, strict = false } = {}) {
  const opts = { branch: branch ?? currentBranch(dir), today: today ?? new Date().toISOString().slice(0, 10) };

  async function handle(req, res) {
    const url = new URL(req.url, `http://${host}`);
    const path = url.pathname;
    try {
      if (path.startsWith('/api/')) return await api(req, res, url);
      // the person's asset files, straight from assets/ — never a path outside it
      if (path.startsWith('/assets/')) {
        const file = assetFile(dir, path);
        if (!file) return json(res, 404, { error: 'not found' });
        try {
          const body = await readFile(file);
          res.writeHead(200, { 'content-type': assetType(file), 'cache-control': 'no-cache' });
          return res.end(body);
        } catch {
          return json(res, 404, { error: 'not found' });
        }
      }
      const project = await loadProject(dir);
      // the sidebar lists what waits on a person on every page
      project.pending = await listProposals(dir, { status: 'pending' });
      // the top bar's "apply comments" button: how many are open, and whether it was already pressed
      project.live = { openComments: (await listComments(dir, { status: 'open' })).length, requests: await listRequests(dir), agent: await agentStatus(dir) };
      const adapter = await resolveAdapter(project, components);
      // no overview: the viewer opens on the first domain's canvas
      if (path === '/' || path === '/index.html') return html(res, await renderIndex(project));
      if (path === '/tokens.html') return html(res, renderTokens(project, { branch: opts.branch, api: true }));
      if (path === '/assets.html') return html(res, renderAssets(project, { branch: opts.branch, api: true }));
      if (path === '/style.html') { res.writeHead(301, { location: 'foundations.html' }); return res.end(); }
      if (path === '/foundations.html') return html(res, renderFoundations(project, { branch: opts.branch, adapter, api: true }));
      if (path === '/patterns.html') return html(res, renderPatterns(project, { branch: opts.branch, api: true }));
      if (path === '/components.html') return html(res, renderLibrary(project, { branch: opts.branch, adapter, api: true }));
      if (path === '/proto.html') return html(res, renderProto(project, { branch: opts.branch, adapter, api: true }));
      let m = path.match(/^\/canvas-(.+)\.html$/);
      if (m) {
        const slug = decodeURIComponent(m[1]);
        const spec = canvasPages(project).find((p) => p.slug === slug);
        const comments = await listComments(dir, { status: 'open' });
        // ?proposal=<id>: the canvas as the pending proposal would leave it (TO-BE), or as it is
        // (&side=asis), with the proposal in the right panel
        const pid = url.searchParams.get('proposal');
        const full = pid && /^p_[a-z0-9]+$/.test(pid) ? await readFile(join(dir, '.proposals', `${pid}.json`), 'utf8').then(JSON.parse, () => null) : null;
        // a domain the project does not have: a section that exists only in a pending proposal is drawn
        // as the proposal would leave it; any other is a page that says so, never a line of JSON
        if (!spec && !(full && full.status === 'pending')) {
          const D = (await import('./render/i18n.js')).dictionary(languageOf(project));
          const waiting = project.pending.find((p) => p.section && slugOf(domainOf(p.section).domain) === slug);
          if (waiting) return html(res, renderNotice(project, { title: D.onlyInProposal, text: D.onlyInProposalText(waiting.section), links: [{ href: `canvas-${slug}.html?proposal=${waiting.id}`, label: D.openProposal, primary: true }, { href: '/', label: D.backHome }] }));
          return html(res, renderNotice(project, { title: D.noDomain, text: D.noDomainText(slug), links: [{ href: '/', label: D.backHome }] }), 404);
        }
        if (full && full.status === 'pending') {
          const side = url.searchParams.get('side') === 'asis' ? 'asis' : 'tobe';
          const files = full.kind === 'files' ? full.files : [{ path: full.file, after: full.after }];
          const { project: after, tmp } = await projectWith(dir, files);
          try {
            // a section the proposal creates has no AS-IS canvas: both sides are the TO-BE one
            const afterSpec = canvasPages(after).find((p) => p.slug === slug);
            const asis = side === 'asis' && !!spec;
            const shown = asis ? project : Object.assign(after, { dir: project.dir, pending: project.pending, live: project.live });
            return html(res, renderCanvas(shown, asis ? spec : afterSpec ?? spec, { branch: opts.branch, adapter: asis ? adapter : await resolveAdapter(after, components), api: true, comments, proposalView: { proposal: full, side: asis ? 'asis' : 'tobe', changed: changedIds(full, languageOf(project)) } }));
          } finally {
            await rm(tmp, { recursive: true, force: true });
          }
        }
        return html(res, renderCanvas(project, spec, { branch: opts.branch, adapter, api: true, comments }));
      }
      m = path.match(/^\/proposal-(p_[a-z0-9]+)\.html$/);
      if (m) {
        const full = JSON.parse(await readFile(join(dir, '.proposals', `${m[1]}.json`), 'utf8'));
        if (full.kind === 'files') {
          const { project: after, tmp } = await projectWith(dir, full.status === 'pending' ? full.files : []);
          try {
            return html(res, renderFilesProposal(project, full, { after: full.status === 'pending' ? after : null, branch: opts.branch, adapter, api: true }));
          } finally {
            await rm(tmp, { recursive: true, force: true });
          }
        }
        return html(res, renderProposal(project, full, { branch: opts.branch, adapter, api: true }));
      }
      m = path.match(/^\/spec-(.+)\.html$/);
      if (m) {
        const screen = project.screens.find((s) => s.doc.screen === decodeURIComponent(m[1]));
        if (!screen) return json(res, 404, { error: `no screen "${m[1]}"` });
        return html(res, renderSpec(project, screen, { branch: opts.branch, api: true }));
      }
      m = path.match(/^\/(.+)\.html$/);
      if (m) {
        const screen = project.screens.find((s) => s.doc.screen === decodeURIComponent(m[1]));
        if (!screen) return json(res, 404, { error: `no screen "${m[1]}"` });
        const comments = await listComments(dir, { screen: screen.doc.screen });
        return html(res, renderScreen(project, screen, { branch: opts.branch, adapter, api: true, comments }));
      }
      return json(res, 404, { error: 'not found' });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // where the viewer goes after a verdict: the screen's frame on its canvas, carrying ?applied=<id>
  // after an Apply so the page can offer Undo; a screen that is gone (an undone create) goes home
  async function landing(p, mark) {
    const project = await loadProject(dir);
    const q = mark ? `?${mark}=${p.id}` : '';
    if (p.screen && project.screens.some((s) => s.doc.screen === p.screen)) {
      const href = appliedHref(project, p.screen);
      const [base, hash] = href.split('#');
      return `${base}${q}${hash ? `#${hash}` : ''}`;
    }
    return `/${q}`;
  }

  async function api(req, res, url) {
    const path = url.pathname;
    const method = req.method;
    let m;
    try {
      if (method === 'GET' && path === '/api/lint') return json(res, 200, await lintProject(dir, { ...opts, cwd: dir }));
      if (method === 'GET' && path === '/api/proposals') return json(res, 200, { proposals: await listProposals(dir, { status: url.searchParams.get('status') ?? 'pending' }) });
      if (method === 'GET' && path === '/api/spec') return json(res, 200, await specScreen(dir, { screen: url.searchParams.get('screen'), format: url.searchParams.get('format') ?? 'json', branch: opts.branch }));
      if (method === 'GET' && path === '/api/comments') return json(res, 200, { comments: await listComments(dir, { screen: url.searchParams.get('screen'), status: url.searchParams.get('status') ?? 'open' }) });
      if (method === 'POST' && path === '/api/comments') return json(res, 201, await addComment(dir, await readBody(req)));
      if (method === 'POST' && (m = path.match(/^\/api\/comments\/(c_[a-z0-9]+)\/resolve$/))) return json(res, 200, await resolveComment(dir, { id: m[1], ...(await readBody(req)) }));
      if (method === 'POST' && (m = path.match(/^\/api\/proposals\/(p_[a-z0-9]+)\/apply$/))) {
        const body = await readBody(req);
        // who said yes: the name sent, or the project's git author — the viewer has no login
        const p = await applyProposal(dir, { id: m[1], approved_by: body.by || authorOf(dir) });
        return json(res, 200, { ...p, href: await landing(p, 'applied') });
      }
      // the same undo the CLI runs; it refuses when the file changed after the apply
      if (method === 'POST' && (m = path.match(/^\/api\/proposals\/(p_[a-z0-9]+)\/undo$/))) {
        const p = await undoProposal(dir, { id: m[1] });
        return json(res, 200, { ...p, href: await landing(p, null) });
      }
      // the panel's live preview: the css a rule draws, from the same function the picture is drawn with
      if (method === 'POST' && path === '/api/layout-style') {
        const body = await readBody(req);
        return json(res, 200, { style: layoutStyle(body.rule ?? {}, { container: !!body.container }) });
      }
      if (method === 'POST' && path === '/api/layout') {
        const body = await readBody(req);
        const project = await loadProject(dir);
        const p = await proposeLayout(dir, { ...body, lang: languageOf(project) }, { branch: opts.branch, today: opts.today });
        const s = project.screens.find((x) => x.doc.screen === body.screen);
        const slug = canvasPages(project).find((pg) => pg.sections.some((sec) => sec.screens.some((x) => x.screen === body.screen)))?.slug;
        return json(res, 201, { id: p.id, status: p.status, href: p.status === 'pending' && slug ? `canvas-${slug}.html?proposal=${p.id}` : s ? `${body.screen}.html` : '/' });
      }
      if (method === 'GET' && path === '/api/agent') return json(res, 200, await agentStatus(dir));
      if (method === 'GET' && path === '/api/requests') return json(res, 200, { requests: await listRequests(dir, { status: url.searchParams.get('status') ?? 'open' }) });
      if (method === 'POST' && path === '/api/requests') return json(res, 201, await addRequest(dir, { ...(await readBody(req)), by: authorOf(dir) }));
      if (method === 'POST' && (m = path.match(/^\/api\/requests\/(r_[a-z0-9]+)\/close$/))) return json(res, 200, await closeRequest(dir, { id: m[1], ...(await readBody(req)) }));
      if (method === 'POST' && (m = path.match(/^\/api\/proposals\/(p_[a-z0-9]+)\/reject$/))) {
        const p = await rejectProposal(dir, { id: m[1], ...(await readBody(req)) });
        return json(res, 200, { ...p, href: await landing(p, null) });
      }
      return json(res, 404, { error: 'no such api' });
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  const server = createServer(handle);
  const listen = (p) =>
    new Promise((resolve, reject) => {
      const onError = (err) => (server.off('listening', onListening), reject(err));
      const onListening = () => (server.off('error', onError), resolve());
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(p, host);
    });
  let tried = port;
  for (;;) {
    try {
      await listen(tried);
      break;
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
      if (strict || port === 0 || tried - port >= 20) throw Object.assign(new Error(`port ${tried} is in use`), { code: 'EADDRINUSE', port: tried, exit: 1 });
      tried += 1;
    }
  }
  const actual = server.address().port;
  return { port: actual, moved: actual !== port && port !== 0 ? port : null, url: `http://${host}:${actual}/`, close: () => new Promise((r) => server.close(r)) };
}
