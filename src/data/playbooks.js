// Playbooks completos de resposta a incidentes, estruturados pelas Funções do CSF 2.0
// (NIST SP 800-61 Rev. 3). Cada passo indica papel responsável e subcategoria CSF.

const REF = {
  nist: { title: 'NIST SP 800-61 Rev. 3 — Incident Response Recommendations', url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf' },
  csf: { title: 'NIST Cybersecurity Framework 2.0', url: 'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf' },
  attack: { title: 'MITRE ATT&CK', url: 'https://attack.mitre.org/' },
  cisaPb: { title: 'CISA — Incident & Vulnerability Response Playbooks', url: 'https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks' },
  cisaRw: { title: 'CISA #StopRansomware Guide', url: 'https://www.cisa.gov/stopransomware/ransomware-guide' },
  anpd: { title: 'ANPD — Comunicação de incidente de segurança', url: 'https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca' },
  certbr: { title: 'CERT.br — Cartilha de Segurança', url: 'https://cartilha.cert.br/' },
  sp80083: { title: 'NIST SP 800-83 Rev. 1 — Malware Incident Prevention and Handling', url: 'https://csrc.nist.gov/pubs/sp/800/83/r1/final' },
  sp80086: { title: 'NIST SP 800-86 — Integrating Forensic Techniques into IR', url: 'https://csrc.nist.gov/pubs/sp/800/86/final' },
  scrm: { title: 'NIST — Cybersecurity Supply Chain Risk Management', url: 'https://csrc.nist.gov/projects/cyber-supply-chain-risk-management' },
};

// Passo: título, detalhe, papel, subcategoria CSF.
const S = (title, detail, role, csf) => ({ title, detail, role, csf });
const P = (id, goal, steps, extra = {}) => ({ id, goal, steps, evidence: [], decisions: [], ...extra });

export const PHASE_TITLES = {
  triagem: 'Detecção e triagem', analise: 'Análise', contencao: 'Contenção', erradicacao: 'Erradicação', recuperacao: 'Recuperação', pos: 'Pós-incidente e melhoria',
};

const BOOKS = [
  {
    id: 'ransomware', name: 'Ransomware', subtitle: 'Criptografia de dados e extorsão', category: 'Ransomware', color: '#b42318', art: 'ransomware', version: '2.0',
    summary: 'Resposta a ataques que criptografam dados ou sistemas e exigem resgate, frequentemente com exfiltração prévia (dupla extorsão).',
    objective: 'Conter a propagação rapidamente, preservar evidências, avaliar exfiltração, cumprir obrigações de notificação e restaurar a operação a partir de fontes íntegras sem reinfecção.',
    scope: 'Estações, servidores, ambientes virtualizados, nuvem e backups da organização. Inclui variantes com e sem exfiltração.',
    triggers: ['Nota de resgate ou extensão de arquivo desconhecida em massa', 'Alerta de EDR para criptografia ou exclusão de cópias de sombra (vssadmin, wbadmin)', 'Indisponibilidade simultânea de vários servidores de arquivos', 'Contato do atacante ou publicação em site de vazamento', 'Alerta de terceiro (CERT, fornecedor, autoridade)'],
    severity: 'Normalmente S1 (Crítica) — impacto funcional alto, recuperabilidade estendida e possível exposição de dados pessoais.',
    roles: [['lead', 'Coordena o comitê de crise, decide sobre desligamentos e aprova comunicações.'], ['handler', 'Conduz triagem, coleta forense e análise do vetor inicial.'], ['tech', 'Isola redes e hosts, protege backups, executa restauração.'], ['legal', 'Avalia obrigações (LGPD/ANPD, contratos, seguradora) e pagamento de resgate.'], ['comms', 'Comunicação interna, clientes e imprensa com mensagens aprovadas.'], ['leadership', 'Decisões de negócio, orçamento e acionamento de seguradora/terceiros.']],
    prerequisites: ['Backups offline ou imutáveis testados (PR.DS-11)', 'EDR com capacidade de isolamento em todos os endpoints e servidores', 'Inventário de ativos críticos e ordem de restauração (ID.AM-05)', 'Canal de comunicação fora de banda para o comitê de crise', 'Contatos de seguradora, forense externa e autoridades atualizados', 'Retenção de logs de autenticação, VPN e EDR por pelo menos 90 dias'],
    phases: [
      P('triagem', 'Confirmar o ataque, estimar o alcance inicial e acionar o comitê de crise.', [
        S('Validar o alerta e confirmar a criptografia', 'Verifique nota de resgate, extensões alteradas e processos suspeitos. Registre capturas de tela e o nome da família (use CTI ou ID Ransomware).', 'handler', 'DE.AE-02'),
        S('Declarar o incidente e classificar como S1', 'Aplique os critérios de declaração e registre a severidade com justificativa.', 'lead', 'DE.AE-08'),
        S('Acionar o comitê de crise', 'Convoque liderança, jurídico, comunicação e TI pelo canal fora de banda. Defina cadência de reuniões (ex.: a cada 2 h).', 'lead', 'RS.MA-04'),
        S('Acionar seguradora e parceiros contratados', 'Siga as cláusulas da apólice antes de contratar terceiros; registre número do sinistro.', 'legal', 'RS.MA-01'),
      ], { evidence: ['Nota de resgate (arquivo e captura)', 'Amostra de arquivo criptografado', 'Alertas do EDR/SIEM com horários'], decisions: ['Existe risco à vida ou à segurança física? Priorize sistemas de segurança e OT.', 'O ataque ainda está ativo (criptografia em andamento)? Vá direto à contenção.'] }),
      P('contencao', 'Interromper a propagação e proteger o que ainda está íntegro.', [
        S('Isolar hosts afetados sem desligá-los', 'Use o isolamento do EDR ou desconecte da rede. Evite desligar: a memória contém chaves e artefatos.', 'tech', 'RS.MI-01'),
        S('Segmentar ou bloquear tráfego lateral', 'Bloqueie SMB/RDP/WinRM entre segmentos e restrinja acesso a servidores críticos.', 'tech', 'RS.MI-01'),
        S('Desabilitar contas comprometidas e revogar sessões', 'Inclua contas de serviço e VPN; force logoff e revogue tokens em nuvem.', 'tech', 'RS.MI-01'),
        S('Proteger os backups', 'Desconecte repositórios, confirme imutabilidade e troque credenciais do console de backup.', 'tech', 'RS.MI-01'),
        S('Bloquear indicadores conhecidos', 'Bloqueie domínios, IPs e hashes do C2 e do encriptador em firewall, proxy, DNS e EDR.', 'handler', 'RS.MI-01'),
      ], { evidence: ['Lista de hosts isolados e horário', 'Configurações de bloqueio aplicadas'], decisions: ['Desligar a internet ou o domínio inteiro? Avalie impacto x propagação com a liderança.'] }),
      P('analise', 'Entender vetor inicial, alcance, exfiltração e magnitude.', [
        S('Coletar evidências voláteis e de disco', 'Adquira memória e imagens dos hosts-chave com hash SHA-256 e cadeia de custódia.', 'handler', 'RS.AN-07'),
        S('Identificar o vetor inicial', 'Revise logs de VPN, RDP exposto, e-mails e vulnerabilidades de borda recentes.', 'handler', 'RS.AN-03'),
        S('Mapear movimentação lateral e persistência', 'Busque contas criadas, tarefas agendadas, GPOs alteradas e ferramentas de acesso remoto.', 'handler', 'RS.AN-03'),
        S('Determinar exfiltração de dados', 'Analise volume de saída, ferramentas como rclone/megasync e sites de vazamento.', 'handler', 'RS.AN-08'),
        S('Estimar magnitude e dados pessoais afetados', 'Quantifique sistemas, registros e titulares; valide com os donos dos dados.', 'legal', 'RS.AN-08'),
        S('Avaliar e iniciar notificações', 'Verifique prazos da ANPD (3 dias úteis), reguladores setoriais, contratos e polícia.', 'legal', 'RS.CO-02'),
      ], { evidence: ['Imagens de memória e disco (com hash)', 'Logs de VPN, AD, EDR, firewall e proxy', 'Linha do tempo do atacante'], decisions: ['Pagamento de resgate: decisão exclusiva da liderança com jurídico; avalie sanções e ausência de garantia.'] }),
      P('erradicacao', 'Remover o atacante e fechar o vetor de entrada.', [
        S('Remover persistências e ferramentas do atacante', 'Elimine contas, tarefas, serviços e binários identificados em todos os hosts.', 'tech', 'RS.MI-02'),
        S('Redefinir credenciais privilegiadas', 'Inclua administradores de domínio, contas de serviço e KRBTGT (duas vezes, respeitando a replicação).', 'tech', 'RS.MI-02'),
        S('Corrigir o vetor inicial', 'Aplique patches, feche RDP exposto, exija MFA na VPN e revise regras de firewall.', 'tech', 'RS.MI-02'),
        S('Aplicar critérios para iniciar a recuperação', 'Confirme ausência de atividade maliciosa por período definido antes de restaurar.', 'lead', 'RS.MA-05'),
      ]),
      P('recuperacao', 'Restaurar por prioridade de negócio com integridade verificada.', [
        S('Definir a ordem de restauração', 'Priorize identidade (AD), rede, sistemas críticos e depois demais serviços.', 'lead', 'RC.RP-02'),
        S('Verificar integridade dos backups', 'Confira hash, varredura antimalware e data anterior ao comprometimento.', 'tech', 'RC.RP-03'),
        S('Restaurar em ambiente limpo', 'Reconstrua a partir de imagens confiáveis; não reutilize sistemas não validados.', 'tech', 'RC.RP-02'),
        S('Validar sistemas restaurados e monitorar', 'Teste funcionalidade com os donos e mantenha monitoramento reforçado por 30 dias.', 'handler', 'RC.RP-05'),
        S('Comunicar o progresso da recuperação', 'Atualize stakeholders em cadência definida e publique comunicados aprovados.', 'comms', 'RC.CO-03'),
      ], { decisions: ['Decriptador público disponível? Teste em cópia antes de usar em produção.'] }),
      P('pos', 'Encerrar formalmente e transformar lições em melhorias.', [
        S('Declarar o fim da recuperação', 'Aplique os critérios de encerramento e conclua a documentação.', 'lead', 'RC.RP-06'),
        S('Conduzir reunião de lições aprendidas', 'Faça uma revisão sem culpados em até 2 semanas, com todas as áreas envolvidas.', 'lead', 'ID.IM-03'),
        S('Atualizar plano, playbooks e controles', 'Registre melhorias com dono e prazo; atualize este playbook.', 'lead', 'ID.IM-04'),
      ]),
    ],
    comms: [['Comitê de crise', 'Imediato e a cada 2 h', 'Situação, decisões tomadas, próximos passos'], ['Colaboradores', 'Nas primeiras horas', 'O que não fazer (não ligar máquinas, não usar e-mail comprometido), canal de dúvidas'], ['ANPD e titulares', 'Até 3 dias úteis após ciência', 'Natureza dos dados, titulares, medidas e riscos'], ['Clientes e imprensa', 'Após aprovação do jurídico', 'Mensagem factual, sem especulação']],
    indicators: ['Execução de vssadmin delete shadows / wbadmin delete catalog', 'Grande volume de renomeação de arquivos em pouco tempo', 'Uso de ferramentas de acesso remoto não autorizadas (AnyDesk, Atera)', 'Tráfego de saída volumoso para serviços de armazenamento', 'Novas contas administrativas ou GPOs alteradas'],
    mitre: [['T1486', 'Data Encrypted for Impact'], ['T1490', 'Inhibit System Recovery'], ['T1133', 'External Remote Services'], ['T1078', 'Valid Accounts'], ['T1021.001', 'Remote Desktop Protocol'], ['T1567', 'Exfiltration Over Web Service']],
    checklist: ['Hosts afetados isolados e registrados', 'Backups protegidos e verificados', 'Evidências coletadas com hash e custódia', 'Vetor inicial identificado e corrigido', 'Credenciais privilegiadas redefinidas', 'Notificações regulatórias avaliadas e registradas', 'Sistemas restaurados e validados pelos donos', 'Lições aprendidas registradas com responsáveis'],
    metrics: ['Tempo até o isolamento dos primeiros hosts', 'Percentual de sistemas restaurados a partir de backup íntegro', 'Tempo total até operação normal'],
    references: [REF.nist, REF.cisaRw, REF.anpd, REF.attack],
  },
  {
    id: 'phishing', name: 'Phishing', subtitle: 'Mensagens fraudulentas e roubo de credenciais', category: 'Phishing', color: '#b54708', art: 'phishing', version: '2.0',
    summary: 'Resposta a e-mails, SMS ou mensagens fraudulentas que buscam credenciais, execução de malware ou ações do usuário.',
    objective: 'Remover a mensagem de todas as caixas, identificar e proteger quem interagiu, bloquear a infraestrutura do atacante e reforçar a conscientização.',
    scope: 'E-mail corporativo, colaboração (Teams/Slack), SMS e mensageria usados a trabalho.',
    triggers: ['Denúncia de usuário (botão "Reportar phishing")', 'Alerta do gateway de e-mail ou sandbox', 'Login suspeito logo após clique em link', 'Várias caixas recebendo a mesma mensagem'],
    severity: 'S3/S4 quando ninguém interagiu; S2 se houver credenciais entregues ou anexo executado.',
    roles: [['handler', 'Analisa a mensagem, busca no ambiente e remove.'], ['tech', 'Redefine credenciais, ajusta filtros e bloqueios.'], ['comms', 'Alerta os colaboradores com exemplos.'], ['lead', 'Decide escalonamento se houver comprometimento.']],
    prerequisites: ['Botão de denúncia de phishing disponível', 'Acesso à busca e remoção em massa no e-mail (eDiscovery)', 'Sandbox para anexos e URLs', 'Política de redefinição rápida de senha e revogação de sessões'],
    phases: [
      P('triagem', 'Validar a denúncia e medir o alcance.', [
        S('Analisar cabeçalhos e remetente', 'Verifique SPF, DKIM, DMARC, domínio parecido e caminho de entrega.', 'handler', 'DE.AE-02'),
        S('Detonar anexos e links em sandbox', 'Nunca abra no computador de trabalho; registre o veredito e os IOCs.', 'handler', 'DE.AE-07'),
        S('Buscar a mesma campanha no ambiente', 'Procure por assunto, remetente, URL e hash em todas as caixas.', 'handler', 'DE.AE-03'),
      ], { evidence: ['Mensagem original (.eml) com cabeçalhos', 'Relatório da sandbox'] }),
      P('analise', 'Identificar quem interagiu e o que foi exposto.', [
        S('Levantar cliques, respostas e execuções', 'Use logs do proxy, do gateway e do EDR para listar usuários afetados.', 'handler', 'RS.AN-03'),
        S('Verificar logins após o clique', 'Procure acessos de IPs ou países incomuns e consentimentos OAuth novos.', 'handler', 'RS.AN-03'),
        S('Registrar ações na linha do tempo', 'Documente consultas, resultados e decisões.', 'handler', 'RS.AN-06'),
      ]),
      P('contencao', 'Retirar a ameaça do alcance dos usuários.', [
        S('Remover a mensagem de todas as caixas', 'Use a remoção em massa e confirme a quantidade removida.', 'tech', 'RS.MI-01'),
        S('Bloquear remetente, domínio e URLs', 'Aplique no gateway, proxy e DNS.', 'tech', 'RS.MI-01'),
        S('Proteger contas de quem entregou credenciais', 'Redefina senha, revogue sessões e exija MFA resistente a phishing.', 'tech', 'RS.MI-01'),
      ]),
      P('erradicacao', 'Eliminar consequências da interação.', [
        S('Examinar endpoints de quem executou anexos', 'Rode varredura completa e, se necessário, reimagem.', 'tech', 'RS.MI-02'),
        S('Remover regras de e-mail e apps maliciosos', 'Revise regras de encaminhamento e consentimentos OAuth.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Voltar ao normal com monitoramento.', [
        S('Monitorar contas afetadas', 'Acompanhe logins por pelo menos 7 dias.', 'handler', 'RC.RP-05'),
        S('Compartilhar indicadores', 'Envie IOCs a parceiros e ISAC respeitando o TLP.', 'handler', 'RS.CO-03'),
      ]),
      P('pos', 'Aprender e reforçar.', [
        S('Reforçar conscientização com o caso real', 'Publique um alerta com a captura da mensagem e como identificar.', 'comms', 'ID.IM-03'),
        S('Ajustar filtros e regras de detecção', 'Converta os IOCs e padrões em regras permanentes.', 'tech', 'ID.IM-03'),
      ]),
    ],
    comms: [['Colaboradores', 'Após a remoção', 'Alerta com exemplo e orientação de denúncia'], ['Usuários afetados', 'Imediato', 'Troca de senha e o que observar']],
    indicators: ['Domínios recém-registrados parecidos com o da organização', 'Anexos .html, .iso, .one ou arquivos compactados com senha', 'Páginas de login falsas hospedadas em serviços legítimos'],
    mitre: [['T1566.001', 'Spearphishing Attachment'], ['T1566.002', 'Spearphishing Link'], ['T1204', 'User Execution'], ['T1557', 'Adversary-in-the-Middle']],
    checklist: ['Mensagem removida de todas as caixas', 'IOCs bloqueados', 'Usuários afetados identificados e protegidos', 'Endpoints verificados', 'Alerta de conscientização publicado'],
    metrics: ['Tempo entre a denúncia e a remoção em massa', 'Taxa de denúncia versus taxa de clique'],
    references: [REF.nist, REF.cisaPb, REF.certbr, REF.attack],
  },
  {
    id: 'bec', short: 'E-mail corporativo (BEC)', name: 'Comprometimento de e-mail corporativo', subtitle: 'BEC — fraude financeira por e-mail', category: 'Comprometimento de e-mail corporativo (BEC)', color: '#6941c6', art: 'bec', version: '2.0',
    summary: 'Uso de caixa de e-mail comprometida ou falsificada para fraude financeira, alteração de dados bancários ou roubo de informações.',
    objective: 'Interromper fraudes em andamento, retomar o controle da caixa, identificar mensagens lidas e enviadas pelo atacante e avisar terceiros enganados.',
    scope: 'Caixas corporativas, especialmente financeiro, compras, diretoria e RH.',
    triggers: ['Fornecedor pergunta sobre mudança de conta bancária', 'Regra de encaminhamento externo desconhecida', 'Pagamento feito a conta não reconhecida', 'Login em caixa a partir de local incomum'],
    severity: 'S2 quando há transferência financeira ou dados sensíveis; S3 sem prejuízo confirmado.',
    roles: [['lead', 'Coordena resposta e contato com banco.'], ['handler', 'Analisa logs de auditoria da caixa.'], ['tech', 'Retoma o controle da conta.'], ['legal', 'Boletim de ocorrência e contato com terceiros.'], ['leadership', 'Aprova ações financeiras.']],
    prerequisites: ['Log de auditoria de caixas habilitado', 'Contato de emergência do banco para recall', 'Procedimento de verificação fora de banda para pagamentos'],
    phases: [
      P('triagem', 'Agir primeiro sobre o dinheiro.', [
        S('Acionar o banco imediatamente', 'Se houve transferência, peça bloqueio ou devolução — as primeiras horas são decisivas.', 'lead', 'RS.MA-04'),
        S('Confirmar o comprometimento', 'Verifique logins, regras e mensagens enviadas da caixa suspeita.', 'handler', 'RS.MA-02'),
      ]),
      P('contencao', 'Retomar o controle da caixa.', [
        S('Redefinir senha e revogar sessões e tokens', 'Inclua tokens OAuth e senhas de aplicativo.', 'tech', 'RS.MI-01'),
        S('Remover regras de encaminhamento e ocultação', 'Revise regras da caixa e de transporte.', 'tech', 'RS.MI-01'),
      ]),
      P('analise', 'Medir o que o atacante fez.', [
        S('Exportar logs de auditoria da caixa', 'Logins, acesso a mensagens, regras criadas e envios.', 'handler', 'RS.AN-07'),
        S('Identificar mensagens lidas e enviadas', 'Liste destinatários enganados e anexos acessados.', 'handler', 'RS.AN-08'),
        S('Avisar parceiros e clientes afetados', 'Use telefone conhecido, não o e-mail.', 'legal', 'RS.CO-02'),
      ]),
      P('erradicacao', 'Fechar as portas.', [
        S('Remover apps OAuth e dispositivos indevidos', 'Revogue consentimentos e dispositivos registrados pelo atacante.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Normalizar com controles extras.', [
        S('Reativar com MFA resistente a phishing', 'Monitore a conta por 30 dias.', 'tech', 'RC.RP-02'),
      ]),
      P('pos', 'Evitar repetição.', [
        S('Implantar verificação fora de banda para pagamentos', 'Toda alteração bancária exige confirmação por telefone conhecido.', 'lead', 'ID.IM-03'),
      ]),
    ],
    comms: [['Banco', 'Imediato', 'Pedido de bloqueio/recall com dados da transação'], ['Fornecedores e clientes', 'Mesmo dia', 'Aviso para desconsiderar instruções recebidas']],
    indicators: ['Regras que movem mensagens para RSS ou Arquivo', 'Login com MFA aprovado por notificação repetida', 'Domínio parecido do fornecedor em cópia'],
    mitre: [['T1114.003', 'Email Forwarding Rule'], ['T1534', 'Internal Spearphishing'], ['T1078.004', 'Cloud Accounts'], ['T1564.008', 'Email Hiding Rules']],
    checklist: ['Banco acionado (se houve pagamento)', 'Controle da caixa retomado', 'Regras e apps maliciosos removidos', 'Terceiros avisados', 'Verificação fora de banda implantada'],
    metrics: ['Tempo até o contato com o banco', 'Valor recuperado'],
    references: [REF.nist, REF.cisaPb, REF.attack],
  },
  {
    id: 'data-breach', short: 'Vazamento de dados', name: 'Vazamento de dados pessoais', subtitle: 'Exposição, acesso ou exfiltração', category: 'Vazamento / exfiltração de dados', color: '#155eef', art: 'breach', version: '2.0',
    summary: 'Acesso, divulgação ou exfiltração não autorizada de dados pessoais ou confidenciais, incluindo exposições acidentais.',
    objective: 'Fechar a exposição, determinar o que foi acessado, avaliar risco aos titulares e comunicar ANPD e titulares no prazo.',
    scope: 'Bancos de dados, armazenamento em nuvem, APIs, documentos e dados em posse de fornecedores.',
    triggers: ['Bucket, pasta ou API expostos publicamente', 'Dados da organização em fórum ou site de vazamento', 'Envio de dados ao destinatário errado', 'Alerta de DLP para transferência volumosa'],
    severity: 'S1/S2 com dados sensíveis, de crianças ou em grande volume; S3 para exposição limitada sem evidência de acesso.',
    roles: [['legal', 'Encarregado (DPO): avalia risco e conduz comunicações.'], ['handler', 'Investiga acesso e extensão.'], ['tech', 'Fecha a exposição.'], ['comms', 'Comunicação aos titulares e público.'], ['lead', 'Coordena e aprova.']],
    prerequisites: ['Inventário de dados pessoais (mapeamento)', 'Logs de acesso a armazenamento e bancos', 'Modelo de comunicação à ANPD e aos titulares'],
    phases: [
      P('triagem', 'Envolver privacidade desde o início.', [
        S('Acionar o Encarregado (DPO) e o jurídico', 'O prazo da ANPD começa na ciência do incidente.', 'lead', 'RS.MA-04'),
        S('Registrar a data e hora da ciência', 'Esse marco define o prazo de 3 dias úteis.', 'legal', 'RS.MA-02'),
      ]),
      P('contencao', 'Fechar a exposição sem destruir evidências.', [
        S('Remover o acesso público ou revogar a credencial', 'Preserve logs e configuração antes da alteração.', 'tech', 'RS.MI-01'),
        S('Solicitar remoção de conteúdo publicado', 'Peça a retirada a plataformas e buscadores, quando aplicável.', 'legal', 'RS.MI-01'),
      ]),
      P('analise', 'Quantificar e avaliar o risco.', [
        S('Determinar período de exposição e acessos', 'Analise logs de acesso para confirmar se houve cópia por terceiros.', 'handler', 'RS.AN-03'),
        S('Quantificar titulares e categorias de dados', 'Identifique dados sensíveis, de crianças e financeiros.', 'legal', 'RS.AN-08'),
        S('Avaliar risco ou dano relevante', 'Documente a análise que fundamenta comunicar ou não.', 'legal', 'RS.AN-08'),
        S('Comunicar ANPD e titulares', 'Use o formulário oficial e linguagem clara para titulares.', 'legal', 'RS.CO-02'),
      ]),
      P('erradicacao', 'Corrigir a causa.', [
        S('Corrigir a falha e revisar ativos semelhantes', 'Procure a mesma configuração em outros ambientes.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Atender e informar.', [
        S('Disponibilizar canal de atendimento aos titulares', 'FAQ, e-mail ou telefone dedicado.', 'comms', 'RC.CO-04'),
      ]),
      P('pos', 'Reduzir exposição futura.', [
        S('Atualizar inventário de dados e RIPD', 'Reveja retenção e minimização.', 'legal', 'ID.IM-01'),
      ]),
    ],
    comms: [['ANPD', 'Até 3 dias úteis', 'Formulário oficial com natureza dos dados, titulares, medidas e riscos'], ['Titulares', 'Até 3 dias úteis', 'O que aconteceu, riscos e o que fazer'], ['Público', 'Se necessário', 'Nota oficial aprovada']],
    indicators: ['Acessos anônimos a buckets', 'Consultas em massa fora do horário', 'Downloads volumosos por uma única conta'],
    mitre: [['T1530', 'Data from Cloud Storage'], ['T1567', 'Exfiltration Over Web Service'], ['T1213', 'Data from Information Repositories'], ['T1190', 'Exploit Public-Facing Application']],
    checklist: ['DPO acionado e ciência registrada', 'Exposição encerrada', 'Titulares e dados quantificados', 'Análise de risco documentada', 'ANPD e titulares comunicados ou dispensa fundamentada'],
    metrics: ['Tempo entre a ciência e a comunicação à ANPD', 'Número de titulares afetados'],
    references: [REF.nist, REF.anpd, REF.attack],
  },
  {
    id: 'ddos', short: 'DDoS', name: 'Negação de serviço (DDoS)', subtitle: 'Indisponibilidade por saturação', category: 'Negação de serviço (DoS/DDoS)', color: '#0e7090', art: 'ddos', version: '2.0',
    summary: 'Ataques que esgotam recursos de rede ou de aplicação, degradando ou derrubando serviços.',
    objective: 'Restabelecer a disponibilidade com mitigação do provedor, verificar se o ataque encobre outra ação e informar clientes.',
    scope: 'Sites, APIs, VPN, DNS e links de internet.',
    triggers: ['Pico anormal de tráfego ou requisições', 'Indisponibilidade de serviço público', 'Alerta do provedor de trânsito ou CDN', 'Ameaça ou pedido de resgate para cessar o ataque'],
    severity: 'S2 para serviços críticos indisponíveis; S3 para degradação parcial.',
    roles: [['tech', 'Ativa mitigação e ajusta infraestrutura.'], ['handler', 'Analisa vetores e busca atividade paralela.'], ['comms', 'Atualiza página de status.'], ['third', 'Provedor anti-DDoS/CDN.']],
    prerequisites: ['Contrato de mitigação com contato 24x7', 'Runbooks de ativação (scrubbing, WAF, rate limit)', 'Página de status independente da infraestrutura principal'],
    phases: [
      P('triagem', 'Confirmar e caracterizar o ataque.', [
        S('Confirmar volume e vetores', 'Volumétrico, protocolo ou aplicação (L7); registre picos e origens.', 'handler', 'DE.AE-04'),
        S('Acionar o provedor de mitigação', 'Abra chamado prioritário conforme contrato.', 'tech', 'RS.MA-01'),
      ]),
      P('contencao', 'Mitigar.', [
        S('Ativar scrubbing, WAF e rate limiting', 'Aplique regras por padrão de requisição, geolocalização ou ASN.', 'tech', 'RS.MI-01'),
      ]),
      P('analise', 'Olhar além do ruído.', [
        S('Verificar se o DDoS encobre outra atividade', 'Revise alertas de intrusão e acessos no mesmo período.', 'handler', 'RS.AN-03'),
      ]),
      P('erradicacao', 'Remover a causa quando aplicável.', [
        S('Corrigir pontos de amplificação próprios', 'Feche resolvedores abertos e serviços expostos desnecessários.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Normalizar e informar.', [
        S('Confirmar normalização de latência e disponibilidade', 'Acompanhe por 24 h antes de relaxar as regras.', 'tech', 'RC.RP-05'),
        S('Atualizar a página de status', 'Informe início, mitigação e normalização.', 'comms', 'RC.CO-04'),
      ]),
      P('pos', 'Preparar para o próximo.', [
        S('Revisar capacidade e runbooks', 'Ajuste limites, contratos e testes periódicos.', 'tech', 'ID.IM-03'),
      ]),
    ],
    comms: [['Clientes', 'Durante e após', 'Página de status com horários'], ['Provedor', 'Imediato', 'Chamado com evidências de tráfego']],
    indicators: ['Tráfego UDP massivo (DNS/NTP/memcached)', 'Requisições HTTP repetitivas de muitos IPs', 'Aumento súbito de conexões semiabertas (SYN)'],
    mitre: [['T1498', 'Network Denial of Service'], ['T1498.002', 'Reflection Amplification'], ['T1499', 'Endpoint Denial of Service']],
    checklist: ['Provedor acionado', 'Mitigação ativa', 'Atividade paralela descartada', 'Clientes informados', 'Runbook revisado'],
    metrics: ['Tempo até a mitigação efetiva', 'Duração da indisponibilidade'],
    references: [REF.nist, REF.cisaPb, REF.attack],
  },
  {
    id: 'account', short: 'Conta comprometida', name: 'Conta comprometida', subtitle: 'Uso indevido de credenciais válidas', category: 'Comprometimento de conta', color: '#3538cd', art: 'account', version: '2.0',
    summary: 'Uso de credenciais legítimas por terceiros, incluindo contas privilegiadas, de serviço e de nuvem.',
    objective: 'Bloquear o acesso do atacante, levantar tudo o que a conta fez e remover persistências antes de devolvê-la ao dono.',
    scope: 'Diretório corporativo, nuvem (IaaS/SaaS), VPN e contas de serviço.',
    triggers: ['Viagem impossível ou login de país incomum', 'Fadiga de MFA (muitas solicitações)', 'Criação de chave de API ou novo método de MFA', 'Alerta de vazamento de credenciais'],
    severity: 'S2 para contas privilegiadas; S3 para contas comuns sem acesso a dados sensíveis.',
    roles: [['handler', 'Valida e investiga a atividade.'], ['tech', 'Bloqueia e restaura a conta.'], ['lead', 'Escalona se houver privilégio elevado.']],
    prerequisites: ['Logs de autenticação centralizados', 'Capacidade de revogar sessões e tokens', 'MFA resistente a phishing disponível'],
    phases: [
      P('triagem', 'Separar falso positivo de comprometimento.', [
        S('Validar logins anômalos com o usuário', 'Confirme por canal fora de banda se foi ele.', 'handler', 'DE.AE-02'),
      ]),
      P('contencao', 'Cortar o acesso.', [
        S('Bloquear a conta e revogar sessões, tokens e chaves', 'Inclua chaves de API e senhas de aplicativo.', 'tech', 'RS.MI-01'),
      ]),
      P('analise', 'Levantar o que foi feito.', [
        S('Revisar ações realizadas pela conta', 'Acesso a dados, alterações de configuração, criação de recursos.', 'handler', 'RS.AN-03'),
        S('Registrar consultas e resultados', 'Mantenha a linha do tempo atualizada.', 'handler', 'RS.AN-06'),
      ]),
      P('erradicacao', 'Remover persistências.', [
        S('Remover MFAs, apps, chaves e regras adicionados', 'Compare com o estado anterior ao incidente.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Devolver com segurança.', [
        S('Reativar com nova credencial e MFA forte', 'Monitore por 14 dias.', 'tech', 'RC.RP-02'),
      ]),
      P('pos', 'Endurecer acessos.', [
        S('Revisar acesso condicional e privilégios', 'Aplique menor privilégio e bloqueios por risco.', 'tech', 'ID.IM-03'),
      ]),
    ],
    comms: [['Usuário', 'Imediato', 'Motivo do bloqueio e próximos passos'], ['Gestor', 'Mesmo dia', 'Impacto no trabalho e prazo de retorno']],
    indicators: ['Logins de proxies anônimos ou hospedagem', 'Muitas falhas seguidas de sucesso', 'Consentimentos OAuth a apps desconhecidos'],
    mitre: [['T1078', 'Valid Accounts'], ['T1110.003', 'Password Spraying'], ['T1621', 'Multi-Factor Authentication Request Generation'], ['T1098', 'Account Manipulation'], ['T1528', 'Steal Application Access Token']],
    checklist: ['Acesso bloqueado', 'Atividade levantada', 'Persistências removidas', 'Conta reativada com MFA forte'],
    metrics: ['Tempo entre o alerta e a revogação das sessões'],
    references: [REF.nist, REF.cisaPb, REF.attack],
  },
  {
    id: 'malware', short: 'Malware', name: 'Malware em endpoint', subtitle: 'Código malicioso em estação ou servidor', category: 'Malware', color: '#c11574', art: 'malware', version: '2.0',
    summary: 'Execução de código malicioso (trojan, infostealer, loader, backdoor) em estação ou servidor.',
    objective: 'Isolar o host, entender o que o malware faz, varrer o ambiente pelos indicadores e devolver o equipamento limpo.',
    scope: 'Estações, servidores e dispositivos gerenciados.',
    triggers: ['Alerta do EDR/antivírus', 'Comunicação com domínio de C2 conhecido', 'Comportamento anômalo relatado pelo usuário'],
    severity: 'S3 para host isolado sem movimentação; S2 se houver roubo de credenciais ou propagação.',
    roles: [['handler', 'Analisa amostra e busca no ambiente.'], ['tech', 'Isola e reimagem o host.']],
    prerequisites: ['EDR com isolamento e coleta remota', 'Sandbox para amostras', 'Imagem padrão para reinstalação'],
    phases: [
      P('triagem', 'Entender o alerta.', [
        S('Enriquecer hashes e domínios com CTI', 'Consulte fontes de reputação e sandbox.', 'handler', 'DE.AE-07'),
      ]),
      P('contencao', 'Isolar.', [
        S('Isolar o host via EDR', 'Mantenha a comunicação com o console para coleta.', 'tech', 'RS.MI-01'),
      ]),
      P('analise', 'Mapear o comportamento.', [
        S('Coletar triagem forense', 'Memória, persistências, artefatos de execução e conexões.', 'handler', 'RS.AN-07'),
        S('Varrer o ambiente pelos IOCs', 'Procure hashes, domínios e mutexes em todos os endpoints.', 'handler', 'DE.AE-03'),
      ]),
      P('erradicacao', 'Limpar.', [
        S('Reimagem ou limpeza validada', 'Prefira reinstalação a partir da imagem padrão.', 'tech', 'RS.MI-02'),
        S('Redefinir credenciais usadas no host', 'Infostealers roubam senhas e cookies do navegador.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Devolver.', [
        S('Devolver o equipamento após validação', 'Confirme ausência de alertas por 24 h.', 'tech', 'RC.RP-05'),
      ]),
      P('pos', 'Melhorar a detecção.', [
        S('Ajustar regras de detecção e bloqueio', 'Transforme os achados em regras.', 'handler', 'ID.IM-03'),
      ]),
    ],
    comms: [['Usuário', 'Imediato', 'Equipamento em análise e prazo']],
    indicators: ['Chaves Run/RunOnce novas', 'Tarefas agendadas estranhas', 'Processos injetados em binários do sistema'],
    mitre: [['T1204.002', 'Malicious File'], ['T1547.001', 'Registry Run Keys / Startup Folder'], ['T1053.005', 'Scheduled Task'], ['T1071', 'Application Layer Protocol'], ['T1105', 'Ingress Tool Transfer']],
    checklist: ['Host isolado', 'IOCs extraídos e varridos', 'Host reinstalado', 'Credenciais redefinidas'],
    metrics: ['Tempo até o isolamento', 'Hosts adicionais encontrados na varredura'],
    references: [REF.nist, REF.sp80083, REF.sp80086, REF.attack],
  },
  {
    id: 'supply', short: 'Fornecedor', name: 'Incidente em fornecedor', subtitle: 'Cadeia de suprimentos e terceiros', category: 'Cadeia de suprimentos / terceiro', color: '#4d7c0f', art: 'supply', version: '2.0',
    summary: 'Comprometimento de fornecedor, software ou serviço de terceiro que afeta a organização.',
    objective: 'Entender a exposição ao fornecedor, cortar integrações de risco, buscar indicadores no ambiente e coordenar comunicação.',
    scope: 'Softwares instalados, SaaS, prestadores com acesso remoto e integrações de dados.',
    triggers: ['Comunicado de incidente do fornecedor', 'Alerta público sobre software usado pela organização', 'Atualização assinada com comportamento suspeito'],
    severity: 'Varia conforme o acesso do fornecedor: S1/S2 para acesso privilegiado ou dados sensíveis.',
    roles: [['lead', 'Coordena com o fornecedor.'], ['handler', 'Busca IOCs e exposição.'], ['tech', 'Suspende integrações e rotaciona segredos.'], ['legal', 'Cláusulas contratuais e notificações.']],
    prerequisites: ['Inventário de fornecedores e acessos (GV.SC)', 'Cláusulas contratuais de notificação', 'Contatos de segurança dos fornecedores críticos'],
    phases: [
      P('triagem', 'Medir a exposição.', [
        S('Acionar o fornecedor pelos canais contratuais', 'Solicite IOCs, versões afetadas e cronologia.', 'lead', 'RS.MA-01'),
        S('Mapear onde o produto ou serviço é usado', 'Liste hosts, integrações e dados acessíveis.', 'handler', 'DE.AE-04'),
      ]),
      P('contencao', 'Reduzir a superfície.', [
        S('Suspender integrações e rotacionar credenciais compartilhadas', 'Inclua chaves de API e contas de serviço do fornecedor.', 'tech', 'RS.MI-01'),
      ]),
      P('analise', 'Procurar sinais no ambiente.', [
        S('Buscar IOCs publicados', 'Procure em logs e endpoints; documente resultados negativos também.', 'handler', 'RS.AN-03'),
        S('Coordenar comunicação com o fornecedor', 'Alinhe mensagens a clientes e reguladores.', 'legal', 'RS.CO-03'),
      ]),
      P('erradicacao', 'Remover versões comprometidas.', [
        S('Remover ou atualizar a versão afetada', 'Siga orientação oficial do fornecedor.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Retomar com confiança.', [
        S('Validar integridade das versões corrigidas', 'Verifique assinaturas e hashes antes de reinstalar.', 'tech', 'RC.RP-03'),
      ]),
      P('pos', 'Fortalecer a gestão de terceiros.', [
        S('Revisar contratos e exercícios conjuntos', 'Inclua o fornecedor em simulações (ID.IM-02).', 'lead', 'ID.IM-02'),
      ]),
    ],
    comms: [['Fornecedor', 'Imediato', 'Pedido formal de informações'], ['Clientes', 'Se afetados', 'Mensagem coordenada']],
    indicators: ['Atualizações fora da janela esperada', 'Conexões do agente do fornecedor para destinos novos'],
    mitre: [['T1195.002', 'Compromise Software Supply Chain'], ['T1199', 'Trusted Relationship'], ['T1072', 'Software Deployment Tools']],
    checklist: ['Fornecedor acionado formalmente', 'Exposição mapeada', 'Integrações suspensas ou validadas', 'IOCs buscados', 'Contrato revisado'],
    metrics: ['Tempo até o mapeamento da exposição'],
    references: [REF.nist, REF.scrm, REF.attack],
  },
  {
    id: 'insider', name: 'Ameaça interna', subtitle: 'Uso indevido por pessoas com acesso', category: 'Ameaça interna', color: '#475467', art: 'insider', version: '1.0',
    summary: 'Ações maliciosas ou negligentes de colaboradores, prestadores ou ex-colaboradores com acesso legítimo.',
    objective: 'Conter o dano com discrição, preservar provas com rigor jurídico e agir em conjunto com RH e jurídico.',
    scope: 'Colaboradores, terceiros e ex-colaboradores com acessos remanescentes.',
    triggers: ['Transferência de dados para e-mail pessoal ou nuvem pessoal', 'Acesso a dados fora da função', 'Desligamento com acessos não revogados'],
    severity: 'S2 quando envolve dados sensíveis ou sabotagem; S3 nos demais.',
    roles: [['lead', 'Coordena com discrição.'], ['hr', 'Conduz aspectos trabalhistas.'], ['legal', 'Garante legalidade da investigação.'], ['handler', 'Coleta evidências com cadeia de custódia.']],
    prerequisites: ['Política de uso aceitável assinada', 'DLP e logs de acesso a dados', 'Processo de desligamento com revogação de acessos'],
    phases: [
      P('triagem', 'Avaliar com discrição.', [
        S('Envolver RH e jurídico antes de agir', 'Defina quem pode saber do caso (necessidade de conhecer).', 'lead', 'RS.MA-04'),
      ]),
      P('analise', 'Reunir provas.', [
        S('Preservar evidências com cadeia de custódia', 'Logs, e-mails, dispositivos; tudo com hash.', 'handler', 'RS.AN-07'),
        S('Reconstruir a linha do tempo das ações', 'Correlacione DLP, acessos e movimentações.', 'handler', 'RS.AN-03'),
      ]),
      P('contencao', 'Limitar o acesso.', [
        S('Restringir ou revogar acessos', 'Coordene o momento com RH para não alertar prematuramente.', 'tech', 'RS.MI-01'),
      ]),
      P('erradicacao', 'Recuperar dados e acessos.', [
        S('Recuperar dados e equipamentos', 'Solicite devolução formal e confirme exclusão de cópias.', 'hr', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Retomar a normalidade.', [
        S('Revisar permissões da área afetada', 'Aplique menor privilégio.', 'tech', 'RC.RP-04'),
      ]),
      P('pos', 'Prevenir.', [
        S('Revisar processo de desligamento e DLP', 'Automatize revogações.', 'lead', 'ID.IM-03'),
      ]),
    ],
    comms: [['Liderança da área', 'Com discrição', 'Somente o necessário'], ['Autoridades', 'Se houver crime', 'Via jurídico']],
    indicators: ['Uploads para nuvem pessoal', 'Impressões e cópias para USB em volume', 'Acessos fora do horário habitual'],
    mitre: [['T1078', 'Valid Accounts'], ['T1052', 'Exfiltration Over Physical Medium'], ['T1567.002', 'Exfiltration to Cloud Storage'], ['T1485', 'Data Destruction']],
    checklist: ['RH e jurídico envolvidos', 'Evidências preservadas', 'Acessos revogados', 'Dados recuperados', 'Processo revisado'],
    metrics: ['Tempo entre o desligamento e a revogação de acessos'],
    references: [REF.nist, REF.sp80086],
  },
  {
    id: 'cloud', short: 'Nuvem', name: 'Comprometimento em nuvem', subtitle: 'IaaS, PaaS e contas de nuvem', category: 'Configuração incorreta em nuvem', color: '#0086c9', art: 'cloud', version: '1.0',
    summary: 'Acesso indevido a contas ou recursos de nuvem, uso abusivo (ex.: mineração) ou exposição por configuração incorreta.',
    objective: 'Revogar acessos indevidos, preservar logs da nuvem, remover recursos e credenciais criados pelo atacante e corrigir a configuração.',
    scope: 'Contas e assinaturas de nuvem pública, Kubernetes e serviços gerenciados.',
    triggers: ['Pico de custo inesperado', 'Chaves de acesso usadas de IP desconhecido', 'Recursos criados em regiões não utilizadas', 'Alerta de CSPM'],
    severity: 'S2 com acesso administrativo ou a dados; S3 para abuso de recursos isolado.',
    roles: [['tech', 'Administra a nuvem e executa as ações.'], ['handler', 'Analisa logs de auditoria.'], ['lead', 'Coordena e aciona o provedor.']],
    prerequisites: ['Logs de auditoria da nuvem habilitados e centralizados', 'Conta de emergência (break-glass) protegida', 'Guardrails e CSPM ativos'],
    phases: [
      P('triagem', 'Confirmar e dimensionar.', [
        S('Identificar identidades e chaves usadas', 'Liste principais, chaves e regiões envolvidas.', 'handler', 'DE.AE-02'),
      ]),
      P('contencao', 'Cortar o acesso.', [
        S('Desativar chaves e sessões comprometidas', 'Aplique políticas de negação temporárias se necessário.', 'tech', 'RS.MI-01'),
      ]),
      P('analise', 'Rastrear as ações.', [
        S('Exportar e preservar logs de auditoria', 'Guarde em conta separada com retenção.', 'handler', 'RS.AN-07'),
        S('Levantar recursos e permissões criados', 'Compare com o estado de infraestrutura como código.', 'handler', 'RS.AN-03'),
      ]),
      P('erradicacao', 'Limpar a conta.', [
        S('Remover recursos, usuários e credenciais do atacante', 'Inclua funções, chaves adicionais e webhooks.', 'tech', 'RS.MI-02'),
      ]),
      P('recuperacao', 'Restaurar a configuração segura.', [
        S('Reaplicar configuração a partir de IaC validado', 'Confirme ausência de desvios.', 'tech', 'RC.RP-05'),
      ]),
      P('pos', 'Prevenir.', [
        S('Aplicar guardrails organizacionais', 'Bloqueie regiões, acesso público e chaves de longa duração.', 'tech', 'ID.IM-03'),
      ]),
    ],
    comms: [['Provedor de nuvem', 'Se necessário', 'Chamado de suporte de segurança'], ['Financeiro', 'Se houver custo', 'Estimativa e contestação']],
    indicators: ['Chamadas de listagem em massa (enumeração)', 'Instâncias com GPU em regiões incomuns', 'Novas chaves de acesso para usuários antigos'],
    mitre: [['T1078.004', 'Cloud Accounts'], ['T1530', 'Data from Cloud Storage'], ['T1537', 'Transfer Data to Cloud Account'], ['T1496', 'Resource Hijacking'], ['T1098.001', 'Additional Cloud Credentials']],
    checklist: ['Credenciais revogadas', 'Logs preservados', 'Recursos maliciosos removidos', 'Guardrails aplicados'],
    metrics: ['Tempo até a revogação das chaves', 'Custo indevido evitado'],
    references: [REF.nist, REF.attack],
  },
];

// Compatibilidade: lista achatada de passos (fase, CSF, título) usada para gerar tarefas.
export const PLAYBOOKS = BOOKS.map((b) => ({
  ...b, kind: 'playbook',
  steps: b.phases.flatMap((ph) => ph.steps.map((s) => ({ phase: ph.id, csf: s.csf, title: s.title, role: s.role, detail: s.detail }))),
}));
export const playbookById = Object.fromEntries(PLAYBOOKS.map((p) => [p.id, p]));
export { REF };
