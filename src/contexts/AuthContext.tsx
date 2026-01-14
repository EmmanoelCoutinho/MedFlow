"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
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
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ClinicUser | null>(null);
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
      return;
    }

    setProfile(data);
  };

  const loadProfileSafe = async (userId: string) => {
    try {
      await loadProfile(userId);
    } catch (error) {
      console.error("Erro ao carregar clinic_users:", error);
      setProfile(null);
    }
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
        setSession(currentSession);
        setAuthUser(currentSession?.user ?? null);
        setLoading(false);

        if (currentSession?.user) {
          void loadProfileSafe(currentSession.user.id);
        } else {
          setProfile(null);
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
        setSession(newSession);
        setAuthUser(newSession?.user ?? null);
        setLoading(false);

        if (newSession?.user) {
          void loadProfileSafe(newSession.user.id);
        } else {
          setProfile(null);
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

    setSession(data.session ?? null);
    setAuthUser(data.user ?? null);
    setLoading(false);

    if (data.user) {
      void loadProfileSafe(data.user.id);
    } else {
      setProfile(null);
    }

    return { error: null };
  };

  /**
   * Logout
   */
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        profile,
        session,
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
