import { supabase } from "../lib/supabaseClient";

export type AnalyticsFilters = {
  clinicId: string;
  start: string;
  end: string;
  channels: string[];
  departmentId?: string;
  assignedUserId?: string;
};

export type SlaByChannel = {
  channel: string;
  p50Sec: number;
  p90Sec: number;
  withinSlaPct: number;
};

export type AnalyticsResponse = {
  kpis: {
    leads: number;
    activeConversations: number;
    inboundMessages: number;
    outboundMessages: number;
    p50FirstResponseSec: number | null;
    p90FirstResponseSec: number | null;
    withinSlaPct: number | null;
  };
  leadsByChannel: Array<{ channel: string; leads: number }>;
  leadsByDepartment: Array<{ department: string; leads: number }>;
  dailyLeads: Array<{ day: string; leads: number }>;
  slaByChannel: SlaByChannel[];
  funnelByChannel: Array<{ channel: string; converted: number; lost: number }>;
};

const applyConversationFilters = (
  rows: any[],
  filters: AnalyticsFilters,
) => {
  const start = new Date(filters.start).getTime();
  const end = new Date(filters.end).getTime();

  return rows.filter((row) => {
    if (row.clinic_id !== filters.clinicId) return false;
    if (filters.channels.length > 0 && row.channel && !filters.channels.includes(row.channel)) return false;
    if (filters.departmentId && row.department_id !== filters.departmentId) return false;
    if (filters.assignedUserId && row.assigned_user_id !== filters.assignedUserId) return false;

    const createdAt = row.created_at ? new Date(row.created_at).getTime() : null;
    if (createdAt === null || Number.isNaN(createdAt)) return false;

    return createdAt >= start && createdAt < end;
  });
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const fetchInboxAnalytics = async (
  filters: AnalyticsFilters,
): Promise<AnalyticsResponse> => {
  const { data: conversationsData, error: convError } = await supabase
    .from("conversations")
    .select("id,clinic_id,channel,department_id,assigned_user_id,status,created_at")
    .eq("clinic_id", filters.clinicId)
    .gte("created_at", filters.start)
    .lt("created_at", filters.end);

  if (convError) throw convError;

  const filteredConversations = applyConversationFilters(conversationsData ?? [], filters);
  const conversationIds = filteredConversations.map((c) => c.id);

  const [departmentsRes, messagesRes, eventsRes] = await Promise.all([
    supabase.from("departments").select("id,name").eq("clinic_id", filters.clinicId),
    conversationIds.length
      ? supabase
          .from("messages")
          .select("conversation_id,direction,created_at")
          .in("conversation_id", conversationIds)
          .gte("created_at", filters.start)
          .lt("created_at", filters.end)
      : Promise.resolve({ data: [], error: null } as any),
    conversationIds.length
      ? supabase
          .from("conversation_events")
          .select("conversation_id,event_type,metadata,created_at")
          .in("conversation_id", conversationIds)
          .gte("created_at", filters.start)
          .lt("created_at", filters.end)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (departmentsRes.error) throw departmentsRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const departmentsMap = new Map((departmentsRes.data ?? []).map((d) => [d.id, d.name]));
  const messages = messagesRes.data ?? [];
  const events = eventsRes.data ?? [];

  const leadsByChannelMap = new Map<string, number>();
  const leadsByDepartmentMap = new Map<string, number>();
  const dailyLeadsMap = new Map<string, number>();

  filteredConversations.forEach((conv) => {
    const channel = conv.channel ?? "unknown";
    leadsByChannelMap.set(channel, (leadsByChannelMap.get(channel) ?? 0) + 1);

    const department = conv.department_id ? departmentsMap.get(conv.department_id) ?? "Sem departamento" : "Sem departamento";
    leadsByDepartmentMap.set(department, (leadsByDepartmentMap.get(department) ?? 0) + 1);

    const day = (conv.created_at ?? "").slice(0, 10);
    if (day) dailyLeadsMap.set(day, (dailyLeadsMap.get(day) ?? 0) + 1);
  });

  const inboundMessages = messages.filter((m) => m.direction === "inbound").length;
  const outboundMessages = messages.filter((m) => m.direction === "outbound").length;
  const activeConversations = filteredConversations.filter((c) => c.status === "open" || c.status === "pending").length;

  const slaEvents = events.filter((e) => e.event_type === "sla.first_response");

  const responseSecondsByConversation = new Map<string, { channel: string; seconds: number }>();

  if (slaEvents.length > 0) {
    const conversationMap = new Map(filteredConversations.map((c) => [c.id, c]));
    slaEvents.forEach((event) => {
      const conv = conversationMap.get(event.conversation_id);
      const sec = Number((event.metadata as any)?.seconds);
      if (!conv || Number.isNaN(sec) || sec < 0) return;
      responseSecondsByConversation.set(event.conversation_id, {
        channel: conv.channel ?? "unknown",
        seconds: sec,
      });
    });
  } else if (conversationIds.length) {
    const { data: allMessages, error: allMsgError } = await supabase
      .from("messages")
      .select("conversation_id,direction,created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (allMsgError) throw allMsgError;

    const firstInbound = new Map<string, string>();
    const firstOutbound = new Map<string, string>();

    (allMessages ?? []).forEach((message) => {
      if (message.direction === "inbound" && !firstInbound.has(message.conversation_id)) {
        firstInbound.set(message.conversation_id, message.created_at);
      }
      if (message.direction === "outbound" && !firstOutbound.has(message.conversation_id)) {
        firstOutbound.set(message.conversation_id, message.created_at);
      }
    });

    filteredConversations.forEach((conv) => {
      const inbound = firstInbound.get(conv.id);
      const outbound = firstOutbound.get(conv.id);
      if (!inbound || !outbound) return;
      const diffSec = (new Date(outbound).getTime() - new Date(inbound).getTime()) / 1000;
      if (diffSec < 0) return;
      responseSecondsByConversation.set(conv.id, {
        channel: conv.channel ?? "unknown",
        seconds: diffSec,
      });
    });
  }

  const slaByChannelMap = new Map<string, number[]>();
  Array.from(responseSecondsByConversation.values()).forEach((entry) => {
    const current = slaByChannelMap.get(entry.channel) ?? [];
    current.push(entry.seconds);
    slaByChannelMap.set(entry.channel, current);
  });

  const slaByChannel: SlaByChannel[] = Array.from(slaByChannelMap.entries()).map(([channel, values]) => {
    const p50Sec = percentile(values, 0.5) ?? 0;
    const p90Sec = percentile(values, 0.9) ?? 0;
    const withinSlaPct = values.length
      ? round2((values.filter((v) => v <= 120).length / values.length) * 100)
      : 0;
    return {
      channel,
      p50Sec: round2(p50Sec),
      p90Sec: round2(p90Sec),
      withinSlaPct,
    };
  });

  const allSlaValues = Array.from(responseSecondsByConversation.values()).map((item) => item.seconds);

  const funnelByChannelMap = new Map<string, { converted: number; lost: number }>();
  filteredConversations.forEach((conv) => {
    const channel = conv.channel ?? "unknown";
    if (!funnelByChannelMap.has(channel)) {
      funnelByChannelMap.set(channel, { converted: 0, lost: 0 });
    }
  });

  const conversationMap = new Map(filteredConversations.map((c) => [c.id, c]));
  events.forEach((event) => {
    if (event.event_type !== "lead.converted" && event.event_type !== "lead.lost") return;
    const conv = conversationMap.get(event.conversation_id);
    const channel = conv?.channel ?? "unknown";
    const current = funnelByChannelMap.get(channel) ?? { converted: 0, lost: 0 };
    if (event.event_type === "lead.converted") current.converted += 1;
    if (event.event_type === "lead.lost") current.lost += 1;
    funnelByChannelMap.set(channel, current);
  });

  return {
    kpis: {
      leads: filteredConversations.length,
      activeConversations,
      inboundMessages,
      outboundMessages,
      p50FirstResponseSec: percentile(allSlaValues, 0.5),
      p90FirstResponseSec: percentile(allSlaValues, 0.9),
      withinSlaPct: allSlaValues.length
        ? round2((allSlaValues.filter((v) => v <= 120).length / allSlaValues.length) * 100)
        : null,
    },
    leadsByChannel: Array.from(leadsByChannelMap.entries())
      .map(([channel, leads]) => ({ channel, leads }))
      .sort((a, b) => b.leads - a.leads),
    leadsByDepartment: Array.from(leadsByDepartmentMap.entries())
      .map(([department, leads]) => ({ department, leads }))
      .sort((a, b) => b.leads - a.leads),
    dailyLeads: Array.from(dailyLeadsMap.entries())
      .map(([day, leads]) => ({ day, leads }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    slaByChannel,
    funnelByChannel: Array.from(funnelByChannelMap.entries()).map(([channel, value]) => ({
      channel,
      converted: value.converted,
      lost: value.lost,
    })),
  };
};

export type BacklogItem = {
  conversationId: string;
  contact: string;
  channel: string;
  department: string;
  assignedTo: string;
  lastMessageAt: string;
  minutesWaiting: number;
};

export const fetchBacklog = async (
  filters: AnalyticsFilters,
): Promise<BacklogItem[]> => {
  let query = supabase
    .from("conversations")
    .select(
      "id,clinic_id,channel,department_id,assigned_user_id,status,last_message_at,contacts:contact_id(first_name,phone),departments:department_id(name),clinic_users:assigned_user_id(name,user_id)",
    )
    .eq("clinic_id", filters.clinicId)
    .in("status", ["open", "pending"])
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (filters.channels.length > 0) query = query.in("channel", filters.channels);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.assignedUserId) query = query.eq("assigned_user_id", filters.assignedUserId);

  const { data: conversations, error } = await query;
  if (error) throw error;

  if (!(conversations ?? []).length) return [];

  const ids = (conversations ?? []).map((c) => c.id);
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("conversation_id,direction,created_at,text")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false });

  if (messagesError) throw messagesError;

  const lastMessageByConversation = new Map<string, { direction: string; created_at: string }>();
  (messages ?? []).forEach((message) => {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message);
    }
  });

  return (conversations ?? [])
    .map((conv) => {
      const lastMessage = lastMessageByConversation.get(conv.id);
      if (!lastMessage || lastMessage.direction !== "inbound") return null;

      const minutesWaiting = (Date.now() - new Date(lastMessage.created_at).getTime()) / 1000 / 60;

      return {
        conversationId: conv.id,
        contact: (conv.contacts as any)?.first_name ?? (conv.contacts as any)?.phone ?? "Contato sem nome",
        channel: conv.channel ?? "unknown",
        department: (conv.departments as any)?.name ?? "Sem departamento",
        assignedTo: (conv.clinic_users as any)?.name ?? "Não atribuído",
        lastMessageAt: lastMessage.created_at,
        minutesWaiting: round2(minutesWaiting),
      };
    })
    .filter((item): item is BacklogItem => Boolean(item))
    .sort((a, b) => b.minutesWaiting - a.minutesWaiting);
};
