'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Conversation, Channel, Tag } from '../types';

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
};

export function useConversations(options: UseConversationsOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchConversations = useCallback(async () => {
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
        contacts:contact_id (
          id,
          name,
          phone
        ),
        messages (
          id,
          text,
          sent_at,
          direction
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
          }[]) ?? [];

        const last = messages
          .slice()
          .sort(
            (a, b) =>
              new Date(b.sent_at ?? 0).getTime() -
              new Date(a.sent_at ?? 0).getTime()
          )[0];

        const rawContacts: any = row.contacts;
        const contactRow = Array.isArray(rawContacts)
          ? rawContacts[0]
          : rawContacts;

        const rawTags: any = row.conversation_tags?.[0]?.tags;
        let tagName: string | undefined;
        if (Array.isArray(rawTags)) {
          tagName = rawTags[0]?.name;
        } else {
          tagName = rawTags?.name;
        }

        return {
          id: row.id,
          channel: row.channel as Channel,
          status: row.status === 'open' ? 'em_andamento' : 'finalizada',

          contactName:
            contactRow?.name ??
            contactRow?.phone ??
            'Contato sem nome',
          contactNumber: contactRow?.phone ?? '',

          lastMessage: last?.text ?? '',
          lastTimestamp: last?.sent_at ?? row.last_message_at ?? '',

          // placeholder até você ter controle real de leitura
          unreadCount: last?.direction === 'inbound' ? 1 : 0,

          tag: tagName as Tag | undefined,
          assignedTo: row.assigned_user_id ?? undefined,
        };
      }) ?? [];

    setConversations(mapped);
    setLoading(false);
  }, [options.status, options.channel]);

  // carregamento inicial + quando mudar filtro (status/canal)
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // realtime focado em messages (igual o useMessages, mas atualizando a lista)
  useEffect(() => {
    const channel = supabase
      .channel('inbox-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // se quiser deixar mais parecido ainda com o useMessages,
          // você poderia depois colocar um filter aqui, mas não é obrigatório:
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
              // conversa não está na lista (pode não ser "open" ou não bater o filtro)
              return current;
            }

            const old = current[idx];

            const isInbound = msg.direction === 'inbound';

            const updated: Conversation = {
              ...old,
              lastMessage: msg.text ?? old.lastMessage,
              lastTimestamp: msg.sent_at ?? old.lastTimestamp,
              unreadCount: isInbound
                ? (old.unreadCount ?? 0) + 1
                : old.unreadCount ?? 0,
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
  }, []);

  return { conversations, loading, error, refetch: fetchConversations };
}
