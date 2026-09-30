// Preparação (Governar, Identificar, Proteger): prontidão, equipe, ativos e exercícios.
import * as store from '../core/store.js';
import { html, uid, download, toCSV } from '../core/util.js';
import { ROLES, roleById, FUNCTIONS } from '../core/nist.js';
import { READINESS, LEVELS } from '../data/readiness.js';
import { ic, field, input, dt, textarea, select, modal, confirmBox, fnBadge, empty, bar, when } from '../ui.js';

const TABS = [['prontidao', 'Prontidão'], ['equipe', 'Equipe e contatos'], ['ativos', 'Ativos'], ['exercicios', 'Exercícios']];
const CRIT = [{ v: 'alta', t: 'Alta' }, { v: 'media', t: 'Média' }, { v: 'baixa', t: 'Baixa' }];

function contactForm(c = {}) {
  return html`<div class="form-grid">
    <div class="span2">${field('Área', input('name', c.name, 'required placeholder="Ex.: Infraestrutura e TI"'))}</div>
    ${field('Papel na resposta', select('role', ROLES.map((r) => ({ v: r.id, t: r.name })), c.role || 'handler'))}
    ${field('Canal de contato', input('email', c.email, 'placeholder="e-mail, grupo ou ramal"'))}
    <details class="more span2"><summary>Mais opções</summary><div class="form-grid">
      ${field('Telefone de acionamento', input('phone', c.phone))}
      <label class="chk"><input type="checkbox" name="external" ${c.external ? 'checked' : ''}> Área externa (fornecedor, autoridade)</label></div></details></div>`;
}
function assetForm(a = {}) {
  return html`<div class="form-grid">
    ${field('Nome', input('name', a.name, 'required'))}${field('Tipo', input('type', a.type || 'Servidor', 'list="assettypes"'))}
    ${field('Responsável', input('owner', a.owner))}${field('Criticidade (ID.AM-05)', select('criticality', CRIT, a.criticality || 'media'))}
    ${field('IP / endereço', input('ip', a.ip))}${field('Classificação dos dados', input('dataClass', a.dataClass))}
    <div class="span2">${field('Notas', textarea('notes', a.notes, 'rows="2"'))}</div></div>
    <datalist id="assettypes">${['Servidor', 'Estação de trabalho', 'Controlador de domínio', 'Aplicação web', 'Banco de dados', 'SaaS', 'Nuvem (IaaS/PaaS)', 'Rede', 'Backup', 'OT/IoT', 'Dispositivo móvel'].map((t) => html`<option value="${t}">`)}</datalist>`;
}

export default {
  title: () => 'Preparação',
  render([tab = 'prontidao']) {
    const db = store.get();
    let body;
    if (tab === 'equipe') {
      const byRole = ROLES.map((r) => ({ r, n: db.contacts.filter((c) => c.role === r.id).length }));
      const missing = byRole.filter((x) => x.n === 0 && ['lead', 'handler', 'legal', 'comms', 'leadership'].includes(x.r.id));
      body = html`<section class="card">
        <div class="card-head"><h2>Áreas da resposta <small class="muted">GV.RR-02</small></h2><button class="btn sm primary" data-act="c-add">${ic('plus')} Nova área</button></div>
        <p class="small muted">Cadastre áreas, não pessoas. Cada área tem um papel padrão e recebe automaticamente as tarefas desse papel nos playbooks.</p>
        ${missing.length ? html`<div class="warnbox">Papéis sem área definida: ${missing.map((x) => x.r.name).join(', ')}.</div>` : ''}
        ${db.contacts.length ? html`<div class="area-grid">${db.contacts.map((c) => { const open = db.incidents.filter((i) => i.status !== 'encerrado').flatMap((i) => i.tasks).filter((t) => t.owner === c.id && t.status !== 'concluida').length;
          return html`<article class="area-card"><span class="area-ic">${ic(c.external ? 'ext' : 'users')}</span>
            <div><b>${c.name}</b><small class="muted">${roleById[c.role]?.name || ''}${c.external ? ' · externa' : ''}</small><small>${c.email || ''}${c.phone ? ` · ${c.phone}` : ''}</small>
              <small class="${open ? '' : 'muted'}">${open} tarefa(s) aberta(s)</small></div>
            <div class="row"><button class="btn sm ghost" data-c-edit="${c.id}">Editar</button><button class="icon-btn" data-c-del="${c.id}" aria-label="Remover">${ic('x')}</button></div></article>`; })}</div>` : empty('Nenhuma área cadastrada.')}
      </section>`;
    } else if (tab === 'ativos') {
      body = html`<section class="card">
        <div class="card-head"><h2>Inventário de ativos (ID.AM)</h2><div class="row"><button class="btn sm" data-act="a-csv">${ic('down')} CSV</button><button class="btn sm primary" data-act="a-add">${ic('plus')} Novo ativo</button></div></div>
        ${db.assets.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Ativo</th><th>Tipo</th><th>Responsável</th><th>Criticidade</th><th>IP</th><th>Dados</th><th>Incidentes</th><th></th></tr></thead>
          <tbody>${db.assets.map((a) => { const n = db.incidents.filter((i) => i.assets.includes(a.id)); return html`<tr><td><b>${a.name}</b><br><small class="muted">${a.notes}</small></td><td>${a.type}</td><td>${a.owner}</td>
          <td><span class="badge crit-${a.criticality}">${a.criticality}</span></td><td class="mono">${a.ip}</td><td>${a.dataClass}</td><td>${n.map((i) => html`<a href="#/incidente/${i.id}">${i.id}</a> `)}</td>
          <td><div class="row"><button class="btn sm ghost" data-a-edit="${a.id}">Editar</button><button class="icon-btn" data-a-del="${a.id}" aria-label="Remover">${ic('x')}</button></div></td></tr>`; })}</tbody></table></div>` : empty('Nenhum ativo cadastrado.')}
      </section>`;
    } else if (tab === 'exercicios') {
      body = html`<section class="card">
        <div class="card-head"><h2>Exercícios e testes (ID.IM-02)</h2><button class="btn sm primary" data-act="x-add">${ic('plus')} Registrar exercício</button></div>
        <p class="small muted">Tabletops e simulações — inclusive com fornecedores e terceiros — geram melhorias antes de um incidente real.</p>
        ${db.exercises.length ? html`<ul class="list">${db.exercises.map((x) => html`<li><div><b>${x.type}: ${x.scenario}</b><br><span class="muted">${when(x.date)} · ${x.participants}</span><p>${x.findings}</p></div>
          <button class="icon-btn" data-x-del="${x.id}" aria-label="Remover">${ic('x')}</button></li>`)}</ul>` : empty('Nenhum exercício registrado.')}
      </section>`;
    } else {
      tab = 'prontidao';
      const score = (fn) => { const it = READINESS.filter((r) => r.id.startsWith(fn)); return it.length ? Math.round((it.reduce((s, r) => s + (db.readiness[r.id] || 0), 0) / (it.length * 3)) * 100) : null; };
      const total = Math.round((READINESS.reduce((s, r) => s + (db.readiness[r.id] || 0), 0) / (READINESS.length * 3)) * 100);
      body = html`<section class="card">
        <div class="card-head"><h2>Avaliação de prontidão para resposta a incidentes</h2><strong class="big">${total}%</strong></div>
        <div class="fnscores">${FUNCTIONS.map((f) => { const s = score(f.id); return s == null ? '' : html`<div><span>${f.id} · ${f.name}</span>${bar(s, f.color)}<b>${s}%</b></div>`; })}</div>
        <p class="small muted">Níveis: ${LEVELS.map((l, i) => `${i} = ${l}`).join(' · ')}. A Rev. 3 enfatiza que a preparação é contínua e sustentada pelas Funções Governar, Identificar e Proteger.</p>
        <div class="table-wrap"><table class="tbl"><tbody>${READINESS.map((r) => html`<tr><td class="nowrap">${fnBadge(r.id)}</td><td>${r.text}</td>
          <td><div class="seg sm">${LEVELS.map((l, i) => html`<button class="${(db.readiness[r.id] || 0) === i ? 'on' : ''}" data-ready="${r.id}" data-lvl="${i}" title="${l}">${i}</button>`)}</div></td></tr>`)}</tbody></table></div>
      </section>`;
    }
    return body; // a página Organização fornece cabeçalho e abas
  },
  mount(el, _, ctx) {
    const db = store.get();
    const done = (a, t = '') => { store.audit(a, t); store.persist(); ctx.rerender(); };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.ready) { db.readiness[d.ready] = Number(d.lvl); return done('Prontidão avaliada', `${d.ready}=${d.lvl}`); }
      if (d.act === 'c-add') modal('Novo contato', contactForm(), { onSubmit: (f) => { db.contacts.push({ id: uid('c'), ...f }); done('Contato criado', f.name); } });
      if (d.cEdit) { const c = db.contacts.find((x) => x.id === d.cEdit); modal('Editar contato', contactForm(c), { onSubmit: (f) => { Object.assign(c, f); done('Contato editado', c.name); } }); }
      if (d.cDel && await confirmBox('Remover contato', 'Remover este contato?', { danger: true })) { db.contacts = db.contacts.filter((x) => x.id !== d.cDel); done('Contato removido', d.cDel); }
      if (d.act === 'a-add') modal('Novo ativo', assetForm(), { onSubmit: (f) => { db.assets.push({ id: uid('a'), ...f }); done('Ativo criado', f.name); } });
      if (d.aEdit) { const a = db.assets.find((x) => x.id === d.aEdit); modal('Editar ativo', assetForm(a), { onSubmit: (f) => { Object.assign(a, f); db.incidents.forEach(store.recompute); done('Ativo editado', a.name); } }); }
      if (d.aDel && await confirmBox('Remover ativo', 'Remover este ativo do inventário?', { danger: true })) { db.assets = db.assets.filter((x) => x.id !== d.aDel); done('Ativo removido', d.aDel); }
      if (d.act === 'a-csv') download('ativos.csv', toCSV([['nome', 'tipo', 'responsavel', 'criticidade', 'ip', 'dados'], ...db.assets.map((a) => [a.name, a.type, a.owner, a.criticality, a.ip, a.dataClass])]), 'text/csv');
      if (d.act === 'x-add') modal('Registrar exercício', html`<div class="form-grid">
        ${field('Data', dt('date', new Date().toISOString()))}${field('Tipo', select('type', ['Tabletop', 'Simulação técnica', 'Red team / purple team', 'Teste de restauração', 'Teste de comunicação'], 'Tabletop'))}
        <div class="span2">${field('Cenário', input('scenario', '', 'required'))}</div><div class="span2">${field('Participantes', input('participants', ''))}</div>
        <div class="span2">${field('Achados e melhorias', textarea('findings', '', 'rows="3"'))}</div></div>`, {
        onSubmit: (f) => { db.exercises.unshift({ id: uid('x'), csf: 'ID.IM-02', ...f }); done('Exercício registrado', f.scenario); },
      });
      if (d.xDel) { db.exercises = db.exercises.filter((x) => x.id !== d.xDel); done('Exercício removido'); }
    });
  },
};
