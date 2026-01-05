// src/pages/Chat.tsx
import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Conversation, Message, Channel, Tag } from '../types';
import { useMessages, mapDbMessage } from '../hooks/useMessages';
import { persistConversationOpenedAt } from '../hooks/useConversations';
import { Button } from '../components/ui/Button';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { ArrowDownIcon } from 'lucide-react';

type SendableInput =
  | string
  | {
      type: 'text' | 'image' | 'audio' | 'document';
      text?: string;
      mediaUrl?: string;
      mediaMimeType?: string;
      filename?: string;
      fileSize?: number;
    };

export const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(true);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);

  const {
    messages,
    loading: loadingMessages,
    setMessages,
  } = useMessages(id ?? null);

  // Quando trocar de conversa, resetar estado de scroll
  useEffect(() => {
    setShowScrollToBottom(false);
    justOpenedRef.current = true;
  }, [id]);

  // ===== FUNÇÕES AUXILIARES DE MÉTRICA =====
  const getContainerMetrics = () => {
    const container = messagesContainerRef.current;
    if (!container) return null;

    const fullHeight = container.scrollHeight;
    const visibleHeight = container.clientHeight;
    const currentScrollTop = container.scrollTop;
    const scrollable = fullHeight > visibleHeight + 5;

    return {
      context: 'container' as const,
      el: container,
      fullHeight,
      visibleHeight,
      currentScrollTop,
      scrollable,
    };
  };

  const getWindowMetrics = () => {
    const doc = document.documentElement;
    const fullHeight = doc.scrollHeight;
    const visibleHeight = window.innerHeight;
    const currentScrollTop = window.scrollY || doc.scrollTop || 0;
    const scrollable = fullHeight > visibleHeight + 5;

    return {
      context: 'window' as const,
      fullHeight,
      visibleHeight,
      currentScrollTop,
      scrollable,
    };
  };

  // ===== SCROLL PRO FINAL (CONTAINER OU WINDOW) =====
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const containerMetrics = getContainerMetrics();
    const windowMetrics = getWindowMetrics();

    const useContainer =
      containerMetrics && containerMetrics.scrollable ? true : false;
    const useWindow = !useContainer && windowMetrics.scrollable ? true : false;

    if (useContainer && containerMetrics) {
      const { el, fullHeight, visibleHeight } = containerMetrics;
      const maxScrollTop = fullHeight - visibleHeight;
      const target = maxScrollTop > 0 ? maxScrollTop : 0;

      el.scrollTo({
        top: target,
        behavior,
      });
    } else if (useWindow && windowMetrics) {
      const { fullHeight, visibleHeight } = windowMetrics;
      const maxScrollTop = fullHeight - visibleHeight;
      const target = maxScrollTop > 0 ? maxScrollTop : 0;

      window.scrollTo({
        top: target,
        behavior,
      });
    }

    setShowScrollToBottom(false);
  }, []);

  // ===== SEMPRE ABRIR A CONVERSA NO FINAL =====
  useLayoutEffect(() => {
    if (loadingMessages) return;
    if (!messages.length) return;

    // só auto-scroll na abertura da conversa
    if (!justOpenedRef.current) return;

    // marca que já tratamos essa abertura
    justOpenedRef.current = false;

    // 1ª tentativa logo após o layout
    scrollToBottom('auto');

    // 2ª tentativa na próxima tick (caso a página ainda cresça)
    setTimeout(() => {
      scrollToBottom('auto');
    }, 0);

    // 3ª tentativa com um pequeno delay (ex: quando o realtime entra logo depois)
    setTimeout(() => {
      scrollToBottom('auto');
    }, 100);
  }, [loadingMessages, messages.length, scrollToBottom]);

  // ===== VER QUANDO MOSTRAR O BOTÃO "IR PRO FIM" =====
  const handleScrollCheck = useCallback(() => {
    const containerMetrics = getContainerMetrics();
    const windowMetrics = getWindowMetrics();

    const useContainer =
      containerMetrics && containerMetrics.scrollable ? true : false;
    const useWindow = !useContainer && windowMetrics.scrollable ? true : false;

    if (useContainer && containerMetrics) {
      const { fullHeight, visibleHeight, currentScrollTop } = containerMetrics;
      const distanceToBottom = fullHeight - (currentScrollTop + visibleHeight);

      setShowScrollToBottom(distanceToBottom > 40);
    } else if (useWindow && windowMetrics) {
      const { fullHeight, visibleHeight, currentScrollTop } = windowMetrics;
      const distanceToBottom = fullHeight - (currentScrollTop + visibleHeight);

      setShowScrollToBottom(distanceToBottom > 40);
    } else {
      setShowScrollToBottom(false);
    }
  }, []);

  // Recalcula quando chegam novas mensagens
  useEffect(() => {
    handleScrollCheck();
  }, [messages.length, handleScrollCheck]);

  // Sempre joga o usuario para a ultima mensagem quando chegar/enviar nova
  useEffect(() => {
    if (loadingMessages || messages.length === 0) return;
    scrollToBottom('auto');
  }, [loadingMessages, messages.length, scrollToBottom]);

  // Também atualiza estado ao rolar a página inteira
  useEffect(() => {
    const onWindowScroll = () => handleScrollCheck();
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', onWindowScroll);
  }, [handleScrollCheck]);

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
          type?: string | null;
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

  // Marca conversa como lida sempre que houver mensagens (incluindo novas em tempo real)
  useEffect(() => {
    if (!id || loadingMessages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const ts = lastMessage?.createdAt
      ? new Date(lastMessage.createdAt).getTime()
      : Date.now();

    persistConversationOpenedAt(id, ts || Date.now());
  }, [id, messages, loadingMessages]);

  // ===== Enviar mensagem (texto / imagem / áudio) =====
  // Enviar mensagem (texto / imagem / áudio)
  const handleSendMessage = async (input: SendableInput) => {
    if (!id) return;

    let bodyText = '';
    let outboundType: 'text' | 'image' | 'audio' | 'document' = 'text';
    let mediaUrl: string | undefined;
    let mediaMimeType: string | undefined;
    let filename: string | undefined;
    let fileSize: number | undefined;
    
    if (typeof input === 'string') {
      bodyText = input.trim();
      outboundType = 'text';
    } else {
      outboundType = input.type;
      bodyText = (input.text ?? '').trim();
      mediaUrl = input.mediaUrl;
      mediaMimeType = input.mediaMimeType;
      filename = input.filename;
      fileSize = input.fileSize;
    }

    if (!bodyText && !mediaUrl) return;

    const tempId = `local-${Date.now()}`;

    const optimistic: Message = {
      id: tempId,
      conversationId: id,
      author: 'atendente',
      text:
        bodyText ||
        (outboundType === 'image'
          ? '🖼️ Imagem'
          : outboundType === 'audio'
          ? '🎧 Áudio'
          : outboundType === 'document'
          ? '📄 Documento'
          : ''),
      createdAt: new Date().toISOString(),
      type: outboundType,
      mediaUrl,
      mediaMimeType,
      filename,
      fileSize,
    };

    setMessages((prev) => [...prev, optimistic]);

    // já rola pro fim ao enviar
    scrollToBottom('smooth');

    const { data, error } = await supabase.functions.invoke(
      'send-whatsapp-message',
      {
        body: {
          conversationId: id,
          text: bodyText,
          type: outboundType,
          mediaUrl,
          mediaMimeType,
          filename,
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
      if (outboundType === 'document' && filename && inserted.id) {
        const { error: filenameError } = await supabase
          .from('messages')
          .update({ filename })
          .eq('id', inserted.id);

        if (filenameError) {
          console.warn(
            'Não foi possível persistir o nome do documento:',
            filenameError
          );
        }
      }

      const persisted: Message = mapDbMessage(inserted);
      const merged: Message = {
        ...persisted,
        filename: persisted.filename ?? optimistic.filename,
        fileSize: persisted.fileSize ?? optimistic.fileSize,
        mediaUrl: persisted.mediaUrl ?? optimistic.mediaUrl,
        mediaMimeType: persisted.mediaMimeType ?? optimistic.mediaMimeType,
      };

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const alreadyExists = withoutTemp.some((m) => m.id === merged.id);
        if (alreadyExists) return withoutTemp;
        return [...withoutTemp, merged];
      });

      scrollToBottom('smooth');
    }
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

      {/* Área de Mensagens */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScrollCheck}
        className="flex-1 min-h-0 overflow-y-auto p-4 pt-24 pb-28 space-y-4"
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
              <MessageBubble
                key={message.id}
                message={message}
                contactName={conversation.contactName}
              />
            ))}
          </>
        )}
      </div>

      {/* Botão flutuante pra ir pro fim */}
      {showScrollToBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="fixed left-1/2 -translate-x-1/2 bottom-28 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#0A84FF] text-white shadow-lg transition-colors hover:bg-[#0066d6]"
          aria-label="Ir para ultima mensagem"
        >
          <ArrowDownIcon className="w-5 h-5" />
        </button>
      )}

      {/* IMPORTANTE: o MessageInput agora pode enviar string OU objeto */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};
