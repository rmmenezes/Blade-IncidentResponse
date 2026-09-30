// Tecnologias, Processos e Procedimentos (POPs) que sustentam a resposta a incidentes.
import * as store from '../core/store.js';
import { html, uid, download, toCSV, fmtDate } from '../core/util.js';
import { FUNCTIONS, ROLES, roleById, STATUSES, statusById, SUBCATEGORIES } from '../core/nist.js';
import { techCoverage } from '../core/engine.js';
import { TECH_CATEGORIES, TECH_STATUS } from '../data/library.js';
import { ic, field, input, dt, textarea, select, modal, confirmBox, fnBadge, empty, toast } from '../ui.js';

const TABS = [['tecnologias', 'Tecnologias'], ['processos', 'Processos']];
const csfList = (v) => String(v || '').split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
const who = (db, id) => db.contacts.find((c) => c.id === id)?.name || '';
const owners = (db) => [{ v: '', t: '—' }, ...db.contacts.map((c) => ({ v: c.id, t: c.name }))];

function techForm(db, t = {}) {
  return html`<div class="form-grid">
    ${field('Nome', input('name', t.name, 'required'))}${field('Categoria', select('category', TECH_CATEGORIES, t.category || 'SIEM'))}
    ${field('Fornecedor / produto', input('vendor', t.vendor))}${field('Responsável', select('owner', owners(db), t.owner))}
    ${field('Estado', select('status', Object.entries(TECH_STATUS).map(([v, x]) => ({ v, t: x })), t.status || 'operacional'))}
    ${field('Subcategorias CSF apoiadas', input('csf', (t.csf || []).join(', '), 'placeholder="DE.CM-01, RS.MI-01"'))}
    <fieldset class="span2 inline"><legend>Funções CSF 2.0</legend>${FUNCTIONS.map((f) => html`<label class="chk"><input type="checkbox" name="fn_${f.id}" ${(t.functions || []).includes(f.id) ? 'checked' : ''}> ${f.id} · ${f.name}</label>`)}</fieldset>
    <div class="span2">${field('Uso na resposta / observações', textarea('notes', t.notes, 'rows="2"'))}</div></div>`;
}
const techFromForm = (f) => {
  const functions = FUNCTIONS.filter((x) => f[`fn_${x.id}`]).map((x) => x.id);
  return { name: f.name, category: f.category, vendor: f.vendor, owner: f.owner, status: f.status, csf: csfList(f.csf), notes: f.notes, functions };
};

function processForm(db, p = {}) {
  return html`<div class="form-grid">
    <div class="span2">${field('Processo', input('name', p.name, 'required'))}</div>
    <div class="span2">${field('Objetivo', textarea('objective', p.objective, 'rows="2"'))}</div>
    ${field('Dono do processo', select('owner', owners(db), p.owner))}${field('Versão', input('version', p.version || '1.0'))}
    ${field('Entradas', input('inputs', p.inputs))}${field('Saídas', input('outputs', p.outputs))}
    ${field('Subcategorias CSF', input('csf', (p.csf || []).join(', ')))}${field('Última revisão', dt('reviewedAt', p.reviewedAt))}</div>`;
}

const lines = (v) => (v || []).join('\n');
const unlines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);

export function procedureForm(db, p = {}) {
  const steps = (p.steps || []).map((s) => [s.title, s.detail || '', s.role || '', s.tech || ''].join(' | ')).join('\n');
  return html`<div class="form-grid">
    <div class="span2">${field('Procedimento', input('name', p.name, 'required'))}</div>
    <div class="span2">${field('Objetivo', textarea('objective', p.objective, 'rows="2"'))}</div>
    <div class="span2">${field('Quando usar', textarea('whenToUse', p.whenToUse, 'rows="2"'))}</div>
    ${field('Processo', select('process', [{ v: '', t: '—' }, ...db.processes.map((x) => ({ v: x.id, t: x.name }))], p.process))}
    ${field('Fase de aplicação', select('phase', STATUSES.filter((s) => s.id !== 'encerrado').map((s) => ({ v: s.id, t: s.name })), p.phase || 'contencao'))}
    ${field('Subcategoria CSF principal', select('csf', SUBCATEGORIES.map((s) => ({ v: s.id, t: s.id })), p.csf || 'RS.MI-01'))}
    ${field('Versão', input('version', p.version || '1.0'))}
    ${field('Dono', select('owner', owners(db), p.owner))}
    ${field('Cor da capa', input('color', p.color || '#344054', 'type="color"'))}
    <div class="span2">${field('Passos — um por linha: título | detalhe | papel | tecnologia', textarea('steps', steps, 'rows="8" class="mono"'),
      html`Papéis: ${ROLES.map((r) => r.id).join(', ')}. Tecnologias: ${db.technologies.map((t) => t.id).join(', ') || '—'}.`)}</div>
    ${field('Pré-requisitos (um por linha)', textarea('prerequisites', lines(p.prerequisites), 'rows="3"'))}
    ${field('Como verificar (um por linha)', textarea('verification', lines(p.verification), 'rows="3"'))}
    ${field('Cuidados (um por linha)', textarea('cautions', lines(p.cautions), 'rows="3"'))}
    ${field('Registros gerados (um por linha)', textarea('records', lines(p.records), 'rows="3"'))}</div>`;
}
export function procedureFromForm(f) {
  const steps = unlines(f.steps).map((l) => { const [title, detail = '', role = '', tech = ''] = l.split('|').map((x) => x.trim()); return { title, detail, role, tech }; });
  return { name: f.name, objective: f.objective, whenToUse: f.whenToUse, process: f.process, phase: f.phase, csf: f.csf, version: f.version, owner: f.owner, color: f.color,
    steps, prerequisites: unlines(f.prerequisites), verification: unlines(f.verification), cautions: unlines(f.cautions), records: unlines(f.records) };
}

export default {
  title: () => 'Tecnologias, processos e procedimentos',
  // Renderiza apenas a seção; a página Organização fornece cabeçalho e abas.
  render([tab = 'tecnologias']) {
    const db = store.get();
    if (!TABS.some(([k]) => k === tab)) tab = 'tecnologias';
    let body;
    if (tab === 'tecnologias') {
      const cov = techCoverage(db.technologies.filter((t) => t.status === 'operacional' || t.status === 'degradado'));
      const usage = (id) => db.incidents.filter((i) => i.tools?.includes(id)).length;
      body = html`<section class="card">
          <div class="card-head"><h2>Cobertura por Função do CSF 2.0</h2><span class="small muted">tecnologias operacionais ou degradadas</span></div>
          <div class="coverage">${FUNCTIONS.map((f) => html`<div class="cov ${cov[f.id].length ? '' : 'gap'}" style="--c:${f.color}"><b>${f.id}</b><span>${f.name}</span><strong>${cov[f.id].length}</strong>
            <small>${cov[f.id].length ? cov[f.id].map((t) => t.name).join(', ') : 'sem cobertura'}</small></div>`)}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Catálogo de tecnologias</h2><div class="row"><button class="btn sm" data-act="t-csv">${ic('down')} CSV</button><button class="btn sm primary" data-act="t-add">${ic('plus')} Nova tecnologia</button></div></div>
          ${db.technologies.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Tecnologia</th><th>Categoria</th><th>Funções</th><th>Subcategorias</th><th>Responsável</th><th>Estado</th><th>Uso</th><th></th></tr></thead>
          <tbody>${db.technologies.map((t) => html`<tr><td><b>${t.name}</b>${t.vendor ? html`<br><small class="muted">${t.vendor}</small>` : ''}${t.notes ? html`<br><small class="muted">${t.notes}</small>` : ''}</td>
            <td>${t.category}</td><td><div class="row">${(t.functions || []).map((f) => fnBadge(f))}</div></td><td>${(t.csf || []).map((c) => html`<span class="mono small">${c} </span>`)}</td>
            <td>${who(db, t.owner) || html`<span class="txt-late">sem dono</span>`}</td><td><span class="badge tst-${t.status}">${TECH_STATUS[t.status]}</span></td><td>${usage(t.id)} incid.</td>
            <td><div class="row nowrap"><button class="btn sm ghost" data-t-edit="${t.id}">Editar</button><button class="icon-btn" data-t-del="${t.id}" aria-label="Remover">${ic('x')}</button></div></td></tr>`)}</tbody></table></div>` : empty('Nenhuma tecnologia cadastrada.')}
        </section>`;
    } else if (tab === 'processos') {
      body = html`<section class="card">
        <div class="card-head"><h2>Processos de resposta a incidentes</h2><button class="btn sm primary" data-act="p-add">${ic('plus')} Novo processo</button></div>
        <p class="small muted">Processos definem <b>o quê</b> e <b>quem responde</b>; procedimentos definem <b>como</b>, passo a passo.</p>
        ${db.processes.length ? html`<div class="proc-grid">${db.processes.map((p) => { const pops = db.procedures.filter((x) => x.process === p.id); const stale = !p.reviewedAt || Date.now() - new Date(p.reviewedAt) > 365 * 864e5;
          return html`<article class="card flat">
            <div class="card-head"><h3>${p.name}</h3><span class="muted small">v${p.version}</span></div>
            <p>${p.objective}</p>
            <dl class="dl small"><dt>Dono</dt><dd>${who(db, p.owner) || html`<span class="txt-late">não definido</span>`}</dd><dt>Entradas</dt><dd>${p.inputs || '—'}</dd><dt>Saídas</dt><dd>${p.outputs || '—'}</dd>
              <dt>Revisão</dt><dd>${fmtDate(p.reviewedAt, false)}${stale ? html` <b class="txt-late">revisar</b>` : ''}</dd></dl>
            <div class="row">${(p.csf || []).map((c) => fnBadge(c))}</div>
            <p class="small"><b>Procedimentos:</b> ${pops.length ? pops.map((x) => x.name).join(' · ') : html`<span class="muted">nenhum</span>`}</p>
            <div class="row"><button class="btn sm ghost" data-p-edit="${p.id}">Editar</button><button class="btn sm ghost" data-p-rev="${p.id}">Marcar revisado</button><button class="icon-btn" data-p-del="${p.id}" aria-label="Remover">${ic('x')}</button></div>
          </article>`; })}</div>` : empty('Nenhum processo cadastrado.')}
      </section>`;
    }
    return body;
  },
  mount(el, _, ctx) {
    const db = store.get();
    const done = (a, t = '') => { store.audit(a, t); store.persist(); ctx.rerender(); };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      // Tecnologias
      if (d.act === 't-add') modal('Nova tecnologia', techForm(db), { wide: true, onSubmit: (f) => { db.technologies.push({ id: uid('tec-'), ...techFromForm(f) }); done('Tecnologia criada', f.name); } });
      if (d.tEdit) { const t = db.technologies.find((x) => x.id === d.tEdit); modal('Editar tecnologia', techForm(db, t), { wide: true, onSubmit: (f) => { Object.assign(t, techFromForm(f)); done('Tecnologia editada', t.name); } }); }
      if (d.tDel && await confirmBox('Remover tecnologia', 'Remover do catálogo?', { danger: true })) { db.technologies = db.technologies.filter((x) => x.id !== d.tDel); done('Tecnologia removida', d.tDel); }
      if (d.act === 't-csv') download('tecnologias.csv', toCSV([['nome', 'categoria', 'fornecedor', 'funcoes', 'subcategorias', 'responsavel', 'estado'], ...db.technologies.map((t) => [t.name, t.category, t.vendor, (t.functions || []).join(' '), (t.csf || []).join(' '), who(db, t.owner), t.status])]), 'text/csv');
      // Processos
      if (d.act === 'p-add') modal('Novo processo', processForm(db), { wide: true, onSubmit: (f) => { db.processes.push({ id: uid('proc-'), ...f, csf: csfList(f.csf) }); done('Processo criado', f.name); } });
      if (d.pEdit) { const p = db.processes.find((x) => x.id === d.pEdit); modal('Editar processo', processForm(db, p), { wide: true, onSubmit: (f) => { Object.assign(p, f, { csf: csfList(f.csf) }); done('Processo editado', p.name); } }); }
      if (d.pRev) { const p = db.processes.find((x) => x.id === d.pRev); p.reviewedAt = new Date().toISOString(); toast('Revisão registrada.'); done('Processo revisado', p.name); }
      if (d.pDel && await confirmBox('Remover processo', 'Os procedimentos vinculados ficarão sem processo.', { danger: true })) { db.processes = db.processes.filter((x) => x.id !== d.pDel); done('Processo removido', d.pDel); }
    });
  },
};
