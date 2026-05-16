import { useCallback, useEffect, useState } from "react";
import { getCampaignRecipients } from "../api/recipients";
import type { CampaignRecipient } from "../types/recipients";

type UseCampaignRecipientsOptions = {
  enabled?: boolean;
};

export const useCampaignRecipients = (
  clinicId: string | null,
  campaignId: string | null,
  options: UseCampaignRecipientsOptions = {},
) => {
  const enabled = (options.enabled ?? true) && Boolean(campaignId);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!clinicId || !campaignId || !enabled) {
      setRecipients([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCampaignRecipients(clinicId, campaignId);
      setRecipients(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar destinatários.";
      setRecipients([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, clinicId, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    recipients,
    loading,
    error,
    refetch,
  };
};
