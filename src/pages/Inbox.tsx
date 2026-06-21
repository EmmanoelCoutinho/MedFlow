import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MessageSquareIcon } from "lucide-react";

import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { AppSidebar } from "../components/layout/AppSidebar";
import { ConversationItem } from "../components/inbox/ConversationItem";
import { ChannelFilter } from "../components/inbox/ChannelFilter";
import { TagFilter } from "../components/inbox/TagFilter";
import { useConversations } from "../hooks/useConversations";
import type { Channel } from "../types";

type InboxTab = "open" | "pending";

export const Inbox: React.FC = () => {
  const navigate = useNavigate();

  const {
    conversations,
    loading: isLoading,
    markAsRead,
    totalUnreadCount,
    totalUnreadOpen,
    totalUnreadPending,
  } = useConversations();

  useEffect(() => {
    const baseTitle = "Unxet";
    document.title =
      totalUnreadCount > 0 ? `(${totalUnreadCount}) ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [totalUnreadCount]);

  const [tab, setTab] = useState<InboxTab>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail === "open") {
        setTab("open");
      }
    };

    window.addEventListener("inbox:tab", handleTabChange);
    return () => window.removeEventListener("inbox:tab", handleTabChange);
  }, []);

  const visibleConversations = useMemo(() => {
    return conversations.filter((conversation) => conversation.status !== "closed");
  }, [conversations]);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return visibleConversations.filter((conversation) => {
      const matchesSearch =
        conversation.contactName?.toLowerCase().includes(query) ||
        conversation.contactNumber?.includes(query) ||
        conversation.lastMessage?.toLowerCase().includes(query);

      const matchesChannel =
        selectedChannels.length === 0 ||
        selectedChannels.includes(conversation.channel);

      const matchesTag =
        selectedTagIds.length === 0 ||
        (conversation.tags ?? []).some((tag) => selectedTagIds.includes(tag.id));

      return matchesSearch && matchesChannel && matchesTag;
    });
  }, [visibleConversations, searchQuery, selectedChannels, selectedTagIds]);

  const openConversations = useMemo(() => {
    return filtered.filter((conversation) => conversation.status === "open");
  }, [filtered]);

  const pendingConversations = useMemo(() => {
    return filtered.filter((conversation) => conversation.status === "pending");
  }, [filtered]);

  const currentList = tab === "open" ? openConversations : pendingConversations;

  return (
    <div className="flex h-screen w-full overflow-x-hidden bg-white">
      <AppSidebar />

      <div className="flex h-screen min-h-0 w-96 flex-col border-r">
        <div className="shrink-0 border-b p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Conversas</h2>
            {totalUnreadCount > 0 && (
              <Badge variant="warning">{totalUnreadCount} não lidas</Badge>
            )}
          </div>

          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
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

          <div className="mt-3 flex items-center">
            <button
              type="button"
              onClick={() => setTab("open")}
              className={[
                "h-10 flex-1 text-sm font-medium transition",
                tab === "open"
                  ? "border-b-4 border-blue-500 text-blue-500"
                  : "bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Abertas
                <span className="text-xs opacity-90">
                  ({openConversations.length})
                </span>
                {totalUnreadOpen > 0 && (
                  <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                    {totalUnreadOpen}
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("pending")}
              className={[
                "h-10 flex-1 text-sm font-medium transition",
                tab === "pending"
                  ? "border-b-4 border-blue-500 text-blue-500"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Pendentes
                <span className="text-xs opacity-90">
                  ({pendingConversations.length})
                </span>
                {totalUnreadPending > 0 && (
                  <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                    {totalUnreadPending}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded bg-gray-200"
                />
              ))}
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <MessageSquareIcon className="mb-3 h-12 w-12 text-gray-300" />
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
            <div className="divide-y pb-20">
              {currentList.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onClick={() => {
                    markAsRead(conversation.id);
                    navigate(`/inbox/chat/${conversation.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
};

