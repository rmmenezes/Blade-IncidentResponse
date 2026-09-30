// Pessoas, Processos e Tecnologia: catálogos iniciais editáveis pela organização.

export const TECH_CATEGORIES = [
  'SIEM', 'EDR/XDR', 'SOAR', 'NDR / IDS / IPS', 'Firewall / WAF', 'Gateway de e-mail', 'IAM / MFA / PAM', 'DLP', 'CSPM / CNAPP',
  'Backup e recuperação', 'Forense digital', 'Inteligência de ameaças (CTI)', 'Gestão de vulnerabilidades', 'Gestão de casos / ITSM',
  'Comunicação fora de banda', 'Registro e retenção de logs', 'Outro',
];
export const TECH_STATUS = { operacional: 'Operacional', degradado: 'Degradado', implantacao: 'Em implantação', planejado: 'Planejado', descontinuado: 'Descontinuado' };

export const DEFAULT_TECHNOLOGIES = [
  { id: 'tec-siem', name: 'SIEM corporativo', category: 'SIEM', vendor: '', functions: ['DE', 'RS'], csf: ['DE.CM-01', 'DE.AE-03', 'RS.AN-07'], status: 'operacional', owner: '', notes: 'Correlação de eventos e retenção de logs.' },
  { id: 'tec-edr', name: 'EDR nos endpoints e servidores', category: 'EDR/XDR', vendor: '', functions: ['DE', 'RS'], csf: ['DE.CM-09', 'RS.MI-01', 'RS.AN-07'], status: 'operacional', owner: '', notes: 'Isolamento de host e coleta de artefatos.' },
  { id: 'tec-backup', name: 'Backup imutável', category: 'Backup e recuperação', vendor: '', functions: ['PR', 'RC'], csf: ['PR.DS-11', 'RC.RP-03'], status: 'operacional', owner: '', notes: 'Cópias offline/imutáveis testadas.' },
  { id: 'tec-iam', name: 'Diretório + MFA', category: 'IAM / MFA / PAM', vendor: '', functions: ['PR', 'RS'], csf: ['PR.AA-01', 'RS.MI-01'], status: 'operacional', owner: '', notes: 'Bloqueio de contas e revogação de sessões.' },
  { id: 'tec-forense', name: 'Kit de forense', category: 'Forense digital', vendor: '', functions: ['RS'], csf: ['RS.AN-07', 'RS.AN-03'], status: 'operacional', owner: '', notes: 'Aquisição de memória e disco, hash e cadeia de custódia.' },
  { id: 'tec-vuln', name: 'Gestão de vulnerabilidades', category: 'Gestão de vulnerabilidades', vendor: '', functions: ['ID'], csf: ['ID.RA-01', 'ID.RA-08'], status: 'operacional', owner: '', notes: 'Varreduras e priorização; apoia a análise de vetores de ataque.' },
  { id: 'tec-casos', name: 'Blade Incident Response', category: 'Gestão de casos / ITSM', vendor: 'Blade', functions: ['GV', 'ID', 'RS', 'RC'], csf: ['GV.RR-02', 'RS.MA-01', 'RS.AN-06', 'ID.IM-04'], status: 'operacional', owner: '', notes: 'Registro, coordenação e documentação dos incidentes.' },
  { id: 'tec-oob', name: 'Canal de comunicação fora de banda', category: 'Comunicação fora de banda', vendor: '', functions: ['RS', 'RC'], csf: ['RS.CO-02', 'RC.CO-03'], status: 'planejado', owner: '', notes: 'Canal alternativo caso o e-mail/chat corporativo esteja comprometido.' },
];

export const DEFAULT_PROCESSES = [
  { id: 'proc-triagem', name: 'Triagem, validação e classificação', objective: 'Validar relatos, declarar incidentes e definir prioridade.', csf: ['DE.AE-02', 'DE.AE-08', 'RS.MA-02', 'RS.MA-03'], owner: '', inputs: 'Alertas, relatos de usuários, notificações de terceiros', outputs: 'Incidente declarado e priorizado', version: '1.0', reviewedAt: null },
  { id: 'proc-escalonamento', name: 'Escalonamento e acionamento', objective: 'Envolver liderança, jurídico e terceiros conforme severidade.', csf: ['RS.MA-01', 'RS.MA-04'], owner: '', inputs: 'Severidade, escopo', outputs: 'Comitê acionado, papéis atribuídos', version: '1.0', reviewedAt: null },
  { id: 'proc-evidencias', name: 'Gestão de evidências e registros', objective: 'Coletar e preservar dados com integridade e proveniência.', csf: ['RS.AN-06', 'RS.AN-07'], owner: '', inputs: 'Sistemas afetados', outputs: 'Evidências com hash e cadeia de custódia', version: '1.0', reviewedAt: null },
  { id: 'proc-mitigacao', name: 'Contenção e erradicação', objective: 'Limitar danos e remover o agente da ameaça.', csf: ['RS.MI-01', 'RS.MI-02'], owner: '', inputs: 'Análise, IOCs', outputs: 'Ameaça contida e erradicada', version: '1.0', reviewedAt: null },
  { id: 'proc-comunicacao', name: 'Comunicação e notificação', objective: 'Notificar partes interessadas e autoridades nos prazos.', csf: ['RS.CO-02', 'RS.CO-03', 'RC.CO-03', 'RC.CO-04'], owner: '', inputs: 'Magnitude, dados afetados', outputs: 'Notificações e comunicados registrados', version: '1.0', reviewedAt: null },
  { id: 'proc-recuperacao', name: 'Recuperação', objective: 'Restaurar com integridade verificada e declarar o fim da recuperação.', csf: ['RS.MA-05', 'RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-05', 'RC.RP-06'], owner: '', inputs: 'Critérios de recuperação', outputs: 'Operação normal confirmada', version: '1.0', reviewedAt: null },
  { id: 'proc-melhoria', name: 'Lições aprendidas e melhoria', objective: 'Transformar o incidente em melhorias do programa.', csf: ['ID.IM-01', 'ID.IM-03', 'ID.IM-04'], owner: '', inputs: 'Registros do incidente', outputs: 'Backlog de melhorias, plano atualizado', version: '1.0', reviewedAt: null },
];

const st = (title, role = '', tech = '') => ({ title, role, tech });
export const DEFAULT_PROCEDURES = [
  { id: 'pop-isolamento', name: 'Isolamento de host comprometido', process: 'proc-mitigacao', phase: 'contencao', csf: 'RS.MI-01', version: '1.0', owner: '',
    steps: [st('Confirmar identificação do host (hostname, IP, usuário)', 'handler'), st('Coletar triagem volátil antes do isolamento, se aprovado', 'handler', 'tec-forense'), st('Aplicar isolamento de rede via EDR', 'tech', 'tec-edr'), st('Registrar horário e responsável na linha do tempo', 'scribe'), st('Comunicar o usuário e o gestor da área', 'comms')] },
  { id: 'pop-memoria', name: 'Aquisição de memória e disco', process: 'proc-evidencias', phase: 'analise', csf: 'RS.AN-07', version: '1.0', owner: '',
    steps: [st('Preparar mídia de coleta esterilizada e ferramenta validada', 'handler', 'tec-forense'), st('Adquirir memória RAM', 'handler', 'tec-forense'), st('Adquirir imagem de disco (bloqueio de escrita)', 'handler', 'tec-forense'), st('Calcular SHA-256 das imagens', 'handler'), st('Registrar evidência e abrir cadeia de custódia', 'scribe'), st('Armazenar em local controlado (WORM/cofre)', 'tech')] },
  { id: 'pop-credenciais', name: 'Redefinição de credenciais privilegiadas', process: 'proc-mitigacao', phase: 'erradicacao', csf: 'RS.MI-02', version: '1.0', owner: '',
    steps: [st('Inventariar contas privilegiadas e de serviço afetadas', 'tech', 'tec-iam'), st('Redefinir senhas e rotacionar segredos/chaves', 'tech', 'tec-iam'), st('Redefinir KRBTGT duas vezes (intervalo de replicação)', 'tech', 'tec-iam'), st('Revogar sessões e tokens ativos', 'tech', 'tec-iam'), st('Validar ausência de logins anômalos após a troca', 'handler', 'tec-siem')] },
  { id: 'pop-anpd', name: 'Comunicação de incidente à ANPD e titulares', process: 'proc-comunicacao', phase: 'analise', csf: 'RS.CO-02', version: '1.0', owner: '',
    steps: [st('Avaliar risco ou dano relevante aos titulares', 'legal'), st('Levantar natureza dos dados, titulares, medidas e riscos', 'legal'), st('Redigir comunicação (modelo da plataforma)', 'legal'), st('Aprovar com a liderança', 'leadership'), st('Enviar pelo canal oficial da ANPD e registrar protocolo', 'legal'), st('Comunicar titulares em linguagem clara', 'comms')] },
  { id: 'pop-restauracao', name: 'Restauração a partir de backup', process: 'proc-recuperacao', phase: 'recuperacao', csf: 'RC.RP-03', version: '1.0', owner: '',
    steps: [st('Selecionar ponto de restauração anterior ao comprometimento', 'tech', 'tec-backup'), st('Verificar integridade do backup (hash, varredura antimalware)', 'tech', 'tec-backup'), st('Restaurar em rede isolada e validar', 'tech'), st('Aplicar correções do vetor de ataque antes de reconectar', 'tech'), st('Reconectar e monitorar reinfecção por período definido', 'handler', 'tec-siem'), st('Obter aceite do dono do sistema', 'bc')] },
  { id: 'pop-licoes', name: 'Reunião de lições aprendidas', process: 'proc-melhoria', phase: 'pos', csf: 'ID.IM-03', version: '1.0', owner: '',
    steps: [st('Agendar em até 2 semanas após a recuperação', 'lead'), st('Consolidar linha do tempo e métricas', 'scribe'), st('Conduzir revisão sem culpados', 'lead'), st('Registrar melhorias com responsável e prazo', 'lead'), st('Atualizar plano, playbooks e procedimentos (ID.IM-04)', 'lead')] },
];
