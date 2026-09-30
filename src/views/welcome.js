import { html } from '../core/util.js';
import { ic } from '../ui.js';

export default {
  render: () => html`<div class="page welcome">
    <div class="hero">
      <h1>Blade Incident Response</h1>
      <p class="lead">Gestão completa de incidentes de cibersegurança alinhada ao <strong>NIST SP 800-61 Revision 3</strong> e às Funções do <strong>CSF 2.0</strong>: Governar, Identificar, Proteger, Detectar, Responder e Recuperar.</p>
      <div class="row">
        <button class="btn primary lg" data-start="demo">${ic('dash')} Explorar com dados de demonstração</button>
        <button class="btn lg" data-start="empty">${ic('plus')} Começar ambiente vazio</button>
      </div>
      <p class="muted small">Os dados ficam somente neste navegador. Use <em>Configurações → Exportar</em> para backup e compartilhamento.</p>
    </div>
    <div class="grid3">
      <div class="card"><h3>Detectar</h3><p>Fila de eventos adversos com triagem, correlação e declaração de incidentes por critérios definidos (DE.AE-08).</p></div>
      <div class="card"><h3>Responder</h3><p>Priorização, playbooks, tarefas, IOCs, evidências com cadeia de custódia, linha do tempo à prova de adulteração e notificações regulatórias.</p></div>
      <div class="card"><h3>Recuperar e melhorar</h3><p>Critérios de recuperação, verificação de integridade, lições aprendidas e backlog de melhorias (ID.IM).</p></div>
    </div>
  </div>`,
  mount(el, { start }) {
    el.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => start(b.dataset.start)));
  },
};
