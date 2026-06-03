import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Campaign {
  id: string;
  created_at: string;
  message: string;
  target_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_targets: number;
  sent_count?: number;
}

export interface QueueItem {
  id: string;
  phone_text: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  sent_at: string | null;
}

export function useCampaignStatus() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca a lista de todas as campanhas e calcula o progresso de envios concluídos
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mass_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const campaignsWithProgress = await Promise.all(
        (data || []).map(async (camp) => {
          const { count } = await supabase
            .from("mass_messages_queue")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", camp.id)
            .eq("status", "sent");

          return {
            ...camp,
            sent_count: count || 0,
          };
        })
      );

      setCampaigns(campaignsWithProgress);
    } catch (err) {
      console.error("Erro ao buscar campanhas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega a fila de destinatários de uma campanha específica para o relatório
  const getCampaignDetails = async (campaignId: string) => {
    const { data, error } = await supabase
      .from("mass_messages_queue")
      .select("id, phone_text, status, error_message, sent_at")
      .eq("campaign_id", campaignId);

    if (error) throw error;
    return data as QueueItem[];
  };

  // Cancela a campanha mudando o status e limpando registros que ainda estavam em espera ('pending')
  const cancelCampaign = async (campaignId: string) => {
    try {
      const { error: campError } = await supabase
        .from("mass_campaigns")
        .update({ status: "cancelled" })
        .eq("id", campaignId);

      if (campError) throw campError;

      const { error: queueError } = await supabase
        .from("mass_messages_queue")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("status", "pending");

      if (queueError) throw queueError;

      return { success: true };
    } catch (err) {
      console.error("Erro ao cancelar campanha:", err);
      throw err;
    }
  };

  // Deleta o histórico da campanha por completo (A fila apaga junta via ON DELETE CASCADE no banco)
  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("mass_campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Erro ao deletar campanha:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return { 
    campaigns, 
    loading, 
    refresh: fetchCampaigns, 
    getCampaignDetails, 
    cancelCampaign, 
    deleteCampaign 
  };
}