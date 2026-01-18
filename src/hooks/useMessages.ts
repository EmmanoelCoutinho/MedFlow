"use client";

import { useCallback, useEffect, useState } from "react";
import type { Message as UiMessage } from "../types";
import { supabase } from "../lib/supabaseClient";

type DbMessage = {
  id: string;
  conversation_id: string;
  direction?: "inbound" | "outbound" | string | null;
  text?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  sender?: string | null;
  type?: string | null;
  payload?: any;
  media_url?: string | null;
  image_url?: string | null;
  media_mime_type?: string | null;
  caption?: string | null;
  filename?: string | null;
};

const safeParsePayload = (raw: any) => {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw ?? {};
};

const getMediaData = (payload: any) => {
  const baseCandidates = [
    payload,
    payload?.message,
    payload?.messages?.[0],
    payload?.data,
    payload?.value,
    payload?.entry?.[0]?.changes?.[0]?.value,
  ].filter(Boolean);

  const candidates: any[] = [];
  baseCandidates.forEach((c) => {
    candidates.push(c);
    if (c?.message) candidates.push(c.message);
    if (Array.isArray(c?.messages) && c.messages.length > 0) {
      candidates.push(c.messages[0]);
    }
  });

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.image) return { type: "image", data: candidate.image };
    if (candidate.audio) return { type: "audio", data: candidate.audio };
    if (candidate.sticker) return { type: "sticker", data: candidate.sticker };
    if (candidate.video) return { type: "video", data: candidate.video };
    if (candidate.document)
      return { type: "document", data: candidate.document };
  }
  return { type: undefined, data: undefined };
};

export const mapDbMessage = (row: DbMessage): UiMessage => {
  const payload = safeParsePayload(row?.payload);
  const mediaInfo = getMediaData(payload);

  const type = row?.type ?? mediaInfo.type ?? (payload as any)?.type;

  // Estrutura da Meta (messages[0])
  const waMessage = Array.isArray(payload?.messages)
    ? payload.messages[0]
    : undefined;

  // PRIORIDADE: URL do Storage (image_url / media_url).
  // Só se não tiver, usa a url bruta da Meta (lookaside).
  const mediaUrl =
    row.image_url ??
    row.media_url ??
    mediaInfo.data?.url ??
    waMessage?.image?.url ??
    waMessage?.audio?.url ??
    waMessage?.video?.url ??
    waMessage?.document?.url ??
    undefined;

  const mediaMimeType =
    row.media_mime_type ?? mediaInfo.data?.mime_type ?? undefined;

  const caption =
    waMessage?.image?.caption ??
    waMessage?.document?.caption ??
    (mediaInfo.data as any)?.caption ??
    row?.caption ??
    null;

  const filename =
    row.filename ?? // ✅ PRIORIDADE: vem do seu DB (principal p/ outbound)
    waMessage?.document?.filename ??
    (mediaInfo.data as any)?.filename ??
    (mediaInfo.data as any)?.name ??
    (payload as any)?.document?.filename ??
    undefined;

  const fileSize =
    waMessage?.document?.file_size ??
    (mediaInfo.data as any)?.file_size ??
    (payload as any)?.document?.file_size ??
    undefined;

  const mapped: UiMessage = {
    id: row.id,
    conversationId: row.conversation_id,
    author: row.direction === "inbound" ? "cliente" : "atendente",
    text: row.text ?? caption ?? "",
    type,
    mediaUrl: mediaUrl ?? undefined,
    mediaMimeType: mediaMimeType ?? undefined,
    filename: filename ?? undefined,
    fileSize: fileSize ?? undefined,
    payload,
    createdAt: row.sent_at ?? row.created_at ?? new Date().toISOString(),
  };

  return mapped;
};

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
          id,
          conversation_id,
          direction,
          text,
          sent_at,
          created_at,
          sender,
          type,
          payload,
          image_url,
          media_url,
          media_mime_type,
          filename
        `,
      )
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => mapDbMessage(row as DbMessage));

    setMessages(mapped);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = mapDbMessage(payload.new as DbMessage);
          setMessages((current) => {
            if (current.some((m) => m.id === newMsg.id)) return current;
            return [...current, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error, refetch: fetchMessages, setMessages };
}
