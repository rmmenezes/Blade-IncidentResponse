// Organização: tudo o que é preparação (pessoas, ativos, tecnologia, processos e melhoria) em um só lugar.
import { html, raw } from '../core/util.js';
import { art } from '../art.js';
import { ic } from '../ui.js';
import prep from './prep.js';
import library from './library.js';
import improvements from './improvements.js';

const TABS = [
  { id: 'equipe', label: 'Equipe', icon: 'users', view: prep },
  { id: 'ativos', label: 'Ativos', icon: 'layers', view: prep },
  { id: 'tecnologias', label: 'Tecnologias', icon: 'gear', view: library },
  { id: 'processos', label: 'Processos', icon: 'list', view: library },
  { id: 'prontidao', label: 'Prontidão', icon: 'shield', view: prep },
  { id: 'exercicios', label: 'Exercícios', icon: 'clock', view: prep },
  { id: 'melhorias', label: 'Melhorias', icon: 'up', view: improvements },
];
const ARTS = { equipe: 'team', ativos: 'plan', tecnologias: 'radar', processos: 'procedure', prontidao: 'shield', exercicios: 'restore', melhorias: 'report' };
const DESC = {
  equipe: 'Quem responde, com que papel e como contatar (GV.RR-02).',
  ativos: 'Inventário e criticidade dos ativos que sustentam o negócio (ID.AM).',
  tecnologias: 'Ferramentas que apoiam cada Função do CSF 2.0.',
  processos: 'Como a resposta é organizada: donos, entradas, saídas e revisões.',
  prontidao: 'Autoavaliação da preparação para responder a incidentes.',
  exercicios: 'Simulações e testes que geram melhorias (ID.IM-02).',
  melhorias: 'Ações de melhoria vindas de incidentes, testes e avaliações.',
};

const pick = (id) => TABS.find((t) => t.id === id) || TABS[0];

export default {
  title: ([tab]) => `Organização · ${pick(tab).label}`,
  render([tab], ctx) {
    const t = pick(tab);
    return html`<div class="page">
      <section class="hero hero-sm">
        <div class="hero-txt"><p class="eyebrow">Organização</p><h1>${t.label}</h1><p class="muted">${DESC[t.id]}</p></div>
        <div class="hero-art">${raw(art(ARTS[t.id]))}</div>
      </section>
      <nav class="tabs pill-tabs">${TABS.map((x) => html`<a class="tab ${x.id === t.id ? 'on' : ''}" href="#/organizacao/${x.id}">${ic(x.icon)} ${x.label}</a>`)}</nav>
      ${t.view.render([t.id], ctx)}
    </div>`;
  },
  mount(el, [tab], ctx) { return pick(tab).view.mount?.(el, [pick(tab).id], ctx); },
};
