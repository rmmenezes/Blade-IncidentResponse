// Estado da plataforma, persistido no navegador (localStorage), com trilha de auditoria.
import { uid, pad } from './util.js';
import { DEFAULT_SLA, DEFAULT_REGULATIONS, computeSeverity, chainAppend, transitionStamps } from './engine.js';
import { statusById } from './nist.js';
import { DEFAULT_TECHNOLOGIES, DEFAULT_PROCESSES, DEFAULT_PROCEDURES } from '../data/library.js';

const KEY = 'blade-ir-db';
const VERSION = 1;

export function emptyDB() {
  return {
    version: VERSION,
    org: { name: 'Minha organização', sector: '', analyst: 'Analista', currentUser: '', enforceGates: false, incidentCriteria: DEFAULT_CRITERIA },
    sla: structuredClone(DEFAULT_SLA),
    regulations: structuredClone(DEFAULT_REGULATIONS),
    incidents: [], events: [], assets: [], contacts: [], improvements: [], exercises: [],
    technologies: structuredClone(DEFAULT_TECHNOLOGIES), processes: structuredClone(DEFAULT_PROCESSES), procedures: structuredClone(DEFAULT_PROCEDURES),
    readiness: {}, audit: [], seq: { inc: 0, evt: 0 },
  };
}

export const DEFAULT_CRITERIA = [
  'Confirmação de acesso não autorizado a sistemas ou dados',
  'Indisponibilidade de serviço crítico causada por atividade maliciosa',
  'Execução confirmada de código malicioso',
  'Exposição ou exfiltração de dados pessoais ou confidenciais',
  'Violação de política de segurança com impacto relevante',
  'Notificação crível de terceiro (fornecedor, CERT, autoridade)',
];

let db = null;
const listeners = new Set();
const mem = new Map(); // fallback quando localStorage não está disponível

function readRaw() {
  try { return globalThis.localStorage?.getItem(KEY) ?? mem.get(KEY) ?? null; } catch { return mem.get(KEY) ?? null; }
}
function writeRaw(s) {
  mem.set(KEY, s);
  try { globalThis.localStorage?.setItem(KEY, s); } catch { /* cota ou modo privado */ }
}

export function load() {
  const s = readRaw();
  try { db = s ? migrate(JSON.parse(s)) : null; } catch { db = null; }
  return db;
}

function migrate(d) {
  const base = emptyDB();
  const out = { ...base, ...d, org: { ...base.org, ...d.org }, seq: { ...base.seq, ...d.seq } };
  // Novas regulações padrão aparecem sem sobrescrever as editadas.
  for (const r of base.regulations) if (!out.regulations.some((x) => x.id === r.id)) out.regulations.push(r);
  for (const i of out.incidents) { i.attachments ||= []; i.tools ||= []; i.team ||= []; }
  return out;
}

export const get = () => db;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(db));

export function persist() { writeRaw(JSON.stringify(db)); emit(); }

export function replace(next) { db = migrate(next); persist(); }

// Usuário atual: um membro da equipe selecionado no topo, ou o nome livre das configurações.
export const me = () => db?.contacts.find((c) => c.id === db.org.currentUser) || null;
export const userName = () => me()?.name || db?.org.analyst || 'Analista';

export function audit(action, target = '', detail = '') {
  db.audit.unshift({ id: uid('a'), at: new Date().toISOString(), who: userName(), action, target, detail });
  if (db.audit.length > 2000) db.audit.length = 2000;
}

/* ---------- Incidentes ---------- */
export function nextIncidentId(date = new Date()) {
  db.seq.inc += 1;
  return `INC-${date.getFullYear()}-${pad(db.seq.inc, 4)}`;
}
export function nextEventId() { db.seq.evt += 1; return `EVT-${pad(db.seq.evt, 5)}`; }

export const incident = (id) => db.incidents.find((i) => i.id === id);

export function newIncident(data = {}) {
  const now = new Date().toISOString();
  return {
    id: nextIncidentId(), title: '', description: '', status: 'triagem', category: 'Outro',
    functional: 0, information: 0, recoverability: 0, scope: 0, severity: 'S4', severityOverride: '', overrideReason: '',
    personalData: false, tlp: 'AMBER',
    occurredAt: null, detectedAt: now, declaredAt: now, awareAt: now, triagedAt: null, materialAt: null,
    containedAt: null, eradicatedAt: null, recoveredAt: null, closedAt: null,
    roles: {}, assets: [], iocs: [], evidence: [], tasks: [], comms: [], notifications: [], csf: {},
    magnitude: {}, analysis: { whys: ['', '', '', '', ''], tactics: [] }, recovery: {}, lessons: {},
    timeline: [], playbooks: [], sourceEvents: [], attachments: [], tools: [], team: [], createdAt: now, updatedAt: now,
    ...data,
  };
}

export function recompute(inc) {
  inc.severity = computeSeverity(inc, db.assets);
  inc.updatedAt = new Date().toISOString();
}

export async function addTimeline(inc, { at, type = 'nota', text, files = [], fileIds = [] }) {
  const entry = { id: uid('t'), at: at || new Date().toISOString(), recordedAt: new Date().toISOString(), author: userName(), type, text, phase: inc.status };
  if (files.length) entry.files = files;
  if (fileIds.length) entry.fileIds = fileIds;
  inc.timeline = await chainAppend(inc.timeline, entry);
}

export async function createIncident(data) {
  const inc = newIncident(data);
  recompute(inc);
  db.incidents.unshift(inc);
  await addTimeline(inc, { type: 'sistema', text: `Incidente declarado: ${inc.title} (${inc.severity}).` });
  audit('Incidente criado', inc.id, inc.title);
  persist();
  return inc;
}

export async function setStatus(inc, to, note = '') {
  const from = inc.status;
  if (from === to) return;
  const at = new Date().toISOString();
  Object.assign(inc, transitionStamps(inc, to, at));
  inc.status = to;
  if (to !== 'encerrado') inc.closedAt = null;
  recompute(inc);
  await addTimeline(inc, { type: 'status', text: `Status: ${statusById[from].name} → ${statusById[to].name}${note ? ' — ' + note : ''}` });
  audit('Mudança de status', inc.id, `${from} → ${to}`);
  persist();
}

export async function logChange(inc, text, auditAction = 'Incidente atualizado') {
  recompute(inc);
  await addTimeline(inc, { type: 'sistema', text });
  audit(auditAction, inc.id, text);
  persist();
}
