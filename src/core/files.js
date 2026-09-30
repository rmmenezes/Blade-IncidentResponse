// Armazenamento de anexos no próprio navegador (IndexedDB) — sem servidor.
// Os metadados ficam no incidente; o conteúdo binário fica aqui, identificado por id.
import { sha256Buffer } from './engine.js';
import { uid } from './util.js';

const DB = 'blade-ir-files';
const STORE = 'files';
export const MAX_FILE = 25 * 1024 * 1024;

let dbp = null;
function open() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Este navegador não permite armazenar arquivos.'));
  dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Armazenamento cheio ou bloqueado.'));
  });
}

// Salva um File/Blob e devolve os metadados a guardar no incidente.
export async function saveFile(file, meta = {}) {
  if (file.size > MAX_FILE) throw new Error(`"${file.name}" excede o limite de ${MAX_FILE / 1048576} MB.`);
  const buf = await file.arrayBuffer();
  const sha256 = await sha256Buffer(buf);
  const rec = { id: meta.id || uid('f'), blob: new Blob([buf], { type: file.type || 'application/octet-stream' }) };
  await tx('readwrite', (s) => s.put(rec));
  return { id: rec.id, name: file.name || meta.name || 'arquivo', type: file.type || 'application/octet-stream', size: file.size, sha256, addedAt: new Date().toISOString(), ...meta, };
}

export async function getBlob(id) {
  const rec = await tx('readonly', (s) => s.get(id));
  return rec?.blob || null;
}
export const deleteFile = (id) => tx('readwrite', (s) => s.delete(id));
export const clearFiles = () => tx('readwrite', (s) => s.clear());

export async function objectURL(id) {
  const b = await getBlob(id);
  return b ? URL.createObjectURL(b) : null;
}

// Conversões para exportar/importar anexos dentro de pacotes JSON.
export async function toBase64(id) {
  const b = await getBlob(id);
  if (!b) return null;
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export async function fromBase64(meta, b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  await tx('readwrite', (s) => s.put({ id: meta.id, blob: new Blob([bytes], { type: meta.type }) }));
}

export async function packFiles(attachments) {
  const out = [];
  for (const a of attachments) { const data = await toBase64(a.id); if (data) out.push({ id: a.id, type: a.type, data }); }
  return out;
}
export async function unpackFiles(files = [], attachments = []) {
  for (const f of files) await fromBase64(attachments.find((a) => a.id === f.id) || f, f.data);
}

export const isImage = (a) => /^image\//.test(a.type);
export const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
