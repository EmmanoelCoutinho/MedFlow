import { useState } from "react";
// Importa diretamente do seu arquivo cliente oficial existente
import { supabase } from "../lib/supabaseClient"; 

export function useMassMessages() {
  const [loading, setLoading] = useState(false);

  const triggerMassCampaign = async (params: {
    targetType: "all" | "tags" | "departments";
    selectedIds: string[];
    messageTemplate: string;
  }) => {
    setLoading(true);
    try {
      // 1. Buscar os contatos corretos com base no filtro
      let query = supabase.from("contacts").select("id, name, phone"); 

      if (params.targetType === "tags") {
        query = query.filter("tags_ids", "cs", `{${params.selectedIds.join(",")}}`);
      } else if (params.targetType === "departments") {
        query = query.in("department_id", params.selectedIds);
      }

      const { data: contacts, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!contacts || contacts.length === 0) {
        throw new Error("Nenhum contato encontrado para o segmento selecionado.");
      }

      // 2. Criar o registro da Campanha
      const { data: campaign, error: campaignError } = await supabase
        .from("mass_campaigns")
        .insert({
          message: params.messageTemplate,
          target_type: params.targetType,
          total_targets: contacts.length,
          status: "pending"
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 3. Montar a lista de payloads em formato JSON para a fila
      const queueItems = contacts.map((contact) => {
        const personalizedMessage = params.messageTemplate.replace(
          /\{nome\}/gi,
          contact.name || "Cliente"
        );

        return {
          campaign_id: campaign.id,
          contact_id: contact.id,
          phone_text: contact.phone,
          message_content: personalizedMessage,
          status: "pending"
        };
      });

      // 4. Enviar para a nova função com mapeamento de parâmetros nomeados exatos 🚀
      const { error: queueError } = await supabase.rpc("send_mass_messages_to_queue", {
        p_queue_name: "mass_messages",
        p_msgs: queueItems 
      });

      if (queueError) {
        console.warn("Falha no envio em lote via RPC, executando fallback individual...", queueError);
        
        for (const item of queueItems) {
          const { error: singleError } = await supabase.rpc("enqueue_message", {
            queue_name: "mass_messages",
            msg: item
          });
          
          if (singleError) {
            console.error("Erro crítico no fallback individual:", singleError);
            throw singleError;
          }
        }
      }

      return { success: true, total: contacts.length };
    } catch (error: any) {
      console.error("Erro no disparo em massa:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { triggerMassCampaign, loading };
}