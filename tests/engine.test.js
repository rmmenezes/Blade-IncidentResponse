import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeverity, priorityScore, notificationStatus, DEFAULT_REGULATIONS, transitionStamps, transitionWarnings, chainAppend, chainVerify, metrics, slaStatus, DEFAULT_SLA, dueDate } from '../src/core/engine.js';
import { addBusinessDays, html, raw, toCSV } from '../src/core/util.js';
import { SUBCATEGORIES } from '../src/core/nist.js';
import { PLAYBOOKS } from '../src/data/playbooks.js';
import { READINESS } from '../src/data/readiness.js';
import { demoDB } from '../src/data/seed.js';

test('severidade a partir dos fatores de priorização', () => {
  assert.equal(computeSeverity({ functional: 0, information: 0, recoverability: 0, scope: 0 }), 'S4');
  assert.equal(computeSeverity({ functional: 1, information: 1, recoverability: 1, scope: 0 }), 'S3');
  assert.equal(computeSeverity({ functional: 2, information: 2, recoverability: 1, scope: 1 }), 'S2');
  assert.equal(computeSeverity({ functional: 3, information: 3, recoverability: 2, scope: 1 }), 'S1');
  assert.equal(computeSeverity({ functional: 3, information: 3, recoverability: 3, scope: 3, severityOverride: 'S3' }), 'S3');
});

test('ativo de criticidade alta eleva a pontuação', () => {
  const assets = [{ id: 'a', criticality: 'alta' }];
  assert.equal(priorityScore({ functional: 1, assets: ['a'] }, assets), 2);
  assert.equal(priorityScore({ functional: 3, information: 3, recoverability: 3, scope: 3, assets: ['a'] }, assets), 12);
});

test('dias úteis pulam fins de semana', () => {
  // Sexta 2026-10-02 12:00 local + 3 dias úteis = quarta 2026-10-07
  const d = new Date(addBusinessDays(new Date(2026, 9, 2, 12).toISOString(), 3));
  assert.equal(d.getDay(), 3);
  assert.equal(d.getDate(), 7);
});

test('prazos regulatórios LGPD e estados', () => {
  const regs = DEFAULT_REGULATIONS;
  const awareAt = new Date(2026, 9, 5, 9).toISOString(); // segunda
  const inc = { personalData: true, awareAt, declaredAt: awareAt, severity: 'S3', notifications: [] };
  const ns = notificationStatus(inc, regs, new Date(2026, 9, 6));
  const anpd = ns.find((n) => n.reg.id === 'lgpd-anpd');
  assert.ok(anpd);
  assert.equal(new Date(anpd.due).getDate(), 8);
  assert.equal(anpd.state, 'pendente');
  assert.equal(notificationStatus(inc, regs, new Date(2026, 9, 9)).find((n) => n.reg.id === 'lgpd-anpd').state, 'atrasada');
  inc.notifications = [{ regId: 'lgpd-anpd', sentAt: new Date(2026, 9, 7).toISOString() }];
  assert.equal(notificationStatus(inc, regs, new Date(2026, 9, 9)).find((n) => n.reg.id === 'lgpd-anpd').state, 'enviada');
  assert.equal(notificationStatus({ ...inc, personalData: false }, regs).length, 0);
});

test('SEC conta a partir da materialidade', () => {
  const reg = DEFAULT_REGULATIONS.find((r) => r.id === 'sec-8k');
  const d = new Date(dueDate(reg, new Date(2026, 9, 1, 10).toISOString())); // quinta
  assert.equal(d.getDate(), 7);
});

test('transições preenchem marcos pulados', () => {
  const at = '2026-01-01T00:00:00.000Z';
  const s = transitionStamps({}, 'recuperacao', at);
  assert.deepEqual(Object.keys(s).sort(), ['containedAt', 'eradicatedAt', 'triagedAt']);
  assert.deepEqual(transitionStamps({ containedAt: 'x', triagedAt: 'y' }, 'erradicacao', at), {});
  assert.ok(transitionWarnings({ csf: {}, tasks: [{ status: 'aberta' }], recovery: {}, lessons: {}, analysis: {} }, 'encerrado').length >= 4);
});

test('cadeia de hash detecta adulteração', async () => {
  let chain = [];
  for (let i = 0; i < 4; i++) chain = await chainAppend(chain, { id: `t${i}`, at: 'a', recordedAt: 'b', author: 'x', type: 'nota', text: `n${i}` });
  assert.equal(await chainVerify(chain), -1);
  const bad = structuredClone(chain);
  bad[2].text = 'alterado';
  assert.equal(await chainVerify(bad), 2);
  const removed = chain.filter((_, i) => i !== 1);
  assert.equal(await chainVerify(removed), 1);
});

test('métricas de tempo', () => {
  const m = metrics([{ status: 'encerrado', severity: 'S2', occurredAt: '2026-01-01T00:00:00Z', detectedAt: '2026-01-01T02:00:00Z', declaredAt: '2026-01-01T03:00:00Z', containedAt: '2026-01-01T05:00:00Z', recoveredAt: '2026-01-02T03:00:00Z' }]);
  assert.equal(m.mttd, 2 * 3600e3);
  assert.equal(m.mttc, 2 * 3600e3);
  assert.equal(m.mttr, 24 * 3600e3);
  assert.equal(m.open, 0);
});

test('SLA marca atraso', () => {
  const inc = { severity: 'S1', declaredAt: '2026-01-01T00:00:00Z' };
  const s = slaStatus(inc, DEFAULT_SLA, new Date('2026-01-01T05:00:00Z'));
  assert.equal(s.find((x) => x.key === 'contain').late, true);
  assert.equal(s.find((x) => x.key === 'recover').late, false);
});

test('html escapa interpolações', () => {
  assert.equal(String(html`<p>${'<script>'}</p>`), '<p>&lt;script&gt;</p>');
  assert.equal(String(html`<p>${raw('<b>')}${['<i>', raw('<u>')]}</p>`), '<p><b>&lt;i&gt;<u></p>');
  assert.equal(toCSV([['a,b', 'c"d']]), '"a,b","c""d"');
});

test('referências CSF dos dados são válidas', () => {
  const re = /^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$/;
  for (const p of PLAYBOOKS) for (const s of p.steps) assert.match(s.csf, re, `${p.id}: ${s.csf}`);
  for (const r of READINESS) assert.match(r.id, re);
  assert.equal(new Set(SUBCATEGORIES.map((s) => s.id)).size, SUBCATEGORIES.length);
});

test('dados de demonstração têm cadeias íntegras', async () => {
  const db = await demoDB();
  assert.equal(db.incidents.length, 3);
  for (const i of db.incidents) assert.equal(await chainVerify(i.timeline), -1);
  assert.equal(db.incidents[0].severity, 'S1');
});
