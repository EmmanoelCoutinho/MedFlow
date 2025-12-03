// src/pages/Chat.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Conversation, Message, Channel, Tag } from '../types';
import { Button } from '../components/ui/Button';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';

export const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
    const initialScrollDone = useRef(false);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (loadingMessages) return;
    if (!messages.length) return;
    if (initialScrollDone.current) return;

    initialScrollDone.current = true;

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    }, 0);
  }, [loadingMessages, messages.length]);

  // Buscar conversa + contato + tag
  useEffect(() => {
    if (!id) return;

    const fetchConversation = async () => {
      setLoadingConversation(true);

      const { data, error } = await supabase
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
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar conversa:', error);
        setLoadingConversation(false);
        return;
      }

      if (!data) {
        setConversation(null);
        setLoadingConversation(false);
        return;
      }

      // mensagens da conversa (para lastMessage / lastTimestamp)
      const messagesRows =
        (data.messages as {
          id: string;
          text: string | null;
          sent_at: string | null;
          direction: string | null;
        }[]) ?? [];

      const last = messagesRows[messagesRows.length - 1];

      // contatos: pode vir objeto ou array
      const rawContacts: any = data.contacts;
      const contactRow = Array.isArray(rawContacts)
        ? rawContacts[0]
        : rawContacts;

      // tags: pode vir objeto ou array
      const rawTags: any = data.conversation_tags?.[0]?.tags;
      let tagName: string | undefined;
      if (Array.isArray(rawTags)) {
        tagName = rawTags[0]?.name;
      } else {
        tagName = rawTags?.name;
      }

      const mappedConversation: Conversation = {
        id: data.id,
        channel: data.channel as Channel,
        status: data.status === 'open' ? 'em_andamento' : 'finalizada',
        contactName:
          contactRow?.name ?? contactRow?.phone ?? 'Contato sem nome',
        contactNumber: contactRow?.phone ?? '',
        lastMessage: last?.text ?? '',
        lastTimestamp:
          last?.sent_at ?? data.last_message_at ?? new Date().toISOString(),
        unreadCount: 0,
        tag: tagName as Tag | undefined,
        assignedTo: data.assigned_user_id ?? undefined,
      };

      setConversation(mappedConversation);
      setLoadingConversation(false);
    };

    fetchConversation();
  }, [id]);

  // Buscar todas as mensagens da conversa (carregamento inicial)
  useEffect(() => {
    if (!id) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);

      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          id,
          conversation_id,
          text,
          sent_at,
          created_at,
          direction
        `
        )
        .eq('conversation_id', id)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        setLoadingMessages(false);
        return;
      }

      const mapped: Message[] =
        data?.map((row: any) => ({
          id: row.id,
          conversationId: row.conversation_id,
          author: row.direction === 'inbound' ? 'cliente' : 'atendente',
          text: row.text ?? '',
          createdAt: row.sent_at ?? row.created_at ?? new Date().toISOString(),
        })) ?? [];

      setMessages(mapped);
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [id]);

  // Realtime: ouvir novas mensagens inseridas na conversa
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`realtime:messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const row: any = payload.new;

          const newMessage: Message = {
            id: row.id,
            conversationId: row.conversation_id,
            author: row.direction === 'inbound' ? 'cliente' : 'atendente',
            text: row.text ?? '',
            createdAt:
              row.sent_at ?? row.created_at ?? new Date().toISOString(),
          };

          // evita duplicar caso já exista
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Enviar mensagem: grava no Supabase e (depois) backend chama Meta
  // Enviar mensagem: chama Edge Function que grava no Supabase e envia para Meta
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !id) return;

    const trimmed = text.trim();
    const tempId = `local-${Date.now()}`;

    // 1) Mensagem otimista na UI
    const optimisticMessage: Message = {
      id: tempId,
      conversationId: id,
      author: 'atendente',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // 2) Chamar Edge Function send-whatsapp-message
    const { data, error } = await supabase.functions.invoke(
      'send-whatsapp-message',
      {
        body: {
          conversationId: id,
          text: trimmed,
        },
      }
    );

    if (error) {
      console.error('Erro ao enviar mensagem para WhatsApp:', error);
      // rollback simples
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    const inserted = (data as any)?.message;
    if (inserted) {
      const persisted: Message = {
        id: inserted.id,
        conversationId: inserted.conversation_id,
        author: 'atendente',
        text: inserted.text ?? '',
        createdAt:
          inserted.sent_at ?? inserted.created_at ?? new Date().toISOString(),
      };

      setMessages((prev) => prev.map((m) => (m.id === tempId ? persisted : m)));
    }

    // 👉 O Realtime também vai disparar pelo INSERT em messages.
    // Como você já tem o check "se já existe id, não adiciona", não duplica.
  };

  if (loadingConversation) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <p className="text-gray-500">Carregando conversa...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-[#1E1E1E] mb-2">
            Conversa não encontrada
          </h3>
          <Button variant="primary" onClick={() => navigate('/inbox')}>
            Voltar para Conversas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      <ChatHeader
        conversation={conversation}
        onBack={() => navigate('/inbox')}
      />

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando mensagens...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};
