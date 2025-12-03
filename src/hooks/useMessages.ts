"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound" | string;
  text: string | null;
  sent_at: string | null;
  sender: string | null;
};

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchMessages = async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, direction, text, sent_at, sender")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    setMessages((data ?? []) as Message[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

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
          const newMsg = payload.new as Message;
          setMessages((current) => [...current, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error, refetch: fetchMessages };
}
