// Início: o essencial em uma tela — o que está acontecendo, o que é meu e por onde começar.
import * as store from '../core/store.js';
import { html, raw } from '../core/util.js';
import { slaStatus, notificationStatus, csfProgress } from '../core/engine.js';
import { STATUSES, statusIndex } from '../core/nist.js';
import { art } from '../art.js';
import { allBooks, coverCard } from '../book.js';
import { sevBadge, when, ic, bar } from '../ui.js';

export default {
  title: () => 'Início',
  render() {
    const db = store.get();
    const now = new Date();
    const me = store.me();
    const open = db.incidents.filter((i) => i.status !== 'encerrado').sort((a, b) => a.severity.localeCompare(b.severity));
    const critical = open.filter((i) => i.severity === 'S1' || i.severity === 'S2').length;
    const pending = db.events.filter((e) => e.status === 'novo' || e.status === 'analise').length;
    const risks = open.flatMap((i) => [
      ...slaStatus(i, db.sla, now).filter((s) => !s.done && s.late).map((s) => ({ i, text: `SLA de ${s.label.toLowerCase()} excedido`, due: s.due, tab: 'visao' })),
      ...notificationStatus(i, db.regulations, now).filter((n) => ['atrasada', 'vence em breve'].includes(n.state)).map((n) => ({ i, text: `${n.reg.name} — ${n.state}`, due: n.due, tab: 'comunicacao' })),
    ]).sort((a, b) => new Date(a.due) - new Date(b.due));
    const tasks = open.flatMap((i) => i.tasks.filter((t) => t.status !== 'concluida' && (!me || t.owner === me.id)).map((t) => ({ ...t, inc: i })))
      .sort((a, b) => new Date(a.due || '2999') - new Date(b.due || '2999')).slice(0, 6);
    const books = allBooks(db).filter((b) => b.kind === 'playbook').slice(0, 6);
    const hour = now.getHours();
    const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return html`<div class="page home">
      <section class="hero">
        <div class="hero-txt">
          <p class="eyebrow">${db.org.name}</p>
          <h1>${hello}.</h1>
          <p class="muted">${open.length ? `${open.length} incidente(s) em andamento${critical ? `, ${critical} de alta severidade` : ''}.` : 'Nenhum incidente em andamento. Bom momento para revisar playbooks e treinar a equipe.'}</p>
          <div class="row">
            <a class="btn primary lg" href="#/incidentes/novo">${ic('alert')} Declarar incidente</a>
          </div>
        </div>
        <div class="hero-art">${raw(art('shield'))}</div>
      </section>

      <div class="stats">
        <a class="stat" href="#/incidentes"><span class="stat-ic">${ic('alert')}</span><div><strong>${open.length}</strong><span>incidentes abertos</span></div></a>
        <a class="stat ${critical ? 'hot' : ''}" href="#/incidentes?sev=S1"><span class="stat-ic">${ic('shield')}</span><div><strong>${critical}</strong><span>críticos ou altos</span></div></a>
        <a class="stat" href="#/atribuicoes"><span class="stat-ic">${ic('check')}</span><div><strong>${open.reduce((n, i) => n + i.tasks.filter((t) => t.status !== 'concluida').length, 0)}</strong><span>tarefas abertas</span></div></a>
        <a class="stat ${risks.length ? 'hot' : ''}" href="#/relatorios/regulatorio"><span class="stat-ic">${ic('clock')}</span><div><strong>${risks.length}</strong><span>prazos em risco</span></div></a>
      </div>

      <div class="home-grid">
        <section class="card">
          <div class="card-head"><h2>Em andamento</h2><a href="#/incidentes">ver todos</a></div>
          ${open.length ? html`<div class="inc-cards">${open.map((i) => { const p = csfProgress(i); const cur = statusIndex(i.status);
            return html`<a class="inc-card sevl-${i.severity}" href="#/incidente/${i.id}">
              <div class="row"><span class="mono small muted">${i.id}</span>${sevBadge(i.severity)}</div>
              <strong>${i.title}</strong>
              <div class="mini-steps" title="${STATUSES[cur]?.name}">${STATUSES.slice(0, 6).map((s, n) => html`<span class="${n < cur ? 'past' : n === cur ? 'cur' : ''}"></span>`)}</div>
              <div class="row small muted"><span>${STATUSES[cur]?.name}</span><span class="spacer"></span><span>CSF ${p.pct}%</span></div></a>`; })}</div>`
            : html`<div class="empty-art">${raw(art('radar', 'art-sm'))}<p>Tudo tranquilo por aqui.</p></div>`}
        </section>
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Próximas tarefas</h2><a href="#/atribuicoes">por área</a></div>
            ${tasks.length ? html`<ul class="task-mini">${tasks.map((t) => html`<li><a href="#/incidente/${t.inc.id}/tarefas">${t.title}</a>
              <span class="muted small">${t.inc.id} · ${db.contacts.find((c) => c.id === t.owner)?.name || 'sem área'}${t.due ? html` · ${when(t.due)}` : ''}${t.due && new Date(t.due) < now ? html` · <b class="txt-late">atrasada</b>` : ''}</span>
              ${t.steps?.length ? bar(Math.round((t.steps.filter((s) => s.done).length / t.steps.length) * 100)) : ''}</li>`)}</ul>`
              : html`<div class="empty-art">${raw(art('procedure', 'art-sm'))}<p>Nenhuma tarefa pendente.</p></div>`}
          </section>
          ${risks.length ? html`<section class="card">
            <h2>Prazos em risco</h2>
            <ul class="alerts">${risks.slice(0, 4).map((r) => html`<li class="al-late"><a href="#/incidente/${r.i.id}/${r.tab}"><b>${r.i.id}</b> ${r.text}</a><span class="muted small">${when(r.due)}</span></li>`)}</ul>
          </section>` : ''}
        </div>
      </div>

      <section class="card shelf-card">
        <div class="card-head"><div><h2>Biblioteca de playbooks</h2><p class="muted small">Leia, aplique em um incidente ou baixe para a equipe.</p></div><a class="btn" href="#/biblioteca">${ic('book')} Abrir biblioteca</a></div>
        <div class="shelf-row compact">${books.map((b) => coverCard(b))}</div>
        <div class="shelf-board"></div>
      </section>
    </div>`;
  },
};
