# Blade Incident Response

Plataforma web de gestão completa de incidentes de cibersegurança baseada no **NIST SP 800-61 Revision 3** (*Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile*, abril/2025) e nas Funções do **NIST CSF 2.0**.

**Acesse:** https://rmmenezes.github.io/Blade-IncidentResponse/

**Documento oficial:** [NIST SP 800-61 Rev. 3 (PDF)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf) · [página da publicação](https://csrc.nist.gov/pubs/sp/800/61/r3/final) · [NIST CSF 2.0 (PDF)](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

## Modelo da Rev. 3 aplicado

| Função CSF 2.0 | Na plataforma |
|---|---|
| **Governar (GV)** | Papéis e responsabilidades, critérios de declaração, SLAs, regras de notificação, auditoria |
| **Identificar (ID)** | Inventário e criticidade de ativos, avaliação de prontidão, exercícios, lições aprendidas e backlog de melhorias (ID.IM) |
| **Proteger (PR)** | Avaliação das salvaguardas (MFA, conscientização, backups, logs, resiliência) |
| **Detectar (DE)** | Fila de eventos adversos, correlação, CTI e declaração por critérios (DE.AE-08) |
| **Responder (RS)** | Triagem, priorização, escalonamento, análise e causa raiz, magnitude, contenção, erradicação, comunicação e notificação |
| **Recuperar (RC)** | Critérios de início e fim, verificação de backups e de ativos restaurados, comunicação da recuperação |

## Funcionalidades

O menu tem 6 itens: **Início, Incidentes, Biblioteca, Relatórios, Organização e Configurações**.

### Biblioteca (playbooks e procedimentos em formato de livro)
- **10 playbooks completos**: ransomware, phishing, BEC, vazamento de dados pessoais, DDoS, conta comprometida, malware, incidente em fornecedor, ameaça interna e comprometimento em nuvem. Cada um tem capa, controle do documento, sumário, gatilhos de acionamento, papéis, pré-requisitos, fluxo de resposta, passos detalhados por fase (com papel responsável e subcategoria do CSF), evidências a coletar, pontos de decisão, comunicação, indicadores, técnicas MITRE ATT&CK, checklist, métricas e referências.
- **Procedimentos operacionais (POPs)** com objetivo, quando usar, pré-requisitos, passo a passo, verificação, cuidados e registros. Podem ser criados, editados (a versão sobe automaticamente) e duplicados.
- **Plano de Resposta a Incidentes** gerado com os dados da organização, e um **Guia NIST SP 800-61r3**.
- **Download** de cada livro em PDF (pela impressão do navegador), HTML completo ou Markdown, e da **biblioteca inteira** em um único HTML.
- **Usar em um incidente**: as etapas viram tarefas atribuídas pelo papel.

### Incidentes
- **Declarar em 3 escolhas:** o que está acontecendo, tipo de incidente (aplica o playbook) e impacto. As tarefas já saem atribuídas às áreas.
- **Troca de fase com um clique:** botões *Voltar* e *Avançar*, ou clique direto na fase, sem justificativa. Pendências aparecem só como aviso.
- **Áreas, não pessoas:** cada área (SOC, Infraestrutura, Jurídico/DPO, Comunicação, Diretoria…) tem um papel padrão e recebe automaticamente as tarefas desse papel.
- **Uma tela por fase** (Triagem, Análise, Contenção, Erradicação, Recuperação, Pós-incidente, Encerrado), com as ações da fase, as boas práticas NIST, registro rápido com anexos e o histórico da fase. A cronologia completa fica no botão *Cronologia*.
- Severidade S1–S4 em um clique (ou automática pelos fatores), SLAs e tarefas com passos.
- Linha do tempo encadeada por SHA-256; arquivos e imagens anexados (arrastar, selecionar ou colar); evidências com cadeia de custódia; IOCs em CSV ou STIX 2.1.
- Notificações com prazo: LGPD (ANPD e titulares, 3 dias úteis) e CERT.br; SLA único de contenção por severidade; modelos de mensagem, recuperação, lições aprendidas e checklist NIST.
- Relatório do incidente pronto para imprimir e **pacote do incidente** (`.blade.json` com arquivos) para compartilhar.

### Relatórios e organização
- 9 relatórios com filtro de período, PDF e CSV.
- Organização: áreas, ativos, tecnologias (cobertura por Função do CSF), processos, prontidão, exercícios e melhorias.

## Visual

Tema **Bento**: blocos grandes, cores pastel, cantos arredondados e fonte Plus Jakarta Sans, com modo claro (padrão) e escuro no botão de tema. Os estilos ficam em `src/theme-bento.css`.

## Dados e privacidade

É uma aplicação estática, sem servidor: os registros ficam no `localStorage` e os arquivos no IndexedDB do navegador. Use **Configurações → Exportar tudo + arquivos** para backup e o **pacote do incidente** para compartilhar um caso com outra pessoa. Para uso multiusuário em produção, o próximo passo é criar um backend com autenticação.

## Desenvolvimento

```bash
npm start   # servidor local em http://localhost:8080
npm test    # testes das regras (priorização, prazos, integridade…)
```

O código usa JavaScript puro com módulos ES e não precisa de build. A publicação no GitHub Pages é feita pelo workflow `.github/workflows/pages.yml` a cada push na `main`.

> Os prazos regulatórios são referências e não substituem a análise jurídica. Consulte o documento oficial em csrc.nist.gov.
