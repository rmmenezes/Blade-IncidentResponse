import * as store from '../core/store.js';
import { html, download, toCSV } from '../core/util.js';
import { ic, when, empty } from '../ui.js';

export default {
  title: () => 'Auditoria',
  render() {
    const db = store.get();
    return html`<div class="page">
      <div class="page-head"><div><h1>Trilha de auditoria</h1><p class="muted">Registro das ações realizadas na plataforma (últimas 2000).</p></div>
        <button class="btn" data-act="csv">${ic('down')} CSV</button></div>
      <section class="card">${db.audit.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Detalhe</th></tr></thead>
        <tbody>${db.audit.slice(0, 500).map((a) => html`<tr><td class="nowrap">${when(a.at)}</td><td>${a.who}</td><td>${a.action}</td>
          <td>${a.target?.startsWith('INC-') ? html`<a href="#/incidente/${a.target}">${a.target}</a>` : a.target}</td><td>${a.detail}</td></tr>`)}</tbody></table></div>` : empty('Sem registros.')}</section>
    </div>`;
  },
  mount(el) {
    el.querySelector('[data-act=csv]').addEventListener('click', () => {
      const db = store.get();
      download('auditoria.csv', toCSV([['quando', 'quem', 'acao', 'alvo', 'detalhe'], ...db.audit.map((a) => [a.at, a.who, a.action, a.target, a.detail])]), 'text/csv');
    });
  },
};
