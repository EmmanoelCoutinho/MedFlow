import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const parseHashParams = (hash: string) => {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(clean);
};

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Se já tem sessão, segue
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/auth/set-password", { replace: true });
          return;
        }

        // 2) Se veio erro no HASH, mostre o motivo real (ex: otp_expired)
        const hashParams = parseHashParams(location.hash || "");
        const hashError = hashParams.get("error");
        const hashErrorCode = hashParams.get("error_code");
        const hashErrorDesc = hashParams.get("error_description");

        if (hashError) {
          setError(
            hashErrorCode === "otp_expired"
              ? "Este link expirou (ou já foi usado). Solicite um novo convite."
              : decodeURIComponent(
                  hashErrorDesc || "Falha ao validar convite.",
                ),
          );
          return;
        }

        // 3) Agora sim processa o link (NÃO limpe a URL antes disso)
        const code = params.get("code");
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) throw exchangeError;

          // limpa hash/query pra evitar reprocesso em refresh/back
          window.history.replaceState({}, document.title, "/auth/callback");

          navigate("/auth/set-password", { replace: true });
          return;
        }

        // 4) Fluxo implícito: tokens no HASH (#access_token=...)
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (setSessionError) throw setSessionError;

          window.history.replaceState({}, document.title, "/auth/callback");

          navigate("/auth/set-password", { replace: true });
          return;
        }

        // 5) fallback: token_hash + type
        const token_hash =
          params.get("token_hash") || hashParams.get("token_hash");
        const type = (params.get("type") || hashParams.get("type")) as
          | "signup"
          | "invite"
          | "magiclink"
          | "recovery"
          | "email_change"
          | null;

        if (token_hash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });
          if (verifyError) throw verifyError;

          window.history.replaceState({}, document.title, "/auth/callback");

          navigate("/auth/set-password", { replace: true });
          return;
        }

        setError("Link inválido ou expirado. Solicite um novo convite.");
      } catch (e: any) {
        setError(e?.message ?? "Falha ao validar convite.");
      }
    };

    run();
  }, [navigate, params, location.hash]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">
          Validando convite…
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Aguarde enquanto confirmamos seu acesso.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
