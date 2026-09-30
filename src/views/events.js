// Detectar: fila de eventos adversos (DE.CM / DE.AE) e declaração de incidentes (DE.AE-08).
import * as store from '../core/store.js';
import { html } from '../core/util.js';
import { CATEGORIES_INCIDENT } from '../core/nist.js';
import { sectionTabs, playbookTasks } from './incidents.js';
import { PLAYBOOKS } from '../data/playbooks.js';
import { ic, field, input, dt, textarea, select, modal, toast, when, empty, confirmBox } from '../ui.js';

const SOURCES = ['SIEM', 'EDR/XDR', 'IDS/IPS', 'Firewall', 'Gateway de e-mail', 'CSPM/Nuvem', 'DLP', 'Relato de usuário', 'Terceiro / fornecedor', 'CTI / ISAC', 'CERT / autoridade', 'Varredura de vulnerabilidades', 'Outro'];
const EV_STATUS = { novo: 'Novo', analise: 'Em análise', descartado: 'Descartado (benigno / falso positivo)', declarado: 'Incidente declarado' };
const SEV_HINT = ['baixa', 'media', 'alta', 'critica'];

// Só o essencial; o restante fica recolhido.
function eventForm(e = {}, db) {
  return html`<div class="form-grid">
    <div class="span2">${field('O que foi observado?', input('title', e.title, 'required'))}</div>
    ${field('Fonte', select('source', SOURCES, e.source || 'SIEM'))}
    ${field('Severidade inicial', select('severity', SEV_HINT.map((v) => ({ v, t: v[0].toUpperCase() + v.slice(1) })), e.severity || 'media'))}
    <details class="more span2"><summary>Mais detalhes (opcional)</summary><div class="form-grid">
      <div class="span2">${field('Descrição', textarea('description', e.description, 'rows="3"'))}</div>
      ${field('Observado em', dt('observedAt', e.observedAt || new Date().toISOString(), 'required'))}
      ${field('Relatado por', input('reporter', e.reporter))}
      ${field('Ativo relacionado', select('asset', [{ v: '', t: '—' }, ...db.assets.map((a) => ({ v: a.id, t: a.name }))], e.asset))}
    </div></details>
  </div>`;
}

export default {
  title: () => 'Eventos adversos',
  render(_, ctx) {
    const db = store.get();
    const f = ctx.query.get('f') || 'ativos';
    const list = db.events.filter((e) => (f === 'ativos' ? ['novo', 'analise'].includes(e.status) : f === 'todos' ? true : e.status === f))
      .sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt));
    const tab = (id, label) => html`<a class="${f === id ? 'on' : ''}" href="#/eventos?f=${id}">${label}</a>`;
    return html`<div class="page">
      <div class="page-head">
        <div><h1>Incidentes</h1><p class="muted">Eventos adversos aguardando triagem. Declare incidente quando os critérios forem atendidos (DE.AE-08).</p></div>
        <button class="btn primary" data-act="new">${ic('plus')} Novo evento</button>
      </div>
      ${sectionTabs('eventos', db)}
      <div class="seg subseg">${tab('ativos', 'Na fila')}${tab('declarado', 'Declarados')}${tab('descartado', 'Descartados')}${tab('todos', 'Todos')}</div>
      ${list.length ? html`<div class="cards">${list.map((e) => {
        const asset = db.assets.find((a) => a.id === e.asset);
        return html`<article class="card ev ev-${e.severity}">
          <div class="card-head"><div><span class="mono muted">${e.id}</span> <span class="badge">${EV_STATUS[e.status]}</span> <span class="badge ghost">${e.source}</span></div>
            <span class="muted small">${when(e.observedAt)}</span></div>
          <h3>${e.title}</h3>
          <p>${e.description}</p>
          ${asset ? html`<p class="small muted">Ativo: ${asset.name}</p>` : ''}
          ${e.notes ? html`<p class="small"><b>Análise:</b> ${e.notes}</p>` : ''}
          ${e.related?.length ? html`<p class="small muted">Correlacionado com: ${e.related.join(', ')}</p>` : ''}
          <div class="row">
            ${e.status === 'declarado' && e.incident ? html`<a class="btn sm" href="#/incidente/${e.incident}">Abrir ${e.incident}</a>` : html`
              <button class="btn sm" data-act="triage" data-id="${e.id}">Triar / analisar</button>
              <button class="btn sm primary" data-act="declare" data-id="${e.id}">Declarar incidente</button>
              ${e.status !== 'descartado' ? html`<button class="btn sm ghost" data-act="discard" data-id="${e.id}">Descartar</button>` : ''}`}
          </div>
        </article>`;
      })}</div>` : empty('Nenhum evento nesta visão.', html`<button class="btn" data-act="new">Registrar evento</button>`)}
    </div>`;
  },
  mount(el, _, ctx) {
    const db = store.get();
    const find = (id) => db.events.find((e) => e.id === id);
    el.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const e = find(b.dataset.id);
      if (b.dataset.act === 'new') {
        modal('Novo evento adverso', eventForm({}, db), {
          onSubmit: (d) => {
            const item = { id: store.nextEventId(), status: 'novo', notes: '', related: [], criteria: [], ...d };
            db.events.unshift(item);
            store.audit('Evento registrado', item.id, item.title);
            store.persist(); ctx.rerender(); toast('Evento registrado.');
          },
        });
      }
      if (b.dataset.act === 'triage') {
        const others = db.events.filter((x) => x.id !== e.id).map((x) => ({ v: x.id, t: `${x.id} — ${x.title}` }));
        modal(`Triagem — ${e.id}`, html`<p class="muted">${e.title}</p>
          ${field('Notas de análise', textarea('notes', e.notes, 'rows="3" placeholder="O que foi verificado, contexto, CTI…"'))}
          <fieldset class="criteria"><legend>Critérios de incidente atendidos</legend>
            ${db.org.incidentCriteria.map((c, i) => html`<label class="chk"><input type="checkbox" name="crit${i}" ${e.criteria?.includes(c) ? 'checked' : ''}> ${c}</label>`)}
          </fieldset>
          <details class="more"><summary>Correlacionar com outros eventos</summary>${field('Eventos relacionados (DE.AE-03)', select('related', others, '', `multiple size="4"`), 'Ctrl/⌘ + clique para vários')}</details>
          </fieldset>`, {
          wide: true,
          onSubmit: (d) => {
            const criteria = db.org.incidentCriteria.filter((_, i) => d[`crit${i}`]);
            Object.keys(d).filter((k) => k.startsWith('crit')).forEach((k) => delete d[k]);
            Object.assign(e, d, { status: 'analise', criteria, related: [...new Set([...(e.related || []), ...(d.related || [])])] });
            store.audit('Evento triado', e.id, e.status);
            store.persist(); ctx.rerender();
            if (criteria.length) toast('Critérios de incidente atendidos — considere declarar o incidente.', 'warn');
          },
        });
        // Pré-seleciona correlações existentes.
        document.querySelectorAll('dialog select[name=related] option').forEach((o) => { o.selected = e.related?.includes(o.value); });
      }
      if (b.dataset.act === 'discard') {
        modal(`Descartar ${e.id}`, field('Justificativa (benigno, falso positivo, duplicado…)', textarea('notes', e.notes, 'required rows="3"')), {
          submitLabel: 'Descartar',
          onSubmit: (d) => { e.status = 'descartado'; e.notes = d.notes; store.audit('Evento descartado', e.id, d.notes); store.persist(); ctx.rerender(); },
        });
      }
      if (b.dataset.act === 'declare') {
        modal(`Declarar incidente a partir de ${e.id}`, html`${field('Título do incidente', input('title', e.title, 'required'))}
          ${field('Tipo', select('category', CATEGORIES_INCIDENT, 'Outro'))}
          <input type="hidden" name="description" value="${e.description || ''}">`, {
          submitLabel: 'Declarar',
          onSubmit: async (d) => {
            const now = new Date().toISOString();
            const related = (e.related || []).map(find).filter(Boolean);
            const pb = PLAYBOOKS.find((p) => p.category === d.category);
            const roles = store.defaultRoles();
            const inc = await store.createIncident({
              ...d, roles, ...(pb ? { playbooks: [pb.id], tasks: playbookTasks(pb.id).map((k) => ({ ...k, owner: roles[k.role] || roles.handler || '' })) } : {}), detectedAt: e.observedAt, declaredAt: now, awareAt: now,
              assets: [...new Set([e.asset, ...related.map((r) => r.asset)].filter(Boolean))],
              sourceEvents: [e.id, ...related.map((r) => r.id)],
              csf: { 'DE.AE-08': { done: true, at: now, note: e.criteria?.join('; ') || '' }, ...(e.notes ? { 'DE.AE-02': { done: true, at: now, note: e.notes } } : {}), ...(related.length ? { 'DE.AE-03': { done: true, at: now, note: '' } } : {}) },
            });
            await store.addTimeline(inc, { at: e.observedAt, type: 'deteccao', text: `Evento ${e.id} (${e.source}): ${e.title}` });
            for (const r of [e, ...related]) { r.status = 'declarado'; r.incident = inc.id; }
            store.persist();
            ctx.go(`#/incidente/${inc.id}/tarefas`);
          },
        });
      }
    });
  },
};
