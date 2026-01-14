import React, { useMemo, useState } from "react";
import { PlusCircleIcon, PencilIcon } from "lucide-react";
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
  const { profile } = useAuth();
  const clinicId = profile?.clinic_id ?? "clinic_demo";

  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVAILABLE_COLORS[0]);

  const [tags, setTags] = useState<TagItem[]>([
    { id: "tag-1", name: "Pós-consulta", color: "#0A84FF", clinicId },
    { id: "tag-2", name: "Retorno", color: "#34C759", clinicId },
    { id: "tag-3", name: "Reclamação", color: "#FF3B30", clinicId },
  ]);

  const isEditing = Boolean(editingId);
  const canSubmit = name.trim().length > 0;

  const clinicLabel = useMemo(() => {
    if (!profile) {
      return "Clínica atual (demo)";
    }

    return `Clínica ${profile.clinic_id}`;
  }, [profile]);

  const resetForm = () => {
    setName("");
    setColor(AVAILABLE_COLORS[0]);
    setEditingId(null);
  };

  const handleEdit = (tag: TagItem) => {
    setActiveTab("form");
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (isEditing) {
      setTags((prev) =>
        prev.map((tag) =>
          tag.id === editingId
            ? {
                ...tag,
                name: name.trim(),
                color,
              }
            : tag
        )
      );
    } else {
      setTags((prev) => [
        {
          id: `tag-${Date.now()}`,
          name: name.trim(),
          color,
          clinicId,
        },
        ...prev,
      ]);
    }

    setActiveTab("list");
    resetForm();
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
              >
                <span className="flex items-center gap-2">
                  <PlusCircleIcon className="h-4 w-4" />
                  Nova tag
                </span>
              </Button>
            </div>

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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tag)}
                  >
                    <span className="flex items-center gap-2 text-gray-700">
                      <PencilIcon className="h-4 w-4" />
                      Editar
                    </span>
                  </Button>
                </div>
              ))}
            </div>
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
                <Button type="submit" variant="primary" disabled={!canSubmit}>
                  {isEditing ? "Salvar alterações" : "Criar tag"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveTab("list");
                    resetForm();
                  }}
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
