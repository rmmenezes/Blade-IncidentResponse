// Shell da aplicação: navegação, roteamento por hash, tema e busca global.
import * as store from './core/store.js';
import { html, esc } from './core/util.js';
import { ic, toast } from './ui.js';
import { demoDB } from './data/seed.js';
import dashboard from './views/dashboard.js';
import events from './views/events.js';
import incidents from './views/incidents.js';
import incident from './views/incident.js';
import report from './views/report.js';
import playbooks from './views/playbooks.js';
import prep from './views/prep.js';
import improvements from './views/improvements.js';
import audit from './views/audit.js';
import reference from './views/reference.js';
import settings from './views/settings.js';
import welcome from './views/welcome.js';

const NAV = [
  { href: '#/', label: 'Painel', icon: 'dash' },
  { href: '#/eventos', label: 'Eventos adversos', icon: 'radar', badge: (db) => db.events.filter((e) => e.status === 'novo' || e.status === 'analise').length },
  { href: '#/incidentes', label: 'Incidentes', icon: 'alert', badge: (db) => db.incidents.filter((i) => i.status !== 'encerrado').length },
  { href: '#/playbooks', label: 'Playbooks', icon: 'book' },
  { href: '#/preparacao', label: 'Preparação', icon: 'shield' },
  { href: '#/melhorias', label: 'Melhorias', icon: 'up' },
  { href: '#/auditoria', label: 'Auditoria', icon: 'list' },
  { href: '#/referencia', label: 'NIST SP 800-61r3', icon: 'info' },
  { href: '#/config', label: 'Configurações', icon: 'gear' },
];

const ROUTES = [
  [/^\/$/, dashboard],
  [/^\/eventos$/, events],
  [/^\/incidentes(?:\/(novo))?$/, incidents],
  [/^\/incidente\/([^/]+)\/relatorio$/, report],
  [/^\/incidente\/([^/]+)(?:\/([a-z-]+))?$/, incident],
  [/^\/playbooks(?:\/([a-z-]+))?$/, playbooks],
  [/^\/preparacao(?:\/([a-z-]+))?$/, prep],
  [/^\/melhorias$/, improvements],
  [/^\/auditoria$/, audit],
  [/^\/referencia$/, reference],
  [/^\/config$/, settings],
];

const app = document.getElementById('app');
const nav = document.getElementById('nav');

export const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

function renderNav(path) {
  const db = store.get();
  nav.innerHTML = String(html`${NAV.map((n) => {
    const p = n.href.slice(1);
    const active = p === '/' ? path === '/' : path.startsWith(p) || (p === '/incidentes' && path.startsWith('/incidente/'));
    const b = db && n.badge ? n.badge(db) : 0;
    return html`<a href="${n.href}" class="${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${ic(n.icon)}<span>${n.label}</span>${b ? html`<em class="nb">${b}</em>` : ''}</a>`;
  })}`);
  document.getElementById('org').textContent = db?.org.name || '';
}

let cleanup = null;
export async function route() {
  const [rawPath, qs = ''] = (location.hash.slice(1) || '/').split('?');
  const path = decodeURIComponent(rawPath || '/');
  ctx.query = new URLSearchParams(qs);
  document.body.classList.remove('nav-open');
  if (!store.get()) {
    renderNav('/');
    const root = document.createElement('div');
    root.innerHTML = String(welcome.render());
    app.replaceChildren(root);
    welcome.mount(root, { start });
    return;
  }
  renderNav(path);
  cleanup?.(); cleanup = null;
  for (const [re, view] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    const params = m.slice(1);
    try {
      // Um contêiner novo por renderização descarta os ouvintes da tela anterior.
      const root = document.createElement('div');
      root.innerHTML = String(await view.render(params, ctx));
      app.replaceChildren(root);
      document.title = `${view.title?.(params) || 'Blade'} — Blade Incident Response`;
      cleanup = (await view.mount?.(root, params, ctx)) || null;
    } catch (err) {
      console.error(err);
      app.innerHTML = String(html`<div class="page"><div class="card"><h2>Erro ao abrir a página</h2><p>${err.message}</p><a class="btn" href="#/">Voltar ao painel</a></div></div>`);
    }
    return;
  }
  app.innerHTML = String(html`<div class="page"><div class="card"><h2>Página não encontrada</h2><a class="btn" href="#/">Voltar ao painel</a></div></div>`);
}

// Re-renderiza a rota atual preservando a rolagem.
async function rerender() {
  const y = window.scrollY;
  await route();
  window.scrollTo(0, y);
}
const ctx = { go, rerender, query: new URLSearchParams() };

async function start(mode) {
  if (mode === 'demo') store.replace(await demoDB());
  else { store.replace(store.emptyDB()); store.audit('Plataforma inicializada'); store.persist(); }
  toast(mode === 'demo' ? 'Dados de demonstração carregados.' : 'Ambiente criado. Comece pela Preparação.');
  go(mode === 'demo' ? '#/' : '#/config');
}

/* ---------- Tema ---------- */
const themeBtn = document.getElementById('theme');
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.innerHTML = String(ic(t === 'dark' ? 'sun' : 'moon'));
  themeBtn.title = t === 'dark' ? 'Tema claro' : 'Tema escuro';
}
themeBtn.addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('blade-theme', t); } catch { /* sem armazenamento */ }
  applyTheme(t);
});
applyTheme(document.documentElement.dataset.theme || 'dark');

/* ---------- Busca global ---------- */
const q = document.getElementById('q');
const results = document.getElementById('qres');
q.addEventListener('input', () => {
  const db = store.get();
  const t = q.value.trim().toLowerCase();
  if (!db || t.length < 2) { results.hidden = true; return; }
  const hits = [];
  for (const i of db.incidents) {
    const iocHit = i.iocs.find((x) => x.value.toLowerCase().includes(t));
    if (i.id.toLowerCase().includes(t) || i.title.toLowerCase().includes(t) || iocHit) {
      hits.push({ href: `#/incidente/${i.id}`, label: `${i.id} — ${i.title}`, sub: iocHit ? `IOC: ${iocHit.value}` : i.category });
    }
  }
  for (const e of db.events) if (e.id.toLowerCase().includes(t) || e.title.toLowerCase().includes(t)) hits.push({ href: '#/eventos', label: `${e.id} — ${e.title}`, sub: 'Evento adverso' });
  for (const a of db.assets) if (a.name.toLowerCase().includes(t) || (a.ip || '').includes(t)) hits.push({ href: '#/preparacao/ativos', label: a.name, sub: `Ativo · ${a.type}` });
  results.innerHTML = hits.length
    ? hits.slice(0, 12).map((h) => `<a href="${esc(h.href)}"><strong>${esc(h.label)}</strong><small>${esc(h.sub)}</small></a>`).join('')
    : '<p class="muted">Nada encontrado.</p>';
  results.hidden = false;
});
results.addEventListener('click', () => { results.hidden = true; q.value = ''; });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) results.hidden = true; });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input,textarea,select')) { e.preventDefault(); q.focus(); }
  if (e.key === 'Escape') results.hidden = true;
});

document.getElementById('menu').addEventListener('click', () => document.body.classList.toggle('nav-open'));

// Sincroniza entre abas abertas.
window.addEventListener('storage', (e) => { if (e.key === 'blade-ir-db') { store.load(); rerender(); } });
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

store.load();
route();
