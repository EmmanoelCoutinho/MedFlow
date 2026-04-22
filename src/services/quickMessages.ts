import { supabase } from "../lib/supabaseClient";

export type QuickMessage = {
  id: string;
  clinicId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

type QuickMessageRow = {
  id: string;
  clinic_id: string;
  message: string;
  created_at: string;
  updated_at: string;
};

const mapQuickMessage = (row: QuickMessageRow): QuickMessage => ({
  id: row.id,
  clinicId: row.clinic_id,
  message: row.message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listQuickMessages = async (clinicId: string) => {
  const { data, error } = await supabase
    .from("quick_messages")
    .select("id, clinic_id, message, created_at, updated_at")
    .eq("clinic_id", clinicId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as QuickMessageRow[]).map(mapQuickMessage);
};

export const createQuickMessage = async (params: {
  clinicId: string;
  message: string;
}) => {
  const { data, error } = await supabase
    .from("quick_messages")
    .insert({
      clinic_id: params.clinicId,
      message: params.message.trim(),
    })
    .select("id, clinic_id, message, created_at, updated_at")
    .single();

  if (error) throw error;

  return mapQuickMessage(data as QuickMessageRow);
};

export const updateQuickMessage = async (params: {
  clinicId: string;
  id: string;
  message: string;
}) => {
  const { data, error } = await supabase
    .from("quick_messages")
    .update({
      message: params.message.trim(),
    })
    .eq("id", params.id)
    .eq("clinic_id", params.clinicId)
    .select("id, clinic_id, message, created_at, updated_at")
    .single();

  if (error) throw error;

  return mapQuickMessage(data as QuickMessageRow);
};

export const deleteQuickMessage = async (params: {
  clinicId: string;
  id: string;
}) => {
  const { error } = await supabase
    .from("quick_messages")
    .delete()
    .eq("id", params.id)
    .eq("clinic_id", params.clinicId);

  if (error) throw error;
};
