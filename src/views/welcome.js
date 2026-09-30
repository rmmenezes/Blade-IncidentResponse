import { html, raw } from '../core/util.js';
import { ic } from '../ui.js';
import { art } from '../art.js';
import { NIST_LINKS } from '../core/nist.js';

const FEATURES = [
  ['radar', 'Detectar e responder', 'Da triagem ao encerramento, com passos guiados e responsáveis definidos.'],
  ['guide', 'Biblioteca em livros', '10 playbooks e 8 procedimentos completos para ler, aplicar e baixar.'],
  ['evidence', 'Registro íntegro', 'Linha do tempo protegida por hash, evidências e arquivos com cadeia de custódia.'],
  ['report', 'Relatórios prontos', 'Executivo, conformidade NIST, prazos regulatórios e lições aprendidas.'],
];

export default {
  render: () => html`<div class="page welcome">
    <section class="hero hero-xl">
      <div class="hero-txt">
        <p class="eyebrow">NIST SP 800-61 Rev. 3 · CSF 2.0</p>
        <h1>Resposta a incidentes, do alerta à lição aprendida.</h1>
        <p class="lead">A Blade organiza áreas, playbooks e evidências para sua equipe responder com método, sem planilhas nem improviso.</p>
        <div class="row">
          <button class="btn primary lg" data-start="demo">${ic('dash')} Explorar com dados de exemplo</button>
          <button class="btn lg" data-start="empty">${ic('plus')} Começar do zero</button>
        </div>
        <p class="muted small">Os dados ficam neste navegador. Documento de referência: <a href="${NIST_LINKS.pdf}" target="_blank" rel="noopener">NIST SP 800-61r3 (PDF)</a>.</p>
      </div>
      <div class="hero-art">${raw(art('shield'))}</div>
    </section>
    <div class="features">${FEATURES.map(([a, t, d]) => html`<div class="feature"><span class="feature-art">${raw(art(a))}</span><h3>${t}</h3><p class="muted">${d}</p></div>`)}</div>
  </div>`,
  mount(el, { start }) {
    el.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => start(b.dataset.start)));
  },
};
