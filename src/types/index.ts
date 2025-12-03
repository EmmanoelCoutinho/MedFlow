export type Channel = 'whatsapp' | 'instagram' | 'messenger';
export type Tag = 'Pacientes' | 'Médicos' | 'Vendas' | 'Suporte';
export type Conversation = {
  id: string;
  channel: Channel;
  contactName: string;
  contactNumber?: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  tag?: Tag;
  assignedTo?: string;
  status: 'em_andamento' | 'finalizada';
};
export type Message = {
  id: string;
  conversationId: string;
  author: 'cliente' | 'atendente';
  text?: string;
  mediaUrl?: string;
  createdAt: string;
};
export type Metrics = {
  avgFirstResponseMin: number;
  avgResolutionMin: number;
  totalConversations: number;
  conversionRate: number;
  perAgent: Array<{
    agent: string;
    firstResponseMin: number;
    count: number;
    conversionRate: number;
  }>;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Atendente' | 'Gestor';
  avatar?: string;
};