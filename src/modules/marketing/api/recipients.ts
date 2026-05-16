import { supabase } from "../../../lib/supabaseClient";
import type { CampaignRecipient } from "../types/recipients";

type CampaignRecipientRow = {
  id: string;
  campaign_id: string;
  clinic_id: string;
  contact_id: string;
  conversation_id: string | null;
  status: CampaignRecipient["status"];
  meta_message_id: string | null;
  phone: string | null;
  variables: Record<string, unknown> | null;
  error_message: string | null;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: { id: string; name: string | null; phone: string | null } | null;
  conversation?: { id: string; status: string | null } | null;
};

const mapRecipient = (row: CampaignRecipientRow): CampaignRecipient => ({
  id: row.id,
  campaign_id: row.campaign_id,
  clinic_id: row.clinic_id,
  contact_id: row.contact_id,
  conversation_id: row.conversation_id,
  status: row.status,
  meta_message_id: row.meta_message_id,
  phone: row.phone,
  variables: row.variables ?? {},
  error_message: row.error_message,
  queued_at: row.queued_at,
  sent_at: row.sent_at,
  delivered_at: row.delivered_at,
  read_at: row.read_at,
  replied_at: row.replied_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  contact: row.contact ?? null,
  conversation: row.conversation ?? null,
});

export const getCampaignRecipients = async (
  clinicId: string,
  campaignId: string,
) => {
  const relationSelect = `
    *,
    contact:contacts (
      id,
      name,
      phone
    ),
    conversation:conversations (
      id,
      status
    )
  `;

  const relationResult = await supabase
    .from("campaign_recipients")
    .select(relationSelect)
    .eq("clinic_id", clinicId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (!relationResult.error) {
    return ((relationResult.data ?? []) as CampaignRecipientRow[]).map(
      mapRecipient,
    );
  }

  const fallback = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (fallback.error) throw fallback.error;

  return ((fallback.data ?? []) as CampaignRecipientRow[]).map(mapRecipient);
};
