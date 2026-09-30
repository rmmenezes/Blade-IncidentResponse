// Utilitários puros (sem DOM) — usados pela interface e pelos testes.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Marca um trecho de HTML já confiável para não ser escapado de novo.
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));

// Template tag que escapa toda interpolação, exceto valores raw() e listas deles.
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return raw(out);
}
function render(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const pad = (n, w = 2) => String(n).padStart(w, '0');

// Datas em ISO; formatação no padrão brasileiro.
export function fmtDate(iso, withTime = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const s = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
}

// Valor para <input type="datetime-local"> no fuso local.
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString();
}

export function fmtDuration(ms) {
  if (ms == null || isNaN(ms)) return '—';
  const neg = ms < 0; ms = Math.abs(ms);
  const m = Math.round(ms / 60000);
  let s;
  if (m < 60) s = `${m} min`;
  else if (m < 60 * 48) s = `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim();
  else s = `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`;
  return neg ? `-${s}` : s;
}

export const diff = (a, b) => (a && b ? new Date(b) - new Date(a) : null);

export function addHours(iso, h) { return new Date(new Date(iso).getTime() + h * 3600e3).toISOString(); }

// Soma dias úteis (seg–sex). Feriados não são considerados.
export function addBusinessDays(iso, days) {
  const d = new Date(iso);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString();
}

export function addMonths(iso, n) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

export const avg = (arr) => {
  const v = arr.filter((x) => typeof x === 'number' && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

export function toCSV(rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}
