import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClinic } from "../contexts/ClinicContext";
import { supabase } from "../lib/supabaseClient";
import {
  fetchBacklog,
  fetchInboxAnalytics,
  type AnalyticsFilters,
  type AnalyticsResponse,
  type BacklogItem,
} from "../services/inboxAnalytics";

const CHANNEL_OPTIONS = ["whatsapp", "instagram", "messenger"];
const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  unknown: "Outro",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#22c55e",
  instagram: "#ec4899",
  messenger: "#3b82f6",
  unknown: "#94a3b8",
};

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  return {
    start: dateInputValue(start),
    end: dateInputValue(end),
  };
};

const formatSeconds = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;

  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const KpiSkeleton = () => (
  <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
);

const HorizontalBars = ({
  rows,
  labelKey,
  valueKey,
  color,
}: {
  rows: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
  color?: string;
}) => {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados no período.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const label = String(row[labelKey] || "-");
        const value = Number(row[valueKey] || 0);
        const width = Math.max(6, (value / max) * 100);

        return (
          <div key={`${label}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="truncate">{label}</span>
              <span className="font-medium text-slate-800">{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: color ?? "#2563eb",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DailyLeadsChart = ({ rows }: { rows: Array<{ day: string; leads: number }> }) => {
  const max = Math.max(1, ...rows.map((row) => row.leads));

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados no período.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.day} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-slate-600">{row.day}</span>
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-cyan-500"
              style={{ width: `${Math.max(4, (row.leads / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-medium text-slate-700">
            {row.leads}
          </span>
        </div>
      ))}
    </div>
  );
};

export const InboxAnalyticsDashboard: React.FC = () => {
  const { clinicId } = useClinic();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaults = useMemo(() => defaultDateRange(), []);

  const [draftStart, setDraftStart] = useState(
    searchParams.get("start") ?? defaults.start,
  );
  const [draftEnd, setDraftEnd] = useState(searchParams.get("end") ?? defaults.end);
  const [draftChannels, setDraftChannels] = useState<string[]>(
    searchParams.getAll("channel"),
  );
  const [draftDepartmentId, setDraftDepartmentId] = useState(
    searchParams.get("department_id") ?? "",
  );
  const [draftAssignedUserId, setDraftAssignedUserId] = useState(
    searchParams.get("assigned_user_id") ?? "",
  );

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);

  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [users, setUsers] = useState<Array<{ user_id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filters = useMemo<AnalyticsFilters | null>(() => {
    if (!clinicId) return null;

    const urlStart = searchParams.get("start") ?? defaults.start;
    const urlEnd = searchParams.get("end") ?? defaults.end;

    return {
      clinicId,
      start: new Date(`${urlStart}T00:00:00`).toISOString(),
      end: new Date(`${urlEnd}T23:59:59`).toISOString(),
      channels: searchParams.getAll("channel"),
      departmentId: searchParams.get("department_id") ?? undefined,
      assignedUserId: searchParams.get("assigned_user_id") ?? undefined,
    };
  }, [clinicId, searchParams, defaults.end, defaults.start]);

  useEffect(() => {
    const nextStart = searchParams.get("start") ?? defaults.start;
    const nextEnd = searchParams.get("end") ?? defaults.end;

    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setDraftChannels(searchParams.getAll("channel"));
    setDraftDepartmentId(searchParams.get("department_id") ?? "");
    setDraftAssignedUserId(searchParams.get("assigned_user_id") ?? "");
  }, [defaults.end, defaults.start, searchParams]);

  useEffect(() => {
    if (!clinicId) return;

    Promise.all([
      supabase
        .from("departments")
        .select("id,name")
        .eq("clinic_id", clinicId)
        .order("name"),
      supabase
        .from("clinic_users")
        .select("user_id,name")
        .eq("clinic_id", clinicId)
        .order("name"),
    ]).then(([depRes, usersRes]) => {
      if (!depRes.error) {
        setDepartments(depRes.data ?? []);
      }
      if (!usersRes.error) {
        setUsers(usersRes.data ?? []);
      }
    });
  }, [clinicId]);

  useEffect(() => {
    if (!filters) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [analyticsResult, backlogResult] = await Promise.all([
          fetchInboxAnalytics(filters),
          fetchBacklog(filters),
        ]);

        setAnalytics(analyticsResult);
        setBacklog(backlogResult);
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Erro ao carregar analytics.";

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [filters]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("start", draftStart);
    params.set("end", draftEnd);
    draftChannels.forEach((channel) => params.append("channel", channel));

    if (draftDepartmentId) {
      params.set("department_id", draftDepartmentId);
    }
    if (draftAssignedUserId) {
      params.set("assigned_user_id", draftAssignedUserId);
    }

    setSearchParams(params);
  };

  const clearFilters = () => {
    const range = defaultDateRange();

    setSearchParams(
      new URLSearchParams({
        start: range.start,
        end: range.end,
      }),
    );
  };

  const toggleChannel = (channel: string) => {
    setDraftChannels((previous) =>
      previous.includes(channel)
        ? previous.filter((item) => item !== channel)
        : [...previous, channel],
    );
  };

  const backlogPage = useMemo(() => {
    const startIndex = (page - 1) * 20;

    return backlog.slice(startIndex, startIndex + 20);
  }, [backlog, page]);

  useEffect(() => {
    setPage(1);
  }, [backlog]);

  const totalPages = Math.max(1, Math.ceil(backlog.length / 20));
  const hasData = !!analytics && analytics.kpis.leads > 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">
                Métricas de aquisição, operação e SLA
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <input
              type="date"
              value={draftStart}
              onChange={(event) => setDraftStart(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={draftEnd}
              onChange={(event) => setDraftEnd(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />

            <div className="rounded-md border border-slate-300 p-2">
              <p className="mb-2 text-xs text-slate-500">Canal</p>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-full px-2 py-1 text-xs ${
                      draftChannels.includes(channel)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {CHANNEL_LABEL[channel]}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={draftDepartmentId}
              onChange={(event) => setDraftDepartmentId(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos departamentos</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>

            <select
              value={draftAssignedUserId}
              onChange={(event) => setDraftAssignedUserId(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos atendentes</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name || user.user_id}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Erro ao carregar analytics</p>
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={applyFilters}
              className="mt-3 rounded-md bg-red-600 px-3 py-2 text-sm text-white"
            >
              Tentar novamente
            </button>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          {loading || !analytics
            ? Array.from({ length: 4 }).map((_, index) => <KpiSkeleton key={index} />)
            : [
                { label: "Leads (chats criados)", value: analytics.kpis.leads },
                {
                  label: "Conversas Ativas",
                  value: analytics.kpis.activeConversations,
                },
                {
                  label: "Mensagens Recebidas",
                  value: analytics.kpis.inboundMessages,
                },
                {
                  label: "Mensagens Enviadas",
                  value: analytics.kpis.outboundMessages,
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {item.value}
                  </p>
                </article>
              ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {loading || !analytics
            ? Array.from({ length: 3 }).map((_, index) => <KpiSkeleton key={index} />)
            : [
                {
                  label: "p50 1ª resposta",
                  value: formatSeconds(analytics.kpis.p50FirstResponseSec),
                },
                {
                  label: "p90 1ª resposta",
                  value: formatSeconds(analytics.kpis.p90FirstResponseSec),
                },
                {
                  label: "% dentro do SLA (<= 2 min)",
                  value:
                    analytics.kpis.withinSlaPct !== null
                      ? `${analytics.kpis.withinSlaPct}%`
                      : "-",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {item.value}
                  </p>
                </article>
              ))}
        </section>

        {!loading && !error && !hasData ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            <p className="font-medium">Nenhum dado para o período selecionado.</p>
            <p className="text-sm">Tente ampliar o período.</p>
          </section>
        ) : null}

        {analytics ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Leads por Canal
              </h2>
              <div className="space-y-3">
                {analytics.leadsByChannel.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem dados no período.</p>
                ) : (
                  analytics.leadsByChannel.map((item) => (
                    <div key={item.channel} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>{CHANNEL_LABEL[item.channel] ?? item.channel}</span>
                        <span>{item.leads}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.max(
                              6,
                              (item.leads / Math.max(1, analytics.kpis.leads)) * 100,
                            )}%`,
                            backgroundColor:
                              CHANNEL_COLORS[item.channel] ?? CHANNEL_COLORS.unknown,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Leads por Departamento
              </h2>
              <HorizontalBars
                rows={analytics.leadsByDepartment}
                labelKey="department"
                valueKey="leads"
              />
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Evolução diária de Leads
              </h2>
              <DailyLeadsChart rows={analytics.dailyLeads} />
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                SLA 1ª resposta por Canal
              </h2>
              <HorizontalBars
                rows={analytics.slaByChannel.map((item) => ({
                  canal: CHANNEL_LABEL[item.channel] ?? item.channel,
                  p50: Math.round(item.p50Sec),
                  p90: Math.round(item.p90Sec),
                }))}
                labelKey="canal"
                valueKey="p90"
                color="#14b8a6"
              />
              <p className="mt-3 text-xs text-slate-500">
                Valor exibido na barra: p90 (segundos). O p50 aparece no rótulo.
              </p>
            </article>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Backlog (sem resposta)
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-2 py-2">Contato</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2">Departamento</th>
                  <th className="px-2 py-2">Responsável</th>
                  <th className="px-2 py-2">Última mensagem</th>
                  <th className="px-2 py-2">Min sem resposta</th>
                </tr>
              </thead>

              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="px-2 py-3" colSpan={6}>
                          <div className="h-6 animate-pulse rounded bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  : backlogPage.length === 0
                    ? (
                      <tr>
                        <td
                          className="px-2 py-8 text-center text-slate-500"
                          colSpan={6}
                        >
                          Sem backlog para os filtros atuais.
                        </td>
                      </tr>
                      )
                    : backlogPage.map((item) => (
                        <tr
                          key={item.conversationId}
                          className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                          onClick={() => navigate(`/inbox/chat/${item.conversationId}`)}
                        >
                          <td className="px-2 py-2">{item.contact}</td>
                          <td className="px-2 py-2">
                            {CHANNEL_LABEL[item.channel] ?? item.channel}
                          </td>
                          <td className="px-2 py-2">{item.department}</td>
                          <td className="px-2 py-2">{item.assignedTo}</td>
                          <td className="px-2 py-2">
                            <p>{item.lastMessageText}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(item.lastMessageAt).toLocaleString()}
                            </p>
                          </td>
                          <td className="px-2 py-2">{item.minutesWaiting}</td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Próxima
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
