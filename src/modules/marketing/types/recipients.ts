export type CampaignRecipientStatus =
  | "pending"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "replied"
  | "failed"
  | "skipped";

export interface CampaignRecipientContact {
  id: string;
  name: string | null;
  phone: string | null;
}

export interface CampaignRecipientConversation {
  id: string;
  status: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  clinic_id: string;
  contact_id: string;
  conversation_id: string | null;
  status: CampaignRecipientStatus;
  meta_message_id: string | null;
  phone: string | null;
  variables: Record<string, unknown>;
  error_message: string | null;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: CampaignRecipientContact | null;
  conversation?: CampaignRecipientConversation | null;
}
