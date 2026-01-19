// src/pages/Chat.tsx
import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { Conversation, Message, Channel } from "../types";
import { useMessages, mapDbMessage } from "../hooks/useMessages";
import { persistConversationOpenedAt } from "../hooks/useConversations";
import { Button } from "../components/ui/Button";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageBubble } from "../components/chat/MessageBubble";
import { MessageInput } from "../components/chat/MessageInput";
import { ArrowDownIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type UiTag = { id: string; name: string; color: string };

type SendableInput =
  | string
  | {
      type: "text" | "image" | "audio" | "document";
      text?: string;
      mediaUrl?: string;
      mediaMimeType?: string;
      filename?: string;
      fileSize?: number;
    };

export const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authUser } = useAuth();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(true);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);

  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<UiTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<UiTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsSavingId, setTagsSavingId] = useState<string | null>(null);
  const [acceptingConversation, setAcceptingConversation] = useState(false);

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
      context: "container" as const,
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
      context: "window" as const,
      fullHeight,
      visibleHeight,
      currentScrollTop,
      scrollable,
    };
  };

  // ===== SCROLL PRO FINAL (CONTAINER OU WINDOW) =====
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
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
    scrollToBottom("auto");

    // 2ª tentativa na próxima tick (caso a página ainda cresça)
    setTimeout(() => {
      scrollToBottom("auto");
    }, 0);

    // 3ª tentativa com um pequeno delay (ex: quando o realtime entra logo depois)
    setTimeout(() => {
      scrollToBottom("auto");
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

  const reloadConversationTags = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("conversation_tags")
      .select("tags(id,name,color)")
      .eq("conversation_id", conversationId);

    if (error) return;

    const mapped: UiTag[] = ((data as any[]) ?? [])
      .map((r) => r.tags)
      .flat()
      .filter(Boolean)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color ?? "#0A84FF",
      }));

    setSelectedTags(mapped);

    // mantém o "conversation.tag" (singular) sincronizado pra não quebrar filtros antigos
    setConversation((prev) =>
      prev ? ({ ...prev, tag: mapped[0]?.name as any } as any) : prev
    );
  }, []);

  // Recalcula quando chegam novas mensagens
  useEffect(() => {
    handleScrollCheck();
  }, [messages.length, handleScrollCheck]);

  // Sempre joga o usuario para a ultima mensagem quando chegar/enviar nova
  useEffect(() => {
    if (loadingMessages || messages.length === 0) return;
    scrollToBottom("auto");
  }, [loadingMessages, messages.length, scrollToBottom]);

  // Também atualiza estado ao rolar a página inteira
  useEffect(() => {
    const onWindowScroll = () => handleScrollCheck();
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", onWindowScroll);
  }, [handleScrollCheck]);

  // Buscar conversa + contato + tag
  useEffect(() => {
    if (!id) return;

    const fetchConversation = async () => {
      setLoadingConversation(true);

      const { data, error } = await supabase
        .from("conversations")
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
          clinic_id,
          conversation_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar conversa:", error);
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

      const ct = (data.conversation_tags as any[]) ?? [];
      const tagsFromConv: UiTag[] = ct
        .map((row) => row?.tags)
        .flat()
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color ?? "#0A84FF",
        }));

      const mappedConversation: Conversation = {
        id: data.id,
        clinicId: (data as any).clinic_id ?? undefined,
        channel: data.channel as Channel,
        status: (data.status as Conversation["status"]) ?? "pending",
        contactName:
          contactRow?.name ?? contactRow?.phone ?? "Contato sem nome",
        contactNumber: contactRow?.phone ?? "",
        lastMessage: last?.text ?? "",
        lastMessageType: (last as any)?.type ?? "text",
        lastTimestamp:
          last?.sent_at ?? data.last_message_at ?? new Date().toISOString(),
        unreadCount: 0,
        tags: tagsFromConv,
        assignedTo: data.assigned_user_id ?? undefined,
      };

      setSelectedTags(tagsFromConv);

      setConversation(mappedConversation);
      setLoadingConversation(false);
    };

    fetchConversation();
  }, [id]);

  useEffect(() => {
    const clinicId = (conversation as any)?.clinicId as string | undefined;
    if (!clinicId) return;

    const fetchClinicTags = async () => {
      setTagsLoading(true);

      const { data, error } = await supabase
        .from("tags")
        .select("id,name,color,clinic_id")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (!error) {
        const mapped: UiTag[] = ((data as any[]) ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color ?? "#0A84FF",
        }));
        setAvailableTags(mapped);
      }

      setTagsLoading(false);
    };

    fetchClinicTags();
  }, [conversation]);

  useEffect(() => {
    if (!conversation?.id) return;

    // carrega 1x
    reloadConversationTags(conversation.id);

    const channel = supabase
      .channel(`rt:conversation_tags:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_tags",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          // sempre que inserir/remover, recarrega do banco (porque o payload não traz tags)
          reloadConversationTags(conversation.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, reloadConversationTags]);

  const handleAcceptConversation = useCallback(async () => {
    if (!id || !authUser) return;

    setAcceptingConversation(true);

    const { error } = await supabase
      .from("conversations")
      .update({ assigned_user_id: authUser.id, status: "open" })
      .eq("id", id);

    if (error) {
      console.error("Erro ao aceitar conversa:", error);
      setAcceptingConversation(false);
      return;
    }

    setConversation((prev) =>
      prev
        ? {
            ...prev,
            assignedTo: authUser.id,
            status: "open",
          }
        : prev
    );
    setAcceptingConversation(false);
  }, [authUser, id]);

  const addTagToConversation = async (
    conversationId: string,
    tagId: string
  ) => {
    const { error } = await supabase
      .from("conversation_tags")
      .insert({ conversation_id: conversationId, tag_id: tagId });

    if (error) throw error;
  };

  const removeTagFromConversation = async (
    conversationId: string,
    tagId: string
  ) => {
    const { error } = await supabase
      .from("conversation_tags")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("tag_id", tagId);

    if (error) throw error;
  };

  const toggleConversationTag = async (tag: UiTag) => {
    if (!conversation?.id) return;

    const isSelected = selectedTags.some((t) => t.id === tag.id);
    setTagsSavingId(tag.id);

    try {
      if (isSelected) {
        await removeTagFromConversation(conversation.id, tag.id);
        setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id));
      } else {
        await addTagToConversation(conversation.id, tag.id);
        setSelectedTags((prev) => [tag, ...prev]);
      }

      // opcional: manter conversation.tag sincronizada com a primeira
      const nextFirst = !isSelected
        ? tag.name
        : selectedTags.filter((t) => t.id !== tag.id)[0]?.name;
      setConversation((prev) =>
        prev ? ({ ...prev, tag: nextFirst as any } as any) : prev
      );
    } finally {
      setTagsSavingId(null);
    }
  };

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

    let bodyText = "";
    let outboundType: "text" | "image" | "audio" | "document" = "text";
    let mediaUrl: string | undefined;
    let mediaMimeType: string | undefined;
    let filename: string | undefined;
    let fileSize: number | undefined;

    if (typeof input === "string") {
      bodyText = input.trim();
      outboundType = "text";
    } else {
      outboundType = input.type;
      bodyText = (input.text ?? "").trim();
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
      author: "atendente",
      text:
        bodyText ||
        (outboundType === "image"
          ? "🖼️ Imagem"
          : outboundType === "audio"
          ? "🎧 Áudio"
          : outboundType === "document"
          ? "📄 Documento"
          : ""),
      createdAt: new Date().toISOString(),
      type: outboundType,
      mediaUrl,
      mediaMimeType,
      filename,
      fileSize,
    };

    setMessages((prev) => [...prev, optimistic]);

    // já rola pro fim ao enviar
    scrollToBottom("smooth");

    const { data, error } = await supabase.functions.invoke(
      "send-whatsapp-message",
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
      console.error("Erro ao enviar mensagem para WhatsApp:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    const inserted = (data as any)?.message;
    if (inserted) {
      if (outboundType === "document" && filename && inserted.id) {
        const { error: filenameError } = await supabase
          .from("messages")
          .update({ filename })
          .eq("id", inserted.id);

        if (filenameError) {
          console.warn(
            "Não foi possível persistir o nome do documento:",
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

      scrollToBottom("smooth");
    }
  };

  if (loadingConversation) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white">
        <p className="text-gray-500">Carregando conversa...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-[#1E1E1E] mb-2">
            Conversa nao encontrada
          </h3>
          <Button variant="primary" onClick={() => navigate("/inbox")}>
            Voltar para Conversas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-white relative">
      <ChatHeader
        conversation={conversation}
        onBack={() => navigate("/inbox")}
        onManageTags={() => setIsManageTagsOpen(true)}
        onAccept={handleAcceptConversation}
        acceptDisabled={
          acceptingConversation ||
          !authUser ||
          conversation.status !== "pending"
        }
      />

      {/* Área de Mensagens */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScrollCheck}
        className="h-full max-h-[70vh] overflow-y-auto p-4 space-y-4"
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
          onClick={() => scrollToBottom("smooth")}
          className="absolute left-1/2 -translate-x-1/2 bottom-44 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#0A84FF] text-white shadow-lg transition-colors hover:bg-[#0066d6]"
          aria-label="Ir para ultima mensagem"
        >
          <ArrowDownIcon className="w-5 h-5" />
        </button>
      )}

      {isManageTagsOpen && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsManageTagsOpen(false)}
          />

          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Gerenciar Etiquetas
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecione as etiquetas que deseja aplicar nesta conversa.
              </p>
            </div>

            <div className="p-5">
              {tagsLoading ? (
                <div className="text-sm text-gray-500">
                  Carregando etiquetas...
                </div>
              ) : availableTags.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Nenhuma etiqueta cadastrada. Crie etiquetas na página{" "}
                  <span
                    onClick={() => navigate("/inbox/tags")}
                    className="font-medium italic cursor-pointer text-blue-500"
                  >
                    Etiquetas
                  </span>
                  .
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((t) => {
                    console.log(t);

                    const active = selectedTags.some((s) => s.id === t.id);
                    const loading = tagsSavingId === t.id;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!!tagsSavingId}
                        onClick={() => toggleConversationTag(t)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${
                          active
                            ? "border-gray-900"
                            : "border-gray-200 hover:border-gray-300"
                        } ${loading ? "opacity-60" : ""}`}
                        style={{
                          backgroundColor: active ? t.color : "transparent",
                          color: active ? "white" : "#374151",
                        }}
                      >
                        {loading ? "Salvando..." : t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setIsManageTagsOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTANTE: o MessageInput agora pode enviar string OU objeto */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};
