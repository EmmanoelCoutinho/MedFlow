import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  createQuickMessage,
  deleteQuickMessage,
  listQuickMessages,
  type QuickMessage,
  updateQuickMessage,
} from "../services/quickMessages";

type UseQuickMessagesOptions = {
  enabled?: boolean;
};

export const useQuickMessages = (
  clinicId: string | null,
  options: UseQuickMessagesOptions = {},
) => {
  const enabled = options.enabled ?? true;
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuickMessages = useCallback(async () => {
    if (!clinicId || !enabled) {
      setQuickMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listQuickMessages(clinicId);
      setQuickMessages(data);
    } catch (err: any) {
      setQuickMessages([]);
      setError(err?.message ?? "Erro ao carregar mensagens rápidas.");
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled]);

  useEffect(() => {
    fetchQuickMessages();
  }, [fetchQuickMessages]);

  useEffect(() => {
    if (!clinicId || !enabled) return;

    const channel = supabase
      .channel(`quick-messages:${clinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quick_messages",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          fetchQuickMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, enabled, fetchQuickMessages]);

  const handleCreateQuickMessage = useCallback(
    async (message: string) => {
      if (!clinicId) throw new Error("Empresa não identificada.");

      setSaving(true);
      try {
        const created = await createQuickMessage({ clinicId, message });
        setQuickMessages((prev) => [created, ...prev]);
        return created;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  const handleUpdateQuickMessage = useCallback(
    async (id: string, message: string) => {
      if (!clinicId) throw new Error("Empresa não identificada.");

      setSaving(true);
      try {
        const updated = await updateQuickMessage({ clinicId, id, message });
        setQuickMessages((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  const handleDeleteQuickMessage = useCallback(
    async (id: string) => {
      if (!clinicId) throw new Error("Empresa não identificada.");

      setSaving(true);
      try {
        await deleteQuickMessage({ clinicId, id });
        setQuickMessages((prev) => prev.filter((item) => item.id !== id));
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return {
    quickMessages,
    loading,
    saving,
    error,
    refetch: fetchQuickMessages,
    createQuickMessage: handleCreateQuickMessage,
    updateQuickMessage: handleUpdateQuickMessage,
    deleteQuickMessage: handleDeleteQuickMessage,
  };
};
