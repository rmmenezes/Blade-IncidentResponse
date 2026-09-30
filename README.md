# Blade Incident Response

Plataforma web de gestão completa de incidentes de cibersegurança baseada no **NIST SP 800-61 Revision 3** (*Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile*, abril/2025) e nas Funções do **NIST CSF 2.0**.

**Acesse:** https://rmmenezes.github.io/Blade-IncidentResponse/

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

- **Painel**: incidentes abertos por severidade, MTTD, MTTC, MTTR, alertas de SLA e de prazos regulatórios, próximas tarefas e índice de prontidão.
- **Eventos adversos**: registro por fonte (SIEM, EDR, usuário, CTI…), triagem, correlação, descarte justificado e declaração de incidente.
- **Incidentes** em lista ou quadro kanban, com filtros e exportação CSV.
- **Gestão do incidente**:
  - Fluxo de estados (Triagem → Análise → Contenção → Erradicação → Recuperação → Pós-incidente → Encerrado), com marcos de tempo automáticos e alertas de boas práticas antes de avançar.
  - Priorização por impacto funcional, impacto na informação, recuperabilidade, escopo e criticidade dos ativos (S1–S4), com ajuste manual justificado.
  - SLAs de triagem, contenção e recuperação por severidade.
  - Papéis da equipe (líder, tratador, jurídico/DPO, comunicação, liderança, terceiros…).
  - **Linha do tempo à prova de adulteração**: registros encadeados por SHA-256, com verificação de integridade (RS.AN-06).
  - **Evidências com cadeia de custódia**: o hash SHA-256 do arquivo é calculado localmente (RS.AN-07).
  - Indicadores (IOCs) com TLP, importação em lote com detecção de tipo e exportação em CSV e **STIX 2.1**.
  - Tarefas por fase, com responsável e prazo, e **playbooks** (ransomware, phishing, BEC, vazamento de dados, DDoS, conta comprometida, malware, cadeia de suprimentos).
  - Análise: hipótese, causa raiz, 5 porquês, táticas MITRE ATT&CK e magnitude (RS.AN-08).
  - **Notificações regulatórias** com cálculo de prazo: LGPD/ANPD e titulares (3 dias úteis), GDPR (72 h), NIS2, SEC 8-K e CERT.br; também aceita regras personalizadas.
  - Registro de comunicações e modelos de mensagem (atualização interna, ANPD, titulares, comunicado público).
  - Recuperação: RS.MA-05, RC.RP-01 a RC.RP-06.
  - Lições aprendidas com roteiro de perguntas, que geram melhorias.
  - Checklist de conformidade com as subcategorias do CSF 2.0 aplicáveis ao incidente.
  - **Relatório** completo pronto para imprimir ou salvar em PDF, e exportação em JSON.
- **Preparação**: avaliação de prontidão (GV/ID/PR/DE/RS/RC), equipe e contatos, inventário de ativos e exercícios.
- **Melhorias**: backlog ligado a incidentes e às subcategorias do CSF.
- **Auditoria**, **busca global** (tecla `/`), tema claro/escuro, layout responsivo, backup e restauração por JSON.

## Dados e privacidade

É uma aplicação estática, sem servidor: os dados ficam no `localStorage` do navegador. Use **Configurações → Exportar** para fazer backup ou compartilhar. Para uso multiusuário em produção, o próximo passo é criar um backend com autenticação.

## Desenvolvimento

```bash
npm start   # servidor local em http://localhost:8080
npm test    # testes das regras (priorização, prazos, integridade…)
```

O código usa JavaScript puro com módulos ES e não precisa de build. A publicação no GitHub Pages é feita pelo workflow `.github/workflows/pages.yml` a cada push na `main`.

> Os prazos regulatórios são referências e não substituem a análise jurídica. Consulte o documento oficial em csrc.nist.gov.
