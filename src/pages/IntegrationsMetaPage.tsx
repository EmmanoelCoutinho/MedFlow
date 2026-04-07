"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Settings2Icon,
  ExternalLinkIcon,
  FacebookIcon,
  InstagramIcon,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { SettingsTabs } from "../components/settings/SettingsTabs";

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_REDIRECT_URI = import.meta.env.VITE_META_REDIRECT_URI as
  | string
  | undefined;

type Connection = {
  id: string;
  channel: "messenger" | "instagram";
  meta_page_id: string | null;
  meta_ig_user_id: string | null;
  status: "connected" | "disconnected" | "needs_reauth";
  updated_at: string | null;
};

type DbClinicRow = {
  id: string;
  name: string | null;
};

type PlatformCardProps = {
  title: string;
  description: string;
  status?: Connection["status"] | null;
  icon: React.ReactNode;
  accessItems: string[];
};

export const MetaIntegrationsPage: React.FC = () => {
  const { profile } = useAuth();
  const clinicId = profile?.clinic_id ?? null;

  const [clinicName, setClinicName] = useState<string>("");

  const [connections, setConnections] = useState<Connection[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clinicLabel = useMemo(() => {
    if (!clinicId) return "Empresa atual (indefinida)";
    if (!clinicName) return "Empresa atual";
    return clinicName;
  }, [clinicId, clinicName]);

  const messenger = useMemo(
    () => connections.find((c) => c.channel === "messenger") ?? null,
    [connections],
  );

  const instagram = useMemo(
    () => connections.find((c) => c.channel === "instagram") ?? null,
    [connections],
  );

  const startOAuth = useCallback(() => {
    if (!clinicId) return;

    if (!META_APP_ID || !META_REDIRECT_URI) {
      setErrorMsg(
        "Configuracao do Meta OAuth ausente (VITE_META_APP_ID / VITE_META_REDIRECT_URI).",
      );
      return;
    }

    const state = `${clinicId}|fb`;
    const redirectUri = META_REDIRECT_URI;

    const scopes = [
      "public_profile",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "pages_messaging",
      "instagram_basic",
      "instagram_manage_messages",
      "business_management",
    ].join(",");

    const url =
      `https://www.facebook.com/v21.0/dialog/oauth` +
      `?client_id=${encodeURIComponent(META_APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code` +
      `&auth_type=rerequest` +
      `&prompt=consent` +
      `&scope=${encodeURIComponent(scopes)}`;

    window.location.href = url;
  }, [clinicId]);

  const fetchClinic = useCallback(async () => {
    if (!clinicId) return;

    const { data, error } = await supabase
      .from("clinics")
      .select("id,name")
      .eq("id", clinicId)
      .single();

    if (error) {
      setClinicName("");
      return;
    }

    const clinic = data as DbClinicRow;
    setClinicName(clinic?.name ?? "");
  }, [clinicId]);

  const fetchConnections = useCallback(async () => {
    if (!clinicId) return;

    setErrorMsg(null);

    const { data, error } = await supabase
      .from("channel_connections")
      .select("id,channel,meta_page_id,meta_ig_user_id,status,updated_at")
      .eq("provider", "meta")
      .eq("clinic_id", clinicId)
      .in("channel", ["messenger", "instagram"])
      .order("updated_at", { ascending: false });

    if (error) {
      setConnections([]);
      setErrorMsg(error.message);
      return;
    }

    setConnections((data ?? []) as Connection[]);
  }, [clinicId]);

  useEffect(() => {
    fetchClinic();
    fetchConnections();
  }, [fetchClinic, fetchConnections]);

  const renderStatus = (status?: Connection["status"] | null) => {
    const s = status ?? "disconnected";
    const cls =
      s === "connected"
        ? "border-green-200 bg-green-50 text-green-700"
        : s === "needs_reauth"
          ? "border-yellow-200 bg-yellow-50 text-yellow-800"
          : "border-gray-200 bg-gray-50 text-gray-700";

    const label =
      s === "connected"
        ? "Conectado"
        : s === "needs_reauth"
          ? "Reconectar"
          : "Desconectado";

    return (
      <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>
        {label}
      </span>
    );
  };

  const PlatformCard: React.FC<PlatformCardProps> = ({
    title,
    description,
    status,
    icon,
    accessItems,
  }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-700">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        {renderStatus(status)}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Acesso liberado
        </p>
        <ul className="mt-2 space-y-2 text-sm text-gray-700">
          {accessItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
      <div className="border-b bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Integrações
            </h1>
            <p className="text-sm text-gray-500">
              Conecte sua Página do Facebook para ativar Messenger e Instagram.
            </p>
            <SettingsTabs />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="bg-blue-600"
              onClick={startOAuth}
              disabled={!clinicId}
            >
              <span className="flex items-center gap-2">
                <ExternalLinkIcon className="h-4 w-4" />
                Conectar Meta
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {errorMsg ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {!clinicId ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Empresa nao identificada
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Aguarde o perfil carregar para configurar integracoes.
            </p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Meta (Instagram e Facebook)
                </h2>
                <p className="text-sm text-gray-500">
                  Empresa vinculada: {clinicLabel}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Settings2Icon className="h-4 w-4" />
                <span>Configuração</span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <PlatformCard
                title="Messenger"
                description="Mensagens da Página do Facebook"
                status={messenger?.status}
                icon={<FacebookIcon className="h-5 w-5 text-blue-600" />}
                accessItems={[
                  "Receber e responder mensagens da Página conectada.",
                  "Centralizar o atendimento do Facebook na inbox.",
                  "Sincronizar conversas recebidas pelo Facebook.",
                ]}
              />

              <PlatformCard
                title="Instagram"
                description="DMs do Instagram vinculado a Página"
                status={instagram?.status}
                icon={<InstagramIcon className="h-5 w-5 text-pink-600" />}
                accessItems={[
                  "Receber e responder mensagens diretas do Instagram.",
                  "Centralizar o atendimento do Instagram na inbox.",
                  "Manter o canal disponivel para operação e automações.",
                ]}
              />
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <span className="font-medium">Importante:</span> Para realizar a
              conexão com o Instagram, é necessário que a conta esteja
              configurada como conta profissional e vinculada a uma página do
              Facebook.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
