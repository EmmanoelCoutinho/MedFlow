"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

type Clinic = {
  id: string;
  name?: string | null;
  slug?: string | null;
  // adicione campos que você tiver na tabela clinics
};

type ClinicMembership = {
  clinic_id: string;
  user_id: string;
  role?: string | null;
  department_id?: string | null;
  // outros campos do clinic_users
};

type ClinicContextType = {
  clinic: Clinic | null;
  clinicId: string | null;
  membership: ClinicMembership | null;
  loading: boolean;
  error: any;
  refetch: () => Promise<void>;
};

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const { authUser, loading: authLoading } = useAuth();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [membership, setMembership] = useState<ClinicMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const clinicId = useMemo(() => membership?.clinic_id ?? null, [membership]);

  const fetchClinic = useCallback(async () => {
    if (!authUser) {
      setClinic(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 1) pega membership do usuário
    const { data: membershipRow, error: memErr } = await supabase
      .from("clinic_users")
      .select("clinic_id, user_id, role, department_id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (memErr) {
      setError(memErr);
      setClinic(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    if (!membershipRow?.clinic_id) {
      setClinic(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    setMembership(membershipRow as ClinicMembership);

    // 2) pega dados da clínica
    const { data: clinicRow, error: clinicErr } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", membershipRow.clinic_id)
      .maybeSingle();

    if (clinicErr) {
      setError(clinicErr);
      setClinic(null);
      setLoading(false);
      return;
    }

    setClinic((clinicRow as Clinic) ?? null);
    setLoading(false);
  }, [authUser]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    fetchClinic();
  }, [authLoading, fetchClinic]);

  const value: ClinicContextType = useMemo(
    () => ({
      clinic,
      clinicId,
      membership,
      loading,
      error,
      refetch: fetchClinic,
    }),
    [clinic, clinicId, membership, loading, error, fetchClinic]
  );

  return (
    <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
  );
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
}
