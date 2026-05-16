export type MessageTemplateStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "paused"
  | "disabled"
  | "archived";

export type MessageTemplateCategory =
  | "marketing"
  | "utility"
  | "authentication";

export interface MessageTemplate {
  id: string;
  clinic_id: string;
  whatsapp_number_id: string | null;
  name: string;
  meta_template_name: string | null;
  category: MessageTemplateCategory;
  language_code: string;
  body: string;
  variables: unknown[];
  footer: string | null;
  buttons: unknown[];
  status: MessageTemplateStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageTemplateInput {
  whatsapp_number_id?: string | null;
  name: string;
  meta_template_name?: string | null;
  category: MessageTemplateCategory;
  language_code: string;
  body: string;
  variables?: unknown[];
  footer?: string | null;
  buttons?: unknown[];
  status?: MessageTemplateStatus;
  rejection_reason?: string | null;
}

export interface UpdateMessageTemplateInput {
  whatsapp_number_id?: string | null;
  name?: string;
  meta_template_name?: string | null;
  category?: MessageTemplateCategory;
  language_code?: string;
  body?: string;
  variables?: unknown[];
  footer?: string | null;
  buttons?: unknown[];
  status?: MessageTemplateStatus;
  rejection_reason?: string | null;
}
