import * as store from '../core/store.js';
import { html, fmtDuration } from '../core/util.js';
import { metrics, slaStatus, notificationStatus, SEVERITIES, csfProgress } from '../core/engine.js';
import { STATUSES, FUNCTIONS, NIST_LINKS } from '../core/nist.js';
import { READINESS } from '../data/readiness.js';
import { sevBadge, statusBadge, when, ic, empty, bar } from '../ui.js';

export default {
  title: () => 'Painel',
  render() {
    const db = store.get();
    const m = metrics(db.incidents);
    const open = db.incidents.filter((i) => i.status !== 'encerrado');
    const now = new Date();

    // Alertas: SLAs estourados e notificações pendentes/atrasadas.
    const alerts = [];
    for (const i of open) {
      for (const s of slaStatus(i, db.sla, now)) if (!s.done && s.late) alerts.push({ i, kind: 'sla', text: `SLA de ${s.label.toLowerCase()} excedido`, due: s.due });
      for (const n of notificationStatus(i, db.regulations, now)) {
        if (n.state === 'atrasada' || n.state === 'vence em breve') alerts.push({ i, kind: n.state === 'atrasada' ? 'late' : 'soon', text: `${n.reg.name}: ${n.state}`, due: n.due });
      }
    }
    alerts.sort((a, b) => new Date(a.due) - new Date(b.due));

    const pendingEvents = db.events.filter((e) => e.status === 'novo' || e.status === 'analise');
    const me = store.me();
    const who = (id) => db.contacts.find((c) => c.id === id)?.name || 'sem responsável';
    const tasks = open.flatMap((i) => i.tasks.filter((t) => t.status !== 'concluida' && (!me || t.owner === me.id)).map((t) => ({ ...t, inc: i })))
      .sort((a, b) => new Date(a.due || '2999') - new Date(b.due || '2999')).slice(0, 8);
    const readyScore = Math.round((READINESS.reduce((s, r) => s + (db.readiness[r.id] || 0), 0) / (READINESS.length * 3)) * 100);
    const impOpen = db.improvements.filter((p) => p.status !== 'concluida').length;
    const maxStatus = Math.max(1, ...Object.values(m.byStatus));

    return html`<div class="page">
      <div class="page-head">
        <div><h1>Painel de resposta a incidentes</h1><p class="muted">${db.org.name} · visão consolidada Detectar · Responder · Recuperar · <a href="${NIST_LINKS.pdf}" target="_blank" rel="noopener">NIST SP 800-61r3</a></p></div>
        <div class="row"><a class="btn" href="#/relatorios/executivo">${ic('chart')} Relatório executivo</a><a class="btn" href="#/eventos">${ic('radar')} Registrar evento</a><a class="btn primary" href="#/incidentes/novo">${ic('plus')} Declarar incidente</a></div>
      </div>

      <div class="kpis">
        <div class="kpi"><span>Incidentes abertos</span><strong>${m.open}</strong><small>${m.total} no total</small></div>
        ${SEVERITIES.slice(0, 2).map((s) => html`<div class="kpi sev-k-${s.id}"><span>${s.id} · ${s.name}</span><strong>${m.bySeverity[s.id]}</strong><small>abertos</small></div>`)}
        <div class="kpi"><span>Eventos a triar</span><strong>${pendingEvents.length}</strong><small><a href="#/eventos">abrir fila</a></small></div>
        <div class="kpi"><span>MTTD</span><strong>${fmtDuration(m.mttd)}</strong><small>ocorrência → detecção</small></div>
        <div class="kpi"><span>MTTC</span><strong>${fmtDuration(m.mttc)}</strong><small>declaração → contenção</small></div>
        <div class="kpi"><span>MTTR</span><strong>${fmtDuration(m.mttr)}</strong><small>declaração → recuperação</small></div>
        <div class="kpi"><span>Prontidão</span><strong>${readyScore}%</strong><small><a href="#/preparacao">avaliação GV/ID/PR</a></small></div>
      </div>

      <div class="grid2">
        <section class="card">
          <h2>Alertas de prazo</h2>
          ${alerts.length ? html`<ul class="alerts">${alerts.slice(0, 8).map((a) => html`<li class="al-${a.kind}">
            <a href="#/incidente/${a.i.id}/${a.kind === 'sla' ? 'visao' : 'comunicacao'}"><strong>${a.i.id}</strong> ${a.text}</a><span class="muted">prazo ${when(a.due)}</span></li>`)}</ul>`
            : empty('Nenhum SLA ou notificação regulatória em risco.')}
        </section>
        <section class="card">
          <h2>Incidentes por estado</h2>
          <div class="hbars">${STATUSES.map((s) => html`<a class="hbar" href="#/incidentes?status=${s.id}"><span>${s.name}</span>
            <div class="bar"><span class="st-bg-${s.id}" style="width:${(m.byStatus[s.id] / maxStatus) * 100}%"></span></div><b>${m.byStatus[s.id]}</b></a>`)}</div>
        </section>
      </div>

      <section class="card">
        <div class="card-head"><h2>Incidentes em andamento</h2><a href="#/incidentes">ver todos</a></div>
        ${open.length ? html`<div class="table-wrap"><table class="tbl">
          <thead><tr><th>ID</th><th>Título</th><th>Severidade</th><th>Estado</th><th>Progresso CSF</th><th>Declarado</th></tr></thead>
          <tbody>${open.map((i) => { const p = csfProgress(i); return html`<tr>
            <td><a href="#/incidente/${i.id}">${i.id}</a></td><td>${i.title}</td><td>${sevBadge(i.severity)}</td><td>${statusBadge(i.status)}</td>
            <td style="min-width:120px">${bar(p.pct)}<small class="muted">${p.done}/${p.total}</small></td><td>${when(i.declaredAt)}</td></tr>`; })}</tbody>
        </table></div>` : empty('Nenhum incidente aberto.')}
      </section>

      <div class="grid2">
        <section class="card">
          <div class="card-head"><h2>${me ? 'Minhas tarefas' : 'Próximas tarefas'}</h2><a href="#/atribuicoes">atribuições</a></div>
          ${tasks.length ? html`<ul class="list">${tasks.map((t) => html`<li><a href="#/incidente/${t.inc.id}/tarefas">${t.title}</a>
            <span class="muted">${t.inc.id}${me ? '' : ` · ${who(t.owner)}`} · ${t.due ? when(t.due) : 'sem prazo'}${t.due && new Date(t.due) < now ? html` <b class="txt-late">atrasada</b>` : ''}</span></li>`)}</ul>` : empty('Nenhuma tarefa pendente.')}
        </section>
        <section class="card">
          <h2>Ciclo de vida CSF 2.0</h2>
          <div class="fnrow">${FUNCTIONS.map((f) => html`<div class="fn" style="--c:${f.color}"><b>${f.id}</b><span>${f.name}</span></div>`)}</div>
          <p class="muted small">Preparação contínua (GV, ID, PR) · Resposta (DE, RS, RC) · Melhoria (ID.IM) realimenta todas as Funções.</p>
          <p><a href="#/melhorias">${impOpen} melhoria(s) em aberto</a> · <a href="#/referencia">Entenda o modelo da Rev. 3</a></p>
        </section>
      </div>
    </div>`;
  },
};
