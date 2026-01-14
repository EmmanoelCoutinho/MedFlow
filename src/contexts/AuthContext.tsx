"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type ClinicUser = {
  id: string;
  user_id: string;
  clinic_id: string;
  role: string;
  name: string;
  created_at: string;
};

type AuthContextType = {
  authUser: User | null;
  profile: ClinicUser | null;
  loading: boolean; // ✅ apenas bootstrap de sessão
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PROFILE_KEY = "medflow.auth.profile.v1";

// cache do profile com metadados (pra validar se é do mesmo user)
type StoredProfile = {
  userId: string;
  savedAt: number;
  profile: ClinicUser;
};

// TTL opcional (se quiser sempre usar cache “fresco”)
const PROFILE_TTL_MS = 10 * 60 * 1000; // 10 min (ajuste ou coloque 0 para “infinito”)

const readStorage = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<ClinicUser | null>(() => {
    const cached = readStorage<StoredProfile>(STORAGE_PROFILE_KEY);
    return cached?.profile ?? null;
  });

  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  const refreshProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("clinic_users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!mountedRef.current) return;

    if (error) {
      console.error("Erro ao carregar clinic_users:", error);
      // ⚠️ aqui você decide:
      // - manter o cache antigo (não derruba profile)
      // - ou limpar (comportamento antigo)
      // Vou manter mais resiliente: não apaga imediatamente se já tinha.
      if (!profile) {
        setProfile(null);
        writeStorage(STORAGE_PROFILE_KEY, null);
      }
      return;
    }

    setProfile(data);
    const payload: StoredProfile = {
      userId,
      savedAt: Date.now(),
      profile: data,
    };
    writeStorage(STORAGE_PROFILE_KEY, payload);
  };

  const shouldUseCachedProfile = (userId: string) => {
    const cached = readStorage<StoredProfile>(STORAGE_PROFILE_KEY);
    if (!cached) return false;
    if (cached.userId !== userId) return false;
    if (!PROFILE_TTL_MS) return true;
    return Date.now() - cached.savedAt <= PROFILE_TTL_MS;
  };

  // ✅ Bootstrap da sessão (não depende de profile)
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        const sessionUser = data.session?.user ?? null;
        setAuthUser(sessionUser);

        // se não tem sessão, limpa profile cache (opcional)
        if (!sessionUser) {
          setProfile(null);
          writeStorage(STORAGE_PROFILE_KEY, null);
          return;
        }

        // ✅ se cache do profile serve, não busca de novo
        if (shouldUseCachedProfile(sessionUser.id)) {
          // garante que state esteja com o cache atual (caso tenha mudado fora)
          const cached = readStorage<StoredProfile>(STORAGE_PROFILE_KEY);
          if (cached?.profile) setProfile(cached.profile);
        } else {
          // não bloqueia app esperando profile
          refreshProfile(sessionUser.id);
        }
      } catch (e) {
        console.error("Erro ao inicializar sessão:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        const sessionUser = newSession?.user ?? null;
        setAuthUser(sessionUser);

        if (!sessionUser) {
          setProfile(null);
          writeStorage(STORAGE_PROFILE_KEY, null);
          return;
        }

        if (!shouldUseCachedProfile(sessionUser.id)) {
          refreshProfile(sessionUser.id);
        } else {
          const cached = readStorage<StoredProfile>(STORAGE_PROFILE_KEY);
          if (cached?.profile) setProfile(cached.profile);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return { error };
    }

    const user = data.user ?? null;
    setAuthUser(user);

    // ✅ libera UI rápido
    setLoading(false);

    // profile em background (ou usa cache se tiver)
    if (user) {
      if (!shouldUseCachedProfile(user.id)) {
        refreshProfile(user.id);
      } else {
        const cached = readStorage<StoredProfile>(STORAGE_PROFILE_KEY);
        if (cached?.profile) setProfile(cached.profile);
      }
    } else {
      setProfile(null);
      writeStorage(STORAGE_PROFILE_KEY, null);
    }

    return { error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setAuthUser(null);
    setProfile(null);
    writeStorage(STORAGE_PROFILE_KEY, null);
    setLoading(false);
  };

  const value = useMemo(
    () => ({ authUser, profile, loading, signInWithEmail, signOut }),
    [authUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
