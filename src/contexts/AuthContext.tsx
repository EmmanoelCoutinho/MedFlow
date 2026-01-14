"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

/**
 * Tipagem do usuário de domínio
 * Ajuste os campos conforme sua tabela clinic_users
 */
export type ClinicUser = {
  id: string;
  user_id: string;
  clinic_id: string;
  role: string;
  name: string;
  created_at: string;
};

type AuthContextType = {
  authUser: User | null; // Supabase Auth User
  profile: ClinicUser | null; // clinic_users
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_AUTH_USER_KEY = "medflow.auth.user";
const STORAGE_PROFILE_KEY = "medflow.auth.profile";

const readStorage = <T,>(key: string): T | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("Erro ao ler storage:", error);
    return null;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Erro ao gravar storage:", error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(() =>
    readStorage<User>(STORAGE_AUTH_USER_KEY),
  );
  const [profile, setProfile] = useState<ClinicUser | null>(() =>
    readStorage<ClinicUser>(STORAGE_PROFILE_KEY),
  );
  const [loading, setLoading] = useState(true);

  /**
   * Carrega profile da tabela clinic_users
   */
  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("clinic_users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Erro ao carregar clinic_users:", error);
      setProfile(null);
      writeStorage(STORAGE_PROFILE_KEY, null);
      return;
    }

    setProfile(data);
    writeStorage(STORAGE_PROFILE_KEY, data);
  };

  /**
   * Bootstrap + listener de auth
   */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        const currentSession = data.session ?? null;
        setAuthUser(currentSession?.user ?? null);
        writeStorage(STORAGE_AUTH_USER_KEY, currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
          writeStorage(STORAGE_PROFILE_KEY, null);
        }
      } catch (error) {
        console.error("Erro ao inicializar sessão:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoading(true);
      try {
        setAuthUser(newSession?.user ?? null);
        writeStorage(STORAGE_AUTH_USER_KEY, newSession?.user ?? null);

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          writeStorage(STORAGE_PROFILE_KEY, null);
        }
      } catch (error) {
        console.error("Erro ao atualizar sessão:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login com email/senha
   */
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

    setAuthUser(data.user ?? null);
    writeStorage(STORAGE_AUTH_USER_KEY, data.user ?? null);
    setLoading(false);

    if (data.user) {
      await loadProfile(data.user.id);
    } else {
      setProfile(null);
      writeStorage(STORAGE_PROFILE_KEY, null);
    }

    return { error: null };
  };

  /**
   * Logout
   */
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setAuthUser(null);
    setProfile(null);
    writeStorage(STORAGE_AUTH_USER_KEY, null);
    writeStorage(STORAGE_PROFILE_KEY, null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        profile,
        loading,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider />");
  }
  return ctx;
}
