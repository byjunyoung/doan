import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/index.js';
import { renderScreen, renderIndex, layoutStyle, renderFoundations } from '../src/render/index.js';

const orders = fileURLToPath(new URL('../examples/orders', import.meta.url));
const ops = fileURLToPath(new URL('../examples/store-ops', import.meta.url));

async function page(dir, name) {
  const project = await loadProject(dir);
  const screen = project.screens.find((s) => s.doc.screen === name);
  return { project, screen, html: renderScreen(project, screen) };
}

test('a screen page shows Default and every state side by side, in states.known order', async () => {
  const { html } = await page(orders, 'order-list');
  const order = ['state-Default', 'state-Empty', 'state-Loading', 'state-Error'].map((id) => html.indexOf(`id="${id}"`));
  assert.ok(order.every((i) => i >= 0), 'every state has a section');
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('every element carries its YAML path and line, and unknown kinds still render', async () => {
  const { html } = await page(orders, 'order-list');
  assert.match(html, /data-path="elements\.2"[^>]*data-line="\d+"/);
  assert.match(html, /data-kind="pagination"/);
  const project = await loadProject(orders);
  const weird = { ...project.screens[0], doc: { ...project.screens[0].doc, elements: [{ id: 'x', kind: 'hologram', beam: 'wide' }] } };
  const out = renderScreen(project, weird);
  assert.match(out, /data-kind="hologram"/);
  assert.match(out, /beam/);
});

test('a state renders the merged view: Empty shows the empty notice and no pagination', async () => {
  const { html } = await page(orders, 'order-list');
  const empty = html.slice(html.indexOf('id="state-Empty"'), html.indexOf('id="state-Loading"'));
  assert.match(empty, /No orders match\./);
  assert.doesNotMatch(empty, /data-kind="pagination"/);
});

test('a $tbd in a prop renders as a chip with its owner, and a placeholder as an undesigned box', async () => {
  const { html } = await page(orders, 'order-list');
  assert.match(html, /class="tbd"[^>]*>[^<]*pm/);
  const project = await loadProject(orders);
  const s = project.screens.find((x) => x.doc.screen === 'order-list');
  const stub = { ...s, doc: { ...s.doc, states: { Empty: [{ target: 'table', replace: { kind: 'placeholder', text: { $tbd: { owner: 'design', note: 'Empty state not designed yet' } } } }] } } };
  const out = renderScreen(project, stub);
  assert.match(out, /class="el el-placeholder/);
  assert.match(out, /Empty state not designed yet/);
});

test('flows become links to the target page and state anchor', async () => {
  const { html } = await page(orders, 'order-list');
  assert.match(html, /href="order-detail\.html"/);
  assert.match(html, /href="#state-Empty"/);
});

test('layout becomes CSS from tokens, never a number with a unit', async () => {
  const { html } = await page(orders, 'order-list');
  assert.match(html, /--space-lg/);
  assert.match(html, /gap:\s*var\(--space-lg\)/);
  assert.doesNotMatch(html, /gap:\s*\d+px/);
});

test('variants render one row per axis, each option in Default; a modal sits on a backdrop; conditions show as badges', async () => {
  const { html } = await page(ops, 'inventory-edit');
  assert.match(html, /id="variant-item_type-CupLid"/);
  assert.match(html, /class="backdrop"/);
  const { html: list } = await page(ops, 'payment-list');
  assert.match(list, /shown when: a row is selected/);
});

test('there is no overview: index.html sends the viewer to the first domain canvas, hash kept', async () => {
  const project = await loadProject(ops);
  const html = await renderIndex(project);
  const [first] = (await import('../src/canvas.js')).canvasPages(project);
  assert.match(html, new RegExp(`url=canvas-${first.slug}\\.html`));
  assert.match(html, /location\.replace\("canvas-[^"]+\.html" \+ location\.hash\)/);
  assert.doesNotMatch(html, /class="side"/);
});

test('a pending proposal renders AS-IS and TO-BE per state, with its decisions and diff on top', async () => {
  const { mkdtempSync, cpSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { propose } = await import('../src/proposals.js');
  const { renderProposal } = await import('../src/render/index.js');
  const dir = mkdtempSync(join(tmpdir(), 'dc-rp-'));
  cpSync(orders, dir, { recursive: true });
  const before = readFileSync(join(dir, 'screens', 'order-list.yaml'), 'utf8');
  const after = before.replace('columns: [order_no, branch, amount, status, ordered_at]', 'columns: [order_no, amount, status, ordered_at]');
  const p = await propose(dir, { screen: 'order-list', after, summary: 'drop the branch column', decisions: [{ item: 'branch column', decision: 'drop it', why: 'never shown to single-store accounts' }] }, { branch: 'x', today: '2026-09-23' });
  const project = await loadProject(dir);
  const html = renderProposal(project, p);
  assert.match(html, /drop the branch column/);
  assert.match(html, /never shown to single-store accounts/);
  assert.match(html, /elements\.table\.columns/);
  for (const state of ['Default', 'Empty', 'Loading', 'Error']) {
    assert.match(html, new RegExp(`id="asis-${state}"`));
    assert.match(html, new RegExp(`id="tobe-${state}"`));
  }
  const tobe = html.slice(html.indexOf('id="tobe-Default"'), html.indexOf('id="asis-Empty"'));
  assert.doesNotMatch(tobe, /<th>branch</);
  const asis = html.slice(html.indexOf('id="asis-Default"'), html.indexOf('id="tobe-Default"'));
  assert.match(asis, /<th>branch</);
});

test('every page lists the pending proposals in the sidebar, each a link to its page', async () => {
  const { mkdtempSync, cpSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { propose, listProposals } = await import('../src/proposals.js');
  const dir = mkdtempSync(join(tmpdir(), 'dc-ri-'));
  cpSync(orders, dir, { recursive: true });
  const before = readFileSync(join(dir, 'screens', 'order-list.yaml'), 'utf8');
  const p = await propose(dir, { screen: 'order-list', after: before.replace('kind: pagination', 'kind: pager') }, { branch: 'x', today: '2026-09-23' });
  const project = await loadProject(dir);
  project.pending = await listProposals(dir);
  const { renderFoundations } = await import('../src/render/index.js');
  const html = renderFoundations(project, { branch: 'x' });
  assert.match(html, new RegExp(`<a class="side-link sub" href="proposal-${p.id}\\.html"><span class="name">order-list</span>`));
  project.pending = [];
  assert.doesNotMatch(renderFoundations(project, { branch: 'x' }), /proposal-p_/);
});

test('with the antd adapter, mapped kinds render as real antd components and unmapped kinds fall back', async () => {
  const { createAdapter } = await import('../src/render/adapters/index.js');
  const project = await loadProject(ops);
  const adapter = await createAdapter('antd', project);
  const screen = project.screens.find((s) => s.doc.screen === 'inventory-list');
  const html = renderScreen(project, screen, { adapter });
  assert.match(html, /ant-table/);
  assert.match(html, /ant-btn/);
  assert.match(html, /ant-segmented/);
  assert.match(html, /data-path="elements\.1\.children\.1"/, 'the inspector still knows where the table came from');
  assert.match(html, /ant-table-thead[\s\S]*Stock level/);
  assert.match(html, /class="el el-filter-bar/, 'a kind with no antd mapping keeps the bundled rendering');
  assert.match(html, /data-rc-order/, 'antd styles are extracted into the page');
});

test('the antd adapter takes its theme from the project tokens', async () => {
  const { createAdapter } = await import('../src/render/adapters/index.js');
  const project = await loadProject(ops);
  project.tokens = { color: { primary: '#ab12cd' } };
  const adapter = await createAdapter('antd', project);
  const screen = project.screens.find((s) => s.doc.screen === 'inventory-list');
  const html = renderScreen(project, screen, { adapter });
  assert.match(html, /#ab12cd/i);
});

test('asking for an adapter that does not exist is a readable error', async () => {
  const { createAdapter } = await import('../src/render/adapters/index.js');
  await assert.rejects(createAdapter('sketch', await loadProject(ops)), /sketch/);
});

test('the viewer shell: sidebar with every screen, state tabs with the first active, compare toggle, drawer inspector closed by default', async () => {
  const project = await loadProject(ops);
  const screen = project.screens.find((s) => s.doc.screen === 'inventory-list');
  const html = renderScreen(project, screen);
  for (const s of project.screens) assert.match(html, new RegExp(`class="tree-screen[^"]*" data-screen="${s.doc.screen}"><div class="tree-screen-head"><span class="caret"></span><a class="name" href="canvas-[^"]+\\.html#${s.doc.screen}"`));
  assert.match(html, /<nav class="views"><a class="" href="canvas-[^"]+\.html#inventory-list">Canvas<\/a>/, "the modes bar is on the screen page too, with this screen as context");
  assert.match(html, /class="tab active" data-state="Default"/);
  assert.match(html, /class="tab" data-state="Empty"/);
  assert.match(html, /id="compare"/);
  assert.match(html, /<aside id="inspector" class="drawer"/);
  assert.doesNotMatch(html, /class="drawer open"/);
});

test('conditions become dots with the text in the title, not badges in the picture', async () => {
  const project = await loadProject(ops);
  const screen = project.screens.find((s) => s.doc.screen === 'payment-list');
  const html = renderScreen(project, screen);
  assert.match(html, /class="dot cond" title="shown when: a row is selected"/);
  assert.doesNotMatch(html, /<span class="cond">shown when/);
});

test('empty cells carry sample values made from the column name, and a leaf element does not inherit a grid from its layout rule', async () => {
  const project = await loadProject(ops);
  const screen = project.screens.find((s) => s.doc.screen === 'home');
  const html = renderScreen(project, screen);
  assert.doesNotMatch(html, /<td>—<\/td>/);
  const pay = renderScreen(project, project.screens.find((s) => s.doc.screen === 'payment-list'));
  assert.match(pay, /<td>[^<]*2026-/);
  const tiles = html.slice(html.indexOf('data-id="tiles"'), html.indexOf('data-id="tiles"') + 400);
  assert.doesNotMatch(tiles, /grid-template-columns:repeat\(25/);
});

test('with the mui adapter, mapped kinds render as MUI components and unmapped kinds fall back', async () => {
  const { createAdapter } = await import('../src/render/adapters/index.js');
  const project = await loadProject(ops);
  for (const [kind, mui] of Object.entries({ table: 'Table', button: 'Button', segmented: 'ToggleButtonGroup', pagination: 'Pagination' })) project.components[kind].maps_to = { ...(project.components[kind].maps_to ?? {}), mui };
  const adapter = await createAdapter('mui', project);
  const screen = project.screens.find((s) => s.doc.screen === 'inventory-list');
  const html = renderScreen(project, screen, { adapter });
  assert.match(html, /MuiTable/);
  assert.match(html, /MuiButton/);
  assert.match(html, /MuiPagination/);
  assert.match(html, /class="el el-filter-bar/);
  assert.match(html, /data-emotion/);
});

test('the viewer speaks the language conventions.meta.language names, samples included', async () => {
  const project = await loadProject(ops);
  project.conventions.meta = { language: 'ko' };
  const screen = project.screens.find((s) => s.doc.screen === 'payment-list');
  const html = renderScreen(project, screen);
  assert.match(html, /상태 비교/);
  assert.match(html, /흐름/);
  assert.match(html, /<td>항목 1<\/td>/);
  const { renderFoundations } = await import('../src/render/index.js');
  assert.match(renderFoundations(project, { branch: 'x' }), /디자인 시스템/);
});

test('an ios screen draws inside a phone frame at the platform width; a tablet screen in a tablet frame; web has no frame', async () => {
  const mobile = fileURLToPath(new URL('../examples/mobile-app', import.meta.url));
  const project = await loadProject(mobile);
  const feed = project.screens.find((s) => s.doc.screen === 'feed');
  const html = renderScreen(project, feed);
  assert.match(html, /class="frame device-phone"[^>]*style="[^"]*--ref-w:390px/);
  assert.match(html, /class="status-bar"/);
  assert.match(html, /class="home-indicator"/);
  assert.match(html, /el-tab-bar/);
  assert.match(html, /el-list-cell/);
  assert.match(html, /gesture-tap/);
  assert.match(html, /nav-push/);
  const tablet = { ...feed, doc: { ...feed.doc, platform: 'tablet' } };
  assert.match(renderScreen(project, tablet), /class="frame device-tablet"[^>]*--ref-w:1024px/);
  const web = { ...feed, doc: { ...feed.doc, platform: 'web' } };
  assert.match(renderScreen(project, web), /class="frame device-web"[^>]*--ref-w:1280px/);
});

test('every mobile kind in the shipped set renders something of its own, not the generic box', async () => {
  const mobile = fileURLToPath(new URL('../examples/mobile-app', import.meta.url));
  const project = await loadProject(mobile);
  for (const name of ['feed', 'item-detail', 'cart-sheet']) {
    const html = renderScreen(project, project.screens.find((s) => s.doc.screen === name));
    assert.doesNotMatch(html, /class="el el-[^"]*el-unknown/, `${name} has an unknown kind`);
  }
});

test('a project with no token resolver gets no mode select and no per-context css', async () => {
  const { html } = await page(orders, 'order-list');
  assert.doesNotMatch(html, /data-mode=/);
  assert.doesNotMatch(html, /:root\[data-/);
});

test('align is horizontal and justify vertical whatever the direction; columns can be a track list; a leaf aligns its box and text', () => {
  assert.match(layoutStyle({ kind: 'stack', direction: 'column', align: 'center', justify: 'space-between' }), /^display:flex;flex-direction:column;--lay-dir:column;align-items:center;--lay-align:center;justify-content:space-between$/);
  assert.match(layoutStyle({ kind: 'stack', direction: 'row', align: 'space-between', justify: 'center' }), /flex-direction:row;--lay-dir:row;justify-content:space-between;align-items:center/);
  assert.match(layoutStyle({ kind: 'grid', columns: '1fr auto auto', gap: 'space.md', justify: 'center' }), /display:grid;grid-template-columns:1fr auto auto;gap:var\(--space-md\);--lay-gap:var\(--space-md\);align-items:center;align-content:center/);
  assert.match(layoutStyle({ kind: 'grid', columns: ['1fr', 'auto'] }), /grid-template-columns:1fr auto/);
  assert.match(layoutStyle({ kind: 'grid', columns: 3 }), /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(layoutStyle({ align: 'end' }, { container: false }), /display:flex;justify-content:flex-end;text-align:end/);
  assert.equal(layoutStyle({ align: 'space-between' }, { container: false }).includes('text-align'), false);
});

test('a screen whose one element is a modal sits on a dimmed backdrop with the modal as the box; an image can contain its picture', async () => {
  const { mkdtemp, cp, writeFile, readFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'doan-layout-'));
  await cp(orders, dir, { recursive: true });
  const f = join(dir, 'screens', 'order-list.yaml');
  await writeFile(f, (await readFile(f, 'utf8')).replace(/elements:[\s\S]*?\nlayout:/, 'elements:\n  - id: dlg\n    kind: modal\n    title: Edit\n    size: lg\n    children:\n      - { id: pic, kind: image, src: assets/photos/x.svg, fit: contain }\n\nlayout:').replace(/states:[\s\S]*?\nflows:/, 'states:\n  Empty: []\n  Loading: []\n  Error: []\n\nflows:'));
  const { html } = await page(dir, 'order-list');
  assert.match(html, /<div class="backdrop by-element"><div class="modal-box size-lg">/);
  assert.match(html, /class="img size-md fit-contain"/);
  assert.match(html, /\.img\.fit-contain img \{ object-fit: contain; \}/);
});

test('the style board: every text style set in its own type, colours, surfaces, scales, and each component sample in each variant — inside .board, a product root', async () => {
  const project = await loadProject(orders);
  const html = renderFoundations(project, { branch: 'x' });
  assert.match(html, /<a class="side-link sub current" href="foundations.html">/);
  assert.match(html, /<div class="b-sample" style="font-family:var\(--text-heading-font-family\);font-size:var\(--text-heading-font-size\);font-weight:var\(--text-heading-font-weight\);line-height:var\(--text-heading-line-height\)">/);
  assert.match(html, /class="b-surface" style="background:var\(--surface-raised-bg\);border-color:var\(--surface-raised-border\);border-radius:var\(--surface-raised-radius\);box-shadow:var\(--surface-raised-shadow\)"/);
  assert.match(html, /<code>primary<\/code>/);
  assert.match(html, /<a class="tab active" href="foundations.html">Board<\/a><a class="tab" href="tokens.html">Variables<\/a>/);
  assert.doesNotMatch(html, /components.html#k-button/, 'components live on their own page; the bare board in a proposal keeps them');
  assert.match(renderFoundations(project, { bare: true }), /<a href="components.html#k-button"><code>button<\/code><\/a>[\s\S]*variant = danger/);
  assert.match(html, /\.frame, \.cv-frame, \.proto-view, \.lib-pic, \.lib-variant, \.board \{/);
});

test('an svg icon is a mask in the text colour — on a button, and as an image under assets/icons/ — so it follows its element; a photo stays an <img>', async () => {
  const { ico } = await import('../src/render/kinds.js');
  assert.equal(ico('assets/icons/card.svg'), '<span class="ico-mask" role="img" style="--ico:url(\'assets/icons/card.svg\')"></span>');
  assert.equal(ico('assets/photos/x.png'), '<img class="ico-img" src="assets/photos/x.png" alt="">');
  const { kinds } = await import('../src/render/kinds.js');
  assert.match(kinds.image({ id: 'i', kind: 'image', src: 'assets/icons/card.svg', size: 'sm' }), /<div class="img is-icon size-sm"><span class="ico-mask ico-fill"/);
  assert.match(kinds.image({ id: 'i', kind: 'image', src: 'assets/photos/a.svg' }), /<img src="assets\/photos\/a.svg"/);
});

test('scroll: vertical keeps a long list inside the frame; grow may shrink; a stack aligned center carries it to a drawn card body', () => {
  assert.match(layoutStyle({ kind: 'grid', columns: 3, scroll: 'vertical', grow: true }), /overflow-y:auto;min-height:0;flex-wrap:nowrap;flex:1 1 auto;min-height:0/);
  assert.match(layoutStyle({ kind: 'stack', direction: 'column', align: 'center' }), /align-items:center;--lay-align:center/);
});

test('an element leads to its main component: the drawer shows the instance chain and a link, a right click offers the same, the components page marks the target', async () => {
  const { INSPECTOR_JS, CSS } = await import('../src/render/page.js');
  assert.match(INSPECTOR_JS, /function instancePath\(el\)/);
  assert.match(INSPECTOR_JS, /components\.html#k-' \+ esc\(el\.getAttribute\('data-kind'\)\)/);
  assert.match(INSPECTOR_JS, /addEventListener\('contextmenu'/);
  assert.match(CSS, /\.lib:target \{ outline:/);
});

test('the components page reads in two levels — used here by category, the bundled rest folded — each card folds its tables; the foundations board groups colours by role; the sidebar lists the sections of the page you are on', async () => {
  const project = await loadProject(orders);
  const { renderLibrary } = await import('../src/render/index.js');
  const lib = renderLibrary(project, { branch: 'x' });
  assert.match(lib, /<div class="lib-group"><h2>Used in this project <span class="hint">\d+<\/span><\/h2><h3 class="lib-cat" id="used-action">Actions/);
  assert.match(lib, /<details class="lib-group" id="unused"( open)?><summary>Bundled, not used here|^(?![\s\S]*id="unused")/);
  assert.match(lib, /<details class="lib-more"><summary>Props and styles <span class="hint">· components\/[a-z-]+\.yaml/);
  assert.match(lib, /<a class="side-link subsub" href="#used-action"><span class="name">Actions<\/span>/);
  const f = renderFoundations(project, { branch: 'x' });
  assert.match(f, /<div class="b-role">Base<\/div>/);
  assert.match(f, /<a class="side-link subsub" href="#f-text"><span class="name">Text styles<\/span>/);
});
