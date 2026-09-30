// Lista de incidentes (tabela e quadro) e formulário de declaração.
import * as store from '../core/store.js';
import { html, download, toCSV } from '../core/util.js';
import { STATUSES, CATEGORIES_INCIDENT, TLP } from '../core/nist.js';
import { FACTORS, SEVERITIES, computeSeverity, priorityScore, csfProgress } from '../core/engine.js';
import { PLAYBOOKS, playbookById } from '../data/playbooks.js';
import { unpackFiles } from '../core/files.js';
import { procedureTask } from './reader.js';
import { ic, toast, confirmBox, sevBadge, statusBadge, when, field, input, dt, textarea, select, formData, empty, bar, tlpBadge } from '../ui.js';

export function factorFields(inc) {
  return html`${Object.entries(FACTORS).map(([k, f]) => field(f.label, select(k, f.opts.map((t, v) => ({ v, t: `${v} — ${t}` })), inc[k] ?? 0, 'data-type="number"')))}`;
}

// Abas compartilhadas entre Incidentes e a fila de eventos adversos.
export function sectionTabs(cur, db) {
  const pend = db.events.filter((e) => e.status === 'novo' || e.status === 'analise').length;
  return html`<nav class="tabs"><a class="tab ${cur === 'incidentes' ? 'on' : ''}" href="#/incidentes">${ic('alert')} Incidentes</a>
    <a class="tab ${cur === 'eventos' ? 'on' : ''}" href="#/eventos">${ic('radar')} Fila de eventos${pend ? html` <em>${pend}</em>` : ''}</a></nav>`;
}

export function playbookTasks(pbId) {
  const pb = playbookById[pbId];
  return pb ? pb.steps.map((s, n) => ({ id: `pb-${pbId}-${n}-${Math.random().toString(36).slice(2, 6)}`, title: s.title, detail: s.detail, role: s.role, phase: s.phase, csf: s.csf, owner: '', due: null, status: 'aberta', playbook: pbId })) : [];
}

function newForm(db, q) {
  const now = new Date().toISOString();
  return html`<div class="page">
    <div class="page-head"><div><h1>Declarar incidente</h1><p class="muted">Registre, categorize e priorize (DE.AE-08, RS.MA-02, RS.MA-03).</p></div></div>
    <form class="card" id="newinc">
      <div class="form-grid">
        <div class="span2">${field('Título', input('title', '', 'required placeholder="Ex.: Ransomware no servidor de arquivos"'))}</div>
        ${field('Categoria', select('category', CATEGORIES_INCIDENT, playbookById[q.get('pb')]?.category || 'Outro'))}
        ${field('Playbook', select('playbook', [{ v: '', t: '— nenhum —' }, ...PLAYBOOKS.map((p) => ({ v: p.id, t: p.name }))], q.get('pb') || ''), 'As etapas viram tarefas do incidente.')}
        <div class="span2">${field('Descrição', textarea('description', '', 'rows="3"'))}</div>
        ${field('Primeira atividade maliciosa (se conhecida)', dt('occurredAt', null))}
        ${field('Detectado em', dt('detectedAt', now, 'required'))}
        ${field('Declarado em', dt('declaredAt', now, 'required'))}
        ${field('TLP', select('tlp', TLP, 'AMBER'))}
      </div>
      <h3>Priorização</h3>
      <div class="form-grid">${factorFields({})}
        ${field('Ativos afetados', select('assets', db.assets.map((a) => ({ v: a.id, t: `${a.name} (${a.criticality})` })), '', 'multiple size="4"'), 'Ativos de criticalidade alta elevam a prioridade.')}
        <label class="chk span2"><input type="checkbox" name="personalData"> Envolve dados pessoais (aciona prazos LGPD/GDPR habilitados)</label>
      </div>
      <p>Severidade calculada: <span id="sevprev"></span> <span class="muted small" id="scoreprev"></span></p>
      <div class="row"><button class="btn primary">${ic('alert')} Declarar incidente</button><a class="btn ghost" href="#/incidentes">Cancelar</a></div>
    </form>
  </div>`;
}

export default {
  title: (p) => (p[0] === 'novo' ? 'Declarar incidente' : 'Incidentes'),
  render([sub], ctx) {
    const db = store.get();
    if (sub === 'novo') return newForm(db, ctx.query);
    const q = ctx.query;
    const view = q.get('v') || 'lista';
    const fs = q.get('status') || '', fsev = q.get('sev') || '', fcat = q.get('cat') || '';
    let list = db.incidents.filter((i) => (!fs || i.status === fs) && (!fsev || i.severity === fsev) && (!fcat || i.category === fcat));
    list = list.sort((a, b) => a.severity.localeCompare(b.severity) || new Date(b.declaredAt) - new Date(a.declaredAt));
    const link = (k, v) => { const n = new URLSearchParams(q); v ? n.set(k, v) : n.delete(k); return `#/incidentes?${n}`; };
    return html`<div class="page">
      <div class="page-head">
        <div><h1>Incidentes</h1><p class="muted">${list.length} incidente(s) no filtro atual</p></div>
        <div class="row">
          <label class="btn" title="Importar pacote .blade.json exportado de outro navegador">${ic('upload')} Importar pacote<input type="file" accept=".json,application/json" id="pkgin" hidden></label>
          <button class="btn" data-act="csv">${ic('down')} CSV</button>
          <a class="btn primary" href="#/incidentes/novo">${ic('plus')} Declarar incidente</a>
        </div>
      </div>
      ${sectionTabs('incidentes', db)}
      <div class="filters">
        <div class="seg"><a class="${view === 'lista' ? 'on' : ''}" href="${link('v', '')}">${ic('list')} Lista</a><a class="${view === 'quadro' ? 'on' : ''}" href="${link('v', 'quadro')}">${ic('board')} Quadro</a></div>
        <select data-filter="status">${[{ v: '', t: 'Todos os estados' }, ...STATUSES.map((s) => ({ v: s.id, t: s.name }))].map((o) => html`<option value="${o.v}" ${o.v === fs ? 'selected' : ''}>${o.t}</option>`)}</select>
        <select data-filter="sev">${[{ v: '', t: 'Todas as severidades' }, ...SEVERITIES.map((s) => ({ v: s.id, t: `${s.id} · ${s.name}` }))].map((o) => html`<option value="${o.v}" ${o.v === fsev ? 'selected' : ''}>${o.t}</option>`)}</select>
        <select data-filter="cat">${[{ v: '', t: 'Todas as categorias' }, ...CATEGORIES_INCIDENT.map((c) => ({ v: c, t: c }))].map((o) => html`<option value="${o.v}" ${o.v === fcat ? 'selected' : ''}>${o.t}</option>`)}</select>
      </div>
      ${!list.length ? empty('Nenhum incidente encontrado.') : view === 'quadro' ? html`<div class="board">${STATUSES.map((s) => {
        const col = list.filter((i) => i.status === s.id);
        return html`<div class="col"><h3>${s.name} <em>${col.length}</em></h3>${col.map((i) => html`<a class="bcard sevl-${i.severity}" href="#/incidente/${i.id}">
          <span class="mono small">${i.id}</span><strong>${i.title}</strong><span class="row">${sevBadge(i.severity)}</span><small class="muted">${i.category}</small></a>`)}</div>`;
      })}</div>` : html`<div class="card"><div class="table-wrap"><table class="tbl">
        <thead><tr><th>ID</th><th>Título</th><th>Categoria</th><th>Severidade</th><th>Estado</th><th>Líder</th><th>TLP</th><th>CSF</th><th>Declarado</th></tr></thead>
        <tbody>${list.map((i) => { const p = csfProgress(i); return html`<tr>
          <td><a href="#/incidente/${i.id}">${i.id}</a></td><td>${i.title}</td><td>${i.category}</td><td>${sevBadge(i.severity)}</td>
          <td>${statusBadge(i.status)}</td><td>${db.contacts.find((c) => c.id === i.roles.lead)?.name || '—'}</td><td>${tlpBadge(i.tlp)}</td><td style="min-width:90px">${bar(p.pct)}</td><td>${when(i.declaredAt)}</td></tr>`; })}</tbody>
      </table></div></div>`}
    </div>`;
  },
  mount(el, [sub], ctx) {
    const db = store.get();
    if (sub === 'novo') {
      const form = el.querySelector('#newinc');
      const upd = () => {
        const d = formData(form);
        const s = computeSeverity(d, db.assets);
        el.querySelector('#sevprev').innerHTML = String(sevBadge(s));
        el.querySelector('#scoreprev').textContent = `(pontuação ${priorityScore(d, db.assets)}/12)`;
      };
      form.addEventListener('change', upd); upd();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { playbook, ...d } = formData(form);
        d.awareAt = d.declaredAt;
        d.csf = { 'DE.AE-08': { done: true, at: d.declaredAt, note: '' }, 'RS.MA-03': { done: true, at: d.declaredAt, note: 'Priorizado na declaração' } };
        if (playbook) { d.playbooks = [playbook]; d.tasks = playbookTasks(playbook); }
        const pop = db.procedures.find((p) => p.id === ctx.query.get('pop'));
        if (pop) d.tasks = [...(d.tasks || []), procedureTask(pop, { roles: {}, status: 'triagem' })];
        const inc = await store.createIncident(d);
        ctx.go(`#/incidente/${inc.id}`);
      });
      return;
    }
    el.querySelectorAll('[data-filter]').forEach((s) => s.addEventListener('change', () => {
      const n = new URLSearchParams(ctx.query);
      s.value ? n.set(s.dataset.filter, s.value) : n.delete(s.dataset.filter);
      ctx.go(`#/incidentes?${n}`);
    }));
    el.querySelector('#pkgin')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const pkg = JSON.parse(await file.text());
        if (pkg.kind !== 'blade-incident-package' || !pkg.incident?.id) throw new Error('Arquivo não é um pacote de incidente da Blade.');
        const inc = pkg.incident;
        const exists = store.incident(inc.id);
        if (exists && !(await confirmBox('Incidente já existe', `${inc.id} já existe neste navegador. Substituir pela versão do pacote?`, { danger: true, label: 'Substituir' }))) return;
        await unpackFiles(pkg.files, inc.attachments);
        db.incidents = [inc, ...db.incidents.filter((x) => x.id !== inc.id)];
        const n = Number(inc.id.split('-').pop()); if (n > db.seq.inc) db.seq.inc = n;
        store.audit('Pacote de incidente importado', inc.id, `${pkg.files?.length || 0} arquivo(s), exportado por ${pkg.exportedBy || '?'}`); store.persist();
        toast(`${inc.id} importado com ${pkg.files?.length || 0} arquivo(s).`);
        ctx.go(`#/incidente/${inc.id}`);
      } catch (err) { toast(err.message, 'err'); }
    });
    el.querySelector('[data-act=csv]')?.addEventListener('click', () => {
      const rows = [['ID', 'Título', 'Categoria', 'Severidade', 'Estado', 'TLP', 'Ocorrido', 'Detectado', 'Declarado', 'Contido', 'Erradicado', 'Recuperado', 'Encerrado']];
      for (const i of db.incidents) rows.push([i.id, i.title, i.category, i.severity, i.status, i.tlp, i.occurredAt, i.detectedAt, i.declaredAt, i.containedAt, i.eradicatedAt, i.recoveredAt, i.closedAt]);
      download('incidentes.csv', toCSV(rows), 'text/csv');
    });
  },
};
