import { useCallback, useEffect, useState } from "react";
import {
  archiveTemplate,
  createTemplate,
  getTemplateById,
  getTemplates,
  updateTemplate,
} from "../api/templates";
import type {
  CreateMessageTemplateInput,
  MessageTemplate,
  UpdateMessageTemplateInput,
} from "../types/templates";

type UseTemplatesOptions = {
  enabled?: boolean;
};

export const useTemplates = (
  clinicId: string | null,
  options: UseTemplatesOptions = {},
) => {
  const enabled = options.enabled ?? true;
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!clinicId || !enabled) {
      setTemplates([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTemplates(clinicId);
      setTemplates(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar templates.";
      setTemplates([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreateTemplate = useCallback(
    async (input: CreateMessageTemplateInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");

      setSaving(true);
      try {
        const created = await createTemplate(clinicId, input);
        setTemplates((current) => [created, ...current]);
        return created;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  const handleUpdateTemplate = useCallback(
    async (id: string, input: UpdateMessageTemplateInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");

      setSaving(true);
      try {
        const updated = await updateTemplate(clinicId, id, input);
        setTemplates((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  const handleArchiveTemplate = useCallback(
    async (id: string) => {
      if (!clinicId) throw new Error("Clínica não identificada.");

      setSaving(true);
      try {
        const archived = await archiveTemplate(clinicId, id);
        setTemplates((current) =>
          current.map((item) => (item.id === archived.id ? archived : item)),
        );
        return archived;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return {
    templates,
    loading,
    saving,
    error,
    refetch,
    createTemplate: handleCreateTemplate,
    updateTemplate: handleUpdateTemplate,
    archiveTemplate: handleArchiveTemplate,
  };
};

export const useTemplate = (
  clinicId: string | null,
  id: string | null,
  options: UseTemplatesOptions = {},
) => {
  const enabled = (options.enabled ?? true) && Boolean(id);
  const [template, setTemplate] = useState<MessageTemplate | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!clinicId || !id || !enabled) {
      setTemplate(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTemplateById(clinicId, id);
      setTemplate(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar template.";
      setTemplate(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    template,
    loading,
    error,
    refetch,
  };
};

export const useCreateTemplate = (clinicId: string | null) => {
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (input: CreateMessageTemplateInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");
      setSaving(true);
      try {
        return await createTemplate(clinicId, input);
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return { createTemplate: mutate, saving };
};

export const useUpdateTemplate = (clinicId: string | null) => {
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (id: string, input: UpdateMessageTemplateInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");
      setSaving(true);
      try {
        return await updateTemplate(clinicId, id, input);
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return { updateTemplate: mutate, saving };
};

export const useArchiveTemplate = (clinicId: string | null) => {
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (id: string) => {
      if (!clinicId) throw new Error("Clínica não identificada.");
      setSaving(true);
      try {
        return await archiveTemplate(clinicId, id);
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return { archiveTemplate: mutate, saving };
};
