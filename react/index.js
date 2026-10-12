// doan/react — a harness component for the team's own build.
//
//   const DoanHarness = createHarness({ registry, joins, space, shell, bare, modal, api });
//   <Route path="/__doan/:screen/*" element={<DoanHarness />} />      (a dev-only route)
//
// It fetches the merged tree of one screen state from a running `doan serve` (`?api=` overrides
// the host), draws it with `drawScreen`, wraps it with the team's shell / bare / modal, and talks
// to the doan viewer when framed: doan:size (its height), doan:select (the element clicked),
// doan:selected (the viewer's highlight), doan:probe (a test round trip).
import React from 'react';
import { drawScreen, findId, flatButtons, boxStyle, chipOf, text, list } from './core.js';

export { drawScreen, findId, flatButtons, boxStyle, chipOf, text, list };

const e = React.createElement;
const SELECTED_CSS = '[data-doan-selected] > * { outline: 2px solid #1677ff; outline-offset: 2px; }';

/** framed by the viewer, or ?bridge=1 at top level to try the bridge by hand */
export const bridged = () => typeof window !== 'undefined' && (window.parent !== window || new URLSearchParams(window.location.search).has('bridge'));

export function useScreen({ screen, state, api }) {
  const [view, setView] = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    setView(null);
    setError(null);
    // the viewer's extra frames ride along: variants=axis:opt,…  bp=<name>  proposal=<id>&side=asis|tobe
    const extra = typeof window !== 'undefined' ? ['variants', 'bp', 'proposal', 'side'].map((k) => [k, new URLSearchParams(window.location.search).get(k)]).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('') : '';
    fetch(`${api}/api/screen?screen=${encodeURIComponent(screen)}&state=${encodeURIComponent(state)}${extra}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((v) => live && setView(v), (err) => live && setError(String(err)));
    return () => {
      live = false;
    };
  }, [screen, state, api]);
  return { view, error };
}

export function useBridge(view) {
  React.useEffect(() => {
    if (!bridged()) return undefined;
    if (!document.getElementById('doan-selected-css')) {
      const st = document.createElement('style');
      st.id = 'doan-selected-css';
      st.textContent = SELECTED_CSS;
      document.head.appendChild(st);
    }
    const post = () => window.parent.postMessage({ type: 'doan:size', height: document.documentElement.scrollHeight }, '*');
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    const onMessage = (ev) => {
      const m = ev.data;
      if (!m || typeof m !== 'object') return;
      if (m.type === 'doan:probe') {
        window.parent.postMessage({ type: 'doan:select', id: m.id }, '*');
        return;
      }
      if (m.type !== 'doan:selected') return;
      document.querySelectorAll('[data-doan-selected]').forEach((n) => n.removeAttribute('data-doan-selected'));
      if (m.id) {
        const n = document.querySelector(`[data-doan-id="${CSS.escape(String(m.id))}"]`);
        if (n) n.setAttribute('data-doan-selected', '');
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      ro.disconnect();
      window.removeEventListener('message', onMessage);
    };
  }, [view]);
}

export const postSelect = (id) => {
  if (bridged()) window.parent.postMessage({ type: 'doan:select', id }, '*');
};

/**
 * config: registry, joins, space (core); api (default http://127.0.0.1:4871);
 * shell(view, body) — around a screen that has a nav; bare(view, body, drawn) — around one that has none;
 * modal(view, body, modalEl) — around a modal screen; loading() / failed(error) — what to show meanwhile.
 * Props: screen (or read from the router by the caller), state, api.
 */
export function createHarness(config) {
  const { api: defaultApi = 'http://127.0.0.1:4871', shell = (v, b) => b, bare = (v, b) => b, modal = (v, b) => b, loading = () => null, failed = (err) => e('pre', null, String(err)) } = config;
  return function DoanHarness({ screen, state = 'Default', api }) {
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const st = state ?? q?.get('state') ?? 'Default';
    const host = api ?? q?.get('api') ?? defaultApi;
    const { view, error } = useScreen({ screen, state: st, api: host });
    useBridge(view);
    if (error) return failed(error);
    if (!view) return loading();
    const drawn = drawScreen(view, { ...config, onSelect: (id) => postSelect(id) });
    if (drawn.modal) return modal(view, drawn.node, drawn.modal, drawn);
    return drawn.shell ? shell(view, drawn.node, drawn) : bare(view, drawn.node, drawn);
  };
}
