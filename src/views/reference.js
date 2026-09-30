// Referência: o modelo de resposta a incidentes da SP 800-61 Rev. 3.
import { html, raw } from '../core/util.js';
import { FUNCTIONS, CATEGORIES, SUBCATEGORIES } from '../core/nist.js';
import { fnBadge } from '../ui.js';

const fn = (id) => FUNCTIONS.find((f) => f.id === id);

function diagram() {
  const box = (x, y, id) => { const f = fn(id); return `<g><rect x="${x}" y="${y}" width="120" height="44" rx="10" fill="${f.color}" opacity=".18" stroke="${f.color}"/><text x="${x + 60}" y="${y + 27}" text-anchor="middle" class="dg-t">${f.name}</text></g>`; };
  return `<svg viewBox="0 0 640 300" class="diagram" role="img" aria-label="Modelo de ciclo de vida de resposta a incidentes baseado nas Funções do CSF 2.0">
    <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="dg-a"/></marker></defs>
    <rect x="10" y="20" width="200" height="220" rx="14" class="dg-g"/><text x="110" y="44" text-anchor="middle" class="dg-h">Preparação</text>
    ${box(50, 62, 'GV')}${box(50, 118, 'ID')}${box(50, 174, 'PR')}
    <rect x="260" y="20" width="370" height="220" rx="14" class="dg-g"/><text x="445" y="44" text-anchor="middle" class="dg-h">Resposta a incidentes</text>
    ${box(280, 118, 'DE')}${box(440, 80, 'RS')}${box(440, 156, 'RC')}
    <path d="M400 132 L436 104" class="dg-l" marker-end="url(#ar)"/><path d="M400 148 L436 176" class="dg-l" marker-end="url(#ar)"/><path d="M500 124 L500 152" class="dg-l" marker-end="url(#ar)"/>
    <path d="M210 140 L276 140" class="dg-l" marker-end="url(#ar)"/>
    <path d="M620 230 C 620 290, 110 290, 110 244" class="dg-l dash" marker-end="url(#ar)"/>
    <text x="365" y="292" text-anchor="middle" class="dg-s">Melhoria (ID.IM): lições aprendidas realimentam todas as Funções</text>
  </svg>`;
}

export default {
  title: () => 'NIST SP 800-61r3',
  render() {
    const cats = Object.entries(CATEGORIES).filter(([k]) => ['DE', 'RS', 'RC'].includes(k.slice(0, 2)) || k === 'ID.IM');
    return html`<div class="page prose">
      <h1>NIST SP 800-61 Revision 3</h1>
      <p class="lead"><em>Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile</em> (abril de 2025). A Rev. 3 substitui a Rev. 2 (2012) e integra a resposta a incidentes à gestão de risco de cibersegurança da organização, usando as seis Funções do NIST Cybersecurity Framework 2.0.</p>

      <section class="card"><h2>Modelo de ciclo de vida</h2>${raw(diagram())}
        <p>Em vez das quatro fases lineares da Rev. 2 (preparação; detecção e análise; contenção, erradicação e recuperação; atividade pós-incidente), a Rev. 3 descreve:</p>
        <ul>
          <li><b>Preparação</b> contínua sustentada por <b>Governar</b>, <b>Identificar</b> e <b>Proteger</b> — políticas, papéis, inventário, avaliação de risco e salvaguardas que reduzem incidentes e deixam a organização pronta para responder.</li>
          <li><b>Resposta a incidentes</b> por <b>Detectar</b>, <b>Responder</b> e <b>Recuperar</b>, com atividades que podem ocorrer em paralelo.</li>
          <li><b>Melhoria</b> (categoria ID.IM) em todas as atividades: lições aprendidas não esperam o fim do incidente e alimentam todas as Funções.</li>
        </ul>
      </section>

      <section class="card"><h2>Como a plataforma aplica a Rev. 3</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Função</th><th>Na Blade</th></tr></thead><tbody>
          <tr><td>${fnBadge('GV')}</td><td>Papéis e responsabilidades (Equipe), políticas de SLA e critérios, regras de notificação, supervisão pelo painel e auditoria.</td></tr>
          <tr><td>${fnBadge('ID')}</td><td>Inventário e criticidade de ativos, avaliação de prontidão, exercícios (ID.IM-02), lições aprendidas e backlog de melhorias (ID.IM).</td></tr>
          <tr><td>${fnBadge('PR')}</td><td>Avaliação de salvaguardas (identidade, conscientização, backups, logs, resiliência) e melhorias direcionadas.</td></tr>
          <tr><td>${fnBadge('DE')}</td><td>Fila de eventos adversos, correlação, CTI e declaração por critérios definidos (DE.AE-08).</td></tr>
          <tr><td>${fnBadge('RS')}</td><td>Triagem, priorização e escalonamento; análise, causa raiz e magnitude; linha do tempo encadeada por hash; evidências com cadeia de custódia; contenção e erradicação; notificações e comunicação.</td></tr>
          <tr><td>${fnBadge('RC')}</td><td>Critérios de início e fim, verificação de backups e ativos restaurados, normas pós-incidente e comunicação da recuperação.</td></tr>
        </tbody></table></div>
      </section>

      <section class="card"><h2>Funções do CSF 2.0</h2>
        <div class="cards">${FUNCTIONS.map((f) => html`<div class="fncard" style="--c:${f.color}"><h3>${f.id} · ${f.name} <small class="muted">${f.en}</small></h3><p>${f.desc}</p></div>`)}</div>
      </section>

      <section class="card"><h2>Subcategorias aplicadas a cada incidente</h2>
        ${cats.map(([k, name]) => { const subs = SUBCATEGORIES.filter((s) => s.id.startsWith(k)); return subs.length ? html`<h3>${k} — ${name}</h3><ul class="plain">${subs.map((s) => html`<li>${fnBadge(s.id)} ${s.text}</li>`)}</ul>` : ''; })}
      </section>

      <section class="card"><h2>Terminologia</h2>
        <dl class="dl">
          <dt>Evento</dt><dd>Ocorrência observável em um sistema ou rede.</dd>
          <dt>Evento adverso</dt><dd>Evento com consequência negativa ou potencialmente negativa.</dd>
          <dt>Incidente</dt><dd>Ocorrência que coloca em risco, real ou iminente, a integridade, confidencialidade ou disponibilidade de informação ou sistema, ou que viola lei, política ou procedimento de segurança.</dd>
        </dl>
        <p class="small muted">Resumo informativo. Consulte o documento oficial em csrc.nist.gov (NIST SP 800-61r3) e as normas aplicáveis ao seu setor.</p>
      </section>
    </div>`;
  },
};
