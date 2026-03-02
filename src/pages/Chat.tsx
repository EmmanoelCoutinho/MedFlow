import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useClinic } from "../contexts/ClinicContext";
import type { Conversation, Message, Channel } from "../types";
import { useMessages, mapDbMessage } from "../hooks/useMessages";
import { useConversationEvents } from "../hooks/useConversationEvents";
import { persistConversationOpenedAt } from "../hooks/useConversations";
import { Button } from "../components/ui/Button";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageBubble } from "../components/chat/MessageBubble";
import { SystemEventBubble } from "../components/chat/SystemEventBubble";
import { MessageInput } from "../components/chat/MessageInput";
import { ArrowDownIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { TransferModal } from "../components/chat/TransferModal";

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

type LocalSendStatus = "sending" | "failed" | "sent";

type LocalPayload = {
  type: "text" | "image" | "audio" | "document";
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  filename?: string;
  fileSize?: number;
};

type LocalMessageMeta = {
  localStatus?: LocalSendStatus;
  localError?: string | null;
  localPayload?: LocalPayload;
};

function getMediaPreviewText(
  type: "text" | "image" | "audio" | "document",
  filename?: string,
): string {
  switch (type) {
    case "image":
      return "Imagem";
    case "audio":
      return "Áudio";
    case "document":
      return filename ?? "Documento";
    default:
      return "";
  }
}

const HOURS_24_MS = 24 * 60 * 60 * 1000;

function getLastInboundClientAt(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.direction === "inbound") return m.createdAt;
  }
  return null;
}

function isInside24hWindow(lastInboundAtIso: string | null) {
  if (!lastInboundAtIso) return false;
  const last = new Date(lastInboundAtIso).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last <= HOURS_24_MS;
}

function get24hBlockMessage(channel: Channel) {
  if (channel === "whatsapp") {
    return "Não foi possível enviar: no WhatsApp, após 24h da última mensagem do cliente, só é permitido enviar mensagens por template aprovado.";
  }

  return "Não foi possível enviar: essa conversa está fora da janela de atendimento. Envie um template (quando aplicável) ou aguarde o cliente responder.";
}

function getSendFunctionName(channel: Channel) {
  return channel === "whatsapp"
    ? "send-whatsapp-message"
    : channel === "messenger" || channel === "instagram"
      ? "send-meta-message"
      : null;
}

function normalizeInput(input: SendableInput) {
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

  return {
    bodyText,
    outboundType,
    mediaUrl,
    mediaMimeType,
    filename,
    fileSize,
  };
}

export const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const { clinicId, membership } = useClinic();
  const departmentId = membership?.department_id ?? null;

  const didInitialConversationLoadRef = useRef(false);
  const [refreshingConversation, setRefreshingConversation] = useState(false);

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
  const [closingConversation, setClosingConversation] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferringConversation, setTransferringConversation] =
    useState(false);

  const {
    messages,
    loading: loadingMessages,
    setMessages,
  } = useMessages(id ?? null);

  const {
    events,
    loading: loadingEvents,
    error: eventsError,
  } = useConversationEvents(id ?? null);

  const timelineItems = useMemo(() => {
    const messageItems = messages.map((message) => ({
      kind: "message" as const,
      message,
      sortAt: new Date(message.createdAt).getTime(),
    }));
    const eventItems = events.map((event) => ({
      kind: "event" as const,
      event,
      sortAt: new Date(event.createdAt).getTime(),
    }));

    return [...messageItems, ...eventItems].sort((a, b) => a.sortAt - b.sortAt);
  }, [messages, events]);

  const loadingTimeline = loadingMessages || loadingEvents;

  useEffect(() => {
    setShowScrollToBottom(false);
    justOpenedRef.current = true;
  }, [id]);

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

  useLayoutEffect(() => {
    if (loadingTimeline) return;
    if (!timelineItems.length) return;
    if (!justOpenedRef.current) return;

    justOpenedRef.current = false;

    scrollToBottom("auto");

    setTimeout(() => {
      scrollToBottom("auto");
    }, 0);

    setTimeout(() => {
      scrollToBottom("auto");
    }, 100);
  }, [loadingTimeline, timelineItems.length, scrollToBottom]);

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
      .map((r) => (r as any).tags)
      .flat()
      .filter(Boolean)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color ?? "#0A84FF",
      }));

    setSelectedTags(mapped);

    setConversation((prev) =>
      prev ? ({ ...prev, tag: mapped[0]?.name as any } as any) : prev,
    );
  }, []);

  const loadConversation = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent;

      if (!id) return;
      if (!clinicId || !departmentId) {
        setConversation(null);
        setLoadingConversation(false);
        didInitialConversationLoadRef.current = true;
        return;
      }

      const shouldHardLoad =
        !silent && !didInitialConversationLoadRef.current && !conversation;

      if (shouldHardLoad) setLoadingConversation(true);
      else if (!silent) setRefreshingConversation(true);

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
        department_id,
        conversation_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `,
        )
        .eq("id", id)
        .eq("clinic_id", clinicId)
        .eq("department_id", departmentId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar conversa:", error);
        setLoadingConversation(false);
        setRefreshingConversation(false);
        didInitialConversationLoadRef.current = true;
        return;
      }

      if (!data) {
        setConversation(null);
        setLoadingConversation(false);
        setRefreshingConversation(false);
        didInitialConversationLoadRef.current = true;
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

      const rawContacts: any = (data as any).contacts;
      const contactRow = Array.isArray(rawContacts)
        ? rawContacts[0]
        : rawContacts;

      const ct = ((data as any).conversation_tags as any[]) ?? [];
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
        id: (data as any).id,
        clinicId: (data as any).clinic_id ?? undefined,
        channel: (data as any).channel as Channel,
        status: ((data as any).status as Conversation["status"]) ?? "pending",
        contactName:
          contactRow?.name ?? contactRow?.phone ?? "Contato sem nome",
        contactNumber: contactRow?.phone ?? "",
        lastMessage: last?.text ?? "",
        lastMessageType: (last as any)?.type ?? "text",
        lastTimestamp:
          last?.sent_at ??
          (data as any).last_message_at ??
          new Date().toISOString(),
        unreadCount: 0,
        tags: tagsFromConv,
        assignedTo: (data as any).assigned_user_id ?? undefined,
      };

      setSelectedTags(tagsFromConv);
      setConversation(mappedConversation);

      setLoadingConversation(false);
      setRefreshingConversation(false);
      didInitialConversationLoadRef.current = true;
    },
    [id, clinicId, departmentId, conversation],
  );

  useEffect(() => {
    handleScrollCheck();
  }, [timelineItems.length, handleScrollCheck]);

  useEffect(() => {
    if (loadingTimeline || timelineItems.length === 0) return;
    scrollToBottom("auto");
  }, [loadingTimeline, timelineItems.length, scrollToBottom]);

  useEffect(() => {
    const onWindowScroll = () => handleScrollCheck();
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", onWindowScroll);
  }, [handleScrollCheck]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    const cid = (conversation as any)?.clinicId as string | undefined;
    if (!cid) return;

    const fetchClinicTags = async () => {
      setTagsLoading(true);

      const { data, error } = await supabase
        .from("tags")
        .select("id,name,color,clinic_id")
        .eq("clinic_id", cid)
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
    if (!id) return;

    const channel = supabase
      .channel(`rt:conversations:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${id}`,
        },
        () => {
          loadConversation({ silent: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadConversation]);

  useEffect(() => {
    if (!conversation?.id) return;

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
        () => reloadConversationTags(conversation.id),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, reloadConversationTags]);

  const handleAcceptConversation = useCallback(async () => {
    if (!id) return;

    setAcceptingConversation(true);

    const { data, error } = await supabase.functions.invoke(
      "accept-conversation",
      {
        body: { conversationId: id },
      },
    );

    if (error) {
      console.error("Erro ao aceitar conversa:", error);
      setAcceptingConversation(false);
      return;
    }

    const updated = (data as any)?.conversation;
    if (updated) {
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              assignedTo: updated.assigned_user_id ?? undefined,
            }
          : prev,
      );
    }

    await loadConversation();
    setAcceptingConversation(false);
  }, [id, loadConversation]);

  const handleCloseConversation = useCallback(async () => {
    if (!id) return;

    setClosingConversation(true);

    const { data, error } = await supabase.functions.invoke(
      "close-conversation",
      {
        body: { conversationId: id },
      },
    );

    if (error) {
      console.error("Erro ao finalizar conversa:", error);
      setClosingConversation(false);
      return;
    }

    const updated = (data as any)?.conversation;
    if (updated) {
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              assignedTo: updated.assigned_user_id ?? undefined,
            }
          : prev,
      );
    }

    await loadConversation();
    setClosingConversation(false);

    navigate("/inbox");
  }, [id, loadConversation, navigate]);

  const handleTransferConversation = useCallback(
    async (target: { departmentId: string }) => {
      if (!id) return;
      if (!target.departmentId) return;

      setTransferringConversation(true);

      const { data, error } = await supabase.functions.invoke(
        "transfer-conversation",
        {
          body: {
            conversationId: id,
            toDepartmentId: target.departmentId,
          },
        },
      );

      console.log(data);

      if (error) {
        console.error("Erro ao transferir conversa:", error);
        setTransferringConversation(false);
        return;
      }

      setIsTransferOpen(false);
      setTransferringConversation(false);

      navigate("/inbox");
    },
    [id, navigate],
  );

  const addTagToConversation = async (
    conversationId: string,
    tagId: string,
  ) => {
    const { error } = await supabase
      .from("conversation_tags")
      .insert({ conversation_id: conversationId, tag_id: tagId });

    if (error) throw error;
  };

  const removeTagFromConversation = async (
    conversationId: string,
    tagId: string,
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

      const nextFirst = !isSelected
        ? tag.name
        : selectedTags.filter((t) => t.id !== tag.id)[0]?.name;
      setConversation((prev) =>
        prev ? ({ ...prev, tag: nextFirst as any } as any) : prev,
      );
    } finally {
      setTagsSavingId(null);
    }
  };

  useEffect(() => {
    if (!id || loadingMessages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const ts = lastMessage?.createdAt
      ? new Date(lastMessage.createdAt).getTime()
      : Date.now();

    persistConversationOpenedAt(id, ts || Date.now());
  }, [id, messages, loadingMessages]);

  const canReply = useMemo(() => {
    if (!authUser || !conversation) return false;

    if (conversation.assignedTo) {
      return conversation.assignedTo === authUser.id;
    }

    return !!departmentId;
  }, [authUser, conversation, departmentId]);

  const createSendNonce = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase.functions.invoke(
      "create-send-nonce",
      {
        body: { conversationId },
      },
    );

    if (error) {
      console.error("create-send-nonce error:", error);
      throw error;
    }

    const nonce = (data as any)?.nonce ?? null;
    if (!nonce) {
      throw new Error("create-send-nonce não retornou nonce");
    }

    return nonce as string;
  }, []);

  const markLocalMessage = useCallback(
    (tempId: string, patch: Partial<LocalMessageMeta>) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? ({ ...m, ...(patch as any) } as any) : m,
        ),
      );
    },
    [setMessages],
  );

  const sendNow = useCallback(
    async (opts: {
      tempId: string;
      input: SendableInput;
      isRetry?: boolean;
    }) => {
      if (!id) return;
      if (!conversation?.channel) return;
      if (!canReply) return;

      const { tempId, input } = opts;

      const lastInboundAt = getLastInboundClientAt(messages);
      const canSend = isInside24hWindow(lastInboundAt);

      if (!canSend) {
        // mantém a mensagem e marca como falha (não some)
        markLocalMessage(tempId, {
          localStatus: "failed",
          localError: get24hBlockMessage(conversation.channel),
        });

        toast.info(get24hBlockMessage(conversation.channel), {
          autoClose: 4500,
        });
        return;
      }

      const {
        bodyText,
        outboundType,
        mediaUrl,
        mediaMimeType,
        filename,
        fileSize,
      } = normalizeInput(input);

      if (!bodyText && !mediaUrl) {
        markLocalMessage(tempId, {
          localStatus: "failed",
          localError: "Nada para enviar.",
        });
        return;
      }

      const functionName = getSendFunctionName(conversation.channel);
      if (!functionName) {
        markLocalMessage(tempId, {
          localStatus: "failed",
          localError: "Canal não suportado para envio.",
        });
        return;
      }

      // marca como enviando
      markLocalMessage(tempId, { localStatus: "sending", localError: null });

      let nonce: string;
      try {
        nonce = await createSendNonce(id);
      } catch (e: any) {
        console.error("Falha ao gerar nonce:", e);
        markLocalMessage(tempId, {
          localStatus: "failed",
          localError: "Falha ao preparar envio. Reenviar.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          nonce,
          conversationId: id,
          text: bodyText,
          type: outboundType,
          mediaUrl,
          mediaMimeType,
          filename,
          fileSize,
        },
      });

      if (error) {
        console.error(`Erro ao enviar mensagem (${functionName}):`, error);
        markLocalMessage(tempId, {
          localStatus: "failed",
          localError: "Falha ao enviar. Reenviar.",
        });
        toast.error("Não foi possível enviar a mensagem.");
        return;
      }

      const inserted = (data as any)?.message;
      if (!inserted) {
        markLocalMessage(tempId, {
          localStatus: "failed",
          localError: "Envio não retornou confirmação. Reenviar.",
        });
        return;
      }

      // documento: persist filename se necessário
      if (outboundType === "document" && filename && inserted.id) {
        const { error: filenameError } = await supabase
          .from("messages")
          .update({ filename })
          .eq("id", inserted.id);

        if (filenameError) {
          console.warn("Persist filename failed:", filenameError);
        }
      }

      const persisted: Message = mapDbMessage(inserted);

      const optimistic = messages.find((m) => m.id === tempId) as
        | (Message & LocalMessageMeta)
        | undefined;

      const merged: Message = {
        ...persisted,
        filename: persisted.filename ?? optimistic?.filename,
        fileSize: persisted.fileSize ?? optimistic?.fileSize,
        mediaUrl: persisted.mediaUrl ?? optimistic?.mediaUrl,
        mediaMimeType: persisted.mediaMimeType ?? optimistic?.mediaMimeType,
        text:
          persisted.text ||
          getMediaPreviewText(outboundType, optimistic?.filename),
      };

      // substitui o local pela persistida (sem “piscar”)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const idx = withoutTemp.findIndex((m) => m.id === merged.id);
        if (idx >= 0) {
          const next = [...withoutTemp];
          next[idx] = { ...next[idx], ...merged };
          return next;
        }
        return [...withoutTemp, merged];
      });

      scrollToBottom("smooth");
    },
    [
      id,
      conversation?.channel,
      canReply,
      messages,
      createSendNonce,
      markLocalMessage,
      setMessages,
      scrollToBottom,
      conversation,
    ],
  );

  const handleSendMessage = async (input: SendableInput) => {
    if (!id) return;
    if (!conversation?.channel) return;
    if (!canReply) return;

    const {
      bodyText,
      outboundType,
      mediaUrl,
      mediaMimeType,
      filename,
      fileSize,
    } = normalizeInput(input);

    if (!bodyText && !mediaUrl) return;

    const tempId = `local-${Date.now()}`;

    const optimistic: Message & LocalMessageMeta = {
      id: tempId,
      conversationId: id,
      author: "atendente",
      direction: "outbound",
      text: bodyText || getMediaPreviewText(outboundType, filename),
      createdAt: new Date().toISOString(),
      type: outboundType,
      mediaUrl,
      mediaMimeType,
      filename,
      fileSize,

      localStatus: "sending",
      localError: null,
      localPayload: {
        type: outboundType,
        text: bodyText,
        mediaUrl,
        mediaMimeType,
        filename,
        fileSize,
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom("smooth");

    await sendNow({ tempId, input });
  };

  const handleRetryLocalMessage = useCallback(
    async (msg: Message) => {
      const meta = msg as any as LocalMessageMeta;
      if (!meta.localPayload) return;

      await sendNow({
        tempId: msg.id,
        input: meta.localPayload,
        isRetry: true,
      });
    },
    [sendNow],
  );

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
        onClose={handleCloseConversation}
        onRefresh={loadConversation}
        onTransfer={() => setIsTransferOpen(true)}
        acceptDisabled={
          acceptingConversation ||
          !authUser ||
          conversation.status !== "pending"
        }
        closeDisabled={
          closingConversation || !authUser || conversation.status === "closed"
        }
      />

      <div
        ref={messagesContainerRef}
        onScroll={handleScrollCheck}
        className="h-full max-h-[70vh] overflow-y-auto p-4 space-y-4"
      >
        {eventsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Não foi possível carregar os logs do sistema.
          </div>
        )}
        {loadingTimeline ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando mensagens...</p>
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <>
            {timelineItems.map((item) =>
              item.kind === "message" ? (
                <div key={`message-${item.message.id}`} className="space-y-1">
                  <MessageBubble
                    message={item.message}
                    contactName={conversation.contactName}
                    onRetry={handleRetryLocalMessage}
                  />

                  {/* ✅ UI de falha/reenvio SEM mexer no MessageBubble */}
                  {(() => {
                    const m = item.message as any as Message & LocalMessageMeta;
                    const isFailed =
                      m.author === "atendente" && m.localStatus === "failed";
                    const isSending =
                      m.author === "atendente" && m.localStatus === "sending";

                    if (!isFailed && !isSending) return null;

                    return (
                      <div className="flex items-center justify-end gap-2">
                        {isSending && (
                          <span className="text-xs text-gray-400">
                            Enviando...
                          </span>
                        )}

                        {isFailed && (
                          <>
                            <span className="text-xs text-red-600">
                              Não enviada
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetryLocalMessage(m)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              Reenviar
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <SystemEventBubble
                  key={`event-${item.event.id}`}
                  event={item.event}
                />
              ),
            )}
          </>
        )}
      </div>

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

      <TransferModal
        open={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onConfirm={handleTransferConversation}
        loading={transferringConversation}
        clinicId={clinicId}
        currentDepartmentId={departmentId}
      />

      {conversation.status === "open" && (
        <MessageInput onSend={handleSendMessage} disabled={!canReply} />
      )}
    </div>
  );
};
