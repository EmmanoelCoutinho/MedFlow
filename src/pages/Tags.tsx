import React, { useEffect, useMemo, useState } from "react";
import { PlusCircleIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

type TagItem = {
  id: string;
  name: string;
  color: string;
  clinicId: string;
};

const AVAILABLE_COLORS = [
  "#0A84FF",
  "#34C759",
  "#FF9500",
  "#FF3B30",
  "#AF52DE",
  "#64D2FF",
  "#FF2D55",
  "#8E8E93",
  "#FFD60A",
  "#30B0C7",
  "#5E5CE6",
  "#AC8E68",
];

export const Tags: React.FC = () => {
  const { profile, loading: authLoading } = useAuth();
  const clinicId = profile?.clinic_id ?? null;

  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVAILABLE_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tags, setTags] = useState<TagItem[]>([]);

  const isEditing = Boolean(editingId);
  const canSubmit = name.trim().length > 0;

  const clinicLabel = useMemo(() => {
    if (!profile) {
      return "Clínica não identificada";
    }

    return `Clínica ${profile.clinic_id}`;
  }, [profile]);

  const resetForm = () => {
    setName("");
    setColor(AVAILABLE_COLORS[0]);
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (tag: TagItem) => {
    setActiveTab("form");
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
  };

  const fetchTags = async (clinic: string) => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("tags")
      .select("id, name, color, clinic_id")
      .eq("clinic_id", clinic)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Erro ao buscar tags:", fetchError);
      setError("Não foi possível carregar as tags.");
      setLoading(false);
      return;
    }

    setTags(
      (data ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        clinicId: tag.clinic_id,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!clinicId) {
      setTags([]);
      setLoading(false);
      return;
    }

    fetchTags(clinicId);
  }, [authLoading, clinicId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (!clinicId) {
      setError("Selecione uma clínica antes de salvar a tag.");
      return;
    }

    setLoading(true);
    setError(null);

    if (isEditing && editingId) {
      const { error: updateError } = await supabase
        .from("tags")
        .update({ name: name.trim(), color })
        .eq("id", editingId)
        .eq("clinic_id", clinicId);

      if (updateError) {
        console.error("Erro ao atualizar tag:", updateError);
        setError("Não foi possível atualizar a tag.");
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("tags").insert({
        name: name.trim(),
        color,
        clinic_id: clinicId,
      });

      if (insertError) {
        console.error("Erro ao criar tag:", insertError);
        setError("Não foi possível criar a tag.");
        setLoading(false);
        return;
      }
    }

    await fetchTags(clinicId);
    setActiveTab("list");
    resetForm();
  };

  const handleDelete = async (tagId: string) => {
    if (!clinicId) {
      setError("Selecione uma clínica antes de remover a tag.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId)
      .eq("clinic_id", clinicId);

    if (deleteError) {
      console.error("Erro ao remover tag:", deleteError);
      setError("Não foi possível remover a tag.");
      setLoading(false);
      return;
    }

    await fetchTags(clinicId);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
      <div className="px-6 py-5 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tags</h1>
            <p className="text-sm text-gray-500">
              Gerencie as tags da sua clínica para organizar atendimentos.
            </p>
          </div>
          <div className="text-xs text-gray-400">{clinicLabel}</div>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="inline-flex rounded-lg bg-white border p-1">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === "list"
                ? "bg-[#0A84FF] text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab("list")}
          >
            Lista
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === "form"
                ? "bg-[#0A84FF] text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => {
              setActiveTab("form");
              resetForm();
            }}
          >
            {isEditing ? "Editar" : "Criar"}
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {activeTab === "list" ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tags cadastradas
                </h2>
                <p className="text-sm text-gray-500">
                  Todas as tags associadas à clínica atual.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveTab("form");
                  resetForm();
                }}
                disabled={!clinicId || loading}
              >
                <span className="flex items-center gap-2">
                  <PlusCircleIcon className="h-4 w-4" />
                  Nova tag
                </span>
              </Button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-16 rounded-lg bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            ) : tags.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                Nenhuma tag cadastrada para esta clínica.
              </div>
            ) : (
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {tag.name}
                        </p>
                        <p className="text-xs text-gray-500">{tag.clinicId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                        disabled={loading}
                      >
                        <span className="flex items-center gap-2 text-gray-700">
                          <PencilIcon className="h-4 w-4" />
                          Editar
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag.id)}
                        disabled={loading}
                      >
                        <span className="flex items-center gap-2 text-red-600">
                          <Trash2Icon className="h-4 w-4" />
                          Remover
                        </span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Editar tag" : "Criar nova tag"}
              </h2>
              <p className="text-sm text-gray-500">
                Defina um nome e escolha uma cor personalizada para a tag.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-[1.2fr,1fr]">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Nome da tag
                  </label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex: Pós-consulta"
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Clínica vinculada
                  </label>
                  <div className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 bg-gray-50">
                    {clinicLabel}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Paleta de cores
                  </label>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Cor atual</span>
                    <span
                      className="h-4 w-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-6 gap-3 sm:grid-cols-8 md:grid-cols-10">
                  {AVAILABLE_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Selecionar cor ${hex}`}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        color === hex
                          ? "border-gray-900"
                          : "border-transparent hover:border-gray-300"
                      }`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setColor(hex)}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <label className="text-sm text-gray-600">
                    Cor customizada
                  </label>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-10 w-14 rounded border border-gray-200 bg-white"
                  />
                  <span className="text-xs text-gray-500">{color}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit || !clinicId || loading}
                  isLoading={loading}
                >
                  {isEditing ? "Salvar alterações" : "Criar tag"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveTab("list");
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};
