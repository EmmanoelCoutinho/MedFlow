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
  const [loading, setLoading] = useState(false);

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

  /**
   * Bootstrap + listener de auth
   */
  // useEffect(() => {
  //   let mounted = true;

  //   const init = async () => {
  //     const { data } = await supabase.auth.getSession();

  //     if (!mounted) return;

  //     const currentSession = data.session ?? null;
  //     setSession(currentSession);
  //     setAuthUser(currentSession?.user ?? null);

  //     if (currentSession?.user) {
  //       await loadProfile(currentSession.user.id);
  //     }

  //     setLoading(false);
  //   };

  //   init();

  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
  //     setSession(newSession);
  //     setAuthUser(newSession?.user ?? null);

  //     if (newSession?.user) {
  //       await loadProfile(newSession.user.id);
  //     } else {
  //       setProfile(null);
  //     }
  //   });

  //   return () => {
  //     mounted = false;
  //     subscription.unsubscribe();
  //   };
  // }, []);

  /**
   * Login com email/senha
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    setSession(data.session ?? null);
    setAuthUser(data.user ?? null);

    if (data.user) {
      await loadProfile(data.user.id);
    }

    return { error: null };
  };

  /**
   * Logout
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
    setProfile(null);
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
