import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export const SetPassword: React.FC = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return password.length >= 8 && password === confirm && !loading;
  }, [confirm, loading, password]);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Sessão não encontrada. Abra novamente o link do convite.");
      }
      setCheckingSession(false);
    };
    check();
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { error: updError } = await supabase.auth.updateUser({ password });
      if (updError) throw updError;

      navigate("/inbox", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Erro ao definir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Crie sua senha</h1>
        <p className="mt-2 text-sm text-gray-600">
          Defina uma senha para acessar o sistema.
        </p>

        {checkingSession ? (
          <p className="mt-4 text-sm text-gray-500">Verificando sessão…</p>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Confirmar senha
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Repita a senha"
                />
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || (error?.includes("Sessão") ?? false)}
                className="mt-2 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? "Salvando…" : "Salvar senha"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
