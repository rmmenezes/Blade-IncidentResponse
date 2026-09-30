// Leitor de livro: sumário lateral, documento paginado e ações (baixar, usar em incidente, editar).
import * as store from '../core/store.js';
import { html, uid, download } from '../core/util.js';
import { findBook, bookDoc, bookChapters, standaloneHTML, toMarkdown } from '../book.js';
import { ic, modal, field, select, confirmBox, toast } from '../ui.js';
import { playbookTasks } from './incidents.js';
import { procedureForm, procedureFromForm } from './library.js';

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default {
  title: ([id]) => findBook(store.get(), id)?.title || 'Livro',
  render([id]) {
    const db = store.get();
    const b = findBook(db, id);
    if (!b) return html`<div class="page"><div class="card"><h2>Documento não encontrado</h2><a class="btn" href="#/biblioteca">Voltar à biblioteca</a></div></div>`;
    const usable = b.kind === 'playbook' || b.kind === 'procedimento';
    return html`<div class="page reader">
      <div class="reader-bar no-print">
        <a class="btn ghost" href="#/biblioteca">← Biblioteca</a>
        <span class="spacer"></span>
        ${usable ? html`<button class="btn primary" data-act="use">${ic('alert')} Usar em um incidente</button>` : ''}
        <div class="dl-group" role="group" aria-label="Baixar">
          <button class="btn" data-act="pdf" title="Abre a impressão — escolha Salvar como PDF">${ic('print')} PDF</button>
          <button class="btn" data-act="html" title="Arquivo HTML completo, abre em qualquer navegador">${ic('down')} HTML</button>
          <button class="btn" data-act="md" title="Texto em Markdown">${ic('file')} Markdown</button>
        </div>
        ${b.kind === 'procedimento' ? html`<button class="btn ghost" data-act="edit">Editar</button><button class="btn ghost" data-act="dup">Duplicar</button>` : ''}
      </div>
      <div class="reader-grid">
        <aside class="reader-toc no-print"><p class="eyebrow">Sumário</p>
          <ol>${bookChapters(b, db).map((c) => html`<li><a href="#" data-goto="${c.id}"><span>${c.n}</span>${c.title}</a></li>`)}</ol></aside>
        <div class="reader-doc">${bookDoc(b, db)}</div>
      </div>
    </div>`;
  },
  mount(el, [id], ctx) {
    const db = store.get();
    const b = findBook(db, id);
    if (!b) return;
    const name = `${b.kind}-${slug(b.title)}-v${b.version}`;
    el.addEventListener('click', async (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); document.getElementById(g.dataset.goto)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const a = e.target.closest('.bk-toc a');
      if (a) { e.preventDefault(); document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth' }); return; }
      const t = e.target.closest('button'); if (!t) return;
      const act = t.dataset.act;
      if (act === 'pdf') window.print();
      if (act === 'html') { download(`${name}.html`, standaloneHTML([b], db, `${b.title} — ${db.org.name}`), 'text/html'); store.audit('Documento baixado', b.title, 'HTML'); store.persist(); }
      if (act === 'md') { download(`${name}.md`, toMarkdown(b, db), 'text/markdown'); store.audit('Documento baixado', b.title, 'Markdown'); store.persist(); }
      if (act === 'use') {
        const open = db.incidents.filter((i) => i.status !== 'encerrado');
        modal(`Usar "${b.title}"`, html`${field('Incidente', select('inc', [...open.map((i) => ({ v: i.id, t: `${i.id} — ${i.title}` })), { v: '__new', t: '+ Declarar novo incidente' }], open[0]?.id || '__new'))}
          <p class="small muted">${b.kind === 'playbook' ? `As ${b.src.steps.length} etapas viram tarefas do incidente, atribuídas pelo papel.` : 'O procedimento vira uma tarefa obrigatória com checklist de passos.'}</p>`, {
          submitLabel: 'Aplicar',
          onSubmit: async (f) => {
            if (f.inc === '__new') { ctx.go(`#/incidentes/novo?${b.kind === 'playbook' ? 'pb=' + b.src.id : 'pop=' + b.src.id}`); return; }
            const inc = store.incident(f.inc);
            if (b.kind === 'playbook') {
              inc.tasks.push(...playbookTasks(b.src.id).map((k) => ({ ...k, owner: inc.roles[k.role] || inc.roles.handler || inc.roles.lead || '' })));
              inc.playbooks = [...new Set([...inc.playbooks, b.src.id])];
              await store.logChange(inc, `Playbook aplicado: ${b.title} v${b.version}`);
            } else {
              inc.tasks.push(procedureTask(b.src, inc));
              await store.logChange(inc, `Procedimento aplicado: ${b.title} v${b.version}`);
            }
            toast('Aplicado ao incidente.'); ctx.go(`#/incidente/${inc.id}/tarefas`);
          },
        });
      }
      if (act === 'edit') modal(`Editar — ${b.title}`, procedureForm(db, b.src), { wide: true, onSubmit: (f) => {
        const next = procedureFromForm(f);
        if (next.version === b.src.version) next.version = ((Math.round((parseFloat(b.src.version) || 1) * 10) + 1) / 10).toFixed(1);
        Object.assign(b.src, next); store.audit('Procedimento editado', `${b.src.name} v${b.src.version}`); store.persist(); ctx.rerender();
      } });
      if (act === 'dup') {
        const copy = { ...structuredClone(b.src), id: uid('pop-'), name: `${b.src.name} (cópia)`, version: '1.0' };
        db.procedures.push(copy); store.audit('Procedimento duplicado', b.src.name); store.persist(); ctx.go(`#/livro/${copy.id}`);
      }
      if (act === 'del' && await confirmBox('Remover procedimento', 'Tarefas já criadas nos incidentes são mantidas.', { danger: true })) {
        db.procedures = db.procedures.filter((x) => x.id !== b.src.id); store.persist(); ctx.go('#/biblioteca');
      }
    });
  },
};

// Tarefa obrigatória com checklist, atribuída ao papel predominante do procedimento.
export function procedureTask(pop, inc) {
  const roles = pop.steps.map((x) => x.role).filter(Boolean);
  const main = roles.sort((a, b) => roles.filter((r) => r === b).length - roles.filter((r) => r === a).length)[0];
  return { id: uid('k'), title: `Procedimento: ${pop.name}`, phase: pop.phase || inc.status, csf: pop.csf, procedure: pop.id, required: true, status: 'aberta', due: null,
    owner: inc.roles[main] || inc.roles.handler || inc.roles.lead || '',
    steps: pop.steps.map((x) => ({ id: uid('s'), text: x.title, role: x.role, tech: x.tech, done: false })) };
}
