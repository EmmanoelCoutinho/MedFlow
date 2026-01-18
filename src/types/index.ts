export type Channel = 'whatsapp' | 'instagram' | 'messenger';

export type Tag = {
  id: string;
  name: string;
  color: string;
  clinicId?: string;
  createdAt?: string;
};

export type Conversation = {
  id: string;
  clinicId?: string;
  channel: Channel;
  contactName: string;
  contactNumber?: string;
  contactAvatar?: string;
  lastMessage: string;
  lastMessageType?:
    | 'text'
    | 'image'
    | 'audio'
    | 'sticker'
    | 'video'
    | 'document'
    | 'other';
  lastTimestamp: string;
  unreadCount: number;
  tags?: Tag[];
  assignedTo?: string;
  status: 'open' | 'pending' | 'closed';
};
export type Message = {
  id: string;
  conversationId: string;
  author: 'cliente' | 'atendente';
  text?: string;
  type?: string;
  mediaUrl?: string;
  image_url?: string;
  mediaMimeType?: string;
  filename?: string;
  fileSize?: number;
  payload?: any;
  caption?: string;
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
