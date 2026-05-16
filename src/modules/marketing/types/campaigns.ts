import type { MessageTemplate } from "./templates";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "partially_failed"
  | "failed"
  | "cancelled";

export interface Campaign {
  id: string;
  clinic_id: string;
  template_id: string;
  whatsapp_number_id: string | null;
  name: string;
  description: string | null;
  status: CampaignStatus;
  audience_type: string;
  audience_filters: Record<string, unknown>;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  total_contacts: number;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_failed: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignWithTemplate extends Campaign {
  template?: MessageTemplate | null;
}

export interface CreateCampaignInput {
  template_id: string;
  whatsapp_number_id?: string | null;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  audience_type: string;
  audience_filters: Record<string, unknown>;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface UpdateCampaignInput {
  template_id?: string;
  whatsapp_number_id?: string | null;
  name?: string;
  description?: string | null;
  status?: CampaignStatus;
  audience_type?: string;
  audience_filters?: Record<string, unknown>;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}
