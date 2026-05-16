import { useCallback, useEffect, useState } from "react";
import {
  resolveAudience,
  type ResolveAudienceType,
} from "../utils/resolveAudience";

type UseAudiencePreviewInput = {
  audienceType: ResolveAudienceType;
  audienceFilters: Record<string, unknown>;
};

type UseAudiencePreviewOptions = {
  enabled?: boolean;
};

export const useAudiencePreview = (
  clinicId: string | null,
  input: UseAudiencePreviewInput,
  options: UseAudiencePreviewOptions = {},
) => {
  const enabled = options.enabled ?? true;
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!clinicId || !enabled) {
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contacts = await resolveAudience({
        clinicId,
        audienceType: input.audienceType,
        audienceFilters: input.audienceFilters,
      });
      setCount(contacts.length);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao estimar o público.";
      setCount(0);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, enabled, input.audienceFilters, input.audienceType]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    count,
    loading,
    error,
    refetch,
  };
};
