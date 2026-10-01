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
import shelf from './views/shelf.js';
import reader from './views/reader.js';
import org from './views/org.js';
import { BOOK_CSS } from './book.js';
import audit from './views/audit.js';
import reference from './views/reference.js';
import settings from './views/settings.js';
import welcome from './views/welcome.js';
import assignments from './views/assignments.js';
import reports from './views/reports.js';
import { saveFile } from './core/files.js';
import { NIST_LINKS } from './core/nist.js';

const NAV = [
  { href: '#/', label: 'Início', icon: 'dash' },
  { href: '#/incidentes', match: ['/incidente', '/eventos'], label: 'Incidentes', icon: 'alert', badge: (db) => db.incidents.filter((i) => i.status !== 'encerrado').length },
  { href: '#/biblioteca', match: ['/biblioteca', '/livro'], label: 'Biblioteca', icon: 'book' },
  { href: '#/relatorios', label: 'Relatórios', icon: 'chart' },
  { href: '#/organizacao', match: ['/organizacao', '/atribuicoes'], label: 'Áreas e organização', icon: 'users' },
  { href: '#/config', match: ['/config', '/auditoria', '/referencia'], label: 'Configurações', icon: 'gear' },
];

// Rotas antigas continuam funcionando.
const REDIRECTS = [
  [/^\/playbooks\/([a-z-]+)$/, (m) => `#/livro/pb-${m[1]}`], [/^\/playbooks$/, () => '#/biblioteca'],
  [/^\/biblioteca\/(tecnologias|processos)$/, (m) => `#/organizacao/${m[1]}`], [/^\/biblioteca\/procedimentos$/, () => '#/biblioteca?f=procedimento'],
  [/^\/preparacao(?:\/([a-z-]+))?$/, (m) => `#/organizacao/${m[1] || 'prontidao'}`], [/^\/melhorias$/, () => '#/organizacao/melhorias'],
];

const ROUTES = [
  [/^\/$/, dashboard],
  [/^\/eventos$/, events],
  [/^\/incidentes(?:\/(novo))?$/, incidents],
  [/^\/incidente\/([^/]+)\/relatorio$/, report],
  [/^\/incidente\/([^/]+)(?:\/([a-z-]+))?$/, incident],
  [/^\/atribuicoes$/, assignments],
  [/^\/relatorios(?:\/([a-z-]+))?$/, reports],
  [/^\/biblioteca$/, shelf],
  [/^\/livro\/([^/]+)$/, reader],
  [/^\/organizacao(?:\/([a-z-]+))?$/, org],
  [/^\/auditoria$/, audit],
  [/^\/referencia$/, reference],
  [/^\/config$/, settings],
];

const app = document.getElementById('app');
const nav = document.getElementById('nav');

export const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

function renderNav(path) {
  const db = store.get();
  nav.innerHTML = String(html`<div class="nav-list">${NAV.map((n) => {
    const ms = n.match || [n.href.slice(1)];
    const active = n.href === '#/' ? path === '/' : ms.some((p) => path.startsWith(p));
    const b = db && n.badge ? n.badge(db) : 0;
    return html`<a href="${n.href}" class="${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${ic(n.icon)}<span>${n.label}</span>${b ? html`<em class="nb">${b}</em>` : ''}</a>`;
  })}</div>
  <div class="nav-foot"><a href="${NIST_LINKS.pdf}" target="_blank" rel="noopener" class="nav-nist">${ic('file')}<span><b>NIST SP 800-61r3</b><small>documento oficial (PDF)</small></span></a></div>`);
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
  for (const [re, to] of REDIRECTS) { const m = path.match(re); if (m) { location.replace(to(m)); return; } }
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

// Imagem ilustrativa anexada ao incidente de demonstração.
async function demoAttachment() {
  const inc = store.incident('INC-2026-0003');
  if (!inc || inc.attachments.length) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#101828"/><rect x="40" y="40" width="560" height="280" rx="8" fill="#1d2939" stroke="#d92d20"/>
    <text x="320" y="120" fill="#f04438" font-family="monospace" font-size="28" text-anchor="middle">YOUR FILES ARE ENCRYPTED</text>
    <text x="320" y="170" fill="#d0d5dd" font-family="monospace" font-size="16" text-anchor="middle">Nota de resgate — SRV-FILE-02 (exemplo fictício)</text>
    <text x="320" y="210" fill="#98a2b3" font-family="monospace" font-size="14" text-anchor="middle">README_RESTORE.txt · extensão .lockbit</text></svg>`;
  const meta = await saveFile(new File([svg], 'nota-de-resgate-SRV-FILE-02.svg', { type: 'image/svg+xml' }), { context: 'general', addedBy: 'Segurança da Informação', caption: 'Captura da nota de resgate' });
  inc.attachments.push(meta);
  await store.addTimeline(inc, { type: 'evidencia', text: `Arquivo anexado: ${meta.name}`, files: [meta.sha256], fileIds: [meta.id] });
  store.persist();
}

async function start(mode) {
  if (mode === 'demo') { store.replace(await demoDB()); await demoAttachment().catch(() => {}); }
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
applyTheme(document.documentElement.dataset.theme || 'light');

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
  for (const a of db.assets) if (a.name.toLowerCase().includes(t) || (a.ip || '').includes(t)) hits.push({ href: '#/organizacao/ativos', label: a.name, sub: `Ativo · ${a.type}` });
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

// Estilos dos livros (os mesmos usados nos downloads).
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: BOOK_CSS }));

store.load();
route();
