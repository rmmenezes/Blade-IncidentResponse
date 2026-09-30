// Biblioteca: estante de playbooks, procedimentos, plano e guia — com download.
import * as store from '../core/store.js';
import { html, raw, uid, download } from '../core/util.js';
import { art } from '../art.js';
import { allBooks, coverCard, standaloneHTML } from '../book.js';
import { ic, modal, toast } from '../ui.js';
import { procedureForm, procedureFromForm } from './library.js';

const FILTERS = [['', 'Tudo'], ['playbook', 'Playbooks'], ['procedimento', 'Procedimentos'], ['referencia', 'Plano e guia']];

export default {
  title: () => 'Biblioteca',
  render(_, ctx) {
    const db = store.get();
    const f = ctx.query.get('f') || '';
    const q = (ctx.query.get('q') || '').toLowerCase();
    const books = allBooks(db).filter((b) => (!f || b.kind === f || (f === 'referencia' && ['plano', 'guia'].includes(b.kind)))
      && (!q || `${b.title} ${b.subtitle}`.toLowerCase().includes(q)));
    const shelf = (kind, title, desc, icon) => {
      const items = books.filter((b) => (Array.isArray(kind) ? kind.includes(b.kind) : b.kind === kind));
      return items.length ? html`<section class="shelf">
        <div class="shelf-head"><span class="shelf-ic">${ic(icon)}</span><div><h2>${title}</h2><p class="muted small">${desc}</p></div></div>
        <div class="shelf-row">${items.map((b) => coverCard(b))}</div><div class="shelf-board"></div></section>` : '';
    };
    return html`<div class="page">
      <section class="hero hero-lib">
        <div class="hero-txt">
          <p class="eyebrow">Biblioteca de resposta</p>
          <h1>Playbooks e procedimentos prontos para usar</h1>
          <p class="muted">Leia como um livro, aplique em um incidente com um clique ou baixe em PDF, HTML ou Markdown para distribuir à equipe.</p>
          <div class="row">
            <button class="btn primary" data-act="dl-all">${ic('down')} Baixar biblioteca completa</button>
            <button class="btn" data-act="new-pop">${ic('plus')} Novo procedimento</button>
          </div>
        </div>
        <div class="hero-art">${raw(art('guide'))}</div>
      </section>
      <form class="filters lib-filters" id="libf">
        <div class="seg">${FILTERS.map(([k, t]) => html`<a class="${k === f ? 'on' : ''}" href="#/biblioteca${k ? '?f=' + k : ''}">${t}</a>`)}</div>
        <div class="search-in">${ic('search')}<input name="q" value="${q}" placeholder="Buscar na biblioteca" aria-label="Buscar na biblioteca"></div>
      </form>
      ${shelf('playbook', 'Playbooks', 'Guias completos por tipo de incidente, organizados pelas Funções do CSF 2.0.', 'book')}
      ${shelf('procedimento', 'Procedimentos operacionais (POPs)', 'Instruções passo a passo, com papel e tecnologia em cada passo.', 'check')}
      ${shelf(['plano', 'guia'], 'Plano e referência', 'Plano de resposta gerado com os dados da organização e o guia NIST.', 'shield')}
      ${!books.length ? html`<div class="empty">${raw(art('empty', 'art-sm'))}<p>Nada encontrado.</p></div>` : ''}
    </div>`;
  },
  mount(el, _, ctx) {
    const db = store.get();
    el.querySelector('#libf').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = new URLSearchParams(ctx.query); const v = e.target.q.value.trim();
      v ? n.set('q', v) : n.delete('q'); ctx.go(`#/biblioteca${n.toString() ? '?' + n : ''}`);
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'dl-all') {
        download(`biblioteca-resposta-a-incidentes.html`, standaloneHTML(allBooks(db), db, `Biblioteca de resposta a incidentes — ${db.org.name}`), 'text/html');
        store.audit('Biblioteca baixada'); store.persist(); toast('Biblioteca baixada. Abra o arquivo e use Imprimir → Salvar como PDF, se preferir.');
      }
      if (b.dataset.act === 'new-pop') modal('Novo procedimento', procedureForm(db), { wide: true, onSubmit: (f) => {
        const p = { id: uid('pop-'), ...procedureFromForm(f) };
        db.procedures.push(p); store.audit('Procedimento criado', p.name); store.persist(); ctx.go(`#/livro/${p.id}`);
      } });
    });
  },
};
