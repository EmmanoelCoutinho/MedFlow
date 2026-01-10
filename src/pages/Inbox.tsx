import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BotIcon,
  Building2Icon,
  MessageCircleIcon,
  MessageSquareIcon,
  MessageSquareTextIcon,
  TagIcon,
  UsersIcon,
} from 'lucide-react';

import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import logo from '../assets/logo-unxet.png';

import { ConversationItem } from '../components/inbox/ConversationItem';
import { ChannelFilter } from '../components/inbox/ChannelFilter';
import { TagFilter } from '../components/inbox/TagFilter';

import { useConversations } from '../hooks/useConversations';
import type { Channel, Tag } from '../types';

export const Inbox: React.FC = () => {
  const navigate = useNavigate();

  const { conversations, loading: isLoading, markAsRead } = useConversations({
    status: 'open',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // total unread
  const unreadCount = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0
  );

  const filtered = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      conv.contactName.toLowerCase().includes(q) ||
      conv.contactNumber?.includes(q) ||
      conv.lastMessage.toLowerCase().includes(q);

    const matchesChannel =
      selectedChannels.length === 0 || selectedChannels.includes(conv.channel);

    const matchesTag =
      selectedTags.length === 0 ||
      (conv.tag && selectedTags.includes(conv.tag));

    return matchesSearch && matchesChannel && matchesTag;
  });

  const sidebarItems = [
    { label: 'Atendimentos', icon: MessageCircleIcon },
    { label: 'Carteira de contatos', icon: UsersIcon },
    { label: 'Departamento', icon: Building2Icon },
    { label: 'Tags', icon: TagIcon },
    { label: 'Bots', icon: BotIcon },
    { label: 'Mensagens rápidas', icon: MessageSquareTextIcon },
  ];

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden">
      <aside className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-6 border-b">
          <img src={logo} alt="Logo MedFlow" className="h-10 w-auto" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  index === 0
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      {/* Sidebar */}
      <div className="w-96 border-r flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Conversas</h2>
            {unreadCount > 0 && (
              <Badge variant="warning">{unreadCount} não lidas</Badge>
            )}
          </div>

          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3"
          />

          <ChannelFilter
            selectedChannels={selectedChannels}
            onChange={setSelectedChannels}
          />

          <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-200 animate-pulse rounded"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
              <MessageSquareIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium">Nenhuma conversa encontrada</p>
              <p className="text-sm text-gray-500">
                Ajuste os filtros ou inicie um chat.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  onClick={() => {
                    markAsRead(conv.id);
                    navigate(`/chat/${conv.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Novo chat */}
        {/* <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Número para iniciar..."
              value={newChatNumber}
              onChange={(e) => setNewChatNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartChat()}
            />
            <Button variant="primary" onClick={handleStartChat}>
              <PhoneIcon className="w-4 h-4" />
            </Button>
          </div>
        </div> */}
      </div>

      {/* painel vazio */}
      <div className="flex-1 flex items-center justify-center text-center">
        <MessageSquareIcon className="w-16 h-16 text-gray-300 mb-3" />
        <div>
          <h3 className="text-lg font-medium">Selecione uma conversa</h3>
          <p className="text-gray-500">Ou inicie um novo chat</p>
        </div>
      </div>
    </div>
  );
};
