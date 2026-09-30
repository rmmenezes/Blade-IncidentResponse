// Regras de negócio puras: priorização, SLAs, prazos regulatórios, métricas e integridade.
import { addHours, addBusinessDays, addMonths, diff, avg } from './util.js';
import { STATUSES, statusIndex, SUBCATEGORIES } from './nist.js';

/* ---------- Priorização (RS.MA-03) ---------- */
export const FACTORS = {
  functional: { label: 'Impacto funcional', opts: ['Nenhum', 'Baixo — serviços críticos operam com perda mínima de eficiência', 'Médio — perda de um serviço crítico para parte dos usuários', 'Alto — serviços críticos indisponíveis para todos'] },
  information: { label: 'Impacto na informação', opts: ['Nenhum', 'Informação proprietária/interna acessada ou exfiltrada', 'Dados pessoais / sensíveis acessados ou exfiltrados', 'Integridade de informação crítica comprometida'] },
  recoverability: { label: 'Recuperabilidade', opts: ['Regular — previsível com recursos atuais', 'Suplementada — previsível com recursos adicionais', 'Estendida — imprevisível, exige ajuda externa', 'Irrecuperável'] },
  scope: { label: 'Escopo', opts: ['Um ativo / usuário', 'Vários ativos ou um setor', 'Múltiplos setores ou terceiros', 'Organização inteira'] },
};

export const SEVERITIES = [
  { id: 'S1', name: 'Crítica', min: 9 },
  { id: 'S2', name: 'Alta', min: 6 },
  { id: 'S3', name: 'Média', min: 3 },
  { id: 'S4', name: 'Baixa', min: 0 },
];
export const sevById = Object.fromEntries(SEVERITIES.map((s) => [s.id, s]));

export function priorityScore(inc, assets = []) {
  const f = (k) => Number(inc[k] ?? 0);
  let score = f('functional') + f('information') + f('recoverability') + f('scope');
  const crit = (inc.assets || []).map((id) => assets.find((a) => a.id === id)).some((a) => a && a.criticality === 'alta');
  if (crit) score += 1;
  return Math.min(score, 12);
}

export function computeSeverity(inc, assets = []) {
  if (inc.severityOverride) return inc.severityOverride;
  const s = priorityScore(inc, assets);
  return SEVERITIES.find((x) => s >= x.min).id;
}

/* ---------- SLAs por severidade ---------- */
export const DEFAULT_SLA = {
  S1: { triage: 0.5, contain: 4, recover: 24 },
  S2: { triage: 2, contain: 12, recover: 72 },
  S3: { triage: 8, contain: 48, recover: 168 },
  S4: { triage: 24, contain: 120, recover: 336 },
};

export function slaStatus(inc, sla, now = new Date()) {
  const s = sla[inc.severity] || DEFAULT_SLA[inc.severity] || DEFAULT_SLA.S4;
  const base = inc.declaredAt || inc.detectedAt;
  if (!base) return [];
  const item = (key, label, doneAt, hours) => {
    const due = addHours(base, hours);
    const done = !!doneAt;
    const late = done ? new Date(doneAt) > new Date(due) : now > new Date(due);
    return { key, label, due, doneAt, done, late, remaining: new Date(due) - now };
  };
  return [
    item('triage', 'Triagem', inc.triagedAt, s.triage),
    item('contain', 'Contenção', inc.containedAt, s.contain),
    item('recover', 'Recuperação', inc.recoveredAt, s.recover),
  ];
}

/* ---------- Notificações regulatórias (RS.CO-02) ---------- */
// trigger: campo de data do incidente que inicia a contagem.
// when: condição de aplicabilidade.
export const DEFAULT_REGULATIONS = [
  { id: 'lgpd-anpd', name: 'LGPD — Comunicação à ANPD', authority: 'ANPD', unit: 'bd', amount: 3, trigger: 'awareAt', when: 'personal', enabled: true,
    note: 'Res. CD/ANPD nº 15/2024: 3 dias úteis a partir do conhecimento de que o incidente afetou dados pessoais com risco ou dano relevante.' },
  { id: 'lgpd-titulares', name: 'LGPD — Comunicação aos titulares', authority: 'Titulares dos dados', unit: 'bd', amount: 3, trigger: 'awareAt', when: 'personal', enabled: true,
    note: 'Res. CD/ANPD nº 15/2024: mesmo prazo de 3 dias úteis, em linguagem clara.' },
  { id: 'gdpr', name: 'GDPR — Art. 33', authority: 'Autoridade supervisora (UE)', unit: 'h', amount: 72, trigger: 'awareAt', when: 'personal', enabled: false,
    note: 'Até 72 horas após tomar conhecimento da violação de dados pessoais.' },
  { id: 'nis2-early', name: 'NIS2 — Alerta antecipado', authority: 'CSIRT / autoridade competente (UE)', unit: 'h', amount: 24, trigger: 'awareAt', when: 'significant', enabled: false,
    note: 'Alerta antecipado em 24 h; notificação em 72 h; relatório final em 1 mês.' },
  { id: 'nis2-notif', name: 'NIS2 — Notificação do incidente', authority: 'CSIRT / autoridade competente (UE)', unit: 'h', amount: 72, trigger: 'awareAt', when: 'significant', enabled: false, note: '' },
  { id: 'nis2-final', name: 'NIS2 — Relatório final', authority: 'CSIRT / autoridade competente (UE)', unit: 'm', amount: 1, trigger: 'awareAt', when: 'significant', enabled: false, note: '' },
  { id: 'sec-8k', name: 'SEC — Form 8-K Item 1.05', authority: 'SEC (EUA)', unit: 'bd', amount: 4, trigger: 'materialAt', when: 'material', enabled: false,
    note: '4 dias úteis após a determinação de materialidade (empresas listadas nos EUA).' },
  { id: 'certbr', name: 'CERT.br / CSIRT setorial', authority: 'CERT.br', unit: 'h', amount: 24, trigger: 'declaredAt', when: 'always', enabled: false,
    note: 'Compartilhamento voluntário/recomendado; ajuste o prazo conforme a política interna.' },
];

export const CONDITIONS = {
  always: 'Todo incidente declarado',
  personal: 'Envolve dados pessoais',
  significant: 'Incidente significativo (S1/S2)',
  material: 'Materialidade determinada',
};

export function regulationApplies(reg, inc) {
  switch (reg.when) {
    case 'always': return true;
    case 'personal': return !!inc.personalData;
    case 'significant': return inc.severity === 'S1' || inc.severity === 'S2';
    case 'material': return !!inc.materialAt;
    default: return false;
  }
}

export function dueDate(reg, start) {
  if (!start) return null;
  if (reg.unit === 'bd') return addBusinessDays(start, reg.amount);
  if (reg.unit === 'm') return addMonths(start, reg.amount);
  return addHours(start, reg.amount);
}

export function notificationStatus(inc, regulations, now = new Date()) {
  return regulations.filter((r) => r.enabled && regulationApplies(r, inc)).map((r) => {
    const rec = (inc.notifications || []).find((n) => n.regId === r.id) || {};
    const start = inc[r.trigger] || inc.declaredAt;
    const due = dueDate(r, start);
    let state;
    if (rec.waived) state = 'dispensada';
    else if (rec.sentAt) state = new Date(rec.sentAt) > new Date(due) ? 'enviada com atraso' : 'enviada';
    else if (!due) state = 'pendente';
    else if (now > new Date(due)) state = 'atrasada';
    else if (new Date(due) - now < 24 * 3600e3) state = 'vence em breve';
    else state = 'pendente';
    return { reg: r, rec, start, due, state };
  });
}

/* ---------- Transições de estado ---------- */
const STAMP_ORDER = [
  ['erradicacao', 'containedAt'], ['recuperacao', 'eradicatedAt'], ['pos', 'recoveredAt'], ['encerrado', 'closedAt'],
];

// Retorna os campos de data a preencher ao mover o incidente para `to`.
export function transitionStamps(inc, to, at) {
  const idx = statusIndex(to);
  const out = {};
  if (idx >= statusIndex('analise') && !inc.triagedAt) out.triagedAt = at;
  for (const [st, field] of STAMP_ORDER) if (idx >= statusIndex(st) && !inc[field]) out[field] = at;
  return out;
}

// Alertas não-bloqueantes antes de avançar (boas práticas da Rev. 3).
export function transitionWarnings(inc, to) {
  const w = [];
  const idx = statusIndex(to);
  const done = (id) => inc.csf?.[id]?.done;
  if (idx >= statusIndex('recuperacao') && !done('RS.MA-05')) w.push('Critérios para iniciar a recuperação (RS.MA-05) não foram marcados como aplicados.');
  if (idx >= statusIndex('recuperacao') && !inc.recovery?.backupVerified) w.push('Integridade dos backups (RC.RP-03) ainda não verificada.');
  if (idx >= statusIndex('pos') && !inc.recovery?.restoredVerified) w.push('Integridade dos ativos restaurados (RC.RP-05) não confirmada.');
  if (to === 'encerrado') {
    if (!inc.lessons?.meetingAt) w.push('Reunião de lições aprendidas (ID.IM) não registrada.');
    if (!inc.analysis?.rootCause) w.push('Causa raiz (RS.AN-03) não documentada.');
    const openTasks = (inc.tasks || []).filter((t) => t.status !== 'concluida').length;
    if (openTasks) w.push(`${openTasks} tarefa(s) ainda em aberto.`);
  }
  return w;
}

// Tarefas obrigatórias não concluídas das fases anteriores ao destino.
export function phaseBlockers(inc, to) {
  const idx = statusIndex(to);
  return (inc.tasks || []).filter((t) => t.required && t.status !== 'concluida' && statusIndex(t.phase) < idx && statusIndex(t.phase) >= 0);
}

// Progresso de uma tarefa com checklist de passos.
export function taskProgress(t) {
  if (!t.steps?.length) return t.status === 'concluida' ? 100 : 0;
  return Math.round((t.steps.filter((s) => s.done).length / t.steps.length) * 100);
}

// Duração de cada fase a partir dos marcos registrados.
export const MILESTONES = [
  ['occurredAt', 'Atividade maliciosa'], ['detectedAt', 'Detecção'], ['declaredAt', 'Declaração'], ['triagedAt', 'Triagem'],
  ['containedAt', 'Contenção'], ['eradicatedAt', 'Erradicação'], ['recoveredAt', 'Recuperação'], ['closedAt', 'Encerramento'],
];
export function phaseDurations(inc, now = new Date()) {
  const pts = MILESTONES.filter(([k]) => inc[k]).map(([k, label]) => ({ k, label, at: new Date(inc[k]) })).sort((a, b) => a.at - b.at);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const end = pts[i + 1]?.at || (inc.closedAt ? null : now);
    if (!end) continue;
    out.push({ from: pts[i].label, to: pts[i + 1]?.label || 'agora', start: pts[i].at.toISOString(), end: end.toISOString(), ms: end - pts[i].at });
  }
  return out;
}

export function inPeriod(inc, from, to) {
  const d = new Date(inc.declaredAt || inc.createdAt);
  return (!from || d >= new Date(from)) && (!to || d <= new Date(to));
}

// Cobertura das Funções do CSF pelas tecnologias cadastradas.
export function techCoverage(techs) {
  const out = { GV: [], ID: [], PR: [], DE: [], RS: [], RC: [] };
  for (const t of techs) for (const f of t.functions || []) out[f]?.push(t);
  return out;
}

/* ---------- Conformidade com as subcategorias ---------- */
export function csfProgress(inc, phase) {
  const list = SUBCATEGORIES.filter((s) => !phase || s.phase === phase);
  const done = list.filter((s) => inc.csf?.[s.id]?.done).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

/* ---------- Métricas ---------- */
export function metrics(incidents) {
  const pick = (a, b) => incidents.map((i) => diff(i[a], i[b])).filter((x) => x != null && x >= 0);
  return {
    total: incidents.length,
    open: incidents.filter((i) => i.status !== 'encerrado').length,
    mttd: avg(pick('occurredAt', 'detectedAt')),
    mttDeclare: avg(pick('detectedAt', 'declaredAt')),
    mttc: avg(pick('declaredAt', 'containedAt')),
    mttr: avg(pick('declaredAt', 'recoveredAt')),
    bySeverity: Object.fromEntries(['S1', 'S2', 'S3', 'S4'].map((s) => [s, incidents.filter((i) => i.severity === s && i.status !== 'encerrado').length])),
    byStatus: Object.fromEntries(STATUSES.map((s) => [s.id, incidents.filter((i) => i.status === s.id).length])),
    byCategory: incidents.reduce((m, i) => { m[i.category || 'Outro'] = (m[i.category || 'Outro'] || 0) + 1; return m; }, {}),
  };
}

/* ---------- Integridade e proveniência (RS.AN-06/07) ---------- */
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Buffer(buf) {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Campos opcionais (fase, anexos) só entram no hash quando presentes — mantém válidas as cadeias antigas.
const canon = (e) => {
  const base = [e.id, e.at, e.recordedAt, e.author, e.type, e.text, e.prevHash];
  if (e.phase) base.push(`phase:${e.phase}`);
  if (e.files?.length) base.push(`files:${e.files.join(',')}`);
  return JSON.stringify(base);
};

// Acrescenta um registro à cadeia: cada hash cobre o conteúdo e o hash anterior.
export async function chainAppend(chain, entry) {
  const prevHash = chain.length ? chain[chain.length - 1].hash : '0'.repeat(64);
  const e = { ...entry, prevHash };
  e.hash = await sha256(canon(e));
  return [...chain, e];
}

// Verifica a cadeia; retorna o índice do primeiro registro adulterado ou -1.
export async function chainVerify(chain) {
  let prev = '0'.repeat(64);
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prevHash !== prev || e.hash !== await sha256(canon(e))) return i;
    prev = e.hash;
  }
  return -1;
}
