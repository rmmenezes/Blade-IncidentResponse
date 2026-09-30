// Avaliação de prontidão: atividades de preparação (Governar, Identificar, Proteger)
// e capacidades de Detectar/Responder/Recuperar recomendadas pela SP 800-61r3.
export const LEVELS = ['Inexistente', 'Inicial', 'Definido', 'Gerenciado'];

export const READINESS = [
  { id: 'GV.OC-04', text: 'Objetivos, capacidades e serviços críticos dos quais os stakeholders dependem são conhecidos e comunicados.' },
  { id: 'GV.RM-06', text: 'Método padronizado para calcular, documentar, categorizar e priorizar riscos (base para severidade de incidentes).' },
  { id: 'GV.RR-02', text: 'Papéis, responsabilidades e autoridades de resposta a incidentes estão definidos, comunicados e aplicados.' },
  { id: 'GV.RR-03', text: 'Recursos adequados (pessoas, orçamento, ferramentas) estão alocados para a resposta a incidentes.' },
  { id: 'GV.PO-01', text: 'Política de resposta a incidentes estabelecida, aprovada pela liderança e comunicada.' },
  { id: 'GV.OV-01', text: 'Resultados da gestão de risco (incluindo incidentes) são revisados para ajustar a estratégia.' },
  { id: 'GV.SC-08', text: 'Fornecedores e terceiros relevantes estão incluídos no planejamento, resposta e recuperação de incidentes.' },
  { id: 'ID.AM-01', text: 'Inventário de hardware mantido.' },
  { id: 'ID.AM-02', text: 'Inventário de software, serviços e sistemas mantido.' },
  { id: 'ID.AM-03', text: 'Fluxos de dados e comunicações de rede autorizados estão documentados.' },
  { id: 'ID.AM-05', text: 'Ativos são priorizados por classificação, criticidade e impacto na missão.' },
  { id: 'ID.RA-02', text: 'Inteligência de ameaças (CTI) é recebida de fóruns e fontes de compartilhamento.' },
  { id: 'ID.RA-08', text: 'Processos para receber, analisar e responder a divulgações de vulnerabilidades existem.' },
  { id: 'ID.IM-02', text: 'Exercícios e testes (tabletop, simulações) geram melhorias, inclusive com terceiros.' },
  { id: 'ID.IM-04', text: 'Plano de resposta a incidentes estabelecido, comunicado, mantido e melhorado.' },
  { id: 'PR.AA-01', text: 'Identidades e credenciais gerenciadas; MFA em acessos remotos e privilegiados.' },
  { id: 'PR.AT-01', text: 'Pessoal recebe conscientização para reconhecer e relatar eventos suspeitos.' },
  { id: 'PR.AT-02', text: 'Pessoas em funções especializadas (equipe de RI) recebem treinamento específico.' },
  { id: 'PR.DS-11', text: 'Backups criados, protegidos, mantidos e testados (inclui cópias offline/imutáveis).' },
  { id: 'PR.PS-04', text: 'Registros de log são gerados, retidos e disponibilizados para monitoramento contínuo.' },
  { id: 'PR.IR-03', text: 'Mecanismos de resiliência (redundância, failover) atendem requisitos normais e adversos.' },
  { id: 'DE.CM-01', text: 'Redes e serviços de rede são monitorados para encontrar eventos potencialmente adversos.' },
  { id: 'DE.CM-09', text: 'Hardware, software, ambientes de execução e dados são monitorados (EDR, SIEM).' },
  { id: 'DE.AE-08', text: 'Critérios formais para declaração de incidentes estão definidos.' },
  { id: 'RS.CO-02', text: 'Contatos e canais de notificação interna/externa (reguladores, CERT.br, polícia) atualizados.' },
  { id: 'RS.AN-07', text: 'Procedimentos e ferramentas forenses com cadeia de custódia estão disponíveis.' },
  { id: 'RC.RP-01', text: 'Plano de recuperação integrado ao processo de resposta e testado.' },
  { id: 'RC.CO-04', text: 'Modelos de comunicação pública pré-aprovados para incidentes.' },
];
