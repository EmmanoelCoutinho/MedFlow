'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Conversation, Channel, Tag } from '../types';
import { useAuth } from '../contexts/AuthContext';

type UseConversationsOptions = {
  status?: string;
  channel?: string;
};

type DbMessage = {
  id: string;
  conversation_id: string;
  direction: string | null;
  text: string | null;
  sent_at: string | null;
  type?: string | null;
  payload?: any;
};

const LAST_OPENED_STORAGE_KEY = 'conversation-last-opened';

const readLastOpenedAt = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LAST_OPENED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const writeLastOpenedAt = (map: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_OPENED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore write errors (ex: storage disabled)
  }
};

export const persistConversationOpenedAt = (
  conversationId: string,
  timestamp = Date.now()
) => {
  const current = readLastOpenedAt();
  const next = { ...current, [conversationId]: timestamp };
  writeLastOpenedAt(next);
  return next;
};

export function useConversations(options: UseConversationsOptions = {}) {
  const { authUser, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [lastOpenedAt, setLastOpenedAt] = useState<Record<string, number>>(
    () => readLastOpenedAt()
  );
  const lastOpenedAtRef = useRef(lastOpenedAt);

  useEffect(() => {
    lastOpenedAtRef.current = lastOpenedAt;
  }, [lastOpenedAt]);

  const parsePayload = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw ?? {};
  };

  const detectMediaType = (
    msg?: { type?: string | null; payload?: any },
    payload?: any
  ): Conversation['lastMessageType'] => {
    const parsedPayload = payload ?? parsePayload(msg?.payload);
    const directType = msg?.type ?? parsedPayload?.type;
    const candidate =
      parsedPayload?.message ??
      parsedPayload?.messages?.[0] ??
      parsedPayload;

    const hasMedia = (key: string) =>
      directType === key ||
      candidate?.[key] ||
      parsedPayload?.[key] ||
      parsedPayload?.data?.[key];

    if (hasMedia('image')) return 'image';
    if (hasMedia('audio')) return 'audio';
    if (hasMedia('sticker')) return 'sticker';
    if (hasMedia('video')) return 'video';
    if (hasMedia('document')) return 'document';

    if (directType) return directType as Conversation['lastMessageType'];
    return 'text';
  };

  const getPreview = (msg?: {
    text: string | null;
    type?: string | null;
    payload?: any;
  }) => {
    if (!msg) {
      return { text: '', type: 'text' as Conversation['lastMessageType'] };
    }

    const payload = parsePayload(msg.payload);
    const kind = detectMediaType(msg, payload);
    const text = msg.text ?? '';

    const fallback =
      kind === 'image'
        ? 'Imagem'
        : kind === 'audio'
        ? 'Audio'
        : kind === 'sticker'
        ? 'Figurinha'
        : kind === 'video'
        ? 'Video'
        : kind === 'document'
        ? 'Documento'
        : 'Mensagem';

    return {
      text: text || fallback,
      type: kind,
    };
  };

  const fetchConversations = useCallback(async () => {
    if (!authUser) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from('conversations')
      .select(
        `
        id,
        status,
        channel,
        last_message_at,
        created_at,
        assigned_user_id,
        contacts:contact_id (*),
        messages (
          id,
          text,
          sent_at,
          direction,
          type,
          payload
        ),
        conversation_tags (
          tags (
            name
          )
        )
      `
      )
      .order('last_message_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.channel) {
      query = query.eq('channel', options.channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      setError(error);
      setLoading(false);
      return;
    }

    const mapped: Conversation[] =
      data?.map((row: any) => {
        const messages =
          (row.messages as {
            id: string;
            text: string | null;
            sent_at: string | null;
            direction: string | null;
            type?: string | null;
            payload?: any;
          }[]) ?? [];

        const last = messages
          .slice()
          .sort(
            (a, b) =>
              new Date(b.sent_at ?? 0).getTime() -
              new Date(a.sent_at ?? 0).getTime()
          )[0];

        const preview = getPreview(last);

        const rawContacts: any = row.contacts;
        const contactRow = Array.isArray(rawContacts)
          ? rawContacts[0]
          : rawContacts;
        const contactAvatar =
          contactRow?.avatar ??
          contactRow?.avatar_url ??
          contactRow?.photo_url ??
          contactRow?.profile_pic_url ??
          contactRow?.image_url;

        const rawTags: any = row.conversation_tags?.[0]?.tags;
        let tagName: string | undefined;
        if (Array.isArray(rawTags)) {
          tagName = rawTags[0]?.name;
        } else {
          tagName = rawTags?.name;
        }

        const lastTime = new Date(
          last?.sent_at ?? row.last_message_at ?? 0
        ).getTime();
        const openedAt = lastOpenedAtRef.current[row.id];
        const isUnread =
          last?.direction === 'inbound' &&
          (!openedAt || lastTime > openedAt);

        return {
          id: row.id,
          channel: row.channel as Channel,
          status: row.status === 'open' ? 'em_andamento' : 'finalizada',

          contactName:
            contactRow?.name ??
            contactRow?.phone ??
            'Contato sem nome',
          contactNumber: contactRow?.phone ?? '',
          contactAvatar: contactAvatar ?? undefined,

          lastMessage: preview.text,
          lastMessageType: preview.type,
          lastTimestamp: last?.sent_at ?? row.last_message_at ?? '',
          unreadCount: isUnread ? 1 : 0,

          tag: tagName as Tag | undefined,
          assignedTo: row.assigned_user_id ?? undefined,
        };
      }) ?? [];

    setConversations(mapped);
    setLoading(false);
  }, [authUser, options.status, options.channel]);

  // carregamento inicial + quando mudar filtro (status/canal)
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    fetchConversations();
  }, [authLoading, fetchConversations]);

  // realtime focado em messages (igual o useMessages, mas atualizando a lista)
  useEffect(() => {
    if (!authUser) {
      return;
    }

    const channel = supabase
      .channel('inbox-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // se quiser deixar mais parecido ainda com o useMessages,
          // voce poderia depois colocar um filter aqui, mas nao e obrigatorio:
          // filter: '...',
        },
        (payload) => {
          const msg = payload.new as DbMessage;
          if (!msg) return;

          console.log('[RT] nova mensagem para conversa', msg.conversation_id);

          setConversations((current) => {
            const idx = current.findIndex(
              (c) => c.id === msg.conversation_id
            );
            if (idx === -1) {
              // conversa nao esta na lista (pode nao ser "open" ou nao bater o filtro)
              return current;
            }

            const old = current[idx];

            const isInbound = msg.direction === 'inbound';

            const preview = getPreview(msg as any);

            const updated: Conversation = {
              ...old,
              lastMessage: preview.text || old.lastMessage,
              lastMessageType: preview.type ?? old.lastMessageType,
              lastTimestamp: msg.sent_at ?? old.lastTimestamp,
              unreadCount: (() => {
                const openedAt = lastOpenedAt[msg.conversation_id];
                const msgTime = new Date(msg.sent_at ?? 0).getTime();
                const isUnread = isInbound && (!openedAt || msgTime > openedAt);
                if (!isUnread) return 0;
                return (old.unreadCount ?? 0) + 1;
              })(),
            };

            const clone = [...current];
            clone[idx] = updated;

            // reordenar pra conversa com mensagem nova subir
            clone.sort(
              (a, b) =>
                new Date(b.lastTimestamp ?? 0).getTime() -
                new Date(a.lastTimestamp ?? 0).getTime()
            );

            return clone;
          });
        }
      )
      .subscribe((status) => {
        console.log('[RT] conversations channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, lastOpenedAt]);

  const markAsRead = useCallback((conversationId: string) => {
    const now = Date.now();
    setLastOpenedAt((current) => {
      const next = { ...current, [conversationId]: now };
      writeLastOpenedAt(next);
      return next;
    });
    setConversations((current) =>
      current.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, []);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    markAsRead,
  };
}
