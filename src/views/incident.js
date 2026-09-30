// Detalhe do incidente: gestão completa pelo ciclo Detectar → Responder → Recuperar → Melhoria.
import * as store from '../core/store.js';
import { html, raw, uid, fmtDate, fmtDuration, download, toCSV } from '../core/util.js';
import { STATUSES, statusById, statusIndex, SUBCATEGORIES, subById, ROLES, CATEGORIES_INCIDENT, TLP, MITRE_TACTICS, IOC_TYPES, CATEGORIES } from '../core/nist.js';
import { slaStatus, notificationStatus, transitionWarnings, csfProgress, chainVerify, sha256Buffer, priorityScore, SEVERITIES, CONDITIONS, FACTORS } from '../core/engine.js';
import { PLAYBOOKS, playbookById } from '../data/playbooks.js';
import { ic, sevBadge, statusBadge, fnBadge, tlpBadge, field, input, dt, textarea, select, modal, confirmBox, toast, when, empty, bar } from '../ui.js';
import { playbookTasks } from './incidents.js';

const TABS = [
  ['visao', 'Visão geral'], ['linha', 'Linha do tempo'], ['tarefas', 'Tarefas'], ['analise', 'Análise'], ['evidencias', 'Evidências'],
  ['iocs', 'Indicadores'], ['comunicacao', 'Comunicação'], ['recuperacao', 'Recuperação'], ['licoes', 'Lições aprendidas'], ['nist', 'Conformidade NIST'],
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
  return html`<div class="grid2">
    <section class="card">
      <h2>Dados do incidente</h2>
      <div class="form-grid">
        <div class="span2">${field('Título', b('title', inc))}</div>
        ${field('Categoria', bs('category', inc, CATEGORIES_INCIDENT))}
        ${field('TLP (compartilhamento)', bs('tlp', inc, TLP))}
        <div class="span2">${field('Descrição', bt('description', inc, 'rows="4"'))}</div>
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
        <h2>Priorização (RS.MA-03)</h2>
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
      <section class="card">
        <h2>Papéis e responsabilidades</h2>
        <div class="form-grid">${ROLES.map((r) => field(r.name, bs(`roles.${r.id}`, inc, contactOpts(db))))}</div>
        <p class="small muted">Cadastre pessoas em <a href="#/preparacao/equipe">Preparação → Equipe</a>.</p>
      </section>
      <section class="card danger-zone">
        <h2>Zona de risco</h2>
        <button class="btn danger sm" data-act="delete">${ic('trash')} Excluir incidente</button>
      </section>
    </div>
  </div>`;
}

function tabLinha(inc) {
  const items = [...inc.timeline].sort((a, b) => new Date(a.at) - new Date(b.at));
  return html`<section class="card">
    <div class="card-head"><h2>Linha do tempo (RS.AN-06)</h2>
      <div class="row"><button class="btn sm" data-act="verify">${ic('lock')} Verificar integridade</button><button class="btn sm primary" data-act="tl-add">${ic('plus')} Registrar</button></div></div>
    <p class="small muted">Cada registro é encadeado por SHA-256 com o anterior (autor, horário do fato e do registro), preservando integridade e proveniência. Registros não podem ser editados — corrija com um novo registro.</p>
    <ol class="timeline">${items.map((e) => html`<li class="tl-${e.type}">
      <div class="tl-when">${when(e.at)}<small>registrado ${fmtDate(e.recordedAt)} por ${e.author}</small></div>
      <div class="tl-body"><span class="badge ghost">${TL_TYPES[e.type] || e.type}</span> ${e.text}<code class="hash" title="SHA-256">${e.hash.slice(0, 16)}…</code></div></li>`)}</ol>
  </section>`;
}

function tabTarefas(inc, db) {
  const phases = STATUSES.filter((s) => s.id !== 'encerrado');
  return html`<section class="card">
    <div class="card-head"><h2>Tarefas e ações</h2>
      <div class="row">${select('pb', [{ v: '', t: 'Aplicar playbook…' }, ...PLAYBOOKS.map((p) => ({ v: p.id, t: p.name }))], '', 'data-act="apply-pb"')}
      <button class="btn sm primary" data-act="task-add">${ic('plus')} Nova tarefa</button></div></div>
    ${inc.playbooks.length ? html`<p class="small muted">Playbooks aplicados: ${inc.playbooks.map((p) => playbookById[p]?.name).join(', ')}</p>` : ''}
    ${phases.map((ph) => {
      const ts = inc.tasks.filter((t) => t.phase === ph.id);
      if (!ts.length) return '';
      return html`<h3 class="ph">${ph.name} <small class="muted">${ts.filter((t) => t.status === 'concluida').length}/${ts.length}</small></h3>
      <div class="table-wrap"><table class="tbl tasks"><tbody>${ts.map((t) => html`<tr class="${t.status === 'concluida' ? 'done' : ''}">
        <td><input type="checkbox" data-task-done="${t.id}" ${t.status === 'concluida' ? 'checked' : ''} aria-label="Concluída"></td>
        <td>${t.title}</td><td>${t.csf ? fnBadge(t.csf) : ''}</td>
        <td>${select('', contactOpts(db), t.owner, `data-task="${t.id}" data-k="owner" aria-label="Responsável"`)}</td>
        <td>${dt('', t.due, `data-task="${t.id}" data-k="due" aria-label="Prazo"`)}</td>
        <td>${select('', Object.entries(TASK_ST).map(([v, t2]) => ({ v, t: t2 })), t.status, `data-task="${t.id}" data-k="status" aria-label="Estado"`)}</td>
        <td><button class="icon-btn" data-task-del="${t.id}" aria-label="Remover">${ic('x')}</button></td></tr>`)}</tbody></table></div>`;
    })}
    ${!inc.tasks.length ? empty('Sem tarefas. Aplique um playbook ou crie tarefas manualmente.') : ''}
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
    <p class="small muted">O hash SHA-256 de arquivos é calculado localmente no navegador; o arquivo não é enviado nem armazenado.</p>
    ${inc.evidence.length ? inc.evidence.map((e) => html`<article class="evid">
      <div class="card-head"><h3>${e.name}</h3><div class="row"><button class="btn sm" data-ev-transfer="${e.id}">Transferir custódia</button><button class="icon-btn" data-ev-del="${e.id}" aria-label="Remover">${ic('x')}</button></div></div>
      <dl class="dl">
        <dt>Tipo</dt><dd>${e.type}</dd><dt>Hash</dt><dd><code class="wrap">${e.hashAlg}: ${e.hash || '—'}</code></dd>
        <dt>Coletado por</dt><dd>${e.collectedBy} em ${fmtDate(e.collectedAt)}</dd><dt>Local</dt><dd>${e.location || '—'}</dd>
        ${e.size ? html`<dt>Tamanho</dt><dd>${e.size.toLocaleString('pt-BR')} bytes</dd>` : ''}
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
          <td class="row">${n.rec.sentAt || n.rec.waived ? html`<button class="btn sm ghost" data-notif-undo="${n.reg.id}">Desfazer</button>` : html`<button class="btn sm" data-notif-send="${n.reg.id}">Registrar envio</button><button class="btn sm ghost" data-notif-waive="${n.reg.id}">Dispensar</button>`}</td></tr>`)}</tbody></table></div>`
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

const RENDER = { visao: tabVisao, linha: tabLinha, tarefas: tabTarefas, analise: tabAnalise, evidencias: tabEvidencias, iocs: tabIocs, comunicacao: tabComunicacao, recuperacao: tabRecuperacao, licoes: tabLicoes, nist: tabNist };

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
        <div class="row"><a class="btn" href="#/incidente/${inc.id}/relatorio">${ic('print')} Relatório</a><button class="btn" data-act="export">${ic('down')} JSON</button></div>
      </div>
      <ol class="stepper">${STATUSES.map((s, i) => html`<li class="${i < cur ? 'past' : i === cur ? 'cur' : ''}"><button data-status="${s.id}" title="${s.hint}" ${i === cur ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.name}</button></li>`)}</ol>
      <p class="hint-line">${ic('info')} ${statusById[inc.status].hint}</p>
      <nav class="tabs" aria-label="Seções do incidente">${TABS.map(([k, t]) => html`<a class="tab ${k === tab ? 'on' : ''}" href="#/incidente/${inc.id}/${k}">${t}${k === 'tarefas' ? html` <em>${inc.tasks.filter((x) => x.status !== 'concluida').length}</em>` : k === 'iocs' ? html` <em>${inc.iocs.length}</em>` : k === 'evidencias' ? html` <em>${inc.evidence.length}</em>` : ''}</a>`)}</nav>
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
        k.status = t.checked ? 'concluida' : 'aberta'; k.doneAt = t.checked ? new Date().toISOString() : null;
        return save(t.checked ? `Tarefa concluída: ${k.title}` : `Tarefa reaberta: ${k.title}`);
      }
      if (t.dataset.task) {
        const k = inc.tasks.find((x) => x.id === t.dataset.task);
        k[t.dataset.k] = t.type === 'datetime-local' ? (t.value ? new Date(t.value).toISOString() : null) : t.value;
        if (t.dataset.k === 'status') return save(`Tarefa "${k.title}": ${TASK_ST[k.status]}`);
        return save(null, false);
      }
      if (t.dataset.act === 'apply-pb' && t.value) {
        const pb = playbookById[t.value];
        if (inc.playbooks.includes(pb.id) && !(await confirmBox('Playbook já aplicado', 'Adicionar as etapas novamente?'))) { t.value = ''; return; }
        inc.tasks.push(...playbookTasks(pb.id));
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
        const warns = transitionWarnings(inc, to);
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

      if (d.act === 'export') download(`${inc.id}.json`, JSON.stringify(inc, null, 2));
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
          <div class="span2">${field('Descrição', textarea('text', '', 'required rows="3"'))}</div></div>`, {
          onSubmit: async (f) => { await store.addTimeline(inc, f); store.audit('Registro na linha do tempo', inc.id, f.type); store.persist(); ctx.rerender(); },
        });
      }

      if (d.act === 'task-add') {
        modal('Nova tarefa', html`<div class="form-grid">
          <div class="span2">${field('Tarefa', input('title', '', 'required'))}</div>
          ${field('Fase', select('phase', STATUSES.filter((s) => s.id !== 'encerrado').map((s) => ({ v: s.id, t: s.name })), inc.status === 'encerrado' ? 'pos' : inc.status))}
          ${field('Subcategoria CSF', select('csf', [{ v: '', t: '—' }, ...SUBCATEGORIES.map((s) => ({ v: s.id, t: `${s.id} — ${s.text.slice(0, 60)}…` }))], ''))}
          ${field('Responsável', select('owner', contactOpts(db), ''))}
          ${field('Prazo', dt('due', null))}</div>`, {
          onSubmit: (f) => { inc.tasks.push({ id: uid('k'), status: 'aberta', ...f }); return save(`Tarefa criada: ${f.title}`); },
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
          ${field('Coletado por', input('collectedBy', db.org.analyst, 'required'))}
          ${field('Coletado em', dt('collectedAt', new Date().toISOString()))}
          <div class="span2">${field('Local de armazenamento', input('location', ''))}</div>
          <input type="hidden" name="size" data-type="number"></div>`, {
          onSubmit: (f) => { inc.evidence.push({ id: uid('e'), custody: [], ...f }); if (!inc.csf['RS.AN-07']?.done) inc.csf['RS.AN-07'] = { done: true, at: new Date().toISOString(), note: 'Evidência registrada' }; return save(`Evidência registrada: ${f.name} (${f.hashAlg} ${f.hash || 'sem hash'})`); },
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
  },
};

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
