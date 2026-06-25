import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient"; // Ajuste o caminho para o seu cliente do Supabase
import { toast } from "react-toastify";

export interface AvailableTag {
  id: string;
  name: string;
  color: string;
  clinic_id?: string;
}

export const useTags = () => {
  const [tags, setTags] = useState<AvailableTag[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar etiquetas do banco
  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color, clinic_id")
        .order("name", { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar etiquetas:", error);
      toast.error("Erro ao carregar etiquetas do banco.");
    } finally {
      setLoading(false);
    }
  };

  // Inserir nova etiqueta
  const createTag = async (name: string, color: string) => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .insert([{ name, color }]) // O Supabase gera o id e o created_at automaticamente
        .select()
        .single();

      if (error) throw error;
      
      setTags(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      throw new Error(error.message || "Erro ao criar etiqueta.");
    }
  };

  // Atualizar etiqueta existente
  const updateTag = async (id: string, name: string, color: string) => {
    try {
      const { error } = await supabase
        .from("tags")
        .update({ name, color })
        .eq("id", id);

      if (error) throw error;

      setTags(prev => prev.map(t => (t.id === id ? { ...t, name, color } : t)));
    } catch (error: any) {
      throw new Error(error.message || "Erro ao atualizar etiqueta.");
    }
  };

  // Deletar etiqueta
  const deleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTags(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      throw new Error(error.message || "Erro ao deletar etiqueta.");
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return { tags, loading, refreshTags: fetchTags, createTag, updateTag, deleteTag };
};