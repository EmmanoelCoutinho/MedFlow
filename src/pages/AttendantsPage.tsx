import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  FilterIcon,
  Settings2Icon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { supabase } from "../lib/supabaseClient";
import { useClinic } from "../contexts/ClinicContext";

type Role = "admin" | "agent";

type ClinicUser = {
  clinic_id: string;
  user_id: string;
  role: Role;
  name: string | null;
  department_id: string | null;
  email?: string | null;
};

type Department = {
  id: string;
  clinic_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DepartmentMemberRow = {
  department_id: string;
  clinic_user_id: string;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

type ActionError = {
  message: string;
  isPermission: boolean;
};

type RoleFilter = "all" | Role;

type ModalMode = "edit" | "remove";

const buildToast = (message: string, type: Toast["type"]) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  message,
  type,
});

const isPermissionError = (error: { status?: number; code?: string } | null) => {
  if (!error) return false;
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.code === "42501"
  );
};

const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  return { toasts, pushToast };
};

const RoleBadge: React.FC<{ role: Role }> = ({ role }) => (
  <Badge variant={role === "admin" ? "success" : "default"}>
    {role === "admin" ? "Admin" : "Atendente"}
  </Badge>
);

const StatusBadge: React.FC<{ status: "active" | "inactive" }> = ({
  status,
}) => (
  <Badge variant={status === "active" ? "success" : "warning"}>
    {status === "active" ? "Ativo" : "Inativo"}
  </Badge>
);

const Divider: React.FC = () => (
  <div className="h-px w-full bg-gray-100" />
);

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed right-6 top-20 z-50 flex flex-col gap-3">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg"
      >
        {toast.type === "success" && (
          <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
        )}
        {toast.type === "error" && (
          <AlertTriangleIcon className="h-4 w-4 text-rose-500" />
        )}
        {toast.type === "info" && (
          <Settings2Icon className="h-4 w-4 text-blue-500" />
        )}
        <span className="text-sm text-gray-700">{toast.message}</span>
      </div>
    ))}
  </div>
);

const Modal: React.FC<{
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, description, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onAction: () => void }> = ({ onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
      <UsersIcon className="h-6 w-6 text-gray-400" />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-gray-800">
      Nenhum atendente cadastrado
    </h3>
    <p className="mt-2 max-w-md text-sm text-gray-500">
      Adicione pessoas para começar a distribuir conversas, definir setores e
      permissões.
    </p>
    <button
      type="button"
      onClick={onAction}
      className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300"
    >
      + Convidar atendente
    </button>
  </div>
);

const SkeletonRow: React.FC = () => (
  <div className="grid grid-cols-12 gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4">
    <div className="col-span-3 h-4 w-full animate-pulse rounded bg-gray-100" />
    <div className="col-span-3 h-4 w-full animate-pulse rounded bg-gray-100" />
    <div className="col-span-2 h-4 w-full animate-pulse rounded bg-gray-100" />
    <div className="col-span-2 h-4 w-full animate-pulse rounded bg-gray-100" />
    <div className="col-span-2 h-4 w-full animate-pulse rounded bg-gray-100" />
  </div>
);

export const AttendantsPage: React.FC = () => {
  const { clinicId, membership } = useClinic();
  const isAdmin = membership?.role === "admin";

  const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<
    Record<string, string[]>
  >({});
  const [hasDepartmentMembers, setHasDepartmentMembers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminCount, setAdminCount] = useState(0);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [activeModal, setActiveModal] = useState<ModalMode | null>(null);
  const [editingUser, setEditingUser] = useState<ClinicUser | null>(null);
  const [editRole, setEditRole] = useState<Role>("agent");
  const [editDepartmentId, setEditDepartmentId] = useState<string | null>(null);
  const [editDepartments, setEditDepartments] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { toasts, pushToast } = useToasts();

  const departmentsById = useMemo(() => {
    return departments.reduce<Record<string, Department>>((acc, dept) => {
      acc[dept.id] = dept;
      return acc;
    }, {});
  }, [departments]);

  const activeDepartments = useMemo(
    () => departments.filter((dept) => dept.is_active),
    [departments],
  );

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return clinicUsers.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.user_id.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesDepartment =
        departmentFilter === "all" ||
        user.department_id === departmentFilter;
      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [clinicUsers, departmentFilter, roleFilter, search]);

  const handleActionError = useCallback(
    (errorDetail: ActionError) => {
      if (errorDetail.isPermission) {
        pushToast(buildToast("Você não tem permissão para esta ação", "error"));
      } else {
        pushToast(buildToast(errorDetail.message, "error"));
      }
    },
    [pushToast],
  );

  const countAdmins = useCallback(async () => {
    if (!clinicId) return 0;
    const { count, error: countError } = await supabase
      .from("clinic_users")
      .select("user_id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("role", "admin");

    if (countError) {
      handleActionError({
        message: countError.message,
        isPermission: isPermissionError(countError),
      });
      return 0;
    }

    return count ?? 0;
  }, [clinicId, handleActionError]);

  const fetchClinicUsers = useCallback(async () => {
    if (!clinicId) return [];

    const { data, error: fetchError } = await supabase
      .from("clinic_users")
      .select("clinic_id, user_id, role, name, department_id")
      .eq("clinic_id", clinicId)
      .order("role", { ascending: false })
      .order("name", { ascending: true, nullsFirst: false });

    if (fetchError) {
      throw fetchError;
    }

    // Caso exista uma view/RPC que exponha email, mapeie aqui.
    return (data ?? []) as ClinicUser[];
  }, [clinicId]);

  const fetchDepartments = useCallback(async () => {
    if (!clinicId) return [];

    const { data, error: fetchError } = await supabase
      .from("departments")
      .select(
        "id, clinic_id, name, slug, description, is_default, is_active, created_at, updated_at",
      )
      .eq("clinic_id", clinicId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return (data ?? []) as Department[];
  }, [clinicId]);

  const fetchDepartmentMembers = useCallback(
    async (departmentIds: string[]) => {
      if (departmentIds.length === 0) {
        return { available: true, data: {} as Record<string, string[]> };
      }

      const { data, error: fetchError } = await supabase
        .from("department_members")
        .select("department_id, clinic_user_id")
        .in("department_id", departmentIds);

      if (fetchError?.code === "42P01") {
        return { available: false, data: {} as Record<string, string[]> };
      }

      if (fetchError) {
        throw fetchError;
      }

      const map = (data ?? []).reduce<Record<string, string[]>>(
        (acc, row: DepartmentMemberRow) => {
          if (!acc[row.clinic_user_id]) {
            acc[row.clinic_user_id] = [];
          }
          acc[row.clinic_user_id].push(row.department_id);
          return acc;
        },
        {},
      );

      return { available: true, data: map };
    },
    [],
  );

  const updateClinicUserRole = useCallback(
    async (userId: string, role: Role) => {
      if (!clinicId) return;

      const { error: updateError } = await supabase
        .from("clinic_users")
        .update({ role })
        .eq("clinic_id", clinicId)
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }
    },
    [clinicId],
  );

  const updateClinicUserDepartment = useCallback(
    async (userId: string, departmentId: string | null) => {
      if (!clinicId) return;

      const { error: updateError } = await supabase
        .from("clinic_users")
        .update({ department_id: departmentId })
        .eq("clinic_id", clinicId)
        .eq("user_id", userId);

      if (updateError) {
        throw updateError;
      }
    },
    [clinicId],
  );

  const setUserDepartments = useCallback(
    async (userId: string, nextDepartmentIds: string[]) => {
      if (!hasDepartmentMembers) return;
      const current = new Set(departmentMembers[userId] ?? []);
      const next = new Set(nextDepartmentIds);

      const toAdd = [...next].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !next.has(id));

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("department_members")
          .insert(
            toAdd.map((departmentId) => ({
              department_id: departmentId,
              clinic_user_id: userId,
            })),
          );

        if (insertError) {
          throw insertError;
        }
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("department_members")
          .delete()
          .eq("clinic_user_id", userId)
          .in("department_id", toRemove);

        if (deleteError) {
          throw deleteError;
        }
      }
    },
    [departmentMembers, hasDepartmentMembers],
  );

  const refreshData = useCallback(async () => {
    if (!clinicId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [users, departments] = await Promise.all([
        fetchClinicUsers(),
        fetchDepartments(),
      ]);
      const adminCountValue = await countAdmins();

      setClinicUsers(users);
      setDepartments(departments);
      setAdminCount(adminCountValue);

      const { available, data } = await fetchDepartmentMembers(
        departments.map((dept) => dept.id),
      );
      setHasDepartmentMembers(available);
      setDepartmentMembers(data);
    } catch (fetchError: any) {
      setError(fetchError.message ?? "Erro ao carregar atendentes");
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, countAdmins, fetchClinicUsers, fetchDepartments, fetchDepartmentMembers]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleOpenEdit = (user: ClinicUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDepartmentId(user.department_id ?? null);
    const memberDepartments = departmentMembers[user.user_id] ?? [];
    setEditDepartments(memberDepartments);
    setActiveModal("edit");
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingUser(null);
  };

  const handleRoleChange = (value: Role) => {
    setEditRole(value);
  };

  const handleDepartmentChange = (value: string) => {
    const next = value || null;
    setEditDepartmentId(next);
    if (!next || !hasDepartmentMembers) return;
    setEditDepartments((prev) =>
      prev.includes(next) ? prev : [...prev, next],
    );
  };

  const handleToggleDepartment = (departmentId: string) => {
    setEditDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId],
    );
  };

  const isLastAdminDemotion = useMemo(() => {
    if (!editingUser) return false;
    return (
      editingUser.role === "admin" && editRole === "agent" && adminCount <= 1
    );
  }, [adminCount, editRole, editingUser]);

  const handleSave = async () => {
    if (!editingUser || !clinicId) return;

    if (isLastAdminDemotion) {
      pushToast(
        buildToast("Você não pode rebaixar o último admin da clínica", "error"),
      );
      return;
    }

    setIsSaving(true);

    try {
      const updates: Promise<void>[] = [];

      if (editingUser.role !== editRole) {
        updates.push(updateClinicUserRole(editingUser.user_id, editRole));
      }

      if (editingUser.department_id !== editDepartmentId) {
        updates.push(
          updateClinicUserDepartment(editingUser.user_id, editDepartmentId),
        );
      }

      await Promise.all(updates);

      if (hasDepartmentMembers) {
        const nextDepartments = new Set(editDepartments);
        if (editDepartmentId) {
          nextDepartments.add(editDepartmentId);
        }
        await setUserDepartments(editingUser.user_id, [...nextDepartments]);
      }

      pushToast(buildToast("Alterações salvas com sucesso", "success"));
      await refreshData();
      handleCloseModal();
    } catch (saveError: any) {
      handleActionError({
        message: saveError.message ?? "Erro ao salvar alterações",
        isPermission: isPermissionError(saveError),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAccess = async () => {
    if (!editingUser || !clinicId) return;

    setIsRemoving(true);

    try {
      const { error: deleteError } = await supabase
        .from("clinic_users")
        .delete()
        .eq("clinic_id", clinicId)
        .eq("user_id", editingUser.user_id);

      if (deleteError) {
        throw deleteError;
      }

      pushToast(buildToast("Acesso removido com sucesso", "success"));
      await refreshData();
      handleCloseModal();
    } catch (removeError: any) {
      handleActionError({
        message: removeError.message ?? "Erro ao remover acesso",
        isPermission: isPermissionError(removeError),
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-gray-50">
      <ToastList toasts={toasts} />
      <div className="border-b bg-white px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Atendentes
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Apenas administradores podem editar permissões e vínculos.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-1 items-center gap-3">
              <Input
                placeholder="Buscar por nome, email ou ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="hidden items-center gap-2 text-sm text-gray-500 md:flex">
                <FilterIcon className="h-4 w-4" />
                Filtros
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-gray-500">
                Role
                <div className="relative mt-1">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                    className="w-36 appearance-none rounded-full border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Admin</option>
                    <option value="agent">Atendente</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </label>
              <label className="text-xs font-medium text-gray-500">
                Setor principal
                <div className="relative mt-1">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-48 appearance-none rounded-full border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">Todos</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </label>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="h-5 w-5" />
              <div>
                <p className="font-semibold">Erro ao carregar atendentes</p>
                <p className="mt-1 text-rose-600">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshData}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <SkeletonRow key={index} />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            onAction={() =>
              pushToast(
                buildToast(
                  "Convites são enviados pelo painel administrativo.",
                  "info",
                ),
              )
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-4 px-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span className="col-span-3">Nome</span>
              <span className="col-span-3">Email / ID</span>
              <span className="col-span-2">Role</span>
              <span className="col-span-2">Setor principal</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1 text-right">Ações</span>
            </div>
            <Divider />
            {filteredUsers.map((user) => {
              const department = user.department_id
                ? departmentsById[user.department_id]
                : null;
              return (
                <div
                  key={user.user_id}
                  className="grid grid-cols-12 items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-gray-800">
                      {user.name?.trim() || "Sem nome"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.user_id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-700">
                      {user.email || user.user_id}
                    </p>
                    {!user.email && (
                      <p className="text-xs text-gray-400">
                        Email não disponível no client.
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-700">
                      {department?.name || "Sem setor"}
                    </div>
                    {department && !department.is_active && (
                      <Badge variant="warning">Inativo</Badge>
                    )}
                  </div>
                  <div className="col-span-1">
                    <StatusBadge status="active" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!isAdmin}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        title={
          activeModal === "remove"
            ? "Remover acesso"
            : "Editar atendente"
        }
        description={
          editingUser
            ? `Gerencie permissões e vínculos para ${
                editingUser.name ?? editingUser.user_id
              }.`
            : undefined
        }
        isOpen={activeModal === "edit" && !!editingUser}
        onClose={handleCloseModal}
      >
        {editingUser && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Role
                <select
                  value={editRole}
                  onChange={(e) => handleRoleChange(e.target.value as Role)}
                  disabled={!isAdmin}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                >
                  <option value="admin">Admin</option>
                  <option value="agent">Atendente</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Setor principal
                <select
                  value={editDepartmentId ?? ""}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  disabled={!isAdmin}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                >
                  <option value="">Sem setor</option>
                  {activeDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {editingUser.department_id &&
                  departmentsById[editingUser.department_id] &&
                  !departmentsById[editingUser.department_id].is_active && (
                    <p className="mt-2 text-xs text-amber-600">
                      O setor atual está inativo. Escolha outro setor ativo.
                    </p>
                  )}
              </label>
            </div>

            {hasDepartmentMembers && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Setores atendidos
                    </p>
                    <p className="text-xs text-gray-500">
                      Marque todos os setores em que esta pessoa atua.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {activeDepartments.map((dept) => (
                    <label
                      key={dept.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={editDepartments.includes(dept.id)}
                        onChange={() => handleToggleDepartment(dept.id)}
                        disabled={!isAdmin}
                      />
                      <span>{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {isLastAdminDemotion && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Você não pode rebaixar o último admin da clínica.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setActiveModal("remove")}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isAdmin}
              >
                <Trash2Icon className="h-4 w-4" />
                Remover acesso
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isAdmin || isSaving}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Confirmar remoção"
        description="Isso remove o vínculo do usuário com a clínica. A conta continuará existindo no Supabase Auth."
        isOpen={activeModal === "remove" && !!editingUser}
        onClose={handleCloseModal}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja remover o acesso? Esta ação não pode ser
            desfeita.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveModal("edit")}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleRemoveAccess}
              disabled={!isAdmin || isRemoving}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
            >
              {isRemoving ? "Removendo..." : "Remover acesso"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
