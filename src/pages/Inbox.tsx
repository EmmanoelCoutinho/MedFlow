import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  BotIcon,
  Building2Icon,
  MessageCircleIcon,
  MessageSquareIcon,
  MessageSquareTextIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";

import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";

import { ConversationItem } from "../components/inbox/ConversationItem";
import { ChannelFilter } from "../components/inbox/ChannelFilter";
import { TagFilter } from "../components/inbox/TagFilter";

import { useConversations } from "../hooks/useConversations";
import type { Channel, Tag } from "../types";

export const Inbox: React.FC = () => {
  const navigate = useNavigate();

  const {
    conversations,
    loading: isLoading,
    markAsRead,
  } = useConversations({
    status: "open",
  });

  const [searchQuery, setSearchQuery] = useState("");
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
    { label: "Atendimentos", icon: MessageCircleIcon },
    { label: "Carteira de contatos", icon: UsersIcon },
    { label: "Departamento", icon: Building2Icon },
    { label: "Tags", icon: TagIcon },
    { label: "Bots", icon: BotIcon },
    { label: "Mensagens rápidas", icon: MessageSquareTextIcon },
  ];

  return (
    <div className="flex min-h-screen w-full bg-white overflow-hidden">
      {/* Sidebar (minimizada por padrão, expande no hover) */}
      <aside className="group w-16 hover:w-64 transition-all duration-200 border-r bg-gray-50 flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <img
              src={'/logo-unxet.png'}
              alt="Logo Unxet"
              className="h-9 w-9 rounded-md object-contain"
            />

            {/* Nome aparece só quando expandir */}
            <div className="overflow-hidden max-w-0 group-hover:max-w-[200px] transition-all duration-200">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  Unxet
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  Central de mensagens
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0;

            return (
              <button
                key={item.label}
                type="button"
                className={[
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  "justify-center group-hover:justify-start",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
                title={item.label} // ajuda quando estiver minimizado
              >
                <Icon className="h-5 w-5 flex-shrink-0" />

                {/* Texto some quando minimizado */}
                <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[220px] opacity-0 group-hover:opacity-100 transition-all duration-200">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Sidebar de conversas */}
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
                    navigate(`/inbox/chat/${conv.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col min-h-0 h-full">
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
