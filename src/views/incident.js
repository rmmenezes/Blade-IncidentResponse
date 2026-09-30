// Detalhe do incidente: gestão completa pelo ciclo Detectar → Responder → Recuperar → Melhoria.
import * as store from '../core/store.js';
import { html, raw, uid, fmtDate, fmtDuration, download, toCSV } from '../core/util.js';
import { STATUSES, statusById, statusIndex, SUBCATEGORIES, subById, ROLES, roleById, CATEGORIES_INCIDENT, TLP, MITRE_TACTICS, IOC_TYPES, CATEGORIES } from '../core/nist.js';
import { slaStatus, notificationStatus, transitionWarnings, csfProgress, chainVerify, sha256Buffer, priorityScore, SEVERITIES, CONDITIONS, FACTORS, phaseBlockers, taskProgress, phaseDurations, MILESTONES } from '../core/engine.js';
import { saveFile, getBlob, objectURL, deleteFile, packFiles, isImage, fmtSize, MAX_FILE } from '../core/files.js';
import { PLAYBOOKS, playbookById } from '../data/playbooks.js';
import { ic, sevBadge, statusBadge, fnBadge, tlpBadge, field, input, dt, textarea, select, modal, confirmBox, toast, when, empty, bar } from '../ui.js';
import { playbookTasks } from './incidents.js';

const TABS = [
  ['visao', 'Visão geral'], ['linha', 'Cronologia'], ['tarefas', 'Tarefas e passos'], ['equipe', 'Equipe'], ['analise', 'Análise'], ['evidencias', 'Evidências'],
  ['anexos', 'Arquivos'], ['iocs', 'Indicadores'], ['comunicacao', 'Comunicação'], ['recuperacao', 'Recuperação'], ['licoes', 'Lições aprendidas'], ['nist', 'Conformidade NIST'],
];
const TL_TYPES = { deteccao: 'Detecção', acao: 'Ação', evidencia: 'Evidência', decisao: 'Decisão', comunicacao: 'Comunicação', nota: 'Nota', status: 'Estado', sistema: 'Sistema' };
const TASK_ST = { aberta: 'Aberta', andamento: 'Em andamento', bloqueada: 'Bloqueada', concluida: 'Concluída' };
const AUDIENCES = { interno: 'Interno', externo: 'Externo', lideranca: 'Liderança', regulador: 'Regulador', titulares: 'Titulares de dados', clientes: 'Clientes', publico: 'Público / imprensa', policia: 'Autoridade policial', fornecedor: 'Fornecedor / terceiro', seguradora: 'Seguradora', csirt: 'CSIRT / ISAC' };
const COMM_CSF = ['RS.CO-02', 'RS.CO-03', 'RC.CO-03', 'RC.CO-04'];
const LESSON_Q = [
  ['whatHappened', 'O que aconteceu exatamente e em que momentos?'],
  ['wentWell', 'O que funcionou bem? Procedimentos documentados foram seguidos e eram adequados?'],
  ['infoSooner', 'Que informação teria sido necessária mais cedo?'],
  ['inhibited', 'Alguma ação ou decisão atrapalhou a resposta ou a recuperação?'],
  ['improve', 'O que a equipe e a liderança fariam diferente?'],
  ['sharing', 'Como melhorar o compartilhamento de informações com outras áreas e terceiros?'],
  ['prevent', 'Que ações corretivas evitam incidentes semelhantes?'],
  ['indicators', 'Que precursores ou indicadores devem ser monitorados no futuro?'],
  ['resources', 'Que ferramentas, treinamentos ou recursos adicionais são necessários?'],
  ['planUpdates', 'Que atualizações no plano de resposta, playbooks e políticas são necessárias (ID.IM-04)?'],
];

const contactOpts = (db) => [{ v: '', t: '—' }, ...db.contacts.map((c) => ({ v: c.id, t: c.name }))];
const contactName = (db, id) => db.contacts.find((c) => c.id === id)?.name || '';

function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) {
  const ks = p.split('.'); let t = o;
  ks.slice(0, -1).forEach((k) => { if (typeof t[k] !== 'object' || t[k] === null) t[k] = /^\d+$/.test(k) ? [] : {}; t = t[k]; });
  t[ks.at(-1)] = v;
}
// Campo ligado ao incidente (salvo ao alterar).
const b = (path, inc, attrs = '') => input('', getPath(inc, path) ?? '', `data-bind="${path}" ${attrs}`);
const bt = (path, inc, attrs = 'rows="3"') => textarea('', getPath(inc, path) ?? '', `data-bind="${path}" ${attrs}`);
const bd = (path, inc) => dt('', getPath(inc, path), `data-bind="${path}"`);
const bs = (path, inc, opts, attrs = '') => select('', opts, getPath(inc, path) ?? '', `data-bind="${path}" ${attrs}`);
const bc = (path, inc, label) => html`<label class="chk"><input type="checkbox" data-bind="${path}" ${getPath(inc, path) ? 'checked' : ''}> ${label}</label>`;

function csfCheck(inc, id) {
  const s = subById[id]; const c = inc.csf[id];
  return html`<label class="csfchk ${c?.done ? 'done' : ''}"><input type="checkbox" data-csf="${id}" ${c?.done ? 'checked' : ''}> ${fnBadge(id)} <span>${s.text}</span></label>`;
}

/* ---------- Abas ---------- */
function tabVisao(inc, db) {
  const sla = slaStatus(inc, db.sla);
  const lead = contactName(db, inc.roles.lead);
  const openTasks = inc.tasks.filter((t) => t.status !== 'concluida');
  const reqOpen = openTasks.filter((t) => t.required).length;
  return html`<div class="summary-strip">
      <div><span>Líder</span><b>${lead || '—'}</b></div>
      <div><span>Equipe</span><b>${teamIds(inc).length} pessoa(s)</b></div>
      <div><span>Tarefas abertas</span><b>${openTasks.length}${reqOpen ? html` <small class="txt-late">(${reqOpen} obrigatórias)</small>` : ''}</b></div>
      <div><span>Declarado há</span><b>${fmtDuration(Date.now() - new Date(inc.declaredAt))}</b></div>
      <div><span>Arquivos</span><b>${inc.attachments.length}</b></div>
    </div>
    <div class="grid2">
    <section class="card">
      <h2>Dados do incidente</h2>
      <div class="form-grid">
        <div class="span2">${field('Título', b('title', inc))}</div>
        ${field('Categoria', bs('category', inc, CATEGORIES_INCIDENT))}
        ${field('TLP (compartilhamento)', bs('tlp', inc, TLP))}
        <div class="span2">${field('Descrição', bt('description', inc, 'rows="4"'))}</div>
      </div>
      <h3>Marcos</h3>
      <div class="form-grid">
        ${field('Primeira atividade maliciosa', bd('occurredAt', inc))}
        ${field('Detectado em', bd('detectedAt', inc))}
        ${field('Declarado em', bd('declaredAt', inc))}
        ${field('Triagem concluída em', bd('triagedAt', inc))}
        ${field('Contido em', bd('containedAt', inc))}
        ${field('Erradicado em', bd('eradicatedAt', inc))}
        ${field('Recuperado em', bd('recoveredAt', inc))}
        ${field('Encerrado em', bd('closedAt', inc))}
      </div>
    </section>
    <div class="stack">
      <section class="card">
        <h2>Priorização <small class="muted">RS.MA-03</small></h2>
        <div class="form-grid">
          ${Object.entries(FACTORS).map(([k, f]) => field(f.label, bs(k, inc, f.opts.map((t, v) => ({ v, t: `${v} — ${t}` })), 'data-num="1"')))}
          ${field('Severidade manual', bs('severityOverride', inc, [{ v: '', t: 'Automática' }, ...SEVERITIES.map((s) => ({ v: s.id, t: `${s.id} · ${s.name}` }))]))}
          ${field('Justificativa da alteração', b('overrideReason', inc))}
        </div>
        <p>Pontuação ${priorityScore(inc, db.assets)}/12 → ${sevBadge(inc.severity)}</p>
      </section>
      <section class="card">
        <h2>SLAs</h2>
        <ul class="sla">${sla.map((s) => html`<li class="${s.done ? (s.late ? 'late' : 'ok') : s.late ? 'late' : 'run'}">
          <b>${s.label}</b><span>meta ${when(s.due)}</span>
          <span>${s.done ? `concluída ${fmtDate(s.doneAt)}${s.late ? ' (fora do SLA)' : ''}` : s.late ? `atrasada ${fmtDuration(-s.remaining)}` : `restam ${fmtDuration(s.remaining)}`}</span></li>`)}</ul>
      </section>
      <section class="card danger-zone">
        <h2>Zona de risco</h2>
        <button class="btn danger sm" data-act="delete">${ic('trash')} Excluir incidente</button>
      </section>
    </div>
  </div>`;
}

// Pessoas envolvidas: equipe explícita + papéis + responsáveis por tarefas.
export function teamIds(inc) {
  return [...new Set([...(inc.team || []), ...Object.values(inc.roles || {}).filter(Boolean), ...inc.tasks.map((t) => t.owner).filter(Boolean)])];
}

function tabEquipe(inc, db) {
  const ids = teamIds(inc);
  const rolesOf = (id) => Object.entries(inc.roles).filter(([, v]) => v === id).map(([r]) => roleById[r]?.name || r);
  const outside = db.contacts.filter((c) => !ids.includes(c.id));
  return html`<div class="grid2">
    <section class="card">
      <div class="card-head"><h2>Equipe atribuída</h2>
        <div class="row">${select('', [{ v: '', t: 'Adicionar pessoa…' }, ...outside.map((c) => ({ v: c.id, t: `${c.name} — ${roleById[c.role]?.name || ''}` }))], '', 'data-act="team-add" aria-label="Adicionar pessoa"')}</div></div>
      ${ids.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Pessoa</th><th>Papéis no incidente</th><th>Tarefas</th><th>Contato</th><th></th></tr></thead>
        <tbody>${ids.map((id) => { const c = db.contacts.find((x) => x.id === id); if (!c) return ''; const ts = inc.tasks.filter((t) => t.owner === id); const late = ts.filter((t) => t.status !== 'concluida' && t.due && new Date(t.due) < new Date()).length;
          return html`<tr><td><span class="avatar">${initials(c.name)}</span> <b>${c.name}</b><br><small class="muted">${c.org}${c.external ? ' · externo' : ''}${c.oncall ? ' · plantão' : ''}</small></td>
          <td>${rolesOf(id).join(', ') || html`<span class="muted">membro</span>`}</td>
          <td>${ts.filter((t) => t.status === 'concluida').length}/${ts.length}${late ? html` <b class="txt-late">${late} atrasada(s)</b>` : ''}</td>
          <td class="small">${c.email}<br>${c.phone}</td>
          <td>${(inc.team || []).includes(id) ? html`<button class="icon-btn" data-team-del="${id}" aria-label="Remover da equipe">${ic('x')}</button>` : ''}</td></tr>`; })}</tbody></table></div>`
        : empty('Nenhuma pessoa atribuída.')}
      <p class="small muted">Cadastre pessoas em <a href="#/preparacao/equipe">Preparação → Equipe</a>. Ao aplicar procedimentos, as tarefas são atribuídas automaticamente pelo papel.</p>
    </section>
    <section class="card">
      <h2>Papéis e responsabilidades <small class="muted">GV.RR-02</small></h2>
      <div class="form-grid">${ROLES.map((r) => field(r.name, bs(`roles.${r.id}`, inc, contactOpts(db))))}</div>
    </section>
  </div>`;
}
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function tabLinha(inc) {
  const items = [...inc.timeline].sort((a, b) => new Date(a.at) - new Date(b.at));
  const durs = phaseDurations(inc);
  const total = durs.reduce((s, d) => s + d.ms, 0) || 1;
  const types = [...new Set(items.map((e) => e.type))];
  const byId = Object.fromEntries(inc.attachments.map((a) => [a.id, a]));
  return html`<section class="card">
      <div class="card-head"><h2>Cronologia do incidente</h2><span class="muted small">da primeira atividade conhecida até agora</span></div>
      ${durs.length ? html`<div class="gantt">${durs.map((d, n) => html`<div class="gseg g${n % 7}" style="flex:${Math.max(d.ms / total, 0.03)}" title="${d.from} → ${d.to}: ${fmtDuration(d.ms)}">
        <span>${d.from} → ${d.to}</span><b>${fmtDuration(d.ms)}</b></div>`)}</div>
        <div class="milestones">${MILESTONES.filter(([k]) => inc[k]).map(([k, l]) => html`<div><span>${l}</span><b>${fmtDate(inc[k])}</b></div>`)}</div>` : empty('Registre os marcos na visão geral para montar a cronologia.')}
    </section>
    <section class="card">
    <div class="card-head"><h2>Linha do tempo <small class="muted">RS.AN-06</small></h2>
      <div class="row"><button class="btn sm" data-act="tl-csv">${ic('down')} CSV</button><button class="btn sm" data-act="verify">${ic('lock')} Verificar integridade</button><button class="btn sm primary" data-act="tl-add">${ic('plus')} Registrar</button></div></div>
    <div class="chips" id="tlfilter"><button class="chip on" data-tlf="">Todos <em>${items.length}</em></button>${types.map((t) => html`<button class="chip" data-tlf="${t}">${TL_TYPES[t] || t} <em>${items.filter((e) => e.type === t).length}</em></button>`)}</div>
    <p class="small muted">Cada registro é encadeado por SHA-256 ao anterior — autor, horário do fato, horário do registro, fase e hash dos anexos — preservando integridade e proveniência. Registros não são editáveis: corrija com um novo registro.</p>
    <ol class="timeline">${items.map((e) => html`<li class="tl-${e.type}" data-type="${e.type}">
      <div class="tl-when">${when(e.at)}<small>registrado ${fmtDate(e.recordedAt)} · ${e.author}${e.phase ? ` · ${statusById[e.phase]?.name || e.phase}` : ''}</small></div>
      <div class="tl-body"><span class="badge ghost">${TL_TYPES[e.type] || e.type}</span> ${e.text}
        ${e.fileIds?.length ? html`<div class="thumbs">${e.fileIds.map((id) => byId[id] ? fileChip(byId[id]) : '')}</div>` : ''}
        <code class="hash" title="SHA-256">${e.hash.slice(0, 16)}…</code></div></li>`)}</ol>
  </section>`;
}

const fileChip = (a) => html`<button type="button" class="fchip" data-file-view="${a.id}" title="${a.name}">${isImage(a) ? html`<img alt="" data-thumb="${a.id}">` : ic('file')}<span>${a.name}</span></button>`;

function taskOwnerSel(db, t) { return select('', contactOpts(db), t.owner, `data-task="${t.id}" data-k="owner" aria-label="Responsável"`); }

function tabTarefas(inc, db) {
  const phases = STATUSES.filter((s) => s.id !== 'encerrado');
  const blockers = phaseBlockers(inc, 'encerrado');
  return html`<section class="card">
    <div class="card-head"><h2>Tarefas e passos</h2>
      <div class="row">${select('pb', [{ v: '', t: 'Aplicar playbook…' }, ...PLAYBOOKS.map((p) => ({ v: p.id, t: p.name }))], '', 'data-act="apply-pb" aria-label="Aplicar playbook"')}
      ${select('pop', [{ v: '', t: 'Aplicar procedimento…' }, ...db.procedures.map((p) => ({ v: p.id, t: `${p.name} (v${p.version})` }))], '', 'data-act="apply-pop" aria-label="Aplicar procedimento"')}
      <button class="btn sm primary" data-act="task-add">${ic('plus')} Nova tarefa</button></div></div>
    <p class="small muted">${db.org.enforceGates ? html`${ic('lock')} Controle de fases ativo: tarefas <b>obrigatórias</b> precisam estar concluídas para avançar o estado.` : html`Tarefas <b>obrigatórias</b> geram alertas ao avançar de fase. Ative o bloqueio em <a href="#/config">Configurações</a>.`}
      ${blockers.length ? html` · <b class="txt-late">${blockers.length} obrigatória(s) pendente(s)</b>` : ''}</p>
    ${inc.playbooks.length ? html`<p class="small muted">Playbooks aplicados: ${inc.playbooks.map((p) => playbookById[p]?.name).join(', ')}</p>` : ''}
    ${phases.map((ph) => {
      const ts = inc.tasks.filter((t) => t.phase === ph.id);
      if (!ts.length) return '';
      return html`<h3 class="ph">${ph.name} <small class="muted">${ts.filter((t) => t.status === 'concluida').length}/${ts.length}</small></h3>
      <div class="tasklist">${ts.map((t) => { const p = taskProgress(t); const late = t.status !== 'concluida' && t.due && new Date(t.due) < new Date();
        return html`<div class="task ${t.status === 'concluida' ? 'done' : ''}">
        <div class="task-main">
          <input type="checkbox" data-task-done="${t.id}" ${t.status === 'concluida' ? 'checked' : ''} aria-label="Concluída">
          <div class="task-title"><span>${t.title}</span>
            <div class="row small">${t.required ? html`<span class="badge warn">obrigatória</span>` : ''}${t.procedure ? html`<span class="badge ghost">POP</span>` : ''}${t.csf ? fnBadge(t.csf) : ''}
              ${late ? html`<b class="txt-late">atrasada</b>` : ''}${t.doneBy ? html`<span class="muted">concluída por ${t.doneBy} em ${fmtDate(t.doneAt)}</span>` : ''}</div>
            ${t.steps?.length ? html`<div class="row small">${bar(p)}<span class="muted">${t.steps.filter((s) => s.done).length}/${t.steps.length} passos</span></div>` : ''}</div>
          <div class="task-meta">${taskOwnerSel(db, t)}${dt('', t.due, `data-task="${t.id}" data-k="due" aria-label="Prazo"`)}
            ${select('', Object.entries(TASK_ST).map(([v, t2]) => ({ v, t: t2 })), t.status, `data-task="${t.id}" data-k="status" aria-label="Estado"`)}
            <button class="icon-btn" data-task-req="${t.id}" title="${t.required ? 'Tornar opcional' : 'Tornar obrigatória'}" aria-label="Obrigatória">${ic('lock')}</button>
            <button class="icon-btn" data-task-step="${t.id}" title="Adicionar passo" aria-label="Adicionar passo">${ic('plus')}</button>
            <button class="icon-btn" data-task-del="${t.id}" aria-label="Remover">${ic('x')}</button></div>
        </div>
        ${t.steps?.length ? html`<ol class="steplist">${t.steps.map((s) => html`<li class="${s.done ? 'done' : ''}"><label class="chk"><input type="checkbox" data-step="${t.id}:${s.id}" ${s.done ? 'checked' : ''}>
          <span>${s.text}${s.role ? html` <small class="muted">· ${roleById[s.role]?.name || s.role}</small>` : ''}${s.tech ? html` <small class="muted">· ${db.technologies.find((x) => x.id === s.tech)?.name || ''}</small>` : ''}
          ${s.done && s.doneBy ? html`<small class="muted"> — ${s.doneBy}, ${fmtDate(s.doneAt)}</small>` : ''}</span></label></li>`)}</ol>` : ''}
      </div>`; })}</div>`;
    })}
    ${!inc.tasks.length ? empty('Sem tarefas. Aplique um playbook, um procedimento ou crie tarefas manualmente.') : ''}
  </section>`;
}

function tabAnexos(inc) {
  return html`<section class="card">
    <div class="card-head"><h2>Arquivos e imagens</h2><div class="row"><button class="btn sm" data-act="pkg">${ic('down')} Pacote do incidente</button></div></div>
    <label class="drop" id="drop"><input type="file" multiple id="upfiles" hidden>
      ${ic('upload')}<b>Arraste arquivos aqui, clique para selecionar ou cole uma imagem (Ctrl+V)</b>
      <span class="small muted">Capturas de tela, logs, relatórios, e-mails… até ${MAX_FILE / 1048576} MB por arquivo. O hash SHA-256 é registrado na linha do tempo.</span></label>
    <p class="small muted">${ic('info')} Sem servidor: os arquivos ficam guardados neste navegador. Para compartilhar, exporte o <b>pacote do incidente</b> (inclui os arquivos) e importe-o em outro computador em <i>Incidentes → Importar pacote</i>.</p>
    ${inc.attachments.length ? html`<div class="files">${[...inc.attachments].reverse().map((a) => html`<article class="fcard">
      <button type="button" class="fprev" data-file-view="${a.id}">${isImage(a) ? html`<img alt="${a.name}" data-thumb="${a.id}">` : html`<span class="fext">${(a.name.split('.').pop() || 'arq').slice(0, 5)}</span>`}</button>
      <div class="finfo"><b title="${a.name}">${a.name}</b><small class="muted">${fmtSize(a.size)} · ${a.context === 'evidence' ? 'evidência' : a.context === 'timeline' ? 'linha do tempo' : 'anexo'}</small>
        <small class="muted">${a.addedBy || ''} · ${fmtDate(a.addedAt)}</small><code class="hash" title="SHA-256 ${a.sha256}">${a.sha256.slice(0, 16)}…</code>
        ${a.caption ? html`<small>${a.caption}</small>` : ''}</div>
      <div class="row"><button class="btn sm ghost" data-file-dl="${a.id}">${ic('down')} Baixar</button><button class="icon-btn" data-file-del="${a.id}" aria-label="Remover">${ic('trash')}</button></div>
    </article>`)}</div>` : empty('Nenhum arquivo anexado.')}
  </section>`;
}

function tabAnalise(inc, db) {
  const a = inc.analysis;
  return html`<div class="grid2">
    <section class="card">
      <h2>Análise e causa raiz (RS.AN-03)</h2>
      ${field('Hipótese de trabalho', bt('analysis.hypothesis', inc))}
      ${field('Causa raiz', bt('analysis.rootCause', inc))}
      <h3>5 porquês</h3>
      ${[0, 1, 2, 3, 4].map((i) => field(`Por quê ${i + 1}?`, b(`analysis.whys.${i}`, inc)))}
      <h3>Táticas MITRE ATT&CK observadas</h3>
      <div class="chips">${MITRE_TACTICS.map((t) => html`<label class="chip"><input type="checkbox" data-tactic="${t}" ${a.tactics?.includes(t) ? 'checked' : ''}> ${t}</label>`)}</div>
      ${field('Técnicas (IDs, ex.: T1078, T1486)', b('analysis.techniques', inc))}
    </section>
    <section class="card">
      <div class="card-head"><h2>Tecnologias utilizadas na resposta</h2><a class="small" href="#/biblioteca/tecnologias">catálogo</a></div>
      ${db.technologies.length ? html`<div class="chips col">${db.technologies.map((t) => html`<label class="chip"><input type="checkbox" data-tool="${t.id}" ${inc.tools.includes(t.id) ? 'checked' : ''}> ${t.name} <small class="muted">${t.category}</small></label>`)}</div>` : empty('Nenhuma tecnologia cadastrada.')}
    </section>
    <div class="stack">
      <section class="card">
        <h2>Magnitude (RS.AN-08)</h2>
        <div class="form-grid">
          ${field('Registros afetados', b('magnitude.records', inc, 'type="number" min="0"'))}
          ${field('Usuários / titulares afetados', b('magnitude.users', inc, 'type="number" min="0"'))}
          ${field('Sistemas afetados', b('magnitude.systems', inc, 'type="number" min="0"'))}
          ${field('Impacto financeiro estimado (R$)', b('magnitude.financial', inc, 'type="number" min="0"'))}
          <div class="span2">${field('Tipos de dados afetados', b('magnitude.dataTypes', inc))}</div>
          <div class="span2">${field('Premissas e validação da estimativa', bt('magnitude.notes', inc))}</div>
          <div class="span2">${bc('personalData', inc, 'Envolve dados pessoais')}</div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Ativos afetados</h2><a class="small" href="#/preparacao/ativos">inventário</a></div>
        ${db.assets.length ? html`<div class="chips col">${db.assets.map((x) => html`<label class="chip"><input type="checkbox" data-asset="${x.id}" ${inc.assets.includes(x.id) ? 'checked' : ''}> ${x.name} <small class="muted">${x.type} · ${x.criticality}</small></label>`)}</div>` : empty('Nenhum ativo cadastrado.')}
      </section>
      ${inc.sourceEvents.length ? html`<section class="card"><h2>Eventos de origem</h2><p>${inc.sourceEvents.join(', ')}</p></section>` : ''}
    </div>
  </div>`;
}

function tabEvidencias(inc) {
  return html`<section class="card">
    <div class="card-head"><h2>Evidências e cadeia de custódia (RS.AN-07)</h2><button class="btn sm primary" data-act="ev-add">${ic('plus')} Nova evidência</button></div>
    <p class="small muted">O hash SHA-256 é calculado localmente. Opcionalmente, uma cópia do arquivo pode ficar guardada neste navegador (aba Arquivos).</p>
    ${inc.evidence.length ? inc.evidence.map((e) => html`<article class="evid">
      <div class="card-head"><h3>${e.name}</h3><div class="row"><button class="btn sm" data-ev-transfer="${e.id}">Transferir custódia</button><button class="icon-btn" data-ev-del="${e.id}" aria-label="Remover">${ic('x')}</button></div></div>
      <dl class="dl">
        <dt>Tipo</dt><dd>${e.type}</dd><dt>Hash</dt><dd><code class="wrap">${e.hashAlg}: ${e.hash || '—'}</code></dd>
        <dt>Coletado por</dt><dd>${e.collectedBy} em ${fmtDate(e.collectedAt)}</dd><dt>Local</dt><dd>${e.location || '—'}</dd>
        ${e.size ? html`<dt>Tamanho</dt><dd>${e.size.toLocaleString('pt-BR')} bytes</dd>` : ''}
        ${e.fileId && inc.attachments.some((a) => a.id === e.fileId) ? html`<dt>Arquivo</dt><dd>${fileChip(inc.attachments.find((a) => a.id === e.fileId))}</dd>` : ''}
      </dl>
      ${e.custody?.length ? html`<table class="tbl small"><thead><tr><th>Data</th><th>De</th><th>Para</th><th>Finalidade</th></tr></thead>
        <tbody>${e.custody.map((c) => html`<tr><td>${fmtDate(c.at)}</td><td>${c.from}</td><td>${c.to}</td><td>${c.purpose}</td></tr>`)}</tbody></table>` : ''}
    </article>`) : empty('Nenhuma evidência registrada.')}
  </section>`;
}

function tabIocs(inc) {
  return html`<section class="card">
    <div class="card-head"><h2>Indicadores de comprometimento</h2>
      <div class="row"><button class="btn sm" data-act="ioc-csv">${ic('down')} CSV</button><button class="btn sm" data-act="ioc-stix">${ic('down')} STIX 2.1</button>
      <button class="btn sm" data-act="ioc-bulk">Importar lista</button><button class="btn sm primary" data-act="ioc-add">${ic('plus')} Novo IOC</button></div></div>
    <p class="small muted">Compartilhe com partes interessadas designadas respeitando o TLP (RS.CO-03, DE.AE-07).</p>
    ${inc.iocs.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th>Valor</th><th>Descrição</th><th>TLP</th><th>Visto em</th><th></th></tr></thead>
      <tbody>${inc.iocs.map((x) => html`<tr><td>${x.type}</td><td><code class="wrap">${x.value}</code></td><td>${x.desc}</td><td>${tlpBadge(x.tlp)}</td><td>${when(x.firstSeen)}</td>
      <td><button class="icon-btn" data-ioc-del="${x.id}" aria-label="Remover">${ic('x')}</button></td></tr>`)}</tbody></table></div>` : empty('Nenhum indicador registrado.')}
  </section>`;
}

function tabComunicacao(inc, db) {
  const ns = notificationStatus(inc, db.regulations);
  return html`<div class="stack">
    <section class="card">
      <h2>Notificações obrigatórias (RS.CO-02)</h2>
      <div class="form-grid">
        ${field('Ciência do incidente (início da contagem)', bd('awareAt', inc))}
        ${field('Materialidade determinada em', bd('materialAt', inc))}
        <div class="span2">${bc('personalData', inc, 'Envolve dados pessoais')}</div>
      </div>
      ${ns.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Obrigação</th><th>Destinatário</th><th>Prazo</th><th>Estado</th><th></th></tr></thead>
        <tbody>${ns.map((n) => html`<tr class="ns-${n.state.replace(/\s/g, '-')}"><td><b>${n.reg.name}</b><br><small class="muted">${n.reg.note}</small></td><td>${n.reg.authority}</td>
          <td>${when(n.due)}</td><td><span class="badge ns">${n.state}</span>${n.rec.sentAt ? html`<br><small>${fmtDate(n.rec.sentAt)} ${n.rec.ref ? '· ' + n.rec.ref : ''}</small>` : ''}${n.rec.waived ? html`<br><small>${n.rec.reason}</small>` : ''}</td>
          <td><div class="row">${n.rec.sentAt || n.rec.waived ? html`<button class="btn sm ghost" data-notif-undo="${n.reg.id}">Desfazer</button>` : html`<button class="btn sm" data-notif-send="${n.reg.id}">Registrar envio</button><button class="btn sm ghost" data-notif-waive="${n.reg.id}">Dispensar</button>`}</div></td></tr>`)}</tbody></table></div>`
        : empty('Nenhuma obrigação aplicável com as regras habilitadas.', html`<a href="#/config" class="small">Configurar regras de notificação</a>`)}
      <p class="small muted">Condições: ${Object.values(CONDITIONS).join(' · ')}. Prazos em dias úteis não consideram feriados. Valide sempre com o jurídico.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Registro de comunicações (RS.CO / RC.CO)</h2>
        <div class="row"><button class="btn sm" data-act="templates">Modelos de mensagem</button><button class="btn sm primary" data-act="comm-add">${ic('plus')} Registrar comunicação</button></div></div>
      ${inc.comms.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Público</th><th>Destinatário</th><th>Canal</th><th>Resumo</th><th>CSF</th><th></th></tr></thead>
        <tbody>${[...inc.comms].sort((a, b2) => new Date(b2.at) - new Date(a.at)).map((c) => html`<tr><td>${when(c.at)}</td><td>${AUDIENCES[c.audience] || c.audience}</td><td>${c.stakeholder}</td><td>${c.channel}</td><td>${c.summary}</td><td>${fnBadge(c.csf)}</td>
        <td><button class="icon-btn" data-comm-del="${c.id}" aria-label="Remover">${ic('x')}</button></td></tr>`)}</tbody></table></div>` : empty('Nenhuma comunicação registrada.')}
    </section>
  </div>`;
}

function tabRecuperacao(inc) {
  return html`<div class="grid2">
    <section class="card">
      <h2>Início da recuperação</h2>
      ${field('Critérios para iniciar a recuperação (RS.MA-05)', bt('recovery.criteria', inc))}
      ${csfCheck(inc, 'RS.MA-05')}
      ${field('Plano e prioridades de restauração (RC.RP-01, RC.RP-02)', bt('recovery.plan', inc, 'rows="4"'))}
      ${bc('recovery.backupVerified', inc, 'Integridade dos backups e ativos de restauração verificada antes do uso (RC.RP-03)')}
      ${field('Como a integridade dos backups foi verificada', bt('recovery.backupHow', inc, 'rows="2"'))}
    </section>
    <section class="card">
      <h2>Retorno à operação</h2>
      ${field('Normas operacionais pós-incidente — funções críticas e riscos considerados (RC.RP-04)', bt('recovery.norms', inc))}
      ${bc('recovery.restoredVerified', inc, 'Integridade dos ativos restaurados verificada e operação normal confirmada (RC.RP-05)')}
      ${field('Monitoramento reforçado após a restauração', bt('recovery.monitoring', inc, 'rows="2"'))}
      ${field('Critérios de fim da recuperação (RC.RP-06)', bt('recovery.endCriteria', inc))}
      ${csfCheck(inc, 'RC.RP-06')}
    </section>
  </div>`;
}

function tabLicoes(inc, db) {
  const imps = db.improvements.filter((p) => p.source === inc.id);
  return html`<div class="grid2">
    <section class="card">
      <h2>Revisão pós-incidente (ID.IM-01, ID.IM-03)</h2>
      <div class="form-grid">
        ${field('Reunião realizada em', bd('lessons.meetingAt', inc))}
        ${field('Participantes', b('lessons.participants', inc))}
      </div>
      ${LESSON_Q.map(([k, q]) => field(q, bt(`lessons.${k}`, inc, 'rows="2"')))}
    </section>
    <section class="card">
      <div class="card-head"><h2>Melhorias geradas</h2><button class="btn sm primary" data-act="imp-add">${ic('plus')} Registrar melhoria</button></div>
      ${imps.length ? html`<ul class="list">${imps.map((p) => html`<li><b>${p.title}</b><span class="muted">${p.csf} · ${p.status} · ${contactName(db, p.owner) || 'sem responsável'}</span></li>`)}</ul>` : empty('Nenhuma melhoria registrada a partir deste incidente.')}
      <p class="small muted">As melhorias ficam no <a href="#/melhorias">backlog de melhorias</a> e alimentam Governar, Identificar e Proteger.</p>
    </section>
  </div>`;
}

function tabNist(inc) {
  const groups = [['triagem', 'Detectar e triar'], ['analise', 'Analisar e comunicar'], ['contencao', 'Conter'], ['erradicacao', 'Erradicar'], ['recuperacao', 'Recuperar'], ['pos', 'Encerrar e melhorar']];
  const all = csfProgress(inc);
  return html`<section class="card">
    <div class="card-head"><h2>Conformidade com o NIST SP 800-61r3 / CSF 2.0</h2><span>${all.done}/${all.total} · ${all.pct}%</span></div>
    ${bar(all.pct)}
    ${groups.map(([ph, name]) => { const p = csfProgress(inc, ph); return html`<h3 class="ph">${name} <small class="muted">${p.done}/${p.total}</small></h3>
      <div class="csflist">${SUBCATEGORIES.filter((s) => s.phase === ph).map((s) => html`<div>${csfCheck(inc, s.id)}
        <input class="csfnote" placeholder="Nota / evidência (opcional)" value="${inc.csf[s.id]?.note || ''}" data-csfnote="${s.id}">
        <small class="muted">${CATEGORIES[s.id.slice(0, 5)]}${inc.csf[s.id]?.at ? ` · ${fmtDate(inc.csf[s.id].at)}` : ''}</small></div>`)}</div>`; })}
  </section>`;
}

const RENDER = { visao: tabVisao, equipe: tabEquipe, anexos: tabAnexos, linha: tabLinha, tarefas: tabTarefas, analise: tabAnalise, evidencias: tabEvidencias, iocs: tabIocs, comunicacao: tabComunicacao, recuperacao: tabRecuperacao, licoes: tabLicoes, nist: tabNist };

/* ---------- Modelos de mensagem ---------- */
function templates(inc, db) {
  const lead = contactName(db, inc.roles.lead) || '[responsável]';
  const m = inc.magnitude || {};
  return {
    'Atualização interna de situação': `[${inc.tlp}] Atualização — ${inc.id}: ${inc.title}\n\nSeveridade: ${inc.severity} · Estado: ${statusById[inc.status].name}\nDeclarado em: ${fmtDate(inc.declaredAt)}\n\nResumo:\n${inc.description}\n\nAções em andamento:\n${inc.tasks.filter((t) => t.status !== 'concluida').map((t) => `- ${t.title}`).join('\n') || '- (nenhuma)'}\n\nPróxima atualização: [data/hora]\nLíder do incidente: ${lead}`,
    'Comunicação à ANPD (rascunho)': `Comunicação de incidente de segurança com dados pessoais — ${db.org.name}\n\n1. Descrição da natureza dos dados pessoais afetados: ${m.dataTypes || '[preencher]'}\n2. Informações sobre os titulares envolvidos: ${m.users ?? '[quantidade]'} titulares\n3. Medidas técnicas e de segurança utilizadas para proteção dos dados: [preencher]\n4. Riscos relacionados ao incidente e possíveis impactos: [preencher]\n5. Data da ocorrência: ${fmtDate(inc.occurredAt)} · Data da ciência: ${fmtDate(inc.awareAt)}\n6. Medidas adotadas para reverter ou mitigar os efeitos: ${inc.tasks.filter((t) => t.status === 'concluida').map((t) => t.title).join('; ') || '[preencher]'}\n7. Encarregado (DPO): ${contactName(db, inc.roles.legal) || '[nome e contato]'}\n\nObs.: confira o formulário oficial vigente da ANPD antes do envio.`,
    'Aviso aos titulares / clientes': `Assunto: Aviso sobre incidente de segurança\n\nPrezado(a),\n\nEm ${fmtDate(inc.awareAt, false)}, identificamos um incidente de segurança que pode ter envolvido seus dados (${m.dataTypes || '[tipos de dados]'}).\n\nO que aconteceu: [resumo em linguagem clara]\nO que estamos fazendo: [medidas]\nO que você pode fazer: [recomendações, ex.: trocar senhas, atenção a golpes]\n\nContato: [canal de atendimento]\n\n${db.org.name}`,
    'Comunicado público de recuperação (RC.CO-04)': `${db.org.name} informa que os serviços afetados pelo incidente identificado em ${fmtDate(inc.declaredAt, false)} ${inc.recoveredAt ? 'foram restabelecidos' : 'estão em processo de restabelecimento'}. [Detalhes aprovados pelo jurídico e comunicação.] Novas atualizações serão publicadas em [canal].`,
  };
}

export default {
  title: ([id]) => id,
  render([id, tab = 'visao']) {
    const db = store.get();
    const inc = store.incident(id);
    if (!inc) return html`<div class="page"><div class="card"><h2>Incidente ${id} não encontrado</h2><a class="btn" href="#/incidentes">Voltar</a></div></div>`;
    if (!RENDER[tab]) tab = 'visao';
    const cur = statusIndex(inc.status);
    const p = csfProgress(inc);
    return html`<div class="page">
      <div class="page-head">
        <div>
          <p class="crumb"><a href="#/incidentes">Incidentes</a> / <span class="mono">${inc.id}</span></p>
          <h1>${inc.title || '(sem título)'}</h1>
          <div class="row">${sevBadge(inc.severity)} ${statusBadge(inc.status)} ${tlpBadge(inc.tlp)} <span class="badge ghost">${inc.category}</span>
            ${inc.personalData ? html`<span class="badge warn">Dados pessoais</span>` : ''}<span class="muted small">CSF ${p.pct}%</span></div>
        </div>
        <div class="row"><a class="btn" href="#/incidente/${inc.id}/relatorio">${ic('print')} Relatório</a><button class="btn" data-act="pkg" title="JSON com o incidente e seus arquivos">${ic('down')} Pacote</button></div>
      </div>
      <ol class="stepper">${STATUSES.map((s, i) => html`<li class="${i < cur ? 'past' : i === cur ? 'cur' : ''}"><button data-status="${s.id}" title="${s.hint}" ${i === cur ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.name}</button></li>`)}</ol>
      <p class="hint-line">${ic('info')} ${statusById[inc.status].hint}</p>
      <nav class="tabs" aria-label="Seções do incidente">${TABS.map(([k, t]) => html`<a class="tab ${k === tab ? 'on' : ''}" href="#/incidente/${inc.id}/${k}">${t}${k === 'tarefas' ? html` <em>${inc.tasks.filter((x) => x.status !== 'concluida').length}</em>` : k === 'iocs' ? html` <em>${inc.iocs.length}</em>` : k === 'evidencias' ? html` <em>${inc.evidence.length}</em>` : k === 'anexos' ? html` <em>${inc.attachments.length}</em>` : k === 'equipe' ? html` <em>${teamIds(inc).length}</em>` : ''}</a>`)}</nav>
      ${RENDER[tab](inc, db)}
    </div>`;
  },

  mount(el, [id, tab = 'visao'], ctx) {
    const db = store.get();
    const inc = store.incident(id);
    if (!inc) return;
    const save = async (msg, rerender = true) => { if (msg) await store.logChange(inc, msg); else { store.recompute(inc); store.persist(); } if (rerender) ctx.rerender(); };

    // Campos ligados.
    el.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.dataset.bind) {
        const path = t.dataset.bind;
        let v = t.type === 'checkbox' ? t.checked : t.type === 'datetime-local' ? (t.value ? new Date(t.value).toISOString() : null) : t.value;
        if (t.type === 'number' || t.dataset.num) v = t.value === '' ? null : Number(t.value);
        const before = inc.severity;
        setPath(inc, path, v);
        store.recompute(inc);
        if (inc.severity !== before) { await store.logChange(inc, `Severidade: ${before} → ${inc.severity}${inc.overrideReason ? ' — ' + inc.overrideReason : ''}`); ctx.rerender(); return; }
        store.persist();
        if (['personalData', 'awareAt', 'materialAt', 'title', 'tlp', 'category'].includes(path) || path.startsWith('recovery.') && t.type === 'checkbox') ctx.rerender();
        return;
      }
      if (t.dataset.csf) {
        const now = new Date().toISOString();
        inc.csf[t.dataset.csf] = { ...(inc.csf[t.dataset.csf] || {}), done: t.checked, at: t.checked ? now : null };
        return save(`${t.dataset.csf} ${t.checked ? 'marcada como atendida' : 'desmarcada'}.`);
      }
      if (t.dataset.csfnote) { inc.csf[t.dataset.csfnote] = { ...(inc.csf[t.dataset.csfnote] || { done: false }), note: t.value }; return save(null, false); }
      if (t.dataset.tactic) {
        const s = new Set(inc.analysis.tactics || []); t.checked ? s.add(t.dataset.tactic) : s.delete(t.dataset.tactic);
        inc.analysis.tactics = [...s]; return save(null, false);
      }
      if (t.dataset.asset) {
        const s = new Set(inc.assets); t.checked ? s.add(t.dataset.asset) : s.delete(t.dataset.asset); inc.assets = [...s];
        const a = db.assets.find((x) => x.id === t.dataset.asset);
        return save(`Ativo ${t.checked ? 'vinculado' : 'desvinculado'}: ${a?.name}`);
      }
      if (t.dataset.taskDone) {
        const k = inc.tasks.find((x) => x.id === t.dataset.taskDone);
        k.status = t.checked ? 'concluida' : 'aberta'; k.doneAt = t.checked ? new Date().toISOString() : null; k.doneBy = t.checked ? store.userName() : '';
        return save(t.checked ? `Tarefa concluída: ${k.title}` : `Tarefa reaberta: ${k.title}`);
      }
      if (t.dataset.task) {
        const k = inc.tasks.find((x) => x.id === t.dataset.task);
        k[t.dataset.k] = t.type === 'datetime-local' ? (t.value ? new Date(t.value).toISOString() : null) : t.value;
        if (t.dataset.k === 'status') return save(`Tarefa "${k.title}": ${TASK_ST[k.status]}`);
        return save(null, false);
      }
      if (t.dataset.step) {
        const [tid, sid] = t.dataset.step.split(':');
        const k = inc.tasks.find((x) => x.id === tid); const st = k.steps.find((x) => x.id === sid);
        Object.assign(st, { done: t.checked, doneBy: t.checked ? store.userName() : '', doneAt: t.checked ? new Date().toISOString() : null });
        if (k.steps.every((x) => x.done) && k.status !== 'concluida') Object.assign(k, { status: 'concluida', doneAt: new Date().toISOString(), doneBy: store.userName() });
        else if (!k.steps.every((x) => x.done) && k.status === 'concluida') k.status = 'andamento';
        else if (t.checked && k.status === 'aberta') k.status = 'andamento';
        return save(`Passo ${t.checked ? 'concluído' : 'reaberto'} em "${k.title}": ${st.text}`);
      }
      if (t.dataset.tool) {
        const s = new Set(inc.tools); t.checked ? s.add(t.dataset.tool) : s.delete(t.dataset.tool); inc.tools = [...s];
        return save(null, false);
      }
      if (t.dataset.act === 'team-add' && t.value) {
        inc.team = [...new Set([...(inc.team || []), t.value])];
        return save(`Pessoa atribuída ao incidente: ${contactName(db, t.value)}`);
      }
      if (t.dataset.act === 'apply-pop' && t.value) {
        const pop = db.procedures.find((x) => x.id === t.value);
        const roles = pop.steps.map((x) => x.role).filter(Boolean);
        const mainRole = roles.sort((a2, b2) => roles.filter((r) => r === b2).length - roles.filter((r) => r === a2).length)[0];
        inc.tasks.push({ id: uid('k'), title: `Procedimento: ${pop.name}`, phase: pop.phase || inc.status, csf: pop.csf, procedure: pop.id, required: true, status: 'aberta', due: null,
          owner: inc.roles[mainRole] || inc.roles.handler || inc.roles.lead || '',
          steps: pop.steps.map((x) => ({ id: uid('s'), text: x.title, role: x.role, tech: x.tech, done: false })) });
        toast(`Procedimento aplicado com ${pop.steps.length} passos.`);
        return save(`Procedimento aplicado: ${pop.name} v${pop.version}`);
      }
      if (t.dataset.act === 'apply-pb' && t.value) {
        const pb = playbookById[t.value];
        if (inc.playbooks.includes(pb.id) && !(await confirmBox('Playbook já aplicado', 'Adicionar as etapas novamente?'))) { t.value = ''; return; }
        inc.tasks.push(...playbookTasks(pb.id).map((k) => ({ ...k, owner: inc.roles[PHASE_ROLE[k.phase]] || inc.roles.handler || inc.roles.lead || '' })));
        inc.playbooks = [...new Set([...inc.playbooks, pb.id])];
        toast(`${pb.steps.length} tarefas adicionadas.`);
        return save(`Playbook aplicado: ${pb.name}`);
      }
    });

    el.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const d = t.dataset;

      if (d.status) {
        const to = d.status;
        if (to === inc.status) return;
        const blockers = statusIndex(to) > statusIndex(inc.status) ? phaseBlockers(inc, to) : [];
        if (blockers.length && db.org.enforceGates) {
          modal('Avanço bloqueado', html`<div class="warnbox"><b>Conclua as tarefas obrigatórias antes de avançar para "${statusById[to].name}":</b>
            <ul>${blockers.map((k) => html`<li>${statusById[k.phase].name}: ${k.title}${k.owner ? ` — ${contactName(db, k.owner)}` : ''}</li>`)}</ul></div>
            <p class="small muted">O controle de fases pode ser alterado em Configurações.</p>`);
          return;
        }
        const warns = [...blockers.map((k) => `Tarefa obrigatória pendente: ${k.title}`), ...transitionWarnings(inc, to)];
        modal(`Mover para "${statusById[to].name}"`, html`
          ${warns.length ? html`<div class="warnbox"><b>Atenção (boas práticas da Rev. 3):</b><ul>${warns.map((w) => html`<li>${w}</li>`)}</ul><p class="small">Você pode prosseguir mesmo assim.</p></div>` : ''}
          ${field('Justificativa / observação (vai para a linha do tempo)', textarea('note', '', 'rows="2"'))}`, {
          submitLabel: 'Confirmar',
          onSubmit: async (f) => {
            await store.setStatus(inc, to, f.note);
            const now = new Date().toISOString();
            if (inc.containedAt && !inc.csf['RS.MI-01']?.done) inc.csf['RS.MI-01'] = { done: true, at: now, note: 'Registrado na mudança de estado' };
            if (inc.eradicatedAt && !inc.csf['RS.MI-02']?.done) inc.csf['RS.MI-02'] = { done: true, at: now, note: 'Registrado na mudança de estado' };
            if (inc.triagedAt && !inc.csf['RS.MA-02']?.done) inc.csf['RS.MA-02'] = { done: true, at: now, note: 'Registrado na mudança de estado' };
            store.persist(); ctx.rerender();
          },
        });
      }

      if (d.act === 'pkg') {
        const files = await packFiles(inc.attachments);
        download(`${inc.id}.blade.json`, JSON.stringify({ kind: 'blade-incident-package', version: 1, exportedAt: new Date().toISOString(), exportedBy: store.userName(), incident: inc, files }, null, 2));
        store.audit('Pacote do incidente exportado', inc.id, `${files.length} arquivo(s)`); store.persist();
      }
      if (d.act === 'tl-csv') download(`${inc.id}-linha-do-tempo.csv`, toCSV([['quando', 'registrado', 'autor', 'fase', 'tipo', 'registro', 'sha256'], ...[...inc.timeline].sort((a2, b2) => new Date(a2.at) - new Date(b2.at)).map((x) => [x.at, x.recordedAt, x.author, x.phase || '', x.type, x.text, x.hash])]), 'text/csv');
      if (d.tlf !== undefined) {
        el.querySelectorAll('[data-tlf]').forEach((x) => x.classList.toggle('on', x === t));
        el.querySelectorAll('.timeline li').forEach((li) => { li.hidden = d.tlf && li.dataset.type !== d.tlf; });
      }
      if (d.teamDel) { inc.team = inc.team.filter((x) => x !== d.teamDel); return save(`Pessoa removida da equipe: ${contactName(db, d.teamDel)}`); }
      if (d.taskReq) { const k = inc.tasks.find((x) => x.id === d.taskReq); k.required = !k.required; return save(`Tarefa "${k.title}" marcada como ${k.required ? 'obrigatória' : 'opcional'}`); }
      if (d.taskStep) {
        const k = inc.tasks.find((x) => x.id === d.taskStep);
        modal(`Adicionar passo — ${k.title}`, html`${field('Passo', input('text', '', 'required'))}${field('Papel', select('role', [{ v: '', t: '—' }, ...ROLES.map((r) => ({ v: r.id, t: r.name }))], ''))}`, {
          onSubmit: (f) => { k.steps = [...(k.steps || []), { id: uid('s'), done: false, ...f }]; if (k.status === 'concluida') k.status = 'andamento'; return save(`Passo adicionado em "${k.title}": ${f.text}`); },
        });
      }
      if (d.fileView) return viewFile(inc.attachments.find((a) => a.id === d.fileView));
      if (d.fileDl) { const a = inc.attachments.find((x) => x.id === d.fileDl); const b2 = await getBlob(a.id); if (!b2) return toast('Arquivo não encontrado neste navegador.', 'err'); downloadBlob(a.name, b2); }
      if (d.fileDel) {
        const a = inc.attachments.find((x) => x.id === d.fileDel);
        if (!(await confirmBox('Remover arquivo', `Remover "${a.name}"? O registro na linha do tempo (com o hash) é mantido.`, { danger: true }))) return;
        await deleteFile(a.id).catch(() => {}); inc.attachments = inc.attachments.filter((x) => x.id !== a.id);
        return save(`Arquivo removido: ${a.name} (SHA-256 ${a.sha256.slice(0, 16)}…)`);
      }
      if (d.act === 'delete' && await confirmBox('Excluir incidente', `Excluir ${inc.id} permanentemente? Exporte antes se precisar manter o registro.`, { danger: true, label: 'Excluir' })) {
        db.incidents = db.incidents.filter((x) => x.id !== inc.id);
        store.audit('Incidente excluído', inc.id, inc.title); store.persist(); ctx.go('#/incidentes');
      }

      if (d.act === 'verify') {
        const bad = await chainVerify(inc.timeline);
        if (bad < 0) toast(`Integridade confirmada: ${inc.timeline.length} registros íntegros.`);
        else toast(`Cadeia quebrada no registro ${bad + 1}: possível adulteração.`, 'err');
        store.audit('Verificação de integridade', inc.id, bad < 0 ? 'íntegra' : `falha em ${bad + 1}`); store.persist();
      }
      if (d.act === 'tl-add') {
        modal('Registrar na linha do tempo', html`<div class="form-grid">
          ${field('Quando ocorreu', dt('at', new Date().toISOString(), 'required'))}
          ${field('Tipo', select('type', Object.entries(TL_TYPES).filter(([k]) => !['status', 'sistema'].includes(k)).map(([v, t2]) => ({ v, t: t2 })), 'acao'))}
          <div class="span2">${field('Descrição', textarea('text', '', 'required rows="3"'))}</div>
          <div class="span2">${field('Anexar arquivos / imagens (opcional)', raw('<input type="file" name="_files" multiple>'), 'O hash de cada arquivo passa a integrar o registro encadeado.')}</div></div>`, {
          onSubmit: async (f, form) => {
            const metas = await storeFiles([...form.querySelector('[name=_files]').files], 'timeline');
            await store.addTimeline(inc, { ...f, files: metas.map((m) => m.sha256), fileIds: metas.map((m) => m.id) });
            store.audit('Registro na linha do tempo', inc.id, f.type); store.persist(); ctx.rerender();
          },
        });
      }

      if (d.act === 'task-add') {
        modal('Nova tarefa', html`<div class="form-grid">
          <div class="span2">${field('Tarefa', input('title', '', 'required'))}</div>
          ${field('Fase', select('phase', STATUSES.filter((s) => s.id !== 'encerrado').map((s) => ({ v: s.id, t: s.name })), inc.status === 'encerrado' ? 'pos' : inc.status))}
          ${field('Subcategoria CSF', select('csf', [{ v: '', t: '—' }, ...SUBCATEGORIES.map((s) => ({ v: s.id, t: `${s.id} — ${s.text.slice(0, 60)}…` }))], ''))}
          ${field('Responsável', select('owner', contactOpts(db), ''))}
          ${field('Prazo', dt('due', null))}
          <label class="chk span2"><input type="checkbox" name="required"> Obrigatória para avançar de fase</label></div>`, {
          onSubmit: (f) => { inc.tasks.push({ id: uid('k'), status: 'aberta', ...f }); return save(`Tarefa criada: ${f.title}${f.owner ? ' → ' + contactName(db, f.owner) : ''}`); },
        });
      }
      if (d.taskDel) { const k = inc.tasks.find((x) => x.id === d.taskDel); inc.tasks = inc.tasks.filter((x) => x.id !== d.taskDel); return save(`Tarefa removida: ${k.title}`); }

      if (d.act === 'ev-add') {
        const dlg = modal('Nova evidência', html`<div class="form-grid">
          <div class="span2">${field('Arquivo (opcional — calcula SHA-256 localmente)', raw('<input type="file" id="evfile">'))}</div>
          ${field('Nome / descrição', input('name', '', 'required'))}
          ${field('Tipo', select('type', ['Imagem de disco', 'Memória', 'Log', 'Captura de rede (PCAP)', 'E-mail', 'Arquivo / amostra', 'Captura de tela', 'Documento', 'Outro'], 'Log'))}
          ${field('Algoritmo', select('hashAlg', ['SHA-256', 'SHA-1', 'MD5'], 'SHA-256'))}
          ${field('Hash', input('hash', ''))}
          ${field('Coletado por', input('collectedBy', store.userName(), 'required'))}
          ${field('Coletado em', dt('collectedAt', new Date().toISOString()))}
          <div class="span2">${field('Local de armazenamento', input('location', ''))}</div>
          <label class="chk span2"><input type="checkbox" name="keep" checked> Guardar cópia do arquivo na plataforma (aba Arquivos)</label>
          <input type="hidden" name="size" data-type="number"></div>`, {
          onSubmit: async (f, form) => {
            const file = form.querySelector('#evfile').files[0];
            const { keep, ...ev } = f;
            if (file && keep) { const [m] = await storeFiles([file], 'evidence', false); ev.fileId = m.id; }
            inc.evidence.push({ id: uid('e'), custody: [], ...ev }); if (!inc.csf['RS.AN-07']?.done) inc.csf['RS.AN-07'] = { done: true, at: new Date().toISOString(), note: 'Evidência registrada' }; return save(`Evidência registrada: ${f.name} (${f.hashAlg} ${f.hash || 'sem hash'})`); },
        });
        dlg.querySelector('#evfile').addEventListener('change', async (ev) => {
          const file = ev.target.files[0]; if (!file) return;
          const form = dlg.querySelector('form');
          form.name.value ||= file.name; form.hashAlg.value = 'SHA-256'; form.size.value = file.size;
          form.hash.value = 'calculando…';
          form.hash.value = await sha256Buffer(await file.arrayBuffer());
        });
      }
      if (d.evTransfer) {
        const ev = inc.evidence.find((x) => x.id === d.evTransfer);
        const last = ev.custody?.at(-1)?.to || ev.collectedBy;
        modal(`Transferir custódia — ${ev.name}`, html`<div class="form-grid">
          ${field('De', input('from', last, 'required'))}${field('Para', input('to', '', 'required'))}
          ${field('Data', dt('at', new Date().toISOString()))}${field('Finalidade', input('purpose', '', 'required'))}</div>`, {
          onSubmit: (f) => { ev.custody = [...(ev.custody || []), f]; return save(`Custódia de "${ev.name}": ${f.from} → ${f.to} (${f.purpose})`); },
        });
      }
      if (d.evDel && await confirmBox('Remover evidência', 'O registro será removido (a linha do tempo mantém o histórico).', { danger: true })) {
        const ev = inc.evidence.find((x) => x.id === d.evDel); inc.evidence = inc.evidence.filter((x) => x.id !== d.evDel); return save(`Evidência removida do inventário: ${ev.name}`);
      }

      if (d.act === 'ioc-add') {
        modal('Novo indicador', html`<div class="form-grid">
          ${field('Tipo', select('type', IOC_TYPES, 'IPv4'))}${field('TLP', select('tlp', TLP, inc.tlp))}
          <div class="span2">${field('Valor', input('value', '', 'required'))}</div>
          ${field('Descrição', input('desc', ''))}${field('Visto pela primeira vez', dt('firstSeen', new Date().toISOString()))}</div>`, {
          onSubmit: (f) => { inc.iocs.push({ id: uid('i'), ...f }); return save(`IOC adicionado: ${f.type} ${f.value}`); },
        });
      }
      if (d.act === 'ioc-bulk') {
        modal('Importar indicadores', field('Um indicador por linha — o tipo é detectado automaticamente', textarea('list', '', 'rows="8" required')), {
          onSubmit: (f) => {
            const vals = f.list.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            const have = new Set(inc.iocs.map((x) => x.value));
            const add = vals.filter((v) => !have.has(v)).map((v) => ({ id: uid('i'), type: detectIoc(v), value: v, desc: 'Importado em lote', tlp: inc.tlp, firstSeen: new Date().toISOString() }));
            inc.iocs.push(...add); toast(`${add.length} indicador(es) importado(s).`);
            return save(`${add.length} IOC(s) importado(s) em lote`);
          },
        });
      }
      if (d.iocDel) { inc.iocs = inc.iocs.filter((x) => x.id !== d.iocDel); return save(null); }
      if (d.act === 'ioc-csv') download(`${inc.id}-iocs.csv`, toCSV([['tipo', 'valor', 'descricao', 'tlp', 'visto_em'], ...inc.iocs.map((x) => [x.type, x.value, x.desc, x.tlp, x.firstSeen])]), 'text/csv');
      if (d.act === 'ioc-stix') download(`${inc.id}-stix.json`, JSON.stringify(stixBundle(inc, db), null, 2));

      if (d.notifSend) {
        const reg = db.regulations.find((r) => r.id === d.notifSend);
        modal(`Registrar envio — ${reg.name}`, html`<div class="form-grid">
          ${field('Enviado em', dt('sentAt', new Date().toISOString(), 'required'))}${field('Protocolo / referência', input('ref', ''))}
          <div class="span2">${field('Observações', textarea('notes', '', 'rows="2"'))}</div></div>`, {
          onSubmit: (f) => {
            inc.notifications = inc.notifications.filter((n) => n.regId !== reg.id).concat({ regId: reg.id, ...f });
            inc.comms.push({ id: uid('m'), at: f.sentAt, audience: 'regulador', stakeholder: reg.authority, channel: 'Notificação formal', summary: `${reg.name}${f.ref ? ' · ' + f.ref : ''}`, csf: 'RS.CO-02' });
            inc.csf['RS.CO-02'] = { done: true, at: f.sentAt, note: reg.name };
            return save(`Notificação enviada: ${reg.name}${f.ref ? ' (protocolo ' + f.ref + ')' : ''}`);
          },
        });
      }
      if (d.notifWaive) {
        const reg = db.regulations.find((r) => r.id === d.notifWaive);
        modal(`Dispensar — ${reg.name}`, field('Justificativa (ex.: sem risco ou dano relevante, conforme avaliação do DPO)', textarea('reason', '', 'required rows="3"')), {
          onSubmit: (f) => { inc.notifications = inc.notifications.filter((n) => n.regId !== reg.id).concat({ regId: reg.id, waived: true, reason: f.reason }); return save(`Notificação dispensada: ${reg.name} — ${f.reason}`); },
        });
      }
      if (d.notifUndo) { inc.notifications = inc.notifications.filter((n) => n.regId !== d.notifUndo); return save(`Registro de notificação desfeito: ${d.notifUndo}`); }

      if (d.act === 'comm-add') {
        modal('Registrar comunicação', html`<div class="form-grid">
          ${field('Data', dt('at', new Date().toISOString()))}${field('Público', select('audience', Object.entries(AUDIENCES).map(([v, t2]) => ({ v, t: t2 })), 'interno'))}
          ${field('Destinatário', input('stakeholder', '', 'required'))}${field('Canal', input('channel', 'E-mail'))}
          ${field('Subcategoria', select('csf', COMM_CSF.map((c) => ({ v: c, t: `${c} — ${subById[c].text.slice(0, 50)}…` })), inc.status === 'recuperacao' ? 'RC.CO-03' : 'RS.CO-02'))}
          <div class="span2">${field('Resumo', textarea('summary', '', 'required rows="3"'))}</div></div>`, {
          onSubmit: (f) => { inc.comms.push({ id: uid('m'), ...f }); return save(`Comunicação (${AUDIENCES[f.audience]}) para ${f.stakeholder}: ${f.summary}`); },
        });
      }
      if (d.commDel) { inc.comms = inc.comms.filter((x) => x.id !== d.commDel); return save(null); }
      if (d.act === 'templates') {
        const tp = templates(inc, db);
        const dlg = modal('Modelos de mensagem', html`${field('Modelo', select('tpl', Object.keys(tp), Object.keys(tp)[0], 'id="tplsel"'))}
          ${textarea('body', Object.values(tp)[0], 'id="tplbody" rows="14" class="mono"')}
          <div class="row"><button type="button" class="btn sm" id="tplcopy">Copiar</button></div>`, { wide: true });
        dlg.querySelector('#tplsel').addEventListener('change', (ev) => { dlg.querySelector('#tplbody').value = tp[ev.target.value]; });
        dlg.querySelector('#tplcopy').addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(dlg.querySelector('#tplbody').value); toast('Copiado.'); } catch { dlg.querySelector('#tplbody').select(); }
        });
      }

      if (d.act === 'imp-add') {
        modal('Registrar melhoria', html`<div class="form-grid">
          <div class="span2">${field('Melhoria', input('title', '', 'required'))}</div>
          ${field('Subcategoria CSF alvo', input('csf', 'ID.IM-04', 'placeholder="ex.: PR.AA-03"'))}
          ${field('Prioridade', select('priority', [{ v: 'alta', t: 'Alta' }, { v: 'media', t: 'Média' }, { v: 'baixa', t: 'Baixa' }], 'media'))}
          ${field('Responsável', select('owner', contactOpts(db), ''))}${field('Prazo', dt('due', null))}</div>`, {
          onSubmit: (f) => {
            db.improvements.unshift({ id: uid('p'), status: 'aberta', source: inc.id, ...f });
            inc.csf['ID.IM-03'] = inc.csf['ID.IM-03']?.done ? inc.csf['ID.IM-03'] : { done: true, at: new Date().toISOString(), note: 'Melhoria registrada' };
            return save(`Melhoria registrada: ${f.title}`);
          },
        });
      }
    });

    // Upload por seleção, arrastar-e-soltar ou colar (Ctrl+V).
    const up = el.querySelector('#upfiles');
    const drop = el.querySelector('#drop');
    const addAndRender = async (files) => { if (!files.length) return; await storeFiles(files, 'general'); ctx.rerender(); };
    up?.addEventListener('change', () => addAndRender([...up.files]));
    drop?.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop?.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop?.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addAndRender([...e.dataTransfer.files]); });
    const onPaste = (e) => {
      if (tab !== 'anexos' || e.target.closest?.('input,textarea')) return;
      const files = [...(e.clipboardData?.files || [])].map((f, n) => (f.name && f.name !== 'image.png' ? f : new File([f], `captura-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}${n ? '-' + n : ''}.png`, { type: f.type })));
      if (files.length) { e.preventDefault(); addAndRender(files); }
    };
    document.addEventListener('paste', onPaste);

    // Miniaturas de imagens (URLs temporárias liberadas ao sair da tela).
    const urls = [];
    el.querySelectorAll('img[data-thumb]').forEach(async (img) => {
      const u = await objectURL(img.dataset.thumb).catch(() => null);
      if (u) { urls.push(u); img.src = u; } else img.replaceWith(Object.assign(document.createElement('span'), { className: 'fext', textContent: 'n/d' }));
    });
    return () => { document.removeEventListener('paste', onPaste); urls.forEach((u) => URL.revokeObjectURL(u)); };

    // Salva arquivos no navegador, vincula ao incidente e registra o hash na linha do tempo.
    async function storeFiles(files, context, log = true) {
      const metas = [];
      for (const f of files) {
        try {
          const m = await saveFile(f, { context, addedBy: store.userName() });
          inc.attachments.push(m); metas.push(m);
        } catch (err) { toast(err.message, 'err'); }
      }
      if (metas.length && log && context === 'general') {
        await store.addTimeline(inc, { type: 'evidencia', text: `Arquivo(s) anexado(s): ${metas.map((m) => `${m.name} (${fmtSize(m.size)})`).join(', ')}`, files: metas.map((m) => m.sha256), fileIds: metas.map((m) => m.id) });
      }
      if (metas.length) { store.audit('Arquivo anexado', inc.id, metas.map((m) => m.name).join(', ')); store.persist(); toast(`${metas.length} arquivo(s) guardado(s).`); }
      return metas;
    }
  },
};

// Papel sugerido para tarefas de playbook em cada fase.
const PHASE_ROLE = { triagem: 'handler', analise: 'handler', contencao: 'tech', erradicacao: 'tech', recuperacao: 'tech', pos: 'lead' };

function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

async function viewFile(a) {
  if (!a) return;
  const blob = await getBlob(a.id).catch(() => null);
  if (!blob) return toast('O conteúdo deste arquivo não está neste navegador (importe o pacote do incidente).', 'err');
  const url = URL.createObjectURL(blob);
  const body = isImage(a) ? html`<img class="preview" src="${url}" alt="${a.name}">`
    : a.type === 'application/pdf' ? html`<iframe class="preview" src="${url}" title="${a.name}"></iframe>`
    : /^text\/|json|csv|xml|log/.test(a.type + a.name) ? html`<pre class="preview">${(await blob.text()).slice(0, 200000)}</pre>`
    : html`<p class="muted">Pré-visualização indisponível para este tipo de arquivo.</p>`;
  const dlg = modal(a.name, html`${body}<dl class="dl small"><dt>Tipo</dt><dd>${a.type}</dd><dt>Tamanho</dt><dd>${fmtSize(a.size)}</dd><dt>SHA-256</dt><dd><code class="wrap">${a.sha256}</code></dd>
    <dt>Adicionado</dt><dd>${a.addedBy || ''} · ${fmtDate(a.addedAt)}</dd></dl>`, { wide: true });
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn primary'; btn.textContent = 'Baixar';
  btn.addEventListener('click', () => downloadBlob(a.name, blob));
  dlg.querySelector('footer').appendChild(btn);
  dlg.addEventListener('close', () => URL.revokeObjectURL(url));
}

export function detectIoc(v) {
  if (/^(\d{1,3}\.){3}\d{1,3}(\/\d+)?$/.test(v)) return 'IPv4';
  if (/^[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,7}(\/\d+)?$/i.test(v)) return 'IPv6';
  if (/^[a-f0-9]{64}$/i.test(v)) return 'Hash SHA-256';
  if (/^[a-f0-9]{40}$/i.test(v)) return 'Hash SHA-1';
  if (/^[a-f0-9]{32}$/i.test(v)) return 'Hash MD5';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'E-mail';
  if (/^(https?|hxxps?):\/\//i.test(v)) return 'URL';
  if (/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v)) return 'Domínio';
  if (/^HK(LM|CU|EY)/i.test(v)) return 'Chave de registro';
  return 'Outro';
}

// Exporta IOCs como bundle STIX 2.1 (indicadores com padrões simples).
export function stixBundle(inc, db) {
  const now = new Date().toISOString();
  const tlpMarking = { CLEAR: 'marking-definition--94868c89-83c2-464b-929b-a1a8aa3c8487', GREEN: 'marking-definition--bab4a63c-aed9-4cf5-a766-dfca5abac2bb', AMBER: 'marking-definition--55d920b0-5e8b-4f79-9ee9-91f868d9b421', 'AMBER+STRICT': 'marking-definition--939a9414-2ddd-4d32-a0cd-375ea402b003', RED: 'marking-definition--e828b379-4e03-4974-9ac4-e53a884c97c1' };
  const pat = (x) => {
    const v = x.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/^hxxp/i, 'http');
    switch (x.type) {
      case 'IPv4': return `[ipv4-addr:value = '${v}']`;
      case 'IPv6': return `[ipv6-addr:value = '${v}']`;
      case 'Domínio': return `[domain-name:value = '${v}']`;
      case 'URL': return `[url:value = '${v}']`;
      case 'E-mail': return `[email-addr:value = '${v}']`;
      case 'Hash MD5': return `[file:hashes.MD5 = '${v}']`;
      case 'Hash SHA-1': return `[file:hashes.'SHA-1' = '${v}']`;
      case 'Hash SHA-256': return `[file:hashes.'SHA-256' = '${v}']`;
      case 'Nome de arquivo': return `[file:name = '${v}']`;
      case 'Chave de registro': return `[windows-registry-key:key = '${v}']`;
      case 'Processo': return `[process:name = '${v}']`;
      default: return null;
    }
  };
  const uuid = () => crypto.randomUUID();
  const identity = { type: 'identity', spec_version: '2.1', id: `identity--${uuid()}`, created: now, modified: now, name: db.org.name, identity_class: 'organization' };
  const objs = inc.iocs.map((x) => ({ x, p: pat(x) })).filter((o) => o.p).map(({ x, p }) => ({
    type: 'indicator', spec_version: '2.1', id: `indicator--${uuid()}`, created: now, modified: now, created_by_ref: identity.id,
    name: `${x.type}: ${x.value}`, description: x.desc || undefined, pattern: p, pattern_type: 'stix', valid_from: x.firstSeen || now,
    indicator_types: ['malicious-activity'], object_marking_refs: tlpMarking[x.tlp] ? [tlpMarking[x.tlp]] : undefined,
    labels: [inc.id],
  }));
  return { type: 'bundle', id: `bundle--${uuid()}`, objects: [identity, ...objs] };
}
