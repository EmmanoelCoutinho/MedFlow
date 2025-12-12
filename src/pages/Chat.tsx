// src/pages/Chat.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Conversation, Message, Channel, Tag } from '../types';
import { useMessages, mapDbMessage } from '../hooks/useMessages';
import { Button } from '../components/ui/Button';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { ArrowDownIcon } from 'lucide-react';

export const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);

  const {
    messages,
    loading: loadingMessages,
    setMessages,
  } = useMessages(id ?? null);

  // Sempre que trocar de conversa, resetamos o controle do scroll inicial
  useEffect(() => {
    initialScrollDone.current = false;
    setMessages([]);
    setShowScrollToBottom(false);
  }, [id]);

  // Sempre vai pro fim de verdade do container
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    const endEl = messagesEndRef.current;

    if (endEl) {
      endEl.scrollIntoView({ behavior, block: 'end' });
    }

    if (container) {
      const top = container.scrollHeight;

      if (behavior === 'smooth') {
        container.scrollTo({
          top,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = top;
      }
    }

    setShowScrollToBottom(false);
  }, []);

  // Ao carregar as mensagens da conversa, sempre abrir no fim
  useEffect(() => {
    if (loadingMessages) return;
    if (!messages.length) return;
    if (initialScrollDone.current) return;

    initialScrollDone.current = true;

    // roda apos layout
    scrollToBottom('auto');
    const timer = setTimeout(() => scrollToBottom('auto'), 0);
    return () => clearTimeout(timer);
  }, [loadingMessages, messages.length, scrollToBottom]);

  // Checa se deve mostrar o botao "ir para o fim"
  const handleScrollCheck = useCallback(
    (e?: React.UIEvent<HTMLDivElement>) => {
      const container =
        (e?.currentTarget as HTMLDivElement | null) ?? messagesContainerRef.current;

      if (container) {
        const distanceToBottom =
          container.scrollHeight - (container.scrollTop + container.clientHeight);
        setShowScrollToBottom(distanceToBottom > 120);
        return;
      }

      // fallback: se estiver rolando a pagina (body)
      const doc = document.documentElement;
      const distanceToBottom =
        doc.scrollHeight - (window.scrollY + window.innerHeight);
      setShowScrollToBottom(distanceToBottom > 120);
    },
    []
  );

  // Recalcula quando chegam novas mensagens
  useEffect(() => {
    handleScrollCheck();
  }, [messages.length, handleScrollCheck]);

  // Se o scroll estiver acontecendo no body, ainda assim atualiza o estado do botao
  useEffect(() => {
    const onWindowScroll = () => handleScrollCheck();
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', onWindowScroll);
  }, [handleScrollCheck]);

  // Observa o fim da lista: se o marcador sair da viewport do container, mostra o botao
  useEffect(() => {
    const container = messagesContainerRef.current;
    const endEl = messagesEndRef.current;
    if (!container || !endEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollToBottom(!entry.isIntersecting);
      },
      { root: container ?? null, threshold: 0.01 }
    );

    observer.observe(endEl);

    return () => observer.disconnect();
  }, [messages.length]);

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
            direction,
            type
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

      const messagesRows =
        (data.messages as {
          id: string;
          text: string | null;
          sent_at: string | null;
          direction: string | null;
        }[]) ?? [];

      const last = messagesRows[messagesRows.length - 1];

      const rawContacts: any = data.contacts;
      const contactRow = Array.isArray(rawContacts)
        ? rawContacts[0]
        : rawContacts;

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
        lastMessageType: (last as any)?.type ?? 'text',
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

  // Enviar mensagem
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !id) return;

    const trimmed = text.trim();
    const tempId = `local-${Date.now()}`;

    const optimisticMessage: Message = {
      id: tempId,
      conversationId: id,
      author: 'atendente',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

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
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    const inserted = (data as any)?.message;
    if (inserted) {
      const persisted: Message = mapDbMessage(inserted);

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const alreadyExists = withoutTemp.some((m) => m.id === persisted.id);
        if (alreadyExists) return withoutTemp;
        return [...withoutTemp, persisted];
      });
    }

    // Depois de enviar, rola pro fim suave
    scrollToBottom('smooth');
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
            Conversa nao encontrada
          </h3>
          <Button variant="primary" onClick={() => navigate('/inbox')}>
            Voltar para Conversas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen w-full bg-white">
      <ChatHeader
        conversation={conversation}
        onBack={() => navigate('/inbox')}
      />

      {/* Area de Mensagens */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScrollCheck}
        className="flex-1 min-h-0 overflow-y-auto p-4 pt-24 pb-36 space-y-4"
      >
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

        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="fixed left-1/2 -translate-x-1/2 bottom-28 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#0A84FF] text-white shadow-lg transition-colors hover:bg-[#0066d6]"
          aria-label="Ir para ultima mensagem"
        >
          <ArrowDownIcon className="w-5 h-5" />
        </button>

      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};
