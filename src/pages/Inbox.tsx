import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
import type { Channel } from "../types";

type InboxTab = "open" | "pending";

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Buscar conversas (vamos filtrar closed na UI)
  const { conversations, loading: isLoading, markAsRead } = useConversations();

  // ✅ começa em "open"
  const [tab, setTab] = useState<InboxTab>("open");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // ✅ remove closed ANTES de qualquer coisa
  const visibleConversations = useMemo(() => {
    return conversations.filter((c) => c.status !== "closed");
  }, [conversations]);

  // total unread (geral, sem closed)
  const unreadCount = useMemo(() => {
    return visibleConversations.reduce(
      (sum, conv) => sum + (conv.unreadCount || 0),
      0
    );
  }, [visibleConversations]);

  // aplica filtros de busca/canal/tag (sem closed)
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return visibleConversations.filter((conv) => {
      const matchesSearch =
        conv.contactName?.toLowerCase().includes(q) ||
        conv.contactNumber?.includes(q) ||
        conv.lastMessage?.toLowerCase().includes(q);

      const matchesChannel =
        selectedChannels.length === 0 ||
        selectedChannels.includes(conv.channel);

      const matchesTag =
        selectedTagIds.length === 0 ||
        selectedTagIds.every((id) => conv.tags?.some((t) => t.id === id));

      return matchesSearch && matchesChannel && matchesTag;
    });
  }, [visibleConversations, searchQuery, selectedChannels, selectedTagIds]);

  // separa por status
  const openConversations = useMemo(() => {
    return filtered.filter((c) => c.status === "open");
  }, [filtered]);

  const pendingConversations = useMemo(() => {
    return filtered.filter((c) => c.status === "pending");
  }, [filtered]);

  const currentList = tab === "open" ? openConversations : pendingConversations;

  const unreadOpen = useMemo(() => {
    return openConversations.reduce(
      (sum, conv) => sum + (conv.unreadCount || 0),
      0
    );
  }, [openConversations]);

  const unreadPending = useMemo(() => {
    return pendingConversations.reduce(
      (sum, conv) => sum + (conv.unreadCount || 0),
      0
    );
  }, [pendingConversations]);

  const sidebarItems = [
    {
      label: "Atendimentos",
      icon: MessageCircleIcon,
      path: "/inbox",
      extraPaths: ["/inbox/chat"],
    },
    { label: "Carteira de contatos", icon: UsersIcon },
    { label: "Departamentos", icon: Building2Icon },
    { label: "Etiquetas", icon: TagIcon, path: "/inbox/tags" },
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
              src={"/logo-unxet.png"}
              alt="Logo Unxet"
              className="h-9 w-9 rounded-md object-contain"
            />

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
            const active = item.path
              ? location.pathname === item.path ||
                (item.extraPaths &&
                  item.extraPaths.some((p) => location.pathname.startsWith(p)))
              : index === 0 && location.pathname === "/inbox";

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.path) navigate(item.path);
                }}
                className={[
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  "justify-center group-hover:justify-start",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
                title={item.label}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
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

          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

        </div>
          <div className="flex items-center mt-3">
            <button
              type="button"
              onClick={() => setTab("open")}
              className={[
                "flex-1 h-10 text-sm font-medium transition",
                tab === "open"
                  ? "text-blue-500 border-blue-500 border-b-4"
                  : "bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Abertas
                <span className="text-xs opacity-90">
                  ({openConversations.length})
                </span>
                {unreadOpen > 0 && (
                  <span className="ml-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                    {unreadOpen}
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("pending")}
              className={[
                "flex-1 h-10 text-sm font-medium transition",
                tab === "pending"
                  ? "text-blue-500 border-blue-500 border-b-4"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Pendentes
                <span className="text-xs opacity-90">
                  ({pendingConversations.length})
                </span>
                {unreadPending > 0 && (
                  <span className="ml-1 text-xs bg-white/15 px-2 py-0.5 rounded-full">
                    {unreadPending}
                  </span>
                )}
              </span>
            </button>
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
          ) : currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
              <MessageSquareIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium">
                {tab === "open"
                  ? "Nenhuma conversa aberta"
                  : "Nenhuma conversa pendente"}
              </p>
              <p className="text-sm text-gray-500">
                Ajuste os filtros ou inicie um chat.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {currentList.map((conv) => (
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

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <Outlet />
      </div>
    </div>
  );
};
