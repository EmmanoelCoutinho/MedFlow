import { supabase } from "../../../lib/supabaseClient";
import type {
  CreateMessageTemplateInput,
  MessageTemplate,
  UpdateMessageTemplateInput,
} from "../types/templates";

type MessageTemplateRow = {
  id: string;
  clinic_id: string;
  whatsapp_number_id: string | null;
  name: string;
  meta_template_name: string | null;
  category: MessageTemplate["category"];
  language_code: string;
  body: string;
  variables: unknown[] | null;
  footer: string | null;
  buttons: unknown[] | null;
  status: MessageTemplate["status"];
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

const mapTemplate = (row: MessageTemplateRow): MessageTemplate => ({
  id: row.id,
  clinic_id: row.clinic_id,
  whatsapp_number_id: row.whatsapp_number_id,
  name: row.name,
  meta_template_name: row.meta_template_name,
  category: row.category,
  language_code: row.language_code,
  body: row.body,
  variables: row.variables ?? [],
  footer: row.footer,
  buttons: row.buttons ?? [],
  status: row.status,
  rejection_reason: row.rejection_reason,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const getTemplates = async (clinicId: string) => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as MessageTemplateRow[]).map(mapTemplate);
};

export const getTemplateById = async (clinicId: string, id: string) => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapTemplate(data as MessageTemplateRow) : null;
};

export const createTemplate = async (
  clinicId: string,
  input: CreateMessageTemplateInput,
) => {
  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      clinic_id: clinicId,
      whatsapp_number_id: input.whatsapp_number_id ?? null,
      name: input.name.trim(),
      meta_template_name: input.meta_template_name?.trim() || null,
      category: input.category,
      language_code: input.language_code,
      body: input.body.trim(),
      variables: input.variables ?? [],
      footer: input.footer?.trim() || null,
      buttons: input.buttons ?? [],
      status: input.status ?? "draft",
      rejection_reason: input.rejection_reason ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  return mapTemplate(data as MessageTemplateRow);
};

export const updateTemplate = async (
  clinicId: string,
  id: string,
  input: UpdateMessageTemplateInput,
) => {
  const payload: Record<string, unknown> = {};

  if (input.whatsapp_number_id !== undefined) {
    payload.whatsapp_number_id = input.whatsapp_number_id;
  }
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.meta_template_name !== undefined) {
    payload.meta_template_name = input.meta_template_name?.trim() || null;
  }
  if (input.category !== undefined) payload.category = input.category;
  if (input.language_code !== undefined) payload.language_code = input.language_code;
  if (input.body !== undefined) payload.body = input.body.trim();
  if (input.variables !== undefined) payload.variables = input.variables;
  if (input.footer !== undefined) payload.footer = input.footer?.trim() || null;
  if (input.buttons !== undefined) payload.buttons = input.buttons;
  if (input.status !== undefined) payload.status = input.status;
  if (input.rejection_reason !== undefined) {
    payload.rejection_reason = input.rejection_reason;
  }

  const { data, error } = await supabase
    .from("message_templates")
    .update(payload)
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return mapTemplate(data as MessageTemplateRow);
};

export const archiveTemplate = async (clinicId: string, id: string) =>
  updateTemplate(clinicId, id, { status: "archived" });
