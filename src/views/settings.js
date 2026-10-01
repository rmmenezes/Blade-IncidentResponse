// Configurações (Governar): organização, critérios, SLAs, notificações e dados.
import * as store from '../core/store.js';
import { html, uid, download } from '../core/util.js';
import { SEVERITIES, CONDITIONS } from '../core/engine.js';
import { demoDB } from '../data/seed.js';
import { packFiles, unpackFiles, clearFiles } from '../core/files.js';
import { ic, field, input, textarea, select, modal, confirmBox, toast, formData } from '../ui.js';

const UNITS = [{ v: 'h', t: 'horas' }, { v: 'bd', t: 'dias úteis' }, { v: 'm', t: 'meses' }];
const TRIGGERS = [{ v: 'awareAt', t: 'Ciência do incidente' }, { v: 'declaredAt', t: 'Declaração' }, { v: 'detectedAt', t: 'Detecção' }, { v: 'materialAt', t: 'Determinação de materialidade' }];

export default {
  title: () => 'Configurações',
  render() {
    const db = store.get();
    return html`<div class="page">
      <div class="page-head"><div><h1>Configurações</h1><p class="muted">Políticas que governam a resposta (GV.PO, GV.RR, GV.RM).</p></div>
        <div class="row"><a class="btn" href="#/auditoria">${ic('list')} Trilha de auditoria</a><a class="btn" href="#/referencia">${ic('info')} Referência NIST</a></div></div>
      <form class="card" id="org">
        <h2>Organização</h2>
        <div class="form-grid">
          ${field('Nome da organização', input('name', db.org.name, 'required'))}${field('Setor', input('sector', db.org.sector))}
          ${field('Nome da equipe (assina os registros)', input('analyst', db.org.analyst, 'required'), 'Ex.: SOC, CSIRT, Segurança da Informação.')}
        </div>
        ${field('Critérios de declaração de incidente (DE.AE-08) — um por linha', textarea('criteria', db.org.incidentCriteria.join('\n'), 'rows="6"'))}
        <button class="btn primary">Salvar</button>
      </form>

      <form class="card" id="sla">
        <h2>SLA de contenção</h2>
        <p class="small muted">Horas, a partir da declaração, para conter o incidente.</p>
        <div class="sla-grid">${SEVERITIES.map((s) => html`<label class="sla-box sev-${s.id}"><b>${s.id} · ${s.name}</b><span><input type="number" step="0.5" min="0" name="${s.id}.contain" value="${db.sla[s.id].contain}" aria-label="${s.id}"> h</span></label>`)}</div>
        <button class="btn primary">Salvar SLAs</button>
      </form>

      <section class="card">
        <div class="card-head"><h2>Notificações obrigatórias (RS.CO-02)</h2></div>
        <p class="small muted">Os padrões são referências; confirme prazos e aplicabilidade com o jurídico para sua organização e setor.</p>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Ativa</th><th>Obrigação</th><th>Prazo</th></tr></thead>
          <tbody>${db.regulations.map((r) => html`<tr><td><input type="checkbox" data-reg="${r.id}" data-k="enabled" ${r.enabled ? 'checked' : ''} aria-label="Ativa"></td>
            <td><b>${r.name}</b><br><small class="muted">${r.note}</small></td>
            <td class="nowrap"><input type="number" min="0" style="width:70px" value="${r.amount}" data-reg="${r.id}" data-k="amount" aria-label="Prazo"> ${r.unit === 'bd' ? 'dias úteis' : 'horas'}</td></tr>`)}</tbody></table></div>
      </section>

      <section class="card">
        <h2>Dados</h2>
        <p class="small muted">Tudo fica armazenado apenas neste navegador. Exporte regularmente para backup ou para compartilhar com a equipe.</p>
        <div class="row">
          <button class="btn" data-act="export">${ic('down')} Exportar tudo (JSON)</button>
          <button class="btn" data-act="export-files">${ic('down')} Exportar tudo + arquivos</button>
          <label class="btn">Importar JSON<input type="file" accept="application/json,.json" id="imp" hidden></label>
          <button class="btn" data-act="demo">Carregar demonstração</button>
          <button class="btn danger" data-act="reset">${ic('trash')} Apagar todos os dados</button>
        </div>
      </section>
    </div>`;
  },
  mount(el, _, ctx) {
    const db = store.get();
    el.querySelector('#org').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = formData(e.target);
      Object.assign(db.org, { name: f.name, sector: f.sector, analyst: f.analyst, incidentCriteria: f.criteria.split('\n').map((s) => s.trim()).filter(Boolean) });
      store.audit('Configurações da organização alteradas'); store.persist(); toast('Salvo.'); ctx.rerender();
    });
    el.querySelector('#sla').addEventListener('submit', (e) => {
      e.preventDefault();
      for (const [k, v] of Object.entries(formData(e.target))) { const [s, f] = k.split('.'); db.sla[s][f] = Number(v); }
      store.audit('SLAs alterados'); store.persist(); toast('SLAs salvos.');
    });
    el.addEventListener('change', (e) => {
      const t = e.target; if (!t.dataset.reg) return;
      const r = db.regulations.find((x) => x.id === t.dataset.reg);
      r[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.dataset.k === 'amount' ? Number(t.value) : t.value;
      store.audit('Regra de notificação alterada', r.name, `${t.dataset.k}=${r[t.dataset.k]}`); store.persist();
    });
    el.querySelector('#imp').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.incidents)) throw new Error('Arquivo não parece ser um backup da Blade.');
        const files = data._files; delete data._files;
        if (!(await confirmBox('Importar backup', 'Os dados atuais serão substituídos pelo conteúdo do arquivo.', { danger: true, label: 'Importar' }))) return;
        if (files?.length) await unpackFiles(files, data.incidents.flatMap((i) => i.attachments || []));
        store.replace(data); store.audit('Backup importado', file.name); store.persist(); toast('Backup importado.'); ctx.go('#/');
      } catch (err) { toast(err.message, 'err'); }
    });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.act === 'export-files') {
        const files = await packFiles(store.get().incidents.flatMap((i) => i.attachments || []));
        store.audit('Exportação completa com arquivos', '', `${files.length} arquivo(s)`); store.persist();
        download(`blade-ir-completo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...store.get(), _files: files }));
      }
      if (d.act === 'export') { store.audit('Exportação completa'); store.persist(); download(`blade-ir-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.get(), null, 2)); }
      if (d.act === 'demo' && await confirmBox('Carregar demonstração', 'Os dados atuais serão substituídos por dados fictícios.', { danger: true })) { store.replace(await demoDB()); ctx.go('#/'); }
      if (d.act === 'reset' && await confirmBox('Apagar tudo', 'Todos os incidentes, eventos e cadastros deste navegador serão apagados. Exporte antes se precisar.', { danger: true, label: 'Apagar' })) {
        try { localStorage.removeItem('blade-ir-db'); } catch { /* ignorar */ }
        await clearFiles().catch(() => {});
        location.hash = '#/'; location.reload();
      }
    });
  },
};
