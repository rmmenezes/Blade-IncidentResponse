// Lista de incidentes (tabela e quadro) e formulário de declaração.
import * as store from '../core/store.js';
import { html, download, toCSV } from '../core/util.js';
import { STATUSES, CATEGORIES_INCIDENT, TLP } from '../core/nist.js';
import { SEVERITIES, computeSeverity, csfProgress } from '../core/engine.js';
import { PLAYBOOKS, playbookById } from '../data/playbooks.js';
import { unpackFiles } from '../core/files.js';
import { procedureTask } from './reader.js';
import { art } from '../art.js';
import { raw } from '../core/util.js';
import { ic, toast, confirmBox, sevBadge, statusBadge, when, field, input, dt, textarea, select, formData, empty, bar, tlpBadge } from '../ui.js';

export function playbookTasks(pbId) {
  const pb = playbookById[pbId];
  return pb ? pb.steps.map((s, n) => ({ id: `pb-${pbId}-${n}-${Math.random().toString(36).slice(2, 6)}`, title: s.title, detail: s.detail, role: s.role, phase: s.phase, csf: s.csf, owner: '', due: null, status: 'aberta', playbook: pbId })) : [];
}

// Impacto rápido → fatores de priorização (ajustáveis depois no incidente).
const IMPACT = {
  baixo: { label: 'Baixo', hint: 'pouco efeito no negócio', f: [0, 0, 0, 0] },
  medio: { label: 'Médio', hint: 'afeta parte de um serviço', f: [1, 1, 1, 0] },
  alto: { label: 'Alto', hint: 'serviço crítico afetado', f: [2, 2, 1, 1] },
  critico: { label: 'Crítico', hint: 'operação comprometida', f: [3, 2, 2, 2] },
};

function newForm(db, q) {
  const now = new Date().toISOString();
  const pb0 = q.get('pb') || '';
  return html`<div class="page narrow">
    <div class="page-head"><div><h1>Declarar incidente</h1><p class="muted">Três escolhas e pronto — o resto pode ser completado depois.</p></div></div>
    <form class="card" id="newinc">
      ${field('1. O que está acontecendo?', input('title', '', 'required placeholder="Ex.: Arquivos criptografados no servidor de arquivos" autofocus'))}
      <p class="lbl">2. Tipo de incidente <span class="muted">(aplica o playbook correspondente)</span></p>
      <div class="type-grid">${PLAYBOOKS.map((p) => html`<button type="button" class="type-opt ${p.id === pb0 ? 'on' : ''}" data-pb="${p.id}" data-cat="${p.category}" style="--bk:${p.color}"><span class="type-art">${raw(art(p.art))}</span>${p.short || p.name}</button>`)}
        <button type="button" class="type-opt ${pb0 ? '' : 'on'}" data-pb="" data-cat="Outro" style="--bk:#667085"><span class="type-art">${raw(art('radar'))}</span>Outro / ainda não sei</button></div>
      <input type="hidden" name="playbook" value="${pb0}"><input type="hidden" name="category" value="${playbookById[pb0]?.category || 'Outro'}">
      <p class="lbl">3. Impacto</p>
      <div class="impact">${Object.entries(IMPACT).map(([k, v]) => html`<button type="button" class="imp-opt imp-${k} ${k === 'medio' ? 'on' : ''}" data-imp="${k}"><b>${v.label}</b><small>${v.hint}</small></button>`)}</div>
      <input type="hidden" name="impact" value="medio">
      <label class="chk"><input type="checkbox" name="personalData"> Envolve dados pessoais</label>
      <details class="more"><summary>Mais detalhes (opcional)</summary><div class="form-grid">
        <div class="span2">${field('Descrição', textarea('description', '', 'rows="3"'))}</div>
        ${field('Detectado em', dt('detectedAt', now, 'required'))}
        ${field('Primeira atividade maliciosa', dt('occurredAt', null))}
        ${field('TLP', select('tlp', TLP, 'AMBER'))}
        ${field('Ativos afetados', select('assets', db.assets.map((a) => ({ v: a.id, t: `${a.name} (${a.criticality})` })), '', 'multiple size="4"'))}
      </div></details>
      <div class="submit-row"><span>Severidade: <span id="sevprev"></span></span><span class="spacer"></span><a class="btn ghost" href="#/incidentes">Cancelar</a><button class="btn primary lg">${ic('alert')} Declarar incidente</button></div>
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
      const factors = () => { const f = IMPACT[form.impact.value].f; return { functional: f[0], information: Math.max(f[1], form.personalData.checked ? 2 : 0), recoverability: f[2], scope: f[3] }; };
      const upd = () => { el.querySelector('#sevprev').innerHTML = String(sevBadge(computeSeverity(factors(), db.assets))); };
      form.addEventListener('click', (e) => {
        const b = e.target.closest('button[type=button]'); if (!b) return;
        if (b.dataset.pb !== undefined) { form.playbook.value = b.dataset.pb; form.category.value = b.dataset.cat; form.querySelectorAll('.type-opt').forEach((x) => x.classList.toggle('on', x === b)); }
        if (b.dataset.imp) { form.impact.value = b.dataset.imp; form.querySelectorAll('.imp-opt').forEach((x) => x.classList.toggle('on', x === b)); upd(); }
      });
      form.addEventListener('change', upd); upd();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { playbook, impact, ...d } = formData(form);
        Object.assign(d, factors());
        const now = new Date().toISOString();
        d.declaredAt = now; d.awareAt = now;
        d.roles = store.defaultRoles();
        d.csf = { 'DE.AE-08': { done: true, at: now, note: '' }, 'RS.MA-03': { done: true, at: now, note: 'Priorizado na declaração' } };
        if (playbook) { d.playbooks = [playbook]; d.tasks = playbookTasks(playbook).map((k) => ({ ...k, owner: d.roles[k.role] || store.areaFor(k.role) || d.roles.handler || '' })); }
        const pop = db.procedures.find((p) => p.id === ctx.query.get('pop'));
        if (pop) d.tasks = [...(d.tasks || []), procedureTask(pop, { roles: d.roles, status: 'triagem' })];
        const inc = await store.createIncident(d);
        ctx.go(`#/incidente/${inc.id}/tarefas`);
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
