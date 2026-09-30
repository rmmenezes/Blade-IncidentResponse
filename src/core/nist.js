// Referência NIST SP 800-61 Rev. 3 (abr/2025): recomendações de resposta a incidentes
// organizadas pelas Funções, Categorias e Subcategorias do NIST CSF 2.0.

// Documentos oficiais.
export const NIST_LINKS = {
  pub: 'https://csrc.nist.gov/pubs/sp/800/61/r3/final',
  pdf: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf',
  csf: 'https://www.nist.gov/cyberframework',
  csfPdf: 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf',
  rev2: 'https://csrc.nist.gov/pubs/sp/800/61/r2/final',
  anpd: 'https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca',
  certbr: 'https://www.cert.br/',
};

export const FUNCTIONS = [
  { id: 'GV', name: 'Governar', en: 'Govern', group: 'prep', color: '#8b7cf6',
    desc: 'Estratégia, expectativas e política de gestão de risco de cibersegurança — inclui papéis, responsabilidades e política de resposta a incidentes.' },
  { id: 'ID', name: 'Identificar', en: 'Identify', group: 'prep', color: '#4f9cf9',
    desc: 'Entendimento dos ativos, riscos e — pela categoria Melhoria (ID.IM) — lições aprendidas que realimentam todo o ciclo.' },
  { id: 'PR', name: 'Proteger', en: 'Protect', group: 'prep', color: '#2bb8a6',
    desc: 'Salvaguardas que reduzem a probabilidade e o impacto de incidentes: identidade, conscientização, dados, plataformas e resiliência.' },
  { id: 'DE', name: 'Detectar', en: 'Detect', group: 'ir', color: '#f5b83d',
    desc: 'Monitoramento contínuo e análise de eventos adversos para encontrar possíveis incidentes e declará-los.' },
  { id: 'RS', name: 'Responder', en: 'Respond', group: 'ir', color: '#f2744b',
    desc: 'Gestão, análise, mitigação, relato e comunicação do incidente detectado.' },
  { id: 'RC', name: 'Recuperar', en: 'Recover', group: 'ir', color: '#43c46b',
    desc: 'Restauração de ativos e operações afetadas e comunicação durante a recuperação.' },
];

export const CATEGORIES = {
  'GV.OC': 'Contexto organizacional', 'GV.RM': 'Estratégia de gestão de risco', 'GV.RR': 'Papéis, responsabilidades e autoridades',
  'GV.PO': 'Política', 'GV.OV': 'Supervisão', 'GV.SC': 'Gestão de risco na cadeia de suprimentos',
  'ID.AM': 'Gestão de ativos', 'ID.RA': 'Avaliação de risco', 'ID.IM': 'Melhoria',
  'PR.AA': 'Gestão de identidade, autenticação e controle de acesso', 'PR.AT': 'Conscientização e treinamento',
  'PR.DS': 'Segurança de dados', 'PR.PS': 'Segurança de plataformas', 'PR.IR': 'Resiliência da infraestrutura tecnológica',
  'DE.CM': 'Monitoramento contínuo', 'DE.AE': 'Análise de eventos adversos',
  'RS.MA': 'Gestão de incidentes', 'RS.AN': 'Análise de incidentes', 'RS.CO': 'Relato e comunicação da resposta a incidentes',
  'RS.MI': 'Mitigação de incidentes', 'RC.RP': 'Execução do plano de recuperação de incidentes', 'RC.CO': 'Comunicação da recuperação de incidentes',
};

// Subcategorias aplicadas a cada incidente (Detectar, Responder, Recuperar e Melhoria).
export const SUBCATEGORIES = [
  { id: 'DE.AE-02', phase: 'triagem', text: 'Eventos potencialmente adversos são analisados para entender melhor as atividades associadas.' },
  { id: 'DE.AE-03', phase: 'triagem', text: 'Informações de múltiplas fontes são correlacionadas.' },
  { id: 'DE.AE-04', phase: 'triagem', text: 'O impacto e o escopo estimados de eventos adversos são compreendidos.' },
  { id: 'DE.AE-06', phase: 'triagem', text: 'Informações sobre eventos adversos são fornecidas à equipe e às ferramentas autorizadas.' },
  { id: 'DE.AE-07', phase: 'triagem', text: 'Inteligência de ameaças (CTI) e outras informações contextuais são integradas à análise.' },
  { id: 'DE.AE-08', phase: 'triagem', text: 'Incidentes são declarados quando eventos adversos atendem aos critérios definidos.' },
  { id: 'RS.MA-01', phase: 'triagem', text: 'O plano de resposta a incidentes é executado em coordenação com terceiros relevantes quando o incidente é declarado.' },
  { id: 'RS.MA-02', phase: 'triagem', text: 'Relatos de incidentes são triados e validados.' },
  { id: 'RS.MA-03', phase: 'triagem', text: 'Incidentes são categorizados e priorizados.' },
  { id: 'RS.MA-04', phase: 'analise', text: 'Incidentes são escalados ou elevados conforme necessário.' },
  { id: 'RS.AN-03', phase: 'analise', text: 'Análise é realizada para estabelecer o que ocorreu e a causa raiz do incidente.' },
  { id: 'RS.AN-06', phase: 'analise', text: 'Ações realizadas na investigação são registradas, preservando integridade e proveniência dos registros.' },
  { id: 'RS.AN-07', phase: 'analise', text: 'Dados e metadados do incidente são coletados, preservando integridade e proveniência.' },
  { id: 'RS.AN-08', phase: 'analise', text: 'A magnitude do incidente é estimada e validada.' },
  { id: 'RS.CO-02', phase: 'analise', text: 'Partes interessadas internas e externas são notificadas sobre incidentes.' },
  { id: 'RS.CO-03', phase: 'analise', text: 'Informações são compartilhadas com partes interessadas internas e externas designadas.' },
  { id: 'RS.MI-01', phase: 'contencao', text: 'Incidentes são contidos.' },
  { id: 'RS.MI-02', phase: 'erradicacao', text: 'Incidentes são erradicados.' },
  { id: 'RS.MA-05', phase: 'erradicacao', text: 'Os critérios para iniciar a recuperação do incidente são aplicados.' },
  { id: 'RC.RP-01', phase: 'recuperacao', text: 'A parte de recuperação do plano é executada quando iniciada a partir do processo de resposta.' },
  { id: 'RC.RP-02', phase: 'recuperacao', text: 'Ações de recuperação são selecionadas, delimitadas, priorizadas e executadas.' },
  { id: 'RC.RP-03', phase: 'recuperacao', text: 'A integridade de backups e outros ativos de restauração é verificada antes do uso.' },
  { id: 'RC.RP-04', phase: 'recuperacao', text: 'Funções críticas de missão e a gestão de risco são consideradas para estabelecer normas operacionais pós-incidente.' },
  { id: 'RC.RP-05', phase: 'recuperacao', text: 'A integridade dos ativos restaurados é verificada, sistemas e serviços são restaurados e o status normal é confirmado.' },
  { id: 'RC.CO-03', phase: 'recuperacao', text: 'Atividades e progresso da recuperação são comunicados às partes interessadas designadas.' },
  { id: 'RC.CO-04', phase: 'recuperacao', text: 'Atualizações públicas sobre a recuperação são compartilhadas por métodos e mensagens aprovados.' },
  { id: 'RC.RP-06', phase: 'pos', text: 'O fim da recuperação é declarado com base em critérios e a documentação do incidente é concluída.' },
  { id: 'ID.IM-01', phase: 'pos', text: 'Melhorias são identificadas a partir de avaliações.' },
  { id: 'ID.IM-03', phase: 'pos', text: 'Melhorias são identificadas a partir da execução de processos, procedimentos e atividades operacionais.' },
  { id: 'ID.IM-04', phase: 'pos', text: 'Planos de resposta a incidentes e outros planos de cibersegurança são estabelecidos, comunicados, mantidos e melhorados.' },
];

export const subById = Object.fromEntries(SUBCATEGORIES.map((s) => [s.id, s]));

// Estados do incidente. A Rev. 3 não impõe fases lineares; estes estados organizam o
// trabalho de Detectar → Responder → Recuperar → Melhoria dentro da plataforma.
export const STATUSES = [
  { id: 'triagem', name: 'Triagem', fn: 'DE', hint: 'Validar, categorizar e priorizar (DE.AE-08, RS.MA-02/03).' },
  { id: 'analise', name: 'Análise', fn: 'RS', hint: 'Determinar o que ocorreu, escopo, magnitude e causa raiz (RS.AN).' },
  { id: 'contencao', name: 'Contenção', fn: 'RS', hint: 'Limitar a propagação e o dano (RS.MI-01).' },
  { id: 'erradicacao', name: 'Erradicação', fn: 'RS', hint: 'Remover o agente da ameaça e as causas (RS.MI-02, RS.MA-05).' },
  { id: 'recuperacao', name: 'Recuperação', fn: 'RC', hint: 'Restaurar com integridade verificada (RC.RP, RC.CO).' },
  { id: 'pos', name: 'Pós-incidente', fn: 'ID', hint: 'Lições aprendidas e melhorias (ID.IM, RC.RP-06).' },
  { id: 'encerrado', name: 'Encerrado', fn: 'ID', hint: 'Documentação concluída.' },
];
export const statusById = Object.fromEntries(STATUSES.map((s) => [s.id, s]));
export const statusIndex = (id) => STATUSES.findIndex((s) => s.id === id);

// Campo de data registrado automaticamente ao entrar em cada estado.
export const STATUS_TIMESTAMP = {
  contencao: null, erradicacao: 'containedAt', recuperacao: 'eradicatedAt', pos: 'recoveredAt', encerrado: 'closedAt',
};

// Papéis de resposta a incidentes descritos na Rev. 3 (seção 2).
export const ROLES = [
  { id: 'lead', name: 'Líder do incidente (Incident Commander)' },
  { id: 'handler', name: 'Tratador de incidentes (Incident Handler)' },
  { id: 'tech', name: 'Especialista técnico / TI' },
  { id: 'comms', name: 'Comunicação / Relações públicas' },
  { id: 'legal', name: 'Jurídico e Privacidade (DPO)' },
  { id: 'leadership', name: 'Liderança executiva' },
  { id: 'hr', name: 'Recursos Humanos' },
  { id: 'physical', name: 'Segurança física' },
  { id: 'bc', name: 'Continuidade de negócios' },
  { id: 'scribe', name: 'Escriba / Documentação' },
  { id: 'third', name: 'Terceiro (MSSP, provedor, fornecedor)' },
];
export const roleById = Object.fromEntries(ROLES.map((r) => [r.id, r]));

export const CATEGORIES_INCIDENT = [
  'Ransomware', 'Malware', 'Phishing', 'Comprometimento de e-mail corporativo (BEC)', 'Comprometimento de conta',
  'Vazamento / exfiltração de dados', 'Negação de serviço (DoS/DDoS)', 'Acesso não autorizado', 'Ameaça interna',
  'Exploração de vulnerabilidade', 'Cadeia de suprimentos / terceiro', 'Configuração incorreta em nuvem', 'Perda ou furto de equipamento',
  'Uso indevido de recursos', 'Outro',
];

export const MITRE_TACTICS = [
  'Reconnaissance', 'Resource Development', 'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
  'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Command and Control',
  'Exfiltration', 'Impact',
];

export const TLP = ['CLEAR', 'GREEN', 'AMBER', 'AMBER+STRICT', 'RED'];

export const IOC_TYPES = ['IPv4', 'IPv6', 'Domínio', 'URL', 'Hash MD5', 'Hash SHA-1', 'Hash SHA-256', 'E-mail', 'Nome de arquivo', 'Chave de registro', 'Processo', 'User-Agent', 'Conta', 'Outro'];
