// Tecnologias, Processos e Procedimentos (POPs) que sustentam a resposta a incidentes.
import * as store from '../core/store.js';
import { html, uid, download, toCSV, fmtDate } from '../core/util.js';
import { FUNCTIONS, ROLES, roleById, STATUSES, statusById, SUBCATEGORIES } from '../core/nist.js';
import { techCoverage } from '../core/engine.js';
import { TECH_CATEGORIES, TECH_STATUS } from '../data/library.js';
import { ic, field, input, dt, textarea, select, modal, confirmBox, fnBadge, empty, toast } from '../ui.js';

const TABS = [['tecnologias', 'Tecnologias'], ['processos', 'Processos'], ['procedimentos', 'Procedimentos (POPs)']];
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

function procedureForm(db, p = {}) {
  const steps = (p.steps || []).map((s) => [s.title, s.role, s.tech].join(' | ')).join('\n');
  return html`<div class="form-grid">
    <div class="span2">${field('Procedimento', input('name', p.name, 'required'))}</div>
    ${field('Processo', select('process', [{ v: '', t: '—' }, ...db.processes.map((x) => ({ v: x.id, t: x.name }))], p.process))}
    ${field('Fase de aplicação', select('phase', STATUSES.filter((s) => s.id !== 'encerrado').map((s) => ({ v: s.id, t: s.name })), p.phase || 'contencao'))}
    ${field('Subcategoria CSF principal', select('csf', SUBCATEGORIES.map((s) => ({ v: s.id, t: s.id })), p.csf || 'RS.MI-01'))}
    ${field('Versão', input('version', p.version || '1.0'))}${field('Dono', select('owner', owners(db), p.owner))}
    <div class="span2">${field('Passos — um por linha: descrição | papel | tecnologia', textarea('steps', steps, 'rows="8" class="mono"'),
      html`Papéis: ${ROLES.map((r) => r.id).join(', ')}. Tecnologias: ${db.technologies.map((t) => t.id).join(', ') || '—'}.`)}</div></div>`;
}
const stepsFromText = (txt) => txt.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [title, role = '', tech = ''] = l.split('|').map((x) => x.trim()); return { title, role, tech }; });

export default {
  title: () => 'Tecnologias, processos e procedimentos',
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
    } else {
      const uses = (id) => db.incidents.filter((i) => i.tasks.some((t) => t.procedure === id)).length;
      body = html`<section class="card">
        <div class="card-head"><h2>Procedimentos operacionais padrão (POPs)</h2><button class="btn sm primary" data-act="s-add">${ic('plus')} Novo procedimento</button></div>
        <p class="small muted">Aplique um procedimento na aba <b>Tarefas e passos</b> do incidente: ele vira uma tarefa obrigatória com checklist, atribuída automaticamente pelo papel.</p>
        ${db.procedures.length ? db.procedures.map((p) => html`<details class="pop">
          <summary><b>${p.name}</b> <span class="muted small">v${p.version} · ${statusById[p.phase]?.name || ''} · ${db.processes.find((x) => x.id === p.process)?.name || 'sem processo'} · ${p.steps.length} passos · usado em ${uses(p.id)} incidente(s)</span> ${fnBadge(p.csf)}</summary>
          <ol class="steps">${p.steps.map((s) => html`<li>${s.title} ${s.role ? html`<span class="badge ghost">${roleById[s.role]?.name || s.role}</span>` : ''} ${s.tech ? html`<span class="badge ghost">${db.technologies.find((t) => t.id === s.tech)?.name || s.tech}</span>` : ''}</li>`)}</ol>
          <div class="row"><span class="small muted">Dono: ${who(db, p.owner) || '—'}</span><button class="btn sm ghost" data-s-edit="${p.id}">Editar</button><button class="btn sm ghost" data-s-dup="${p.id}">Duplicar</button><button class="icon-btn" data-s-del="${p.id}" aria-label="Remover">${ic('x')}</button></div>
        </details>`) : empty('Nenhum procedimento cadastrado.')}
      </section>`;
    }
    return html`<div class="page">
      <div class="page-head"><div><h1>Tecnologias, processos e procedimentos</h1><p class="muted">O que a organização usa, como organiza e como executa a resposta a incidentes.</p></div></div>
      <nav class="tabs">${TABS.map(([k, t]) => html`<a class="tab ${k === tab ? 'on' : ''}" href="#/biblioteca/${k}">${t} <em>${k === 'tecnologias' ? db.technologies.length : k === 'processos' ? db.processes.length : db.procedures.length}</em></a>`)}</nav>
      ${body}
    </div>`;
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
      // Procedimentos
      if (d.act === 's-add') modal('Novo procedimento', procedureForm(db), { wide: true, onSubmit: (f) => { db.procedures.push({ id: uid('pop-'), ...f, steps: stepsFromText(f.steps) }); done('Procedimento criado', f.name); } });
      if (d.sEdit) {
        const p = db.procedures.find((x) => x.id === d.sEdit);
        modal('Editar procedimento', procedureForm(db, p), { wide: true, onSubmit: (f) => {
          // Editar sem mudar a versão incrementa a versão menor automaticamente.
          const bump = ((Math.round((parseFloat(p.version) || 1) * 10) + 1) / 10).toFixed(1);
          Object.assign(p, f, { steps: stepsFromText(f.steps), version: f.version === p.version ? bump : f.version });
          done('Procedimento editado', `${p.name} v${p.version}`);
        } });
      }
      if (d.sDup) { const p = db.procedures.find((x) => x.id === d.sDup); db.procedures.push({ ...structuredClone(p), id: uid('pop-'), name: `${p.name} (cópia)`, version: '1.0' }); done('Procedimento duplicado', p.name); }
      if (d.sDel && await confirmBox('Remover procedimento', 'Tarefas já criadas nos incidentes são mantidas.', { danger: true })) { db.procedures = db.procedures.filter((x) => x.id !== d.sDel); done('Procedimento removido', d.sDel); }
    });
  },
};
