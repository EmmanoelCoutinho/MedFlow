import { Conversation, Message, Metrics, User } from '../types';
export const mockConversations: Conversation[] = [{
  id: '1',
  channel: 'whatsapp',
  contactName: 'Maria Silva',
  contactNumber: '+55 11 98765-4321',
  lastMessage: 'Obrigada pelo atendimento!',
  lastTimestamp: new Date(Date.now() - 5 * 60000).toISOString(),
  unreadCount: 0,
  tag: 'Pacientes',
  assignedTo: 'Ana Costa',
  status: 'finalizada'
}, {
  id: '2',
  channel: 'instagram',
  contactName: 'João Santos',
  contactNumber: '+55 21 99876-5432',
  lastMessage: 'Qual o horário de atendimento?',
  lastTimestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  unreadCount: 2,
  tag: 'Suporte',
  assignedTo: 'Carlos Mendes',
  status: 'em_andamento'
}, {
  id: '3',
  channel: 'messenger',
  contactName: 'Paula Oliveira',
  contactNumber: '+55 11 97654-3210',
  lastMessage: 'Gostaria de agendar uma consulta',
  lastTimestamp: new Date(Date.now() - 30 * 60000).toISOString(),
  unreadCount: 1,
  tag: 'Pacientes',
  assignedTo: 'Ana Costa',
  status: 'em_andamento'
}, {
  id: '4',
  channel: 'whatsapp',
  contactName: 'Dr. Roberto Lima',
  contactNumber: '+55 11 96543-2109',
  lastMessage: 'Preciso de acesso ao sistema',
  lastTimestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  unreadCount: 0,
  tag: 'Médicos',
  assignedTo: 'Carlos Mendes',
  status: 'em_andamento'
}, {
  id: '5',
  channel: 'whatsapp',
  contactName: 'Fernanda Souza',
  contactNumber: '+55 21 95432-1098',
  lastMessage: 'Qual o valor da consulta?',
  lastTimestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
  unreadCount: 3,
  tag: 'Vendas',
  status: 'em_andamento'
}];
export const mockMessages: Record<string, Message[]> = {
  '1': [{
    id: 'm1',
    conversationId: '1',
    author: 'cliente',
    text: 'Olá, gostaria de saber sobre consultas',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }, {
    id: 'm2',
    conversationId: '1',
    author: 'atendente',
    text: 'Olá Maria! Claro, posso ajudar. Que especialidade você procura?',
    createdAt: new Date(Date.now() - 3000000).toISOString()
  }, {
    id: 'm3',
    conversationId: '1',
    author: 'cliente',
    text: 'Cardiologia, por favor',
    createdAt: new Date(Date.now() - 2400000).toISOString()
  }, {
    id: 'm4',
    conversationId: '1',
    author: 'atendente',
    text: 'Perfeito! Temos disponibilidade para esta semana. Prefere manhã ou tarde?',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  }, {
    id: 'm5',
    conversationId: '1',
    author: 'cliente',
    text: 'Obrigada pelo atendimento!',
    createdAt: new Date(Date.now() - 300000).toISOString()
  }],
  '2': [{
    id: 'm6',
    conversationId: '2',
    author: 'cliente',
    text: 'Qual o horário de atendimento?',
    createdAt: new Date(Date.now() - 900000).toISOString()
  }]
};
export const mockMetrics: Metrics = {
  avgFirstResponseMin: 3.2,
  avgResolutionMin: 12.5,
  totalConversations: 247,
  conversionRate: 0.27,
  perAgent: [{
    agent: 'Ana Costa',
    firstResponseMin: 2.8,
    count: 89,
    conversionRate: 0.31
  }, {
    agent: 'Carlos Mendes',
    firstResponseMin: 3.5,
    count: 76,
    conversionRate: 0.25
  }, {
    agent: 'Maria Santos',
    firstResponseMin: 3.1,
    count: 82,
    conversionRate: 0.28
  }]
};
export const mockUsers: User[] = [{
  id: '1',
  name: 'Ana Costa',
  email: 'ana@media.com',
  role: 'Atendente'
}, {
  id: '2',
  name: 'Carlos Mendes',
  email: 'carlos@media.com',
  role: 'Atendente'
}, {
  id: '3',
  name: 'Maria Santos',
  email: 'maria@media.com',
  role: 'Gestor'
}];