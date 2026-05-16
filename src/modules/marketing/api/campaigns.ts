import { supabase } from "../../../lib/supabaseClient";
import { resolveAudience, type ResolveAudienceType } from "../utils/resolveAudience";
import type {
  Campaign,
  CampaignWithTemplate,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "../types/campaigns";
import type { MessageTemplate } from "../types/templates";

type CampaignRow = {
  id: string;
  clinic_id: string;
  template_id: string;
  whatsapp_number_id: string | null;
  name: string;
  description: string | null;
  status: Campaign["status"];
  audience_type: string;
  audience_filters: Record<string, unknown> | null;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  total_contacts: number | null;
  total_sent: number | null;
  total_delivered: number | null;
  total_read: number | null;
  total_replied: number | null;
  total_failed: number | null;
  created_at: string;
  updated_at: string;
  template?: MessageTemplate | null;
};

const mapCampaign = (row: CampaignRow): CampaignWithTemplate => ({
  id: row.id,
  clinic_id: row.clinic_id,
  template_id: row.template_id,
  whatsapp_number_id: row.whatsapp_number_id,
  name: row.name,
  description: row.description,
  status: row.status,
  audience_type: row.audience_type,
  audience_filters: row.audience_filters ?? {},
  scheduled_at: row.scheduled_at,
  started_at: row.started_at,
  finished_at: row.finished_at,
  total_contacts: Number(row.total_contacts ?? 0),
  total_sent: Number(row.total_sent ?? 0),
  total_delivered: Number(row.total_delivered ?? 0),
  total_read: Number(row.total_read ?? 0),
  total_replied: Number(row.total_replied ?? 0),
  total_failed: Number(row.total_failed ?? 0),
  created_at: row.created_at,
  updated_at: row.updated_at,
  template: row.template ?? null,
});

const loadTemplateOrThrow = async (clinicId: string, templateId: string) => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Template não encontrado.");
  if (data.status !== "approved") {
    throw new Error("A campanha só pode usar templates aprovados.");
  }

  return data;
};

const syncCampaignRecipients = async (
  clinicId: string,
  campaignId: string,
  audienceType: string,
  audienceFilters: Record<string, unknown>,
) => {
  const resolvedAudience = await resolveAudience({
    clinicId,
    audienceType: audienceType as ResolveAudienceType,
    audienceFilters,
  });

  const { error: deleteError } = await supabase
    .from("campaign_recipients")
    .delete()
    .eq("clinic_id", clinicId)
    .eq("campaign_id", campaignId);

  if (deleteError) throw deleteError;

  if (resolvedAudience.length > 0) {
    const { error: insertError } = await supabase
      .from("campaign_recipients")
      .insert(
        resolvedAudience.map((contact) => ({
          campaign_id: campaignId,
          clinic_id: clinicId,
          contact_id: contact.contactId,
          conversation_id: contact.conversationId,
          status: "pending",
          phone: contact.phone,
          variables: contact.variables,
          error_message: null,
        })),
      );

    if (insertError) throw insertError;
  }

  const { error: updateError } = await supabase
    .from("campaigns")
    .update({
      total_contacts: resolvedAudience.length,
      total_sent: 0,
      total_delivered: 0,
      total_read: 0,
      total_replied: 0,
      total_failed: 0,
    })
    .eq("clinic_id", clinicId)
    .eq("id", campaignId);

  if (updateError) throw updateError;
};

export const getCampaigns = async (clinicId: string) => {
  const relationSelect = `
    *,
    template:message_templates(*)
  `;

  const relationResult = await supabase
    .from("campaigns")
    .select(relationSelect)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (!relationResult.error) {
    return ((relationResult.data ?? []) as CampaignRow[]).map(mapCampaign);
  }

  const fallback = await supabase
    .from("campaigns")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (fallback.error) throw fallback.error;

  return ((fallback.data ?? []) as CampaignRow[]).map(mapCampaign);
};

export const getCampaignById = async (clinicId: string, id: string) => {
  const relationSelect = `
    *,
    template:message_templates(*)
  `;

  const relationResult = await supabase
    .from("campaigns")
    .select(relationSelect)
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .maybeSingle();

  if (!relationResult.error) {
    return relationResult.data
      ? mapCampaign(relationResult.data as CampaignRow)
      : null;
  }

  const fallback = await supabase
    .from("campaigns")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .maybeSingle();

  if (fallback.error) throw fallback.error;

  return fallback.data ? mapCampaign(fallback.data as CampaignRow) : null;
};

export const createCampaign = async (
  clinicId: string,
  input: CreateCampaignInput,
) => {
  await loadTemplateOrThrow(clinicId, input.template_id);

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      clinic_id: clinicId,
      template_id: input.template_id,
      whatsapp_number_id: input.whatsapp_number_id ?? null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status,
      audience_type: input.audience_type,
      audience_filters: input.audience_filters,
      scheduled_at: input.scheduled_at ?? null,
      started_at: input.started_at ?? null,
      finished_at: input.finished_at ?? null,
      total_contacts: 0,
      total_sent: 0,
      total_delivered: 0,
      total_read: 0,
      total_replied: 0,
      total_failed: 0,
    })
    .select("*")
    .single();

  if (error) throw error;

  await syncCampaignRecipients(
    clinicId,
    data.id,
    input.audience_type,
    input.audience_filters,
  );

  const created = await getCampaignById(clinicId, data.id);
  if (!created) throw new Error("Campanha criada, mas não foi possível recarregá-la.");
  return created;
};

export const updateCampaign = async (
  clinicId: string,
  id: string,
  input: UpdateCampaignInput,
) => {
  const existing = await getCampaignById(clinicId, id);
  if (!existing) throw new Error("Campanha não encontrada.");

  const nextTemplateId = input.template_id ?? existing.template_id;
  await loadTemplateOrThrow(clinicId, nextTemplateId);

  const nextAudienceType = input.audience_type ?? existing.audience_type;
  const nextAudienceFilters = input.audience_filters ?? existing.audience_filters;

  const payload: Record<string, unknown> = {
    template_id: nextTemplateId,
    audience_type: nextAudienceType,
    audience_filters: nextAudienceFilters,
  };

  if (input.whatsapp_number_id !== undefined) {
    payload.whatsapp_number_id = input.whatsapp_number_id;
  }
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }
  if (input.status !== undefined) payload.status = input.status;
  if (input.scheduled_at !== undefined) payload.scheduled_at = input.scheduled_at;
  if (input.started_at !== undefined) payload.started_at = input.started_at;
  if (input.finished_at !== undefined) payload.finished_at = input.finished_at;

  const { error } = await supabase
    .from("campaigns")
    .update(payload)
    .eq("clinic_id", clinicId)
    .eq("id", id);

  if (error) throw error;

  await syncCampaignRecipients(clinicId, id, nextAudienceType, nextAudienceFilters);

  const updated = await getCampaignById(clinicId, id);
  if (!updated) throw new Error("Campanha atualizada, mas não foi possível recarregá-la.");
  return updated;
};

export const cancelCampaign = async (clinicId: string, id: string) => {
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return mapCampaign(data as CampaignRow);
};
