"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Settings2Icon, ExternalLinkIcon } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

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

export const MetaIntegrationsPage: React.FC = () => {
  const { profile } = useAuth();
  const clinicId = profile?.clinic_id ?? null;

  const [clinicName, setClinicName] = useState<string>("");

  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        "Configuração do Meta OAuth ausente (VITE_META_APP_ID / VITE_META_REDIRECT_URI).",
      );
      return;
    }

    const state = encodeURIComponent(clinicId);
    const redirectUri = encodeURIComponent(META_REDIRECT_URI);

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

    setIsLoading(true);
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
      setIsLoading(false);
      return;
    }

    setConnections((data ?? []) as Connection[]);
    setIsLoading(false);
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
      <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
      <div className="px-6 py-5 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Integrações
            </h1>
            <p className="text-sm text-gray-500">
              Conecte sua Página do Facebook para ativar Messenger e Instagram.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
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

      <div className="px-6 py-6 space-y-6">
        {errorMsg ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {!clinicId ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Empresa não identificada
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Aguarde o perfil carregar para configurar integrações.
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
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Messenger
                    </p>
                    <p className="text-xs text-gray-500">
                      Mensagens da Página do Facebook
                    </p>
                  </div>
                  {renderStatus(messenger?.status)}
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  <div className="text-xs text-gray-500">Page ID</div>
                  <div className="mt-1 font-medium">
                    {messenger?.meta_page_id ?? "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Instagram
                    </p>
                    <p className="text-xs text-gray-500">
                      DMs do Instagram conectado à Página
                    </p>
                  </div>
                  {renderStatus(instagram?.status)}
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  <div className="text-xs text-gray-500">IG User ID</div>
                  <div className="mt-1 font-medium">
                    {instagram?.meta_ig_user_id ?? "-"}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">Page ID</div>
                  <div className="mt-1 font-medium">
                    {instagram?.meta_page_id ?? "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <span className="font-medium">Importante:</span> para conectar o
              Instagram, ele precisa estar em conta profissional e vinculado a
              uma Página do Facebook.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
