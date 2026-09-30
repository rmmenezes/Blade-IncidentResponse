// Central de relatórios: executivo, operacional, conformidade, regulatório, IOCs, melhorias, equipe e tecnologias.
import * as store from '../core/store.js';
import { html, fmtDate, fmtDuration, diff, download, toCSV, avg } from '../core/util.js';
import { STATUSES, statusById, SUBCATEGORIES, FUNCTIONS, CATEGORIES, NIST_LINKS } from '../core/nist.js';
import { metrics, slaStatus, notificationStatus, csfProgress, inPeriod, techCoverage, SEVERITIES } from '../core/engine.js';
import { TECH_STATUS } from '../data/library.js';
import { ic, sevBadge, statusBadge, fnBadge, empty, bar } from '../ui.js';
import { teamIds } from './incident.js';

const REPORTS = [
  { id: 'executivo', name: 'Executivo', desc: 'Visão para a liderança: volume, severidade, tempos de resposta e exposição regulatória.', icon: 'dash' },
  { id: 'operacional', name: 'Operacional e SLAs', desc: 'Tempos por incidente (detecção, contenção, recuperação) e cumprimento de SLAs.', icon: 'clock' },
  { id: 'conformidade', name: 'Conformidade NIST CSF', desc: 'Aderência às subcategorias da SP 800-61r3 por incidente e no agregado.', icon: 'shield' },
  { id: 'regulatorio', name: 'Notificações regulatórias', desc: 'Obrigações aplicáveis, prazos, envios, atrasos e dispensas justificadas.', icon: 'alert' },
  { id: 'indicadores', name: 'Indicadores (IOCs)', desc: 'Consolidação de indicadores de todos os incidentes, respeitando o TLP.', icon: 'radar' },
  { id: 'equipe', name: 'Equipe e carga de trabalho', desc: 'Atribuições, tarefas abertas, atrasadas e concluídas por pessoa.', icon: 'users' },
  { id: 'tecnologias', name: 'Tecnologias e processos', desc: 'Cobertura das Funções do CSF, uso nos incidentes e revisões pendentes.', icon: 'gear' },
  { id: 'melhorias', name: 'Lições aprendidas e melhorias', desc: 'Causas raiz, lições registradas e andamento do backlog (ID.IM).', icon: 'up' },
  { id: 'incidentes', name: 'Relatório por incidente', desc: 'Relatório completo e imprimível de um incidente específico.', icon: 'list' },
];

const csvBtn = html`<button class="btn sm" data-act="csv">${ic('down')} CSV</button>`;

function frame(db, r, q, body) {
  const de = q.get('de') || '', ate = q.get('ate') || '';
  return html`<div class="page report">
    <div class="no-print">
      <p class="crumb"><a href="#/relatorios">Relatórios</a> / ${r.name}</p>
      <form class="filters" id="period">
        <label class="field inline-f"><span class="lbl">De</span><input type="date" name="de" value="${de}"></label>
        <label class="field inline-f"><span class="lbl">Até</span><input type="date" name="ate" value="${ate}"></label>
        <button class="btn sm">Aplicar período</button>
        <span class="spacer"></span>${csvBtn}<button type="button" class="btn sm primary" onclick="print()">${ic('print')} Imprimir / PDF</button>
      </form>
    </div>
    <header class="rep-head"><div><p class="muted">${db.org.name} · Relatório ${r.name.toLowerCase()}</p><h1>${r.name}</h1></div>
      <div class="small muted right">Período: ${de ? fmtDate(de, false) : 'início'} a ${ate ? fmtDate(ate, false) : 'hoje'}<br>Gerado em ${fmtDate(new Date().toISOString())} por ${store.userName()}</div></header>
    ${body}
    <p class="small muted rep-foot">Estrutura de referência: <a href="${NIST_LINKS.pdf}" target="_blank" rel="noopener">NIST SP 800-61 Rev. 3</a> · <a href="${NIST_LINKS.csfPdf}" target="_blank" rel="noopener">NIST CSF 2.0</a></p>
  </div>`;
}

function period(db, q) {
  const de = q.get('de'), ate = q.get('ate');
  return db.incidents.filter((i) => inPeriod(i, de ? `${de}T00:00:00` : null, ate ? `${ate}T23:59:59` : null));
}

// Cada relatório devolve { body, rows } — rows alimenta a exportação CSV.
const BUILD = {
  executivo(db, list) {
    const m = metrics(list);
    const now = new Date();
    const notif = list.flatMap((i) => notificationStatus(i, db.regulations, now).map((n) => ({ i, ...n })));
    const late = notif.filter((n) => n.state === 'atrasada' || n.state === 'enviada com atraso');
    const cats = Object.entries(m.byCategory).sort((a, b) => b[1] - a[1]);
    const maxCat = Math.max(1, ...cats.map((c) => c[1]));
    const sevAll = Object.fromEntries(SEVERITIES.map((s) => [s.id, list.filter((i) => i.severity === s.id).length]));
    const personal = list.filter((i) => i.personalData).length;
    const records = list.reduce((s, i) => s + (Number(i.magnitude?.records) || 0), 0);
    const cost = list.reduce((s, i) => s + (Number(i.magnitude?.financial) || 0), 0);
    return {
      body: html`<div class="kpis">
          <div class="kpi"><span>Incidentes no período</span><strong>${m.total}</strong><small>${m.open} em aberto</small></div>
          ${SEVERITIES.map((s) => html`<div class="kpi sev-k-${s.id}"><span>${s.id} · ${s.name}</span><strong>${sevAll[s.id]}</strong></div>`)}
          <div class="kpi"><span>MTTD</span><strong>${fmtDuration(m.mttd)}</strong></div><div class="kpi"><span>MTTC</span><strong>${fmtDuration(m.mttc)}</strong></div>
          <div class="kpi"><span>MTTR</span><strong>${fmtDuration(m.mttr)}</strong></div>
          <div class="kpi"><span>Com dados pessoais</span><strong>${personal}</strong><small>${records.toLocaleString('pt-BR')} registros afetados</small></div>
          <div class="kpi"><span>Impacto estimado</span><strong>R$ ${cost.toLocaleString('pt-BR')}</strong></div>
          <div class="kpi"><span>Notificações em atraso</span><strong class="${late.length ? 'txt-late' : ''}">${late.length}</strong><small>${notif.length} obrigações</small></div>
        </div>
        <div class="grid2"><section><h2>Por categoria</h2>${cats.length ? html`<div class="hbars">${cats.map(([c, n]) => html`<div class="hbar"><span>${c}</span><div class="bar"><span style="width:${(n / maxCat) * 100}%"></span></div><b>${n}</b></div>`)}</div>` : empty('Sem dados.')}</section>
        <section><h2>Por estado</h2><div class="hbars">${STATUSES.map((s) => html`<div class="hbar"><span>${s.name}</span><div class="bar"><span class="st-bg-${s.id}" style="width:${(m.byStatus[s.id] / Math.max(1, m.total)) * 100}%"></span></div><b>${m.byStatus[s.id]}</b></div>`)}</div></section></div>
        <h2>Incidentes de maior severidade</h2>
        ${table(['ID', 'Título', 'Severidade', 'Estado', 'Declarado', 'Líder'], list.filter((i) => ['S1', 'S2'].includes(i.severity)).map((i) => [link(i), i.title, sevBadge(i.severity), statusBadge(i.status), fmtDate(i.declaredAt), who(db, i.roles.lead)]))}`,
      rows: [['id', 'titulo', 'categoria', 'severidade', 'estado', 'declarado', 'dados_pessoais', 'registros', 'impacto_rs'], ...list.map((i) => [i.id, i.title, i.category, i.severity, i.status, i.declaredAt, i.personalData ? 'sim' : 'nao', i.magnitude?.records ?? '', i.magnitude?.financial ?? ''])],
    };
  },
  operacional(db, list) {
    const now = new Date();
    const rows = list.map((i) => {
      const sla = slaStatus(i, db.sla, now);
      return { i, d: diff(i.occurredAt, i.detectedAt), c: diff(i.declaredAt, i.containedAt), r: diff(i.declaredAt, i.recoveredAt), sla };
    });
    const slaCell = (s) => html`<span class="${s.late ? 'txt-late' : s.done ? 'txt-ok' : 'muted'}">${s.done ? (s.late ? 'fora' : 'ok') : s.late ? 'estourado' : 'em curso'}</span>`;
    const comp = (k) => { const x = rows.map((r) => r.sla.find((s) => s.key === k)).filter((s) => s.done); return x.length ? Math.round((x.filter((s) => !s.late).length / x.length) * 100) : null; };
    return {
      body: html`<div class="kpis">${[['triage', 'Triagem'], ['contain', 'Contenção'], ['recover', 'Recuperação']].map(([k, l]) => html`<div class="kpi"><span>SLA de ${l.toLowerCase()} cumprido</span><strong>${comp(k) == null ? '—' : comp(k) + '%'}</strong></div>`)}
          <div class="kpi"><span>Tempo médio até detecção</span><strong>${fmtDuration(avg(rows.map((r) => r.d)))}</strong></div></div>
        ${table(['ID', 'Sev.', 'Estado', 'Até detecção', 'Até contenção', 'Até recuperação', 'SLA triagem', 'SLA contenção', 'SLA recuperação', 'Tarefas'],
          rows.map(({ i, d, c, r, sla }) => [link(i), i.severity, statusById[i.status].name, fmtDuration(d), fmtDuration(c), fmtDuration(r), ...sla.map(slaCell), `${i.tasks.filter((t) => t.status === 'concluida').length}/${i.tasks.length}`]))}`,
      rows: [['id', 'severidade', 'estado', 'ms_ate_deteccao', 'ms_ate_contencao', 'ms_ate_recuperacao', 'sla_triagem', 'sla_contencao', 'sla_recuperacao'], ...rows.map(({ i, d, c, r, sla }) => [i.id, i.severity, i.status, d ?? '', c ?? '', r ?? '', ...sla.map((s) => (s.done ? (s.late ? 'fora' : 'ok') : s.late ? 'estourado' : 'em_curso'))])],
    };
  },
  conformidade(db, list) {
    const agg = SUBCATEGORIES.map((s) => { const n = list.filter((i) => i.csf?.[s.id]?.done).length; return { s, n, pct: list.length ? Math.round((n / list.length) * 100) : 0 }; });
    return {
      body: html`<h2>Aderência por incidente</h2>
        ${table(['ID', 'Título', 'Estado', 'Progresso', '%'], list.map((i) => { const p = csfProgress(i); return [link(i), i.title, statusById[i.status].name, bar(p.pct), `${p.done}/${p.total} (${p.pct}%)`]; }))}
        <h2>Aderência por subcategoria</h2>
        ${table(['Subcategoria', 'Descrição', 'Categoria', 'Incidentes atendidos', ''], agg.map(({ s, n, pct }) => [fnBadge(s.id), s.text, CATEGORIES[s.id.slice(0, 5)], `${n}/${list.length}`, bar(pct)]))}`,
      rows: [['subcategoria', 'descricao', 'atendidos', 'total', 'pct'], ...agg.map(({ s, n, pct }) => [s.id, s.text, n, list.length, pct])],
    };
  },
  regulatorio(db, list) {
    const all = list.flatMap((i) => notificationStatus(i, db.regulations).map((n) => ({ i, ...n })));
    return {
      body: html`<p class="small muted">Somente regras habilitadas em Configurações. Prazos em dias úteis não consideram feriados.</p>
        ${table(['Incidente', 'Obrigação', 'Destinatário', 'Início da contagem', 'Prazo', 'Estado', 'Envio / justificativa'], all.map((n) => [link(n.i), n.reg.name, n.reg.authority, fmtDate(n.start), fmtDate(n.due),
          html`<span class="badge ns ns-${n.state.replace(/\s/g, '-')}">${n.state}</span>`, n.rec.sentAt ? `${fmtDate(n.rec.sentAt)}${n.rec.ref ? ' · ' + n.rec.ref : ''}` : n.rec.reason || '—']))}`,
      rows: [['incidente', 'obrigacao', 'destinatario', 'inicio', 'prazo', 'estado', 'enviado_em', 'protocolo', 'justificativa'], ...all.map((n) => [n.i.id, n.reg.name, n.reg.authority, n.start, n.due, n.state, n.rec.sentAt || '', n.rec.ref || '', n.rec.reason || ''])],
    };
  },
  indicadores(db, list) {
    const all = list.flatMap((i) => i.iocs.map((x) => ({ i, x })));
    const dup = all.reduce((m, { x }) => { m[x.value] = (m[x.value] || 0) + 1; return m; }, {});
    return {
      body: html`<p class="small muted">${all.length} indicador(es). Valores vistos em mais de um incidente estão destacados — possível campanha ou ator recorrente.</p>
        ${table(['Tipo', 'Valor', 'Descrição', 'TLP', 'Incidente', 'Visto em'], all.map(({ i, x }) => [x.type, html`<code class="wrap ${dup[x.value] > 1 ? 'hl' : ''}">${x.value}</code>`, x.desc, `TLP:${x.tlp}`, link(i), fmtDate(x.firstSeen)]))}`,
      rows: [['tipo', 'valor', 'descricao', 'tlp', 'incidente', 'visto_em'], ...all.map(({ i, x }) => [x.type, x.value, x.desc, x.tlp, i.id, x.firstSeen])],
    };
  },
  equipe(db, list) {
    const now = new Date();
    const rows = db.contacts.map((c) => {
      const incs = list.filter((i) => teamIds(i).includes(c.id));
      const tasks = list.flatMap((i) => i.tasks.filter((t) => t.owner === c.id));
      const open = tasks.filter((t) => t.status !== 'concluida');
      return { c, incs, lead: list.filter((i) => i.roles.lead === c.id).length, open: open.length, late: open.filter((t) => t.due && new Date(t.due) < now).length, done: tasks.length - open.length };
    }).filter((r) => r.incs.length || r.open || r.done);
    return {
      body: table(['Pessoa', 'Área', 'Incidentes', 'Como líder', 'Tarefas abertas', 'Atrasadas', 'Concluídas'], rows.map((r) => [html`<b>${r.c.name}</b>`, r.c.org, r.incs.map((i) => i.id).join(', '), r.lead, r.open, r.late ? html`<b class="txt-late">${r.late}</b>` : 0, r.done])),
      rows: [['pessoa', 'area', 'incidentes', 'lider', 'abertas', 'atrasadas', 'concluidas'], ...rows.map((r) => [r.c.name, r.c.org, r.incs.map((i) => i.id).join(' '), r.lead, r.open, r.late, r.done])],
    };
  },
  tecnologias(db, list) {
    const cov = techCoverage(db.technologies.filter((t) => ['operacional', 'degradado'].includes(t.status)));
    const stale = db.processes.filter((p) => !p.reviewedAt || Date.now() - new Date(p.reviewedAt) > 365 * 864e5);
    return {
      body: html`<h2>Cobertura por Função</h2><div class="coverage">${FUNCTIONS.map((f) => html`<div class="cov ${cov[f.id].length ? '' : 'gap'}" style="--c:${f.color}"><b>${f.id}</b><span>${f.name}</span><strong>${cov[f.id].length}</strong></div>`)}</div>
        <h2>Tecnologias</h2>${table(['Tecnologia', 'Categoria', 'Estado', 'Responsável', 'Usada em'], db.technologies.map((t) => [t.name, t.category, TECH_STATUS[t.status], who(db, t.owner) || '—', list.filter((i) => i.tools?.includes(t.id)).map((i) => i.id).join(', ') || '—']))}
        <h2>Processos e procedimentos</h2>${table(['Processo', 'Dono', 'Versão', 'Última revisão', 'Procedimentos'], db.processes.map((p) => [p.name, who(db, p.owner) || '—', p.version, html`${fmtDate(p.reviewedAt, false)}${stale.includes(p) ? html` <b class="txt-late">revisar</b>` : ''}`, db.procedures.filter((x) => x.process === p.id).map((x) => `${x.name} v${x.version}`).join(' · ') || '—']))}`,
      rows: [['tecnologia', 'categoria', 'estado', 'funcoes', 'incidentes'], ...db.technologies.map((t) => [t.name, t.category, t.status, (t.functions || []).join(' '), list.filter((i) => i.tools?.includes(t.id)).length])],
    };
  },
  melhorias(db, list) {
    const ids = new Set(list.map((i) => i.id));
    const imps = db.improvements.filter((p) => !p.source?.startsWith('INC-') || ids.has(p.source));
    return {
      body: html`<h2>Causas raiz e lições</h2>
        ${table(['Incidente', 'Causa raiz', 'O que melhorar', 'Reunião'], list.filter((i) => i.analysis?.rootCause || i.lessons?.improve).map((i) => [link(i), i.analysis.rootCause || '—', i.lessons.improve || '—', fmtDate(i.lessons.meetingAt, false)]))}
        <h2>Backlog de melhorias</h2>
        ${table(['Melhoria', 'Origem', 'CSF', 'Prioridade', 'Responsável', 'Prazo', 'Estado'], imps.map((p) => [p.title, p.source || '—', p.csf || '—', p.priority, who(db, p.owner) || '—', fmtDate(p.due, false), p.status]))}`,
      rows: [['melhoria', 'origem', 'csf', 'prioridade', 'responsavel', 'prazo', 'estado'], ...imps.map((p) => [p.title, p.source, p.csf, p.priority, who(db, p.owner), p.due, p.status])],
    };
  },
  incidentes(db, list) {
    return {
      body: table(['ID', 'Título', 'Severidade', 'Estado', 'Declarado', ''], list.map((i) => [link(i), i.title, sevBadge(i.severity), statusBadge(i.status), fmtDate(i.declaredAt), html`<a class="btn sm" href="#/incidente/${i.id}/relatorio">${ic('print')} Abrir relatório</a>`])),
      rows: [['id', 'titulo', 'severidade', 'estado', 'declarado'], ...list.map((i) => [i.id, i.title, i.severity, i.status, i.declaredAt])],
    };
  },
};

const who = (db, id) => db.contacts.find((c) => c.id === id)?.name || '';
const link = (i) => html`<a href="#/incidente/${i.id}">${i.id}</a>`;
function table(head, rows) {
  if (!rows.length) return empty('Sem dados no período.');
  return html`<div class="table-wrap"><table class="tbl"><thead><tr>${head.map((h) => html`<th>${h}</th>`)}</tr></thead><tbody>${rows.map((r) => html`<tr>${r.map((c) => html`<td>${c}</td>`)}</tr>`)}</tbody></table></div>`;
}

export default {
  title: ([id]) => `Relatório ${REPORTS.find((r) => r.id === id)?.name || ''}`.trim(),
  render([id], ctx) {
    const db = store.get();
    const r = REPORTS.find((x) => x.id === id);
    if (!r) {
      return html`<div class="page">
        <div class="page-head"><div><h1>Relatórios</h1><p class="muted">Relatórios gerenciais e de conformidade, com filtro por período, impressão em PDF e exportação CSV.</p></div></div>
        <div class="cards">${REPORTS.map((x) => html`<a class="card link report-card" href="#/relatorios/${x.id}"><span class="rc-ic">${ic(x.icon)}</span><div><h3>${x.name}</h3><p class="muted small">${x.desc}</p></div></a>`)}</div>
      </div>`;
    }
    const out = BUILD[r.id](db, period(db, ctx.query), ctx.query);
    return frame(db, r, ctx.query, out.body);
  },
  mount(el, [id], ctx) {
    const db = store.get();
    const form = el.querySelector('#period');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = new URLSearchParams();
      if (form.de.value) q.set('de', form.de.value);
      if (form.ate.value) q.set('ate', form.ate.value);
      ctx.go(`#/relatorios/${id}${q.toString() ? '?' + q : ''}`);
    });
    el.querySelector('[data-act=csv]')?.addEventListener('click', () => {
      const out = BUILD[id](db, period(db, ctx.query), ctx.query);
      download(`relatorio-${id}.csv`, toCSV(out.rows), 'text/csv');
      store.audit('Relatório exportado', id); store.persist();
    });
  },
};
