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
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#22c55e",
  instagram: "#ec4899",
  messenger: "#3b82f6",
  unknown: "#94a3b8",
};

const formatSeconds = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "-";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);
const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return { start: dateInputValue(start), end: dateInputValue(end) };
};

const kpiSkeleton = <div className="h-24 rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />;

const SimpleBarChart = ({ data, valueKey, labelKey }: { data: any[]; valueKey: string; labelKey: string }) => {
  const max = Math.max(1, ...data.map((item) => item[valueKey]));
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item[labelKey]} className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>{item[labelKey]}</span>
            <span>{item[valueKey]}</span>
          </div>
          <div className="h-2 rounded bg-slate-100">
            <div className="h-2 rounded bg-blue-500" style={{ width: `${(item[valueKey] / max) * 100}%` }} />
          </div>
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

  const [start, setStart] = useState(searchParams.get("start") ?? defaults.start);
  const [end, setEnd] = useState(searchParams.get("end") ?? defaults.end);
  const [channels, setChannels] = useState<string[]>(searchParams.getAll("channel"));
  const [departmentId, setDepartmentId] = useState(searchParams.get("department_id") ?? "");
  const [assignedUserId, setAssignedUserId] = useState(searchParams.get("assigned_user_id") ?? "");

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ user_id: string; name: string }>>([]);
  const [page, setPage] = useState(1);

  const filters = useMemo<AnalyticsFilters | null>(() => {
    if (!clinicId) return null;
    return {
      clinicId,
      start: new Date(`${start}T00:00:00`).toISOString(),
      end: new Date(`${end}T23:59:59`).toISOString(),
      channels,
      departmentId: departmentId || undefined,
      assignedUserId: assignedUserId || undefined,
    };
  }, [clinicId, start, end, channels, departmentId, assignedUserId]);

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([
      supabase.from("departments").select("id,name").eq("clinic_id", clinicId).order("name"),
      supabase.from("clinic_users").select("user_id,name").eq("clinic_id", clinicId).order("name"),
    ]).then(([depRes, usersRes]) => {
      if (!depRes.error) setDepartments(depRes.data ?? []);
      if (!usersRes.error) setUsers(usersRes.data ?? []);
    });
  }, [clinicId]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, backlogRes] = await Promise.all([fetchInboxAnalytics(filters), fetchBacklog(filters)]);
      setAnalytics(analyticsRes);
      setBacklog(backlogRes);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("start", start);
    params.set("end", end);
    channels.forEach((channel) => params.append("channel", channel));
    if (departmentId) params.set("department_id", departmentId);
    if (assignedUserId) params.set("assigned_user_id", assignedUserId);
    setSearchParams(params);
  };

  const clearFilters = () => {
    const range = defaultDateRange();
    setStart(range.start);
    setEnd(range.end);
    setChannels([]);
    setDepartmentId("");
    setAssignedUserId("");
    setSearchParams(new URLSearchParams({ start: range.start, end: range.end }));
  };

  const backlogPage = useMemo(() => backlog.slice((page - 1) * 20, (page - 1) * 20 + 20), [backlog, page]);
  const totalPages = Math.max(1, Math.ceil(backlog.length / 20));
  const hasData = !!analytics && analytics.kpis.leads > 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">Métricas de aquisição, operação e SLA</p>
          </div>
          <div className="grid w-full gap-3 lg:w-auto lg:grid-cols-5">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <div className="rounded-md border border-slate-300 p-2 text-xs">
              <p className="mb-1 text-slate-500">Canal</p>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((option) => (
                  <button key={option} type="button" onClick={() => setChannels((prev) => prev.includes(option) ? prev.filter((c) => c !== option) : [...prev, option])} className={`rounded-full px-2 py-1 ${channels.includes(option) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{option}</button>
                ))}
              </div>
            </div>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todos departamentos</option>
              {departments.map((dep) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
            </select>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todos atendentes</option>
              {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name || user.user_id}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={applyFilters} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">Aplicar</button>
            <button onClick={clearFilters} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Limpar</button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><p className="font-medium">Erro ao carregar analytics</p><button onClick={fetchData} className="mt-3 rounded-md bg-red-600 px-3 py-2 text-sm text-white">Tentar novamente</button></div>}

        <div className="grid gap-4 md:grid-cols-4">
          {loading || !analytics ? Array.from({ length: 4 }).map((_, idx) => <React.Fragment key={idx}>{kpiSkeleton}</React.Fragment>) : [
            { label: "Leads (chats criados)", value: analytics.kpis.leads },
            { label: "Conversas Ativas", value: analytics.kpis.activeConversations },
            { label: "Mensagens Recebidas", value: analytics.kpis.inboundMessages },
            { label: "Mensagens Enviadas", value: analytics.kpis.outboundMessages },
          ].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p></div>)}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {loading || !analytics ? Array.from({ length: 3 }).map((_, idx) => <React.Fragment key={idx}>{kpiSkeleton}</React.Fragment>) : [
            { label: "p50 1ª resposta", value: formatSeconds(analytics.kpis.p50FirstResponseSec) },
            { label: "p90 1ª resposta", value: formatSeconds(analytics.kpis.p90FirstResponseSec) },
            { label: "% dentro do SLA (<= 2 min)", value: analytics.kpis.withinSlaPct !== null ? `${analytics.kpis.withinSlaPct}%` : "-" },
          ].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p></div>)}
        </div>

        {!loading && !error && !hasData && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600"><p className="font-medium">Nenhum dado para o período selecionado.</p><p className="text-sm">Tente ampliar o período.</p></div>}

        {analytics && <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-700">Leads por Canal</h2>{analytics.leadsByChannel.map((item) => <div key={item.channel} className="mb-2"><div className="mb-1 flex justify-between text-xs"><span>{item.channel}</span><span>{item.leads}</span></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded" style={{ width: `${(item.leads / Math.max(1, analytics.kpis.leads)) * 100}%`, background: CHANNEL_COLORS[item.channel] ?? CHANNEL_COLORS.unknown }} /></div></div>)}</div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-700">Leads por Departamento</h2><SimpleBarChart data={analytics.leadsByDepartment} valueKey="leads" labelKey="department" /></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-700">Evolução diária de Leads</h2><SimpleBarChart data={analytics.dailyLeads} valueKey="leads" labelKey="day" /></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-sm font-semibold text-slate-700">SLA 1ª resposta por Canal</h2><SimpleBarChart data={analytics.slaByChannel.map((item) => ({ channel: `${item.channel} (p50/p90 ${Math.round(item.p50Sec)}/${Math.round(item.p90Sec)})`, total: Math.round(item.p90Sec) }))} valueKey="total" labelKey="channel" /></div>
        </div>}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Backlog (sem resposta)</h2>
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="px-2 py-2">Contato</th><th className="px-2 py-2">Canal</th><th className="px-2 py-2">Departamento</th><th className="px-2 py-2">Responsável</th><th className="px-2 py-2">Última mensagem</th><th className="px-2 py-2">Min sem resposta</th></tr></thead><tbody>{loading ? Array.from({ length: 5 }).map((_, idx) => <tr key={idx}><td className="px-2 py-3" colSpan={6}><div className="h-6 animate-pulse rounded bg-slate-100" /></td></tr>) : backlogPage.map((item) => <tr key={item.conversationId} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => navigate(`/inbox/chat/${item.conversationId}`)}><td className="px-2 py-2">{item.contact}</td><td className="px-2 py-2">{item.channel}</td><td className="px-2 py-2">{item.department}</td><td className="px-2 py-2">{item.assignedTo}</td><td className="px-2 py-2">{new Date(item.lastMessageAt).toLocaleString()}</td><td className="px-2 py-2">{item.minutesWaiting}</td></tr>)}</tbody></table></div>
          <div className="mt-4 flex items-center justify-end gap-2 text-sm"><button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button><span>Página {page} de {totalPages}</span><button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</button></div>
        </div>
      </div>
    </div>
  );
};
