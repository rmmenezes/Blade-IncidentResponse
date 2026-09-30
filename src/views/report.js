// Relatório do incidente pronto para impressão / PDF (RC.RP-06: documentação concluída).
import * as store from '../core/store.js';
import { html, fmtDate, fmtDuration, diff } from '../core/util.js';
import { statusById, SUBCATEGORIES, roleById, NIST_LINKS } from '../core/nist.js';
import { fmtSize } from '../core/files.js';
import { csfProgress, notificationStatus, priorityScore, FACTORS, sevById } from '../core/engine.js';
import { ic, tlpBadge } from '../ui.js';

export default {
  title: ([id]) => `Relatório ${id}`,
  render([id]) {
    const db = store.get();
    const i = store.incident(id);
    if (!i) return html`<div class="page"><p>Incidente não encontrado.</p></div>`;
    const who = (cid) => db.contacts.find((c) => c.id === cid)?.name || '—';
    const p = csfProgress(i);
    const ns = notificationStatus(i, db.regulations);
    const assets = i.assets.map((a) => db.assets.find((x) => x.id === a)).filter(Boolean);
    const tl = [...i.timeline].sort((a, b) => new Date(a.at) - new Date(b.at));
    const row = (k, v) => html`<tr><th>${k}</th><td>${v || '—'}</td></tr>`;
    return html`<div class="page report">
      <div class="no-print row"><a class="btn" href="#/incidente/${i.id}">← Voltar</a><a class="btn" href="#/relatorios">Relatórios</a><button class="btn primary" onclick="print()">${ic('print')} Imprimir / salvar PDF</button></div>
      <header class="rep-head">
        <div><p class="muted">${db.org.name} · Relatório de incidente de cibersegurança</p><h1>${i.id} — ${i.title}</h1></div>
        <div>${tlpBadge(i.tlp)}</div>
      </header>
      <p class="small muted">Gerado em ${fmtDate(new Date().toISOString())} por ${store.userName()} · Estrutura baseada no <a href="${NIST_LINKS.pdf}" target="_blank" rel="noopener">NIST SP 800-61 Rev. 3</a> / CSF 2.0</p>

      <h2>1. Sumário executivo</h2>
      <p>${i.description}</p>
      <table class="kv">
        ${row('Categoria', i.category)}${row('Severidade', `${i.severity} · ${sevById[i.severity]?.name} (pontuação ${priorityScore(i, db.assets)}/12)${i.severityOverride ? ' — ajuste manual: ' + (i.overrideReason || 's/ justificativa') : ''}`)}
        ${row('Estado', statusById[i.status].name)}${row('Envolve dados pessoais', i.personalData ? 'Sim' : 'Não')}
        ${Object.entries(FACTORS).map(([k, f]) => row(f.label, f.opts[i[k] || 0]))}
        ${row('Conformidade CSF', `${p.done}/${p.total} subcategorias (${p.pct}%)`)}
      </table>

      <h2>2. Marcos e tempos</h2>
      <table class="kv">
        ${row('Primeira atividade', fmtDate(i.occurredAt))}${row('Detecção', fmtDate(i.detectedAt))}${row('Declaração', fmtDate(i.declaredAt))}
        ${row('Contenção', fmtDate(i.containedAt))}${row('Erradicação', fmtDate(i.eradicatedAt))}${row('Recuperação', fmtDate(i.recoveredAt))}${row('Encerramento', fmtDate(i.closedAt))}
        ${row('Tempo até detecção', fmtDuration(diff(i.occurredAt, i.detectedAt)))}${row('Tempo até contenção', fmtDuration(diff(i.declaredAt, i.containedAt)))}${row('Tempo até recuperação', fmtDuration(diff(i.declaredAt, i.recoveredAt)))}
      </table>

      <h2>3. Equipe</h2>
      <table class="kv">${Object.entries(i.roles).filter(([, v]) => v).map(([r, c]) => row(roleById[r]?.name || r, who(c)))}</table>

      <h2>4. Escopo e magnitude</h2>
      <table class="kv">
        ${row('Ativos afetados', assets.map((a) => `${a.name} (${a.criticality})`).join(', '))}
        ${row('Registros', i.magnitude.records)}${row('Usuários / titulares', i.magnitude.users)}${row('Sistemas', i.magnitude.systems)}
        ${row('Tipos de dados', i.magnitude.dataTypes)}${row('Impacto financeiro estimado', i.magnitude.financial != null ? `R$ ${Number(i.magnitude.financial).toLocaleString('pt-BR')}` : '')}${row('Notas', i.magnitude.notes)}
      </table>

      <h2>5. Análise</h2>
      <table class="kv">${row('Hipótese', i.analysis.hypothesis)}${row('Causa raiz', i.analysis.rootCause)}
        ${row('5 porquês', (i.analysis.whys || []).filter(Boolean).map((w, n) => `${n + 1}. ${w}`).join(' · '))}
        ${row('Táticas ATT&CK', (i.analysis.tactics || []).join(', '))}${row('Técnicas', i.analysis.techniques)}</table>

      <h2>6. Linha do tempo</h2>
      <table class="tbl"><thead><tr><th>Quando</th><th>Tipo</th><th>Registro</th><th>Autor</th></tr></thead>
        <tbody>${tl.map((e) => html`<tr><td class="nowrap">${fmtDate(e.at)}</td><td>${e.type}</td><td>${e.text}</td><td>${e.author}</td></tr>`)}</tbody></table>
      <p class="small muted">Hash final da cadeia: <code>${i.timeline.at(-1)?.hash || '—'}</code></p>

      <h2>7. Ações e passos</h2>
      <table class="tbl"><thead><tr><th>Fase</th><th>Tarefa</th><th>CSF</th><th>Responsável</th><th>Estado</th><th>Conclusão</th></tr></thead>
        <tbody>${i.tasks.map((t) => html`<tr><td>${statusById[t.phase]?.name}</td><td>${t.title}${t.required ? ' (obrigatória)' : ''}${t.steps?.length ? html`<ol class="small">${t.steps.map((s2) => html`<li>${s2.done ? '✔' : '○'} ${s2.text}${s2.doneBy ? ` — ${s2.doneBy}` : ''}</li>`)}</ol>` : ''}</td>
          <td>${t.csf}</td><td>${who(t.owner)}</td><td>${t.status}</td><td>${t.doneBy ? `${t.doneBy}, ${fmtDate(t.doneAt)}` : '—'}</td></tr>`)}</tbody></table>
      <p class="small"><b>Tecnologias utilizadas:</b> ${(i.tools || []).map((id2) => db.technologies.find((x) => x.id === id2)?.name).filter(Boolean).join(', ') || '—'}</p>

      <h2>8. Indicadores (${i.iocs.length})</h2>
      <table class="tbl"><tbody>${i.iocs.map((x) => html`<tr><td>${x.type}</td><td><code class="wrap">${x.value}</code></td><td>${x.desc}</td><td>TLP:${x.tlp}</td></tr>`)}</tbody></table>

      <h2>9. Evidências</h2>
      <table class="tbl"><thead><tr><th>Evidência</th><th>Hash</th><th>Coleta</th><th>Custódia</th></tr></thead>
        <tbody>${i.evidence.map((e) => html`<tr><td>${e.name}<br><small>${e.type}</small></td><td><code class="wrap">${e.hashAlg}: ${e.hash}</code></td><td>${e.collectedBy}<br><small>${fmtDate(e.collectedAt)}</small></td>
          <td>${(e.custody || []).map((c) => `${fmtDate(c.at)} ${c.from} → ${c.to}`).join('; ') || '—'}</td></tr>`)}</tbody></table>

      <h3>Arquivos anexados (${i.attachments.length})</h3>
      <table class="tbl"><tbody>${i.attachments.map((a) => html`<tr><td>${a.name}</td><td>${fmtSize(a.size)}</td><td><code class="wrap">SHA-256: ${a.sha256}</code></td><td>${a.addedBy || ''} · ${fmtDate(a.addedAt)}</td></tr>`)}</tbody></table>

      <h2>10. Comunicações e notificações</h2>
      <table class="tbl"><thead><tr><th>Obrigação</th><th>Prazo</th><th>Estado</th></tr></thead>
        <tbody>${ns.map((n) => html`<tr><td>${n.reg.name}</td><td>${fmtDate(n.due)}</td><td>${n.state}${n.rec.ref ? ' · ' + n.rec.ref : ''}${n.rec.reason ? ' · ' + n.rec.reason : ''}</td></tr>`)}</tbody></table>
      <table class="tbl"><tbody>${i.comms.map((c) => html`<tr><td class="nowrap">${fmtDate(c.at)}</td><td>${c.stakeholder}</td><td>${c.channel}</td><td>${c.summary}</td></tr>`)}</tbody></table>

      <h2>11. Recuperação</h2>
      <table class="kv">${row('Critérios de início (RS.MA-05)', i.recovery.criteria)}${row('Plano de restauração', i.recovery.plan)}
        ${row('Backups verificados (RC.RP-03)', i.recovery.backupVerified ? 'Sim' + (i.recovery.backupHow ? ' — ' + i.recovery.backupHow : '') : 'Não')}
        ${row('Normas pós-incidente (RC.RP-04)', i.recovery.norms)}${row('Ativos restaurados verificados (RC.RP-05)', i.recovery.restoredVerified ? 'Sim' : 'Não')}
        ${row('Critérios de fim (RC.RP-06)', i.recovery.endCriteria)}</table>

      <h2>12. Lições aprendidas</h2>
      <table class="kv">${row('Reunião', fmtDate(i.lessons.meetingAt))}${row('Participantes', i.lessons.participants)}${row('O que funcionou', i.lessons.wentWell)}
        ${row('O que melhorar', i.lessons.improve)}${row('Ações preventivas', i.lessons.prevent)}${row('Atualizações do plano', i.lessons.planUpdates)}</table>
      <ul>${db.improvements.filter((x) => x.source === i.id).map((x) => html`<li>${x.title} (${x.csf}, ${x.status})</li>`)}</ul>

      <h2>13. Checklist CSF 2.0</h2>
      <table class="tbl"><tbody>${SUBCATEGORIES.map((s) => html`<tr><td>${i.csf[s.id]?.done ? '✔' : '○'}</td><td class="nowrap">${s.id}</td><td>${s.text}${i.csf[s.id]?.note ? html`<br><small>${i.csf[s.id].note}</small>` : ''}</td></tr>`)}</tbody></table>
    </div>`;
  },
};
