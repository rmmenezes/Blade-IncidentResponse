// Livros da biblioteca: playbooks, procedimentos, plano de resposta e guia NIST.
// O mesmo HTML é usado na leitura dentro da plataforma e nos downloads (PDF, HTML, Markdown).
import { html, raw, esc, fmtDate } from './core/util.js';
import { art } from './art.js';
import { roleById, statusById, subById, FUNCTIONS, SUBCATEGORIES, CATEGORIES, ROLES, NIST_LINKS } from './core/nist.js';
import { PLAYBOOKS, PHASE_TITLES, REF } from './data/playbooks.js';
import { SEVERITIES, DEFAULT_SLA, CONDITIONS, FACTORS } from './core/engine.js';

const KIND = { playbook: 'Playbook', procedimento: 'Procedimento operacional', plano: 'Plano', guia: 'Guia de referência' };
const PHASE_ORDER = ['triagem', 'analise', 'contencao', 'erradicacao', 'recuperacao', 'pos'];
const role = (r) => roleById[r]?.name.replace(/\s*\(.*\)/, '') || r || '—';
const pad2 = (n) => String(n).padStart(2, '0');

/* ---------- Catálogo ---------- */
export function allBooks(db) {
  const pbs = PLAYBOOKS.map((p) => ({ kind: 'playbook', id: `pb-${p.id}`, src: p, title: p.name, subtitle: p.subtitle, color: p.color, art: p.art, version: p.version, meta: `${p.phases.length} fases · ${p.steps.length} passos` }));
  const pops = db.procedures.map((p) => ({ kind: 'procedimento', id: p.id, src: p, title: p.name, subtitle: statusById[p.phase]?.name || '', color: p.color || '#344054', art: 'procedure', version: p.version, meta: `${p.steps.length} passos · ${p.csf || ''}` }));
  const extra = [
    { kind: 'plano', id: 'plano', title: 'Plano de Resposta a Incidentes', subtitle: db.org.name, color: '#0b1220', art: 'plan', version: '1.0', meta: 'gerado com os dados da organização' },
    { kind: 'guia', id: 'guia-nist', title: 'Guia NIST SP 800-61r3', subtitle: 'Resposta a incidentes com o CSF 2.0', color: '#1d2939', art: 'guide', version: 'r3', meta: 'resumo e mapeamento' },
  ];
  return [...pbs, ...pops, ...extra];
}
export const findBook = (db, id) => allBooks(db).find((b) => b.id === id);

/* ---------- Capa (estante) ---------- */
export function coverCard(b, href = `#/livro/${b.id}`) {
  return html`<a class="book" href="${href}" style="--bk:${b.color}" title="${b.title}">
    <div class="book-cover">
      <span class="book-kind">${KIND[b.kind]}</span>
      <span class="book-art">${raw(art(b.art))}</span>
      <span class="book-title">${b.title}</span>
      <span class="book-sub">${b.subtitle}</span>
      <span class="book-foot"><b>BLADE</b> · v${b.version}</span>
    </div>
    <span class="book-meta">${b.meta}</span>
  </a>`;
}

/* ---------- Conteúdo ---------- */
// Capítulos: [{ id, title, body }]
function chaptersFor(b, db) {
  if (b.kind === 'playbook') return playbookChapters(b.src, db);
  if (b.kind === 'procedimento') return procedureChapters(b.src, db);
  if (b.kind === 'plano') return planChapters(db);
  return guideChapters();
}

const list = (items) => (items?.length ? html`<ul class="bk-list">${items.map((x) => html`<li>${x}</li>`)}</ul>` : html`<p class="bk-muted">—</p>`);
const csfTag = (id) => html`<span class="bk-csf" title="${subById[id]?.text || ''}">${id}</span>`;

function playbookChapters(p, db) {
  const phases = PHASE_ORDER.map((id) => p.phases.find((ph) => ph.id === id)).filter(Boolean);
  let n = 0;
  const ch = [
    { id: 'sobre', title: 'Sobre este playbook', body: html`
      <p class="bk-lead">${p.summary}</p>
      <div class="bk-grid2"><div class="bk-box"><h4>Objetivo</h4><p>${p.objective}</p></div><div class="bk-box"><h4>Escopo</h4><p>${p.scope}</p></div></div>
      <h3>Quando acionar</h3>${list(p.triggers)}
      <div class="bk-callout"><b>Severidade sugerida.</b> ${p.severity}</div>` },
    { id: 'papeis', title: 'Papéis e responsabilidades', body: html`<table class="bk-tbl"><thead><tr><th>Papel</th><th>Responsabilidade</th></tr></thead>
      <tbody>${p.roles.map(([r, t]) => html`<tr><td><b>${role(r)}</b></td><td>${t}</td></tr>`)}</tbody></table>` },
    { id: 'preparacao', title: 'Preparação e pré-requisitos', body: html`<p>Itens que devem existir <b>antes</b> do incidente (Funções Governar, Identificar e Proteger).</p>
      <ul class="bk-check">${p.prerequisites.map((x) => html`<li>${x}</li>`)}</ul>` },
    { id: 'fluxo', title: 'Fluxo de resposta', body: html`<div class="bk-flow">${phases.map((ph, i) => html`<div class="bk-flow-step"><b>${pad2(i + 1)}</b><span>${PHASE_TITLES[ph.id]}</span><small>${ph.steps.length} passo(s)</small></div>`)}</div>
      <p class="bk-muted">As fases podem se sobrepor: a Rev. 3 descreve atividades de Detectar, Responder e Recuperar que ocorrem em paralelo, com melhoria contínua (ID.IM).</p>` },
    ...phases.map((ph) => ({ id: `fase-${ph.id}`, title: PHASE_TITLES[ph.id], body: html`
      <p class="bk-goal"><b>Meta da fase:</b> ${ph.goal}</p>
      <ol class="bk-steps">${ph.steps.map((s) => { n++; return html`<li><div class="bk-step-n">${n}</div><div><h4>${s.title}</h4><p>${s.detail}</p>
        <div class="bk-tags"><span class="bk-role">${role(s.role)}</span>${csfTag(s.csf)}</div></div></li>`; })}</ol>
      ${ph.evidence.length ? html`<div class="bk-box"><h4>Evidências a coletar</h4>${list(ph.evidence)}</div>` : ''}
      ${ph.decisions.length ? html`<div class="bk-callout warn"><h4>Pontos de decisão</h4>${list(ph.decisions)}</div>` : ''}` })),
    { id: 'comunicacao', title: 'Comunicação', body: html`<table class="bk-tbl"><thead><tr><th>Público</th><th>Quando</th><th>Conteúdo</th></tr></thead>
      <tbody>${p.comms.map(([a, w, c]) => html`<tr><td><b>${a}</b></td><td>${w}</td><td>${c}</td></tr>`)}</tbody></table>
      <p class="bk-muted">Modelos de mensagem estão disponíveis na aba Comunicação de cada incidente.</p>` },
    { id: 'indicadores', title: 'Indicadores e técnicas', body: html`<h3>Sinais típicos</h3>${list(p.indicators)}
      <h3>Técnicas MITRE ATT&CK relacionadas</h3><table class="bk-tbl"><tbody>${p.mitre.map(([id, name]) => html`<tr><td class="bk-mono"><a href="https://attack.mitre.org/techniques/${id.replace('.', '/')}/">${id}</a></td><td>${name}</td></tr>`)}</tbody></table>` },
    { id: 'checklist', title: 'Checklist de encerramento', body: html`<ul class="bk-check">${p.checklist.map((x) => html`<li>${x}</li>`)}</ul>
      <h3>Métricas recomendadas</h3>${list(p.metrics)}` },
    { id: 'referencias', title: 'Referências', body: refs(p.references) },
  ];
  return ch;
}

function procedureChapters(p, db) {
  const tech = (id) => db.technologies.find((t) => t.id === id)?.name || '';
  const proc = db.processes.find((x) => x.id === p.process);
  return [
    { id: 'objetivo', title: 'Objetivo e aplicação', body: html`<p class="bk-lead">${p.objective || 'Procedimento operacional padrão da organização.'}</p>
      <div class="bk-grid2"><div class="bk-box"><h4>Quando usar</h4><p>${p.whenToUse || '—'}</p></div>
      <div class="bk-box"><h4>Enquadramento</h4><p>Processo: <b>${proc?.name || '—'}</b><br>Fase: <b>${statusById[p.phase]?.name || '—'}</b><br>Subcategoria: ${p.csf ? csfTag(p.csf) : '—'}</p></div></div>` },
    { id: 'prerequisitos', title: 'Pré-requisitos', body: html`<ul class="bk-check">${(p.prerequisites || []).map((x) => html`<li>${x}</li>`)}</ul>` },
    { id: 'passos', title: 'Passo a passo', body: html`<ol class="bk-steps">${p.steps.map((s, i) => html`<li><div class="bk-step-n">${i + 1}</div><div><h4>${s.title}</h4>${s.detail ? html`<p>${s.detail}</p>` : ''}
      <div class="bk-tags">${s.role ? html`<span class="bk-role">${role(s.role)}</span>` : ''}${s.tech ? html`<span class="bk-tech">${tech(s.tech)}</span>` : ''}</div></div></li>`)}</ol>` },
    { id: 'verificacao', title: 'Verificação e registros', body: html`<div class="bk-grid2"><div class="bk-box"><h4>Como verificar</h4>${list(p.verification)}</div><div class="bk-box"><h4>Registros gerados</h4>${list(p.records)}</div></div>
      ${p.cautions?.length ? html`<div class="bk-callout warn"><h4>Cuidados</h4>${list(p.cautions)}</div>` : ''}` },
    { id: 'referencias', title: 'Referências', body: refs([REF.nist, REF.csf]) },
  ];
}

function planChapters(db) {
  const who = (id) => db.contacts.find((c) => c.id === id);
  return [
    { id: 'proposito', title: 'Propósito e escopo', body: html`<p class="bk-lead">Este plano define como <b>${db.org.name}</b> se prepara, detecta, responde e se recupera de incidentes de cibersegurança, conforme o NIST SP 800-61 Rev. 3 e as Funções do CSF 2.0.</p>
      <p>Aplica-se a todos os sistemas, dados, colaboradores e terceiros que processam informações da organização.</p>
      <h3>Critérios de declaração de incidente</h3>${list(db.org.incidentCriteria)}` },
    { id: 'equipe', title: 'Equipe e contatos', body: db.contacts.length ? html`<table class="bk-tbl"><thead><tr><th>Nome</th><th>Papel</th><th>Área</th><th>Contato</th></tr></thead>
      <tbody>${db.contacts.map((c) => html`<tr><td><b>${c.name}</b>${c.oncall ? ' · plantão' : ''}</td><td>${role(c.role)}</td><td>${c.org}</td><td>${c.email}<br>${c.phone}</td></tr>`)}</tbody></table>` : html`<p class="bk-muted">Cadastre a equipe em Organização → Equipe.</p>` },
    { id: 'severidade', title: 'Classificação e severidade', body: html`<p>A prioridade combina quatro fatores (0 a 3 cada) e a criticidade dos ativos afetados:</p>
      <table class="bk-tbl"><tbody>${Object.values(FACTORS).map((f) => html`<tr><td><b>${f.label}</b></td><td>${f.opts.map((o, i) => `${i} — ${o}`).join(' · ')}</td></tr>`)}</tbody></table>
      <table class="bk-tbl"><thead><tr><th>Severidade</th><th>Pontuação</th><th>Triagem</th><th>Contenção</th><th>Recuperação</th></tr></thead>
      <tbody>${SEVERITIES.map((s) => { const x = db.sla[s.id] || DEFAULT_SLA[s.id]; return html`<tr><td><b>${s.id} · ${s.name}</b></td><td>≥ ${s.min}</td><td>${x.triage} h</td><td>${x.contain} h</td><td>${x.recover} h</td></tr>`; })}</tbody></table>` },
    { id: 'processos', title: 'Processos de resposta', body: html`${db.processes.map((p) => html`<div class="bk-box"><h4>${p.name} <small>v${p.version}</small></h4><p>${p.objective}</p>
      <p class="bk-muted">Dono: ${who(p.owner)?.name || '—'} · Entradas: ${p.inputs || '—'} · Saídas: ${p.outputs || '—'}</p></div>`)}` },
    { id: 'notificacao', title: 'Notificações obrigatórias', body: html`<table class="bk-tbl"><thead><tr><th>Obrigação</th><th>Prazo</th><th>Quando se aplica</th></tr></thead>
      <tbody>${db.regulations.filter((r) => r.enabled).map((r) => html`<tr><td><b>${r.name}</b><br><small>${r.note}</small></td><td>${r.amount} ${({ h: 'horas', bd: 'dias úteis', m: 'mês(es)' })[r.unit]}</td><td>${CONDITIONS[r.when]}</td></tr>`)}</tbody></table>` },
    { id: 'playbooks', title: 'Playbooks e procedimentos', body: html`<table class="bk-tbl"><tbody>
      ${PLAYBOOKS.map((p) => html`<tr><td><b>Playbook</b></td><td>${p.name}</td><td>v${p.version}</td></tr>`)}
      ${db.procedures.map((p) => html`<tr><td><b>Procedimento</b></td><td>${p.name}</td><td>v${p.version}</td></tr>`)}</tbody></table>` },
    { id: 'tecnologias', title: 'Tecnologias de apoio', body: html`<table class="bk-tbl"><tbody>${db.technologies.map((t) => html`<tr><td><b>${t.name}</b></td><td>${t.category}</td><td>${(t.functions || []).join(' · ')}</td></tr>`)}</tbody></table>` },
    { id: 'melhoria', title: 'Manutenção do plano', body: html`<p>O plano é revisado ao menos uma vez por ano, após cada incidente S1/S2 e após exercícios (ID.IM-02, ID.IM-04). Melhorias identificadas são registradas no backlog com responsável e prazo.</p>` },
  ];
}

function guideChapters() {
  return [
    { id: 'modelo', title: 'O modelo da Revisão 3', body: html`<p class="bk-lead">A SP 800-61 Rev. 3 (abril de 2025) integra a resposta a incidentes à gestão de risco de cibersegurança usando as seis Funções do CSF 2.0.</p>
      <div class="bk-flow">${FUNCTIONS.map((f) => html`<div class="bk-flow-step" style="--bk:${f.color}"><b>${f.id}</b><span>${f.name}</span><small>${f.group === 'prep' ? 'preparação' : 'resposta'}</small></div>`)}</div>
      <p>Governar, Identificar e Proteger sustentam a <b>preparação</b>; Detectar, Responder e Recuperar formam a <b>resposta</b>; a categoria Melhoria (ID.IM) realimenta todas as Funções.</p>` },
    { id: 'funcoes', title: 'Funções do CSF 2.0', body: html`${FUNCTIONS.map((f) => html`<div class="bk-box"><h4>${f.id} · ${f.name} <small>${f.en}</small></h4><p>${f.desc}</p></div>`)}` },
    { id: 'subcategorias', title: 'Subcategorias aplicadas aos incidentes', body: html`<table class="bk-tbl"><tbody>${SUBCATEGORIES.map((s) => html`<tr><td class="bk-mono">${s.id}</td><td>${s.text}<br><small class="bk-muted">${CATEGORIES[s.id.slice(0, 5)]}</small></td></tr>`)}</tbody></table>` },
    { id: 'papeis', title: 'Papéis na resposta', body: list(ROLES.map((r) => r.name)) },
    { id: 'referencias', title: 'Documentos oficiais', body: refs([REF.nist, { title: 'Página da publicação (CSRC)', url: NIST_LINKS.pub }, REF.csf, { title: 'SP 800-61 Rev. 2 (substituída)', url: NIST_LINKS.rev2 }]) },
  ];
}

const refs = (items) => html`<ol class="bk-refs">${items.map((r) => html`<li><a href="${r.url}">${r.title}</a><br><small>${r.url}</small></li>`)}</ol>`;

/* ---------- Documento completo ---------- */
export function bookDoc(b, db) {
  const ch = chaptersFor(b, db);
  const owner = b.src?.owner && db.contacts.find((c) => c.id === b.src.owner)?.name;
  return html`<article class="bk-doc" style="--bk:${b.color}" id="doc-${b.id}">
    <section class="bk-cover">
      <div class="bk-cover-top"><span>${KIND[b.kind]}</span><span>v${b.version}</span></div>
      <div class="bk-cover-art">${raw(art(b.art))}</div>
      <div class="bk-cover-title"><h1>${b.title}</h1><p>${b.subtitle}</p></div>
      <div class="bk-cover-foot"><div><b>BLADE</b> Incident Response</div><div>${db.org.name}</div><div>Baseado no NIST SP 800-61 Rev. 3 · CSF 2.0</div></div>
    </section>
    <section class="bk-page bk-control">
      <h2 class="bk-plain">Controle do documento</h2>
      <table class="bk-tbl"><tbody>
        <tr><th>Documento</th><td>${KIND[b.kind]} — ${b.title}</td></tr><tr><th>Versão</th><td>${b.version}</td></tr>
        <tr><th>Organização</th><td>${db.org.name}</td></tr><tr><th>Responsável</th><td>${owner || 'Equipe de resposta a incidentes'}</td></tr>
        <tr><th>Classificação</th><td>Uso interno · TLP:AMBER</td></tr><tr><th>Gerado em</th><td>${fmtDate(new Date().toISOString())}</td></tr>
        <tr><th>Base normativa</th><td>NIST SP 800-61 Rev. 3 (2025) · NIST CSF 2.0 (2024)</td></tr></tbody></table>
      <h2 class="bk-plain">Sumário</h2>
      <ol class="bk-toc">${ch.map((c, i) => html`<li><a href="#bk-${b.id}-${c.id}"><span>${pad2(i + 1)}</span>${c.title}</a></li>`)}</ol>
    </section>
    ${ch.map((c, i) => html`<section class="bk-page bk-ch" id="bk-${b.id}-${c.id}"><h2><span>${pad2(i + 1)}</span>${c.title}</h2>${c.body}</section>`)}
    <footer class="bk-end">${b.title} · v${b.version} · ${db.org.name} · Blade Incident Response</footer>
  </article>`;
}
export const bookChapters = (b, db) => chaptersFor(b, db).map((c, i) => ({ id: `bk-${b.id}-${c.id}`, n: pad2(i + 1), title: c.title }));

/* ---------- Exportações ---------- */
export function standaloneHTML(books, db, title) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap">
<style>body{margin:0;background:#e9ebef;font-family:Inter,system-ui,sans-serif}.bk-doc{margin:32px auto}${BOOK_CSS}</style></head>
<body>${books.map((b) => String(bookDoc(b, db))).join('\n')}</body></html>`;
}

export function toMarkdown(b, db) {
  const strip = (h) => String(h).replace(/<li[^>]*>/g, '\n- ').replace(/<\/(p|h3|h4|tr|div)>/g, '\n').replace(/<td[^>]*>/g, ' | ').replace(/<br>/g, ' ')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  const ch = chaptersFor(b, db);
  return [`# ${b.title}`, `_${KIND[b.kind]} · v${b.version} · ${db.org.name}_`, '', `> Baseado no NIST SP 800-61 Rev. 3 e no CSF 2.0 — ${NIST_LINKS.pdf}`, '',
    '## Sumário', ...ch.map((c, i) => `${i + 1}. ${c.title}`), '',
    ...ch.flatMap((c, i) => [`## ${i + 1}. ${c.title}`, '', strip(c.body), ''])].join('\n');
}

/* ---------- Estilos do livro (injetados na página e nos downloads) ---------- */
export const BOOK_CSS = `
.bk-doc{--paper:#fff;--ink:#1d2433;--ink2:#4a5468;--rule:#e4e7ec;max-width:860px;background:var(--paper);color:var(--ink);font:15px/1.65 Inter,system-ui,sans-serif;box-shadow:0 1px 3px rgba(16,24,40,.12),0 20px 50px rgba(16,24,40,.12);border-radius:4px;overflow:hidden}
.bk-doc a{color:color-mix(in srgb,var(--bk) 80%,#000)}
.bk-cover{position:relative;aspect-ratio:210/297;padding:56px 64px;color:#fff;display:flex;flex-direction:column;background:
radial-gradient(circle at 85% 20%,rgba(255,255,255,.18),transparent 45%),repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 2px,transparent 2px 14px),linear-gradient(160deg,var(--bk),color-mix(in srgb,var(--bk) 45%,#000))}
.bk-cover::before{content:"";position:absolute;left:0;top:0;bottom:0;width:18px;background:linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,0))}
.bk-cover-top{display:flex;justify-content:space-between;font:600 12px/1 Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;opacity:.85;border-bottom:1px solid rgba(255,255,255,.3);padding-bottom:14px}
.bk-cover-art{flex:1;display:grid;place-items:center;padding:40px 0}
.bk-cover-art .art{width:min(300px,60%);height:auto;color:#fff;opacity:.92;filter:drop-shadow(0 12px 30px rgba(0,0,0,.25))}
.bk-cover-title h1{font:700 58px/1.05 "Source Serif 4",Georgia,serif;margin:0 0 12px;letter-spacing:-.02em}
.bk-cover-title p{font-size:20px;margin:0;opacity:.85}
.bk-cover-foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:48px;padding-top:16px;border-top:1px solid rgba(255,255,255,.3);font-size:12px;opacity:.85}
.bk-cover-foot b{letter-spacing:.18em}
.bk-page{padding:56px 72px;border-top:1px solid var(--rule)}
.bk-ch h2,.bk-plain{font:700 30px/1.2 "Source Serif 4",Georgia,serif;margin:0 0 22px;color:var(--ink);display:flex;gap:16px;align-items:baseline}
.bk-ch h2 span{font:700 15px Inter,sans-serif;color:#fff;background:var(--bk);border-radius:6px;padding:4px 9px;transform:translateY(-4px)}
.bk-plain{font-size:24px}
.bk-doc h3{font:700 17px/1.3 "Source Serif 4",Georgia,serif;margin:26px 0 10px}
.bk-doc h4{font-size:14px;margin:0 0 6px}
.bk-doc h4 small{font-weight:500;color:var(--ink2)}
.bk-lead{font-size:18px;color:var(--ink2);border-left:4px solid var(--bk);padding-left:16px;margin:0 0 22px}
.bk-muted{color:var(--ink2);font-size:13px}
.bk-mono{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:13px}
.bk-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}
.bk-box{border:1px solid var(--rule);border-radius:8px;padding:14px 16px;background:#f9fafb;margin:10px 0}
.bk-box p{margin:0}
.bk-callout{border-radius:8px;padding:14px 16px;margin:18px 0;background:color-mix(in srgb,var(--bk) 8%,#fff);border:1px solid color-mix(in srgb,var(--bk) 25%,#fff)}
.bk-callout.warn{background:#fffaeb;border-color:#fedf89}
.bk-callout ul{margin:6px 0 0}
.bk-list{margin:6px 0 12px;padding-left:20px}.bk-list li{margin:4px 0}
.bk-check{list-style:none;padding:0;margin:8px 0 14px}.bk-check li{position:relative;padding:6px 0 6px 32px;border-bottom:1px dashed var(--rule)}
.bk-check li::before{content:"";position:absolute;left:0;top:8px;width:16px;height:16px;border:2px solid var(--bk);border-radius:4px}
.bk-steps{list-style:none;padding:0;margin:8px 0}.bk-steps li{display:grid;grid-template-columns:40px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--rule)}
.bk-steps p{margin:0 0 8px;color:var(--ink2)}
.bk-step-n{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:var(--bk);border:2px solid var(--bk);background:color-mix(in srgb,var(--bk) 8%,#fff)}
.bk-tags{display:flex;gap:6px;flex-wrap:wrap}
.bk-role,.bk-tech,.bk-csf{font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:99px;border:1px solid var(--rule);background:#f2f4f7;color:#344054}
.bk-csf{font-family:"JetBrains Mono",ui-monospace,monospace;background:color-mix(in srgb,var(--bk) 10%,#fff);border-color:color-mix(in srgb,var(--bk) 30%,#fff);color:color-mix(in srgb,var(--bk) 85%,#000)}
.bk-goal{background:#f9fafb;border-radius:8px;padding:12px 16px;border:1px solid var(--rule)}
.bk-tbl{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:14px}
.bk-tbl th,.bk-tbl td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--rule)}
.bk-tbl thead th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink2);background:#f9fafb}
.bk-control .bk-tbl th{width:200px;color:var(--ink2);font-weight:600}
.bk-toc{list-style:none;padding:0;margin:0;columns:2;column-gap:32px}.bk-toc li{break-inside:avoid;border-bottom:1px dotted var(--rule)}
.bk-toc a{display:flex;gap:12px;padding:8px 0;color:var(--ink);text-decoration:none}.bk-toc span{font-weight:700;color:var(--bk)}
.bk-flow{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}
.bk-flow-step{flex:1 1 120px;min-width:110px;padding:14px 22px 14px 18px;color:#fff;background:var(--bk);clip-path:polygon(0 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,0 100%,10px 50%);display:flex;flex-direction:column}
.bk-flow-step:first-child{clip-path:polygon(0 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,0 100%)}
.bk-flow-step b{font-size:12px;opacity:.8}.bk-flow-step span{font-weight:700;font-size:14px}.bk-flow-step small{font-size:11px;opacity:.8}
.bk-refs li{margin:10px 0}.bk-refs small{color:var(--ink2);word-break:break-all}
.bk-end{padding:18px 72px;font-size:12px;color:var(--ink2);border-top:1px solid var(--rule);background:#f9fafb}
@media (max-width:700px){.bk-doc{overflow-wrap:anywhere}.bk-tbl{display:block;overflow-x:auto}.bk-cover{aspect-ratio:auto;min-height:560px;padding:32px 24px}.bk-cover-title h1{font-size:38px}.bk-cover-art .art{width:180px;height:180px}.bk-page{padding:32px 22px}.bk-grid2{grid-template-columns:1fr}.bk-toc{columns:1}.bk-end{padding:14px 22px}}
@media print{@page{size:A4;margin:14mm}body{background:#fff!important}.bk-doc{box-shadow:none;margin:0 auto!important;max-width:none;border-radius:0}
.bk-cover{aspect-ratio:auto;min-height:265mm;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bk-page{border:0;padding:0 0 8mm}.bk-ch{break-before:page}.bk-steps li,.bk-tbl tr,.bk-box,.bk-callout{break-inside:avoid}
.bk-flow-step,.bk-ch h2 span,.bk-step-n{-webkit-print-color-adjust:exact;print-color-adjust:exact}.bk-doc+.bk-doc{break-before:page}.bk-end{display:none}}
`;
