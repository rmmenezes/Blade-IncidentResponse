// Dados de demonstração (fictícios) para explorar a plataforma.
import { emptyDB } from '../core/store.js';
import { chainAppend, computeSeverity } from '../core/engine.js';
import { uid } from '../core/util.js';
import { SUBCATEGORIES } from '../core/nist.js';

const H = 3600e3;
const ago = (h) => new Date(Date.now() - h * H).toISOString();

export async function demoDB() {
  const db = emptyDB();
  db.org = { ...db.org, name: 'Blade Demo S.A.', sector: 'Serviços financeiros', analyst: 'Ana Souza' };
  db.regulations.find((r) => r.id === 'certbr').enabled = true;

  db.contacts = [
    { id: 'c1', name: 'Ana Souza', role: 'lead', org: 'SOC interno', email: 'ana.souza@exemplo.com', phone: '+55 11 90000-0001', oncall: true, external: false },
    { id: 'c2', name: 'Bruno Lima', role: 'handler', org: 'SOC interno', email: 'bruno.lima@exemplo.com', phone: '+55 11 90000-0002', oncall: true, external: false },
    { id: 'c3', name: 'Carla Mendes', role: 'legal', org: 'Jurídico / DPO', email: 'dpo@exemplo.com', phone: '+55 11 90000-0003', oncall: false, external: false },
    { id: 'c4', name: 'Diego Rocha', role: 'tech', org: 'Infraestrutura', email: 'diego.rocha@exemplo.com', phone: '+55 11 90000-0004', oncall: false, external: false },
    { id: 'c5', name: 'Elisa Prado', role: 'comms', org: 'Comunicação', email: 'imprensa@exemplo.com', phone: '+55 11 90000-0005', oncall: false, external: false },
    { id: 'c6', name: 'Fernando Alves', role: 'leadership', org: 'Diretoria (CISO)', email: 'ciso@exemplo.com', phone: '+55 11 90000-0006', oncall: false, external: false },
    { id: 'c7', name: 'MSSP Vigilante', role: 'third', org: 'Provedor de MDR', email: 'soc@mssp.exemplo', phone: '0800 000 0000', oncall: true, external: true },
    { id: 'c8', name: 'CERT.br', role: 'third', org: 'CSIRT nacional', email: 'cert@cert.br', phone: '', oncall: false, external: true },
  ];

  db.assets = [
    { id: 'a1', name: 'SRV-ERP-01', type: 'Servidor', owner: 'Financeiro', criticality: 'alta', ip: '10.0.10.21', dataClass: 'Confidencial', notes: 'ERP principal' },
    { id: 'a2', name: 'SRV-FILE-02', type: 'Servidor', owner: 'TI', criticality: 'media', ip: '10.0.10.35', dataClass: 'Interno', notes: 'Servidor de arquivos' },
    { id: 'a3', name: 'DC-01', type: 'Controlador de domínio', owner: 'TI', criticality: 'alta', ip: '10.0.0.10', dataClass: 'Confidencial', notes: 'Active Directory' },
    { id: 'a4', name: 'M365 Exchange Online', type: 'SaaS', owner: 'TI', criticality: 'alta', ip: '', dataClass: 'Confidencial', notes: 'E-mail corporativo' },
    { id: 'a5', name: 'Portal do Cliente', type: 'Aplicação web', owner: 'Digital', criticality: 'alta', ip: '203.0.113.10', dataClass: 'Dados pessoais', notes: 'Internet-facing' },
    { id: 'a6', name: 'NB-FIN-044', type: 'Estação de trabalho', owner: 'Financeiro', criticality: 'baixa', ip: '10.0.30.44', dataClass: 'Interno', notes: '' },
    { id: 'a7', name: 'Backup Veeam', type: 'Backup', owner: 'TI', criticality: 'alta', ip: '10.0.5.5', dataClass: 'Confidencial', notes: 'Repositório imutável' },
  ];

  db.events = [
    { id: 'EVT-00001', title: 'Múltiplas falhas de login seguidas de sucesso — VPN', source: 'SIEM', observedAt: ago(5), reporter: 'Regra SIEM #112', asset: '', severity: 'media', status: 'novo', description: 'Conta j.pereira com 37 falhas e 1 sucesso a partir de ASN estrangeiro.', notes: '', related: [], criteria: [] },
    { id: 'EVT-00002', title: 'Usuário relata e-mail suspeito de "atualização de boleto"', source: 'Relato de usuário', observedAt: ago(3), reporter: 'Marina (Financeiro)', asset: 'a4', severity: 'baixa', status: 'analise', description: 'Anexo .html solicitando credenciais Microsoft.', notes: 'Mesmo remetente visto em 3 caixas.', related: [], criteria: [] },
    { id: 'EVT-00003', title: 'Varredura de portas externa', source: 'Firewall', observedAt: ago(30), reporter: 'IPS', asset: 'a5', severity: 'baixa', status: 'descartado', description: 'Scan comum de internet.', notes: 'Benigno — ruído de internet, sem exploração.', related: [], criteria: [] },
  ];
  db.seq.evt = 5;

  const mk = async (o, log) => {
    const inc = {
      title: '', description: '', status: 'triagem', category: 'Outro', functional: 0, information: 0, recoverability: 0, scope: 0,
      severity: 'S4', severityOverride: '', overrideReason: '', personalData: false, tlp: 'AMBER',
      occurredAt: null, detectedAt: null, declaredAt: null, awareAt: null, triagedAt: null, materialAt: null,
      containedAt: null, eradicatedAt: null, recoveredAt: null, closedAt: null,
      roles: {}, assets: [], iocs: [], evidence: [], tasks: [], comms: [], notifications: [], csf: {},
      magnitude: {}, analysis: { whys: ['', '', '', '', ''], tactics: [] }, recovery: {}, lessons: {},
      timeline: [], playbooks: [], sourceEvents: [], createdAt: o.declaredAt, updatedAt: new Date().toISOString(), ...o,
    };
    inc.severity = computeSeverity(inc, db.assets);
    for (const [at, type, text, author] of log) {
      inc.timeline = await chainAppend(inc.timeline, { id: uid('t'), at, recordedAt: at, author: author || 'Ana Souza', type, text });
    }
    return inc;
  };
  const done = (ids, at) => Object.fromEntries(ids.map((id) => [id, { done: true, at, note: '' }]));

  const inc1 = await mk({
    id: 'INC-2026-0003', title: 'Ransomware no servidor de arquivos e ERP', category: 'Ransomware', status: 'contencao',
    description: 'Arquivos criptografados com extensão .lockbit em SRV-FILE-02; nota de resgate encontrada. Indícios de acesso inicial via VPN com credencial vazada.',
    functional: 3, information: 2, recoverability: 2, scope: 1, personalData: true, tlp: 'AMBER+STRICT',
    occurredAt: ago(30), detectedAt: ago(6), declaredAt: ago(5.5), awareAt: ago(5), triagedAt: ago(5),
    roles: { lead: 'c1', handler: 'c2', legal: 'c3', tech: 'c4', comms: 'c5', leadership: 'c6', third: 'c7' },
    assets: ['a1', 'a2', 'a3'], playbooks: ['ransomware'], sourceEvents: [],
    iocs: [
      { id: uid('i'), type: 'IPv4', value: '198.51.100.23', desc: 'Origem do login VPN', tlp: 'AMBER', firstSeen: ago(30) },
      { id: uid('i'), type: 'Hash SHA-256', value: 'a3f1c0de9b7e44c2a1d0f5e6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6', desc: 'Binário do encriptador', tlp: 'AMBER', firstSeen: ago(6) },
      { id: uid('i'), type: 'Domínio', value: 'update-cdn-sync.example', desc: 'C2 (beacon)', tlp: 'AMBER', firstSeen: ago(20) },
    ],
    evidence: [
      { id: uid('e'), name: 'Imagem de memória SRV-FILE-02', type: 'Memória', hash: '9f2c...e1', hashAlg: 'SHA-256', collectedBy: 'Bruno Lima', collectedAt: ago(4.5), location: 'Cofre forense / caso-0003', custody: [{ at: ago(4.5), from: 'Bruno Lima', to: 'Cofre forense', purpose: 'Armazenamento' }] },
      { id: uid('e'), name: 'Logs VPN (30 dias)', type: 'Log', hash: '1b7d...a9', hashAlg: 'SHA-256', collectedBy: 'Diego Rocha', collectedAt: ago(4), location: 'Bucket evidências (WORM)', custody: [] },
    ],
    tasks: [
      { id: uid('k'), title: 'Isolar SRV-FILE-02 e SRV-ERP-01 via EDR', phase: 'contencao', csf: 'RS.MI-01', owner: 'c2', due: ago(4), status: 'concluida' },
      { id: uid('k'), title: 'Desabilitar conta j.pereira e revogar sessões VPN', phase: 'contencao', csf: 'RS.MI-01', owner: 'c4', due: ago(4), status: 'concluida' },
      { id: uid('k'), title: 'Confirmar imutabilidade do repositório de backup', phase: 'contencao', csf: 'RS.MI-01', owner: 'c4', due: ago(-2), status: 'andamento' },
      { id: uid('k'), title: 'Avaliar exfiltração e dados pessoais afetados', phase: 'analise', csf: 'RS.AN-08', owner: 'c3', due: ago(-12), status: 'aberta' },
    ],
    comms: [
      { id: uid('m'), at: ago(5.2), audience: 'interno', stakeholder: 'Comitê de crise', channel: 'Ponte telefônica', summary: 'Acionamento do comitê e aprovação do isolamento.', csf: 'RS.CO-02' },
      { id: uid('m'), at: ago(4.8), audience: 'externo', stakeholder: 'Seguradora cyber', channel: 'E-mail', summary: 'Aviso de sinistro nº 2026-114.', csf: 'RS.CO-03' },
    ],
    csf: done(['DE.AE-02', 'DE.AE-03', 'DE.AE-08', 'RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.AN-06', 'RS.AN-07', 'RS.CO-02'], ago(4)),
    magnitude: { records: 12000, users: 240, systems: 3, dataTypes: 'Dados cadastrais de clientes, notas fiscais', financial: 350000, notes: 'Estimativa preliminar.' },
    analysis: { hypothesis: 'Acesso inicial via VPN sem MFA com credencial de infostealer.', rootCause: '', whys: ['', '', '', '', ''], tactics: ['Initial Access', 'Lateral Movement', 'Impact'] },
  }, [
    [ago(30), 'evidencia', 'Primeiro login VPN de 198.51.100.23 (conta j.pereira) — identificado depois nos logs.'],
    [ago(6), 'deteccao', 'EDR alerta criptografia em massa em SRV-FILE-02.', 'MSSP Vigilante'],
    [ago(5.5), 'status', 'Incidente declarado e triado como S1.'],
    [ago(4.9), 'acao', 'Hosts isolados via EDR.', 'Bruno Lima'],
    [ago(4.5), 'evidencia', 'Imagem de memória coletada (SHA-256 registrado).', 'Bruno Lima'],
  ]);

  const inc2 = await mk({
    id: 'INC-2026-0002', title: 'Campanha de phishing de credenciais Microsoft 365', category: 'Phishing', status: 'recuperacao',
    description: 'E-mails "atualização de boleto" com página falsa de login. 2 usuários inseriram credenciais.',
    functional: 1, information: 1, recoverability: 0, scope: 1, tlp: 'GREEN',
    occurredAt: ago(80), detectedAt: ago(76), declaredAt: ago(75), awareAt: ago(75), triagedAt: ago(74.5), containedAt: ago(72), eradicatedAt: ago(50),
    roles: { lead: 'c2', tech: 'c4' }, assets: ['a4'], playbooks: ['phishing'],
    csf: done(SUBCATEGORIES.filter((s) => ['triagem', 'analise', 'contencao', 'erradicacao'].includes(s.phase)).map((s) => s.id), ago(50)),
    iocs: [{ id: uid('i'), type: 'URL', value: 'hxxps://login-m365-secure.example/auth', desc: 'Página de coleta', tlp: 'GREEN', firstSeen: ago(80) }],
    tasks: [{ id: uid('k'), title: 'Monitorar logins das contas redefinidas por 7 dias', phase: 'recuperacao', csf: 'RC.RP-05', owner: 'c2', due: ago(-60), status: 'andamento' }],
    recovery: { backupVerified: true, criteria: 'Contas redefinidas com MFA e sem regras de encaminhamento.' },
    analysis: { rootCause: 'Ausência de filtro para anexos HTML e treinamento desatualizado.', hypothesis: '', whys: ['', '', '', '', ''], tactics: ['Initial Access', 'Credential Access'] },
  }, [[ago(76), 'deteccao', 'Denúncia de usuário pelo botão "Reportar phishing".'], [ago(72), 'acao', 'Mensagens removidas de 41 caixas; URLs bloqueadas.']]);

  const inc3 = await mk({
    id: 'INC-2026-0001', title: 'Bucket de armazenamento público com relatórios internos', category: 'Configuração incorreta em nuvem', status: 'encerrado',
    description: 'Bucket de relatórios configurado como público por 4 dias. Sem evidência de download por terceiros.',
    functional: 0, information: 1, recoverability: 0, scope: 0, tlp: 'GREEN',
    occurredAt: ago(24 * 30), detectedAt: ago(24 * 26), declaredAt: ago(24 * 26 - 1), awareAt: ago(24 * 26 - 1), triagedAt: ago(24 * 26 - 2),
    containedAt: ago(24 * 26 - 3), eradicatedAt: ago(24 * 25), recoveredAt: ago(24 * 25 - 5), closedAt: ago(24 * 20),
    roles: { lead: 'c1' }, playbooks: ['data-breach'],
    csf: done(SUBCATEGORIES.map((s) => s.id), ago(24 * 20)),
    recovery: { backupVerified: true, restoredVerified: true, endCriteria: 'Bucket privado, logs de acesso sem downloads externos.' },
    analysis: { rootCause: 'Template de infraestrutura como código sem bloqueio de acesso público.', hypothesis: '', whys: ['Bucket ficou público', 'Template IaC antigo foi reutilizado', 'Não havia política organizacional bloqueando acesso público', 'Guardrails de nuvem não eram obrigatórios', 'Governança de nuvem sem dono definido'], tactics: ['Collection'] },
    lessons: { meetingAt: ago(24 * 21), participants: 'SOC, Cloud, DPO', wentWell: 'Detecção por CSPM em menos de 4 dias.', improve: 'Bloqueio de acesso público no nível da organização.', planUpdates: 'Incluir checklist de nuvem no playbook de vazamento.' },
  }, [[ago(24 * 26), 'deteccao', 'CSPM detectou bucket público.'], [ago(24 * 20), 'status', 'Incidente encerrado.']]);

  db.incidents = [inc1, inc2, inc3];
  db.seq.inc = 3;

  db.improvements = [
    { id: uid('p'), title: 'Exigir MFA resistente a phishing em VPN', source: 'INC-2026-0003', csf: 'PR.AA-03', owner: 'c4', due: ago(-24 * 14), status: 'andamento', priority: 'alta' },
    { id: uid('p'), title: 'Bloquear acesso público a buckets no nível da organização', source: 'INC-2026-0001', csf: 'PR.PS-01', owner: 'c4', due: ago(24 * 10), status: 'concluida', priority: 'alta' },
    { id: uid('p'), title: 'Treinamento de phishing com o caso real do boleto', source: 'INC-2026-0002', csf: 'PR.AT-01', owner: 'c5', due: ago(-24 * 30), status: 'aberta', priority: 'media' },
  ];
  db.exercises = [
    { id: uid('x'), date: ago(24 * 60), type: 'Tabletop', scenario: 'Ransomware com dupla extorsão', participants: 'SOC, TI, Jurídico, Diretoria', findings: 'Contatos da seguradora desatualizados.', csf: 'ID.IM-02' },
  ];
  db.readiness = { 'GV.RR-02': 2, 'GV.PO-01': 2, 'ID.AM-01': 2, 'ID.AM-02': 1, 'PR.DS-11': 3, 'PR.PS-04': 2, 'DE.CM-09': 2, 'ID.IM-04': 1, 'PR.AA-01': 1, 'RS.CO-02': 2, 'DE.AE-08': 2 };
  db.audit = [{ id: uid('a'), at: new Date().toISOString(), who: 'Sistema', action: 'Dados de demonstração carregados', target: '', detail: '' }];
  return db;
}
