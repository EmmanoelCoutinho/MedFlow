import { useCallback, useEffect, useState } from "react";
import {
  cancelCampaign,
  createCampaign,
  getCampaignById,
  getCampaigns,
  updateCampaign,
} from "../api/campaigns";
import type {
  CampaignWithTemplate,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "../types/campaigns";

type UseCampaignOptions = {
  enabled?: boolean;
};

export const useCampaigns = (
  clinicId: string | null,
  options: UseCampaignOptions = {},
) => {
  const enabled = options.enabled ?? true;
  const [campaigns, setCampaigns] = useState<CampaignWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!clinicId || !enabled) {
      setCampaigns([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCampaigns(clinicId);
      setCampaigns(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar campanhas.";
      setCampaigns([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreateCampaign = useCallback(
    async (input: CreateCampaignInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");

      setSaving(true);
      try {
        const created = await createCampaign(clinicId, input);
        setCampaigns((current) => [created, ...current]);
        return created;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  const handleUpdateCampaign = useCallback(
    async (id: string, input: UpdateCampaignInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");

      setSaving(true);
      try {
        const updated = await updateCampaign(clinicId, id, input);
        setCampaigns((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  const handleCancelCampaign = useCallback(
    async (id: string) => {
      if (!clinicId) throw new Error("Clínica não identificada.");

      setSaving(true);
      try {
        const cancelled = await cancelCampaign(clinicId, id);
        setCampaigns((current) =>
          current.map((item) => (item.id === cancelled.id ? cancelled : item)),
        );
        return cancelled;
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return {
    campaigns,
    loading,
    saving,
    error,
    refetch,
    createCampaign: handleCreateCampaign,
    updateCampaign: handleUpdateCampaign,
    cancelCampaign: handleCancelCampaign,
  };
};

export const useCampaign = (
  clinicId: string | null,
  id: string | null,
  options: UseCampaignOptions = {},
) => {
  const enabled = (options.enabled ?? true) && Boolean(id);
  const [campaign, setCampaign] = useState<CampaignWithTemplate | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!clinicId || !id || !enabled) {
      setCampaign(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCampaignById(clinicId, id);
      setCampaign(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar campanha.";
      setCampaign(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled, id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    campaign,
    loading,
    error,
    refetch,
  };
};

export const useCreateCampaign = (clinicId: string | null) => {
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (input: CreateCampaignInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");
      setSaving(true);
      try {
        return await createCampaign(clinicId, input);
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return { createCampaign: mutate, saving };
};

export const useUpdateCampaign = (clinicId: string | null) => {
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (id: string, input: UpdateCampaignInput) => {
      if (!clinicId) throw new Error("Clínica não identificada.");
      setSaving(true);
      try {
        return await updateCampaign(clinicId, id, input);
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return { updateCampaign: mutate, saving };
};

export const useCancelCampaign = (clinicId: string | null) => {
  const [saving, setSaving] = useState(false);

  const mutate = useCallback(
    async (id: string) => {
      if (!clinicId) throw new Error("Clínica não identificada.");
      setSaving(true);
      try {
        return await cancelCampaign(clinicId, id);
      } finally {
        setSaving(false);
      }
    },
    [clinicId],
  );

  return { cancelCampaign: mutate, saving };
};
