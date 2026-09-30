// Atribuições: quem está em cada incidente, carga de trabalho e tarefas por pessoa.
import * as store from '../core/store.js';
import { html, fmtDate } from '../core/util.js';
import { statusById, roleById } from '../core/nist.js';
import { taskProgress } from '../core/engine.js';
import { select, sevBadge, empty, bar, when, toast } from '../ui.js';
import { teamIds, initials } from './incident.js';

export default {
  title: () => 'Atribuições',
  render(_, ctx) {
    const db = store.get();
    const now = new Date();
    const me = store.me();
    const person = ctx.query.get('p') || me?.id || '';
    const active = db.incidents.filter((i) => i.status !== 'encerrado');
    const load = db.contacts.map((c) => {
      const incs = active.filter((i) => teamIds(i).includes(c.id));
      const tasks = active.flatMap((i) => i.tasks.filter((t) => t.owner === c.id && t.status !== 'concluida').map((t) => ({ ...t, inc: i })));
      return { c, incs, tasks, late: tasks.filter((t) => t.due && new Date(t.due) < now).length };
    });
    const maxLoad = Math.max(1, ...load.map((l) => l.tasks.length));
    const unassigned = active.flatMap((i) => i.tasks.filter((t) => !t.owner && t.status !== 'concluida').map((t) => ({ ...t, inc: i })));
    const sel = load.find((l) => l.c.id === person);
    const opts = [{ v: '', t: '—' }, ...db.contacts.map((c) => ({ v: c.id, t: c.name }))];
    return html`<div class="page">
      <div class="page-head"><div><h1>Atribuições</h1><p class="muted">Pessoas, papéis e tarefas nos incidentes em andamento (GV.RR-02).</p></div></div>
      <div class="grid2">
        <section class="card">
          <h2>Carga de trabalho</h2>
          ${load.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Pessoa</th><th>Incidentes</th><th>Tarefas abertas</th><th>Atrasadas</th></tr></thead>
            <tbody>${load.map((l) => html`<tr class="${l.c.id === person ? 'sel' : ''}"><td><a href="#/atribuicoes?p=${l.c.id}"><span class="avatar">${initials(l.c.name)}</span> ${l.c.name}</a><br><small class="muted">${roleById[l.c.role]?.name || ''}${l.c.oncall ? ' · plantão' : ''}</small></td>
              <td>${l.incs.length}</td><td style="min-width:140px">${bar((l.tasks.length / maxLoad) * 100)}<small>${l.tasks.length}</small></td><td>${l.late ? html`<b class="txt-late">${l.late}</b>` : 0}</td></tr>`)}</tbody></table></div>` : empty('Cadastre a equipe em Preparação → Equipe.')}
        </section>
        <section class="card">
          <div class="card-head"><h2>Tarefas sem responsável</h2><span class="badge ${unassigned.length ? 'warn' : 'ok'}">${unassigned.length}</span></div>
          ${unassigned.length ? html`<ul class="list">${unassigned.map((t) => html`<li><div><b>${t.title}</b><br><small class="muted"><a href="#/incidente/${t.inc.id}/tarefas">${t.inc.id}</a> · ${statusById[t.phase]?.name}${t.required ? ' · obrigatória' : ''}</small></div>
            ${select('', opts, '', `data-assign="${t.inc.id}:${t.id}" aria-label="Atribuir"`)}</li>`)}</ul>` : empty('Todas as tarefas abertas têm responsável.')}
        </section>
      </div>
      <section class="card">
        <div class="card-head"><h2>${sel ? html`Tarefas de ${sel.c.name}${me?.id === sel.c.id ? ' (você)' : ''}` : 'Selecione uma pessoa'}</h2>${select('', opts, person, 'id="pick" aria-label="Pessoa"')}</div>
        ${sel ? html`${sel.tasks.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Tarefa</th><th>Incidente</th><th>Fase</th><th>Progresso</th><th>Prazo</th></tr></thead>
          <tbody>${sel.tasks.sort((a, b) => new Date(a.due || '2999') - new Date(b.due || '2999')).map((t) => html`<tr><td><a href="#/incidente/${t.inc.id}/tarefas">${t.title}</a>${t.required ? html` <span class="badge warn">obrigatória</span>` : ''}</td>
            <td>${t.inc.id} ${sevBadge(t.inc.severity)}</td><td>${statusById[t.phase]?.name}</td><td style="min-width:110px">${bar(taskProgress(t))}</td>
            <td>${t.due ? html`${when(t.due)}${new Date(t.due) < now ? html` <b class="txt-late">atrasada</b>` : ''}` : '—'}</td></tr>`)}</tbody></table></div>` : empty('Nenhuma tarefa aberta.')}
          <h3>Incidentes</h3>${sel.incs.length ? html`<ul class="list">${sel.incs.map((i) => html`<li><a href="#/incidente/${i.id}/equipe">${i.id} — ${i.title}</a><span class="muted">${Object.entries(i.roles).filter(([, v]) => v === sel.c.id).map(([r]) => roleById[r]?.name).join(', ') || 'membro'} · ${statusById[i.status].name}</span></li>`)}</ul>` : empty('Não participa de incidentes ativos.')}` : empty('Escolha uma pessoa ou defina seu usuário no topo da tela.')}
      </section>
      <p class="small muted">Última atualização ${fmtDate(new Date().toISOString())}.</p>
    </div>`;
  },
  mount(el, _, ctx) {
    const db = store.get();
    el.querySelector('#pick')?.addEventListener('change', (e) => ctx.go(`#/atribuicoes?p=${e.target.value}`));
    el.addEventListener('change', async (e) => {
      const t = e.target; if (!t.dataset.assign || !t.value) return;
      const [iid, tid] = t.dataset.assign.split(':');
      const inc = store.incident(iid); const task = inc.tasks.find((x) => x.id === tid);
      task.owner = t.value;
      await store.logChange(inc, `Tarefa "${task.title}" atribuída a ${db.contacts.find((c) => c.id === t.value)?.name}`, 'Tarefa atribuída');
      toast('Tarefa atribuída.'); ctx.rerender();
    });
  },
};
