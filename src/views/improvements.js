// Backlog de melhorias (ID.IM): lições aprendidas que realimentam Governar, Identificar e Proteger.
import * as store from '../core/store.js';
import { html, uid } from '../core/util.js';
import { ic, field, input, dt, select, modal, fnBadge, empty, when } from '../ui.js';

const ST = [{ v: 'aberta', t: 'Aberta' }, { v: 'andamento', t: 'Em andamento' }, { v: 'concluida', t: 'Concluída' }, { v: 'cancelada', t: 'Cancelada' }];
const PR = [{ v: 'alta', t: 'Alta' }, { v: 'media', t: 'Média' }, { v: 'baixa', t: 'Baixa' }];

export default {
  title: () => 'Melhorias',
  render() {
    const db = store.get();
    const owners = [{ v: '', t: '—' }, ...db.contacts.map((c) => ({ v: c.id, t: c.name }))];
    const list = [...db.improvements].sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida') || PR.findIndex((p) => p.v === a.priority) - PR.findIndex((p) => p.v === b.priority));
    const now = new Date();
    return html`<section class="card">
        <div class="card-head"><h2>Melhorias contínuas <small class="muted">ID.IM</small></h2><button class="btn sm primary" data-act="add">${ic('plus')} Nova melhoria</button></div>
        ${list.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Melhoria</th><th>Origem</th><th>CSF</th><th>Prioridade</th><th>Responsável</th><th>Prazo</th><th>Estado</th></tr></thead>
        <tbody>${list.map((p) => html`<tr class="${p.status === 'concluida' ? 'done' : ''}"><td>${p.title}</td>
          <td>${p.source?.startsWith('INC-') ? html`<a href="#/incidente/${p.source}/encerramento">${p.source}</a>` : p.source || '—'}</td>
          <td>${p.csf ? fnBadge(p.csf) : ''}</td><td><span class="badge crit-${p.priority}">${p.priority}</span></td>
          <td>${select('', owners, p.owner, `data-id="${p.id}" data-k="owner" aria-label="Responsável"`)}</td>
          <td>${when(p.due)}${p.due && new Date(p.due) < now && p.status !== 'concluida' ? html` <b class="txt-late">atrasada</b>` : ''}</td>
          <td>${select('', ST, p.status, `data-id="${p.id}" data-k="status" aria-label="Estado"`)}</td></tr>`)}</tbody></table></div>` : empty('Nenhuma melhoria registrada.')}</section>`;
  },
  mount(el, _, ctx) {
    const db = store.get();
    el.addEventListener('change', (e) => {
      const t = e.target; if (!t.dataset.id) return;
      const p = db.improvements.find((x) => x.id === t.dataset.id);
      p[t.dataset.k] = t.value;
      store.audit('Melhoria atualizada', p.title, `${t.dataset.k}=${t.value}`); store.persist(); ctx.rerender();
    });
    el.querySelector('[data-act=add]').addEventListener('click', () => modal('Nova melhoria', html`<div class="form-grid">
      <div class="span2">${field('Melhoria', input('title', '', 'required'))}</div>
      ${field('Origem', input('source', '', 'placeholder="INC-…, auditoria, exercício…"'))}${field('Subcategoria CSF alvo', input('csf', '', 'placeholder="ex.: PR.DS-11"'))}
      ${field('Prioridade', select('priority', PR, 'media'))}${field('Prazo', dt('due', null))}</div>`, {
      onSubmit: (f) => { db.improvements.unshift({ id: uid('p'), status: 'aberta', owner: '', ...f }); store.audit('Melhoria criada', f.title); store.persist(); ctx.rerender(); },
    }));
  },
};
