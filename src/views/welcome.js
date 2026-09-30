import { html } from '../core/util.js';
import { ic } from '../ui.js';
import { NIST_LINKS } from '../core/nist.js';

export default {
  render: () => html`<div class="page welcome">
    <div class="hero">
      <p class="eyebrow">Plataforma de resposta a incidentes · NIST SP 800-61r3</p>
      <h1>Blade Incident Response</h1>
      <p class="lead">Gestão completa de incidentes de cibersegurança alinhada ao <strong>NIST SP 800-61 Revision 3</strong> e às Funções do <strong>CSF 2.0</strong>: Governar, Identificar, Proteger, Detectar, Responder e Recuperar.</p>
      <div class="row">
        <button class="btn primary lg" data-start="demo">${ic('dash')} Explorar com dados de demonstração</button>
        <button class="btn lg" data-start="empty">${ic('plus')} Começar ambiente vazio</button>
      </div>
      <p class="muted small">Os dados ficam somente neste navegador. Use <em>Configurações → Exportar</em> para backup e o <em>pacote do incidente</em> para compartilhar. Referência: <a href="${NIST_LINKS.pdf}" target="_blank" rel="noopener">NIST SP 800-61 Rev. 3 (PDF oficial)</a>.</p>
    </div>
    <div class="grid3">
      <div class="card"><h3>Detectar</h3><p>Fila de eventos adversos com triagem, correlação e declaração de incidentes por critérios definidos (DE.AE-08).</p></div>
      <div class="card"><h3>Responder</h3><p>Priorização, playbooks, tarefas, IOCs, evidências com cadeia de custódia, linha do tempo à prova de adulteração e notificações regulatórias.</p></div>
      <div class="card"><h3>Pessoas, processos e tecnologia</h3><p>Atribuição de equipe e tarefas, catálogo de tecnologias, processos e procedimentos operacionais com passos rastreáveis.</p></div>
      <div class="card"><h3>Relatórios</h3><p>Executivo, operacional e SLAs, conformidade CSF, notificações regulatórias, IOCs, equipe e melhorias — com impressão em PDF e CSV.</p></div>
      <div class="card"><h3>Recuperar e melhorar</h3><p>Critérios de recuperação, verificação de integridade, lições aprendidas e backlog de melhorias (ID.IM).</p></div>
    </div>
  </div>`,
  mount(el, { start }) {
    el.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => start(b.dataset.start)));
  },
};
