"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Conversation, Channel, Tag } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useClinic } from "../contexts/ClinicContext";

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

const LAST_OPENED_STORAGE_KEY = "conversation-last-opened";

const readLastOpenedAt = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAST_OPENED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const writeLastOpenedAt = (map: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_OPENED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore write errors (ex: storage disabled)
  }
};

export const persistConversationOpenedAt = (
  conversationId: string,
  timestamp = Date.now(),
) => {
  const current = readLastOpenedAt();
  const next = { ...current, [conversationId]: timestamp };
  writeLastOpenedAt(next);
  return next;
};

export function useConversations(options: UseConversationsOptions = {}) {
  const { authUser, loading: authLoading } = useAuth();
  const { clinicId, membership } = useClinic();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [lastOpenedAt, setLastOpenedAt] = useState<Record<string, number>>(() =>
    readLastOpenedAt(),
  );
  const lastOpenedAtRef = useRef(lastOpenedAt);
  const lastRefetchAtRef = useRef(0);
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastOpenedAtRef.current = lastOpenedAt;
  }, [lastOpenedAt]);

  const parsePayload = (raw: any) => {
    if (!raw) return {};
    if (typeof raw === "string") {
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
    payload?: any,
  ): Conversation["lastMessageType"] => {
    const parsedPayload = payload ?? parsePayload(msg?.payload);
    const directType = msg?.type ?? parsedPayload?.type;
    const candidate =
      parsedPayload?.message ?? parsedPayload?.messages?.[0] ?? parsedPayload;

    const hasMedia = (key: string) =>
      directType === key ||
      candidate?.[key] ||
      parsedPayload?.[key] ||
      parsedPayload?.data?.[key];

    if (hasMedia("image")) return "image";
    if (hasMedia("audio")) return "audio";
    if (hasMedia("sticker")) return "sticker";
    if (hasMedia("video")) return "video";
    if (hasMedia("document")) return "document";

    if (directType) return directType as Conversation["lastMessageType"];
    return "text";
  };

  const getPreview = (msg?: {
    text: string | null;
    type?: string | null;
    payload?: any;
  }) => {
    if (!msg) {
      return { text: "", type: "text" as Conversation["lastMessageType"] };
    }

    const payload = parsePayload(msg.payload);
    const kind = detectMediaType(msg, payload);
    const text = msg.text ?? "";

    const fallback =
      kind === "image"
        ? "Imagem"
        : kind === "audio"
          ? "Audio"
          : kind === "sticker"
            ? "Figurinha"
            : kind === "video"
              ? "Video"
              : kind === "document"
                ? "Documento"
                : "Mensagem";

    return {
      text: text || fallback,
      type: kind,
    };
  };

  const getAccessibleDepartmentIds = useCallback(async (): Promise<
    string[]
  > => {
    if (!clinicId || !authUser) return [];

    // 1) tenta multi-setor via department_members
    const { data, error } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("clinic_user_id", authUser.id);

    if (!error) {
      const ids = (data ?? []).map((r: any) => r.department_id).filter(Boolean);

      if (ids.length > 0) return ids;
    }

    // 2) fallback: setor principal do membership (single)
    return membership?.department_id ? [membership.department_id] : [];
  }, [authUser, clinicId, membership?.department_id]);

  const fetchConversations = useCallback(async () => {
    if (!authUser) {
      setConversations([]);
      setLoading(false);
      return;
    }

    if (!clinicId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const accessibleDepartmentIds = await getAccessibleDepartmentIds();
    if (accessibleDepartmentIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const baseSelect = `
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
      tag_id,
      tags (
        id,
        name,
        color
      )
    )
  `;

    const makeBase = () =>
      supabase
        .from("conversations")
        .select(baseSelect)
        .eq("clinic_id", clinicId)
        .in("department_id", accessibleDepartmentIds)
        .neq("status", "closed")
        .order("last_message_at", { ascending: false });

    // filtro opcional de canal
    const applyChannel = (q: any) =>
      options.channel ? q.eq("channel", options.channel) : q;

    try {
      let data: any[] = [];

      // Se a tela passar status explicitamente, respeita.
      if (options.status) {
        let q = applyChannel(makeBase()).eq("status", options.status);

        // regra: open sempre atribuída ao usuário logado
        if (options.status === "open") {
          q = q.eq("assigned_user_id", authUser.id);
        }

        // (opcional) pending só não atribuídas:
        // if (options.status === "pending") q = q.is("assigned_user_id", null);

        const res = await q;
        if (res.error) throw res.error;
        data = res.data ?? [];
      } else {
        // padrão: retorna open atribuídas + pending dos setores acessíveis
        const [openRes, pendingRes] = await Promise.all([
          applyChannel(makeBase())
            .eq("status", "open")
            .eq("assigned_user_id", authUser.id),

          applyChannel(makeBase()).eq("status", "pending"),
          // (opcional) só não atribuídas:
          // .is("assigned_user_id", null),
        ]);

        if (openRes.error) throw openRes.error;
        if (pendingRes.error) throw pendingRes.error;

        // merge sem duplicar
        const map = new Map<string, any>();
        (openRes.data ?? []).forEach((r: any) => map.set(r.id, r));
        (pendingRes.data ?? []).forEach((r: any) => map.set(r.id, r));
        data = Array.from(map.values());

        // ordena por last_message_at desc
        data.sort(
          (a, b) =>
            new Date(b.last_message_at ?? 0).getTime() -
            new Date(a.last_message_at ?? 0).getTime(),
        );
      }

      // ✅ daqui pra baixo pode manter seu mapping EXATAMENTE como está hoje
      const mapped: Conversation[] =
        data?.map((row: any) => {
          // ... SEU MAPPING ATUAL (messages, preview, tags, unreadCount etc)
          // (mantém tudo igual)
          const messages = (row.messages as any[]) ?? [];

          const last = messages
            .slice()
            .sort(
              (a, b) =>
                new Date(b.sent_at ?? 0).getTime() -
                new Date(a.sent_at ?? 0).getTime(),
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

          const ct = (row.conversation_tags as any[]) ?? [];
          const tags: Tag[] = ct
            .map((x) => x.tags)
            .flat()
            .filter(Boolean)
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              color: t.color ?? "#0A84FF",
            }));

          const lastTime = new Date(
            last?.sent_at ?? row.last_message_at ?? 0,
          ).getTime();
          const openedAt = lastOpenedAtRef.current[row.id];
          const isUnread =
            last?.direction === "inbound" && (!openedAt || lastTime > openedAt);

          return {
            id: row.id,
            channel: row.channel as Channel,
            status: row.status,

            contactName:
              contactRow?.name ?? contactRow?.phone ?? "Contato sem nome",
            contactNumber: contactRow?.phone ?? "",
            contactAvatar: contactAvatar ?? undefined,

            lastMessage: preview.text,
            lastMessageType: preview.type,
            lastTimestamp: last?.sent_at ?? row.last_message_at ?? "",
            unreadCount: isUnread ? 1 : 0,

            tags,
            assignedTo: row.assigned_user_id ?? undefined,
          };
        }) ?? [];

      setConversations(mapped);
    } catch (err: any) {
      console.error("Erro ao buscar conversas:", err);
      setError(err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [
    authUser,
    clinicId,
    getAccessibleDepartmentIds,
    options.status,
    options.channel,
  ]);

  const scheduleRefetch = useCallback(() => {
    const cooldownMs = 2500;
    const now = Date.now();
    const elapsed = now - lastRefetchAtRef.current;

    if (elapsed >= cooldownMs) {
      lastRefetchAtRef.current = now;
      fetchConversations();
      return;
    }

    if (refetchTimeoutRef.current) {
      return;
    }

    refetchTimeoutRef.current = setTimeout(() => {
      lastRefetchAtRef.current = Date.now();
      refetchTimeoutRef.current = null;
      fetchConversations();
    }, cooldownMs - elapsed);
  }, [fetchConversations]);

  useEffect(() => {
    if (!authUser) return;

    const reloadTagForConversation = async (conversationId: string) => {
      // busca as tags atuais da conversa (join)
      const { data, error } = await supabase
        .from("conversation_tags")
        .select("tags(id,name,color)")
        .eq("conversation_id", conversationId);

      if (error) {
        console.warn("[RT] erro ao recarregar tags:", error);
        return;
      }

      const tags: Tag[] = ((data as any[]) ?? [])
        .map((r) => r.tags)
        .flat()
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color ?? "#0A84FF",
        }));

      setConversations((current) => {
        const idx = current.findIndex((c) => c.id === conversationId);
        if (idx === -1) {
          scheduleRefetch();
          return current;
        }

        const clone = [...current];
        clone[idx] = { ...clone[idx], tags };
        return clone;
      });
    };

    const channel = supabase
      .channel("inbox-conversation-tags-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_tags" },
        (payload) => {
          const conversationId =
            (payload.new as any)?.conversation_id ??
            (payload.old as any)?.conversation_id;

          if (!conversationId) return;

          console.log("[RT] tags alteradas na conversa", conversationId);
          reloadTagForConversation(conversationId);
        },
      )
      .subscribe((status) => {
        console.log("[RT] conversation_tags channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, scheduleRefetch]);

  // carregamento inicial + quando mudar filtro (status/canal)
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    fetchConversations();
  }, [authLoading, fetchConversations]);

  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  // realtime focado em messages (igual o useMessages, mas atualizando a lista)
  useEffect(() => {
    if (!authUser) {
      return;
    }

    const channel = supabase
      .channel("inbox-conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          // se quiser deixar mais parecido ainda com o useMessages,
          // voce poderia depois colocar um filter aqui, mas nao e obrigatorio:
          // filter: '...',
        },
        (payload) => {
          const msg = payload.new as DbMessage;
          if (!msg) return;

          console.log("[RT] nova mensagem para conversa", msg.conversation_id);

          setConversations((current) => {
            const idx = current.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) {
              // conversa nao esta na lista (pode nao ser "open" ou nao bater o filtro)
              scheduleRefetch();
              return current;
            }

            const old = current[idx];

            const isInbound = msg.direction === "inbound";

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
                new Date(a.lastTimestamp ?? 0).getTime(),
            );

            return clone;
          });
        },
      )
      .subscribe((status) => {
        console.log("[RT] conversations channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, lastOpenedAt, scheduleRefetch]);

  const markAsRead = useCallback((conversationId: string) => {
    const now = Date.now();
    setLastOpenedAt((current) => {
      const next = { ...current, [conversationId]: now };
      writeLastOpenedAt(next);
      return next;
    });
    setConversations((current) =>
      current.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
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
