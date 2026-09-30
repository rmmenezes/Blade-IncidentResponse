import * as store from '../core/store.js';
import { html } from '../core/util.js';
import { statusById } from '../core/nist.js';
import { PLAYBOOKS, playbookById } from '../data/playbooks.js';
import { fnBadge, ic } from '../ui.js';

export default {
  title: () => 'Playbooks',
  render([id]) {
    const db = store.get();
    const pb = id && playbookById[id];
    if (pb) {
      const uses = db.incidents.filter((i) => i.playbooks.includes(pb.id));
      const phases = [...new Set(pb.steps.map((s) => s.phase))];
      return html`<div class="page">
        <p class="crumb"><a href="#/playbooks">Playbooks</a> / ${pb.name}</p>
        <div class="page-head"><div><h1>${pb.name}</h1><p class="muted">${pb.summary}</p></div>
          <a class="btn primary" href="#/incidentes/novo">${ic('plus')} Declarar incidente</a></div>
        ${phases.map((ph) => html`<section class="card"><h2>${statusById[ph].name}</h2><ol class="steps">${pb.steps.filter((s) => s.phase === ph).map((s) => html`<li>${fnBadge(s.csf)} ${s.title}</li>`)}</ol></section>`)}
        ${uses.length ? html`<section class="card"><h2>Usado em</h2><p>${uses.map((i) => html`<a href="#/incidente/${i.id}">${i.id}</a> `)}</p></section>` : ''}
      </div>`;
    }
    return html`<div class="page">
      <div class="page-head"><div><h1>Playbooks</h1><p class="muted">Procedimentos de resposta com etapas mapeadas às subcategorias do CSF 2.0. Aplique ao declarar o incidente ou na aba Tarefas.</p></div></div>
      <div class="cards">${PLAYBOOKS.map((p) => html`<a class="card link" href="#/playbooks/${p.id}"><h3>${p.name}</h3><p>${p.summary}</p>
        <p class="small muted">${p.steps.length} etapas · ${[...new Set(p.steps.map((s) => s.csf.slice(0, 2)))].join(' · ')}</p></a>`)}</div>
    </div>`;
  },
};
