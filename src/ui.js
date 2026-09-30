// Componentes de interface compartilhados.
import { html, raw, esc, fmtDate, toLocalInput, fromLocalInput } from './core/util.js';
import { sevById } from './core/engine.js';
import { statusById, FUNCTIONS } from './core/nist.js';

const ICONS = {
  dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>',
  alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3"/><path d="M20 4v14h-7"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  up: '<path d="M4 17l6-6 4 4 6-8"/><path d="M14 7h6v6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/>',
  down: '<path d="M12 3v12M6 11l6 6 6-6M4 21h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
};
export const ic = (n) => raw(`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`);

export const sevBadge = (s) => html`<span class="badge sev-${s}" title="Severidade">${s} · ${sevById[s]?.name || ''}</span>`;
export const statusBadge = (s) => html`<span class="badge st st-${s}">${statusById[s]?.name || s}</span>`;
export const fnBadge = (csfId) => {
  const f = FUNCTIONS.find((x) => x.id === String(csfId).slice(0, 2));
  return html`<span class="csf" style="--c:${f?.color || '#888'}" title="${f ? f.name : ''}">${csfId}</span>`;
};
export const tlpBadge = (t) => html`<span class="tlp tlp-${String(t).replace('+', '-').toLowerCase()}">TLP:${t}</span>`;

/* ---------- Campos de formulário ---------- */
export function field(label, input, hint = '') {
  return html`<label class="field"><span class="lbl">${label}</span>${input}${hint ? html`<span class="hint">${hint}</span>` : ''}</label>`;
}
export const input = (name, value = '', attrs = '') => raw(`<input name="${esc(name)}" value="${esc(value)}" ${attrs}>`);
export const dt = (name, iso, attrs = '') => raw(`<input type="datetime-local" name="${esc(name)}" value="${esc(toLocalInput(iso))}" ${attrs}>`);
export const textarea = (name, value = '', attrs = '') => raw(`<textarea name="${esc(name)}" ${attrs}>${esc(value)}</textarea>`);
export function select(name, options, value, attrs = '') {
  const opts = options.map((o) => (typeof o === 'object' ? o : { v: o, t: o }));
  return raw(`<select name="${esc(name)}" ${attrs}>${opts.map((o) => `<option value="${esc(o.v)}"${String(o.v) === String(value ?? '') ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`);
}

// Lê um formulário para objeto, convertendo tipos pelos atributos data-type.
export function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'datetime-local') v = fromLocalInput(el.value);
    else if (el.type === 'number' || el.dataset.type === 'number') v = el.value === '' ? null : Number(el.value);
    else if (el.multiple) v = [...el.selectedOptions].map((o) => o.value);
    else v = el.value.trim();
    out[el.name] = v;
  }
  return out;
}

/* ---------- Modal, confirmação e aviso ---------- */
export function modal(title, body, { onSubmit, submitLabel = 'Salvar', wide = false } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal' + (wide ? ' wide' : '');
  dlg.innerHTML = String(html`<form method="dialog" class="modal-in">
    <header><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Fechar">${ic('x')}</button></header>
    <div class="modal-body">${body}</div>
    <footer><button type="button" class="btn ghost" data-close>Cancelar</button>${onSubmit ? html`<button class="btn primary" value="ok">${submitLabel}</button>` : ''}</footer>
  </form>`);
  document.body.appendChild(dlg);
  const form = dlg.querySelector('form');
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return dlg.close();
    try {
      const r = await onSubmit(formData(form), form);
      if (r !== false) dlg.close();
    } catch (err) { toast(err.message || String(err), 'err'); }
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  dlg.querySelector('input,select,textarea')?.focus();
  return dlg;
}

export function confirmBox(title, message, { danger = false, label = 'Confirmar' } = {}) {
  return new Promise((resolve) => {
    let ok = false;
    const dlg = modal(title, html`<p>${message}</p>`, { onSubmit: () => { ok = true; }, submitLabel: label });
    if (danger) dlg.querySelector('.btn.primary')?.classList.add('danger');
    dlg.addEventListener('close', () => resolve(ok));
  });
}

export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

export const when = (iso) => html`<time datetime="${iso || ''}">${fmtDate(iso)}</time>`;

export function empty(msg, action = '') {
  return html`<div class="empty"><p>${msg}</p>${action}</div>`;
}

export function bar(pct, color) {
  return html`<div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%;${color ? `background:${color}` : ''}"></span></div>`;
}
