import { supabase } from "../lib/supabaseClient";

export type AnalyticsFilters = {
  clinicId: string;
  start: string;
  end: string;
  channels: string[];
  departmentId?: string;
  assignedUserId?: string;
};

type ConversationRow = {
  id: string;
  clinic_id: string;
  channel: string | null;
  department_id: string | null;
  assigned_user_id: string | null;
  status: string | null;
  created_at: string;
};

type MessageRow = {
  conversation_id: string;
  direction: string | null;
  created_at: string;
  text?: string | null;
};

type ConversationEventRow = {
  conversation_id: string;
  event_type: string;
  metadata: { seconds?: number | string } | null;
  created_at: string;
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

const applyConversationOptionalFilters = <T extends { channel: string | null; department_id: string | null; assigned_user_id: string | null }>(
  query: TQuery<T>,
  filters: AnalyticsFilters,
): TQuery<T> => {
  let nextQuery = query;

  if (filters.channels.length > 0) {
    nextQuery = nextQuery.in("channel", filters.channels);
  }
  if (filters.departmentId) {
    nextQuery = nextQuery.eq("department_id", filters.departmentId);
  }
  if (filters.assignedUserId) {
    nextQuery = nextQuery.eq("assigned_user_id", filters.assignedUserId);
  }

  return nextQuery;
};

type TQuery<T> = ReturnType<typeof supabase.from<T>>;

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);

  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const fetchInboxAnalytics = async (
  filters: AnalyticsFilters,
): Promise<AnalyticsResponse> => {
  const baseConversationsQuery = supabase
    .from("conversations")
    .select(
      "id,clinic_id,channel,department_id,assigned_user_id,status,created_at",
    )
    .eq("clinic_id", filters.clinicId)
    .gte("created_at", filters.start)
    .lt("created_at", filters.end);

  const { data: conversationsData, error: convError } = await applyConversationOptionalFilters(
    baseConversationsQuery,
    filters,
  );

  if (convError) throw convError;

  const conversations: ConversationRow[] = (conversationsData ?? []) as ConversationRow[];
  const conversationIds = conversations.map((conversation) => conversation.id);

  const [departmentsRes, messagesRes, eventsRes] = await Promise.all([
    supabase
      .from("departments")
      .select("id,name")
      .eq("clinic_id", filters.clinicId),
    conversationIds.length
      ? supabase
          .from("messages")
          .select("conversation_id,direction,created_at")
          .in("conversation_id", conversationIds)
          .gte("created_at", filters.start)
          .lt("created_at", filters.end)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? supabase
          .from("conversation_events")
          .select("conversation_id,event_type,metadata,created_at")
          .in("conversation_id", conversationIds)
          .gte("created_at", filters.start)
          .lt("created_at", filters.end)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (departmentsRes.error) throw departmentsRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const departmentsMap = new Map(
    (departmentsRes.data ?? []).map((department) => [department.id, department.name]),
  );
  const messages = (messagesRes.data ?? []) as MessageRow[];
  const events = (eventsRes.data ?? []) as ConversationEventRow[];

  const leadsByChannelMap = new Map<string, number>();
  const leadsByDepartmentMap = new Map<string, number>();
  const dailyLeadsMap = new Map<string, number>();

  conversations.forEach((conversation) => {
    const channel = conversation.channel ?? "unknown";
    const department = conversation.department_id
      ? departmentsMap.get(conversation.department_id) ?? "Sem departamento"
      : "Sem departamento";
    const day = conversation.created_at.slice(0, 10);

    leadsByChannelMap.set(channel, (leadsByChannelMap.get(channel) ?? 0) + 1);
    leadsByDepartmentMap.set(
      department,
      (leadsByDepartmentMap.get(department) ?? 0) + 1,
    );
    dailyLeadsMap.set(day, (dailyLeadsMap.get(day) ?? 0) + 1);
  });

  const inboundMessages = messages.filter(
    (message) => message.direction === "inbound",
  ).length;
  const outboundMessages = messages.filter(
    (message) => message.direction === "outbound",
  ).length;
  const activeConversations = conversations.filter(
    (conversation) =>
      conversation.status === "open" || conversation.status === "pending",
  ).length;

  const conversationMap = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const slaEvents = events.filter((event) => event.event_type === "sla.first_response");

  const responseSecondsByConversation = new Map<
    string,
    { channel: string; seconds: number }
  >();

  if (slaEvents.length > 0) {
    slaEvents.forEach((event) => {
      const conversation = conversationMap.get(event.conversation_id);
      const seconds = Number(event.metadata?.seconds);

      if (!conversation || Number.isNaN(seconds) || seconds < 0) return;

      responseSecondsByConversation.set(event.conversation_id, {
        channel: conversation.channel ?? "unknown",
        seconds,
      });
    });
  } else if (conversationIds.length > 0) {
    const { data: allMessagesData, error: allMessagesError } = await supabase
      .from("messages")
      .select("conversation_id,direction,created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (allMessagesError) throw allMessagesError;

    const allMessages = (allMessagesData ?? []) as MessageRow[];
    const firstInboundMap = new Map<string, string>();
    const firstOutboundMap = new Map<string, string>();

    allMessages.forEach((message) => {
      if (message.direction === "inbound" && !firstInboundMap.has(message.conversation_id)) {
        firstInboundMap.set(message.conversation_id, message.created_at);
      }

      if (message.direction === "outbound" && !firstOutboundMap.has(message.conversation_id)) {
        firstOutboundMap.set(message.conversation_id, message.created_at);
      }
    });

    conversations.forEach((conversation) => {
      const inboundAt = firstInboundMap.get(conversation.id);
      const outboundAt = firstOutboundMap.get(conversation.id);

      if (!inboundAt || !outboundAt) return;

      const seconds =
        (new Date(outboundAt).getTime() - new Date(inboundAt).getTime()) / 1000;

      if (seconds < 0) return;

      responseSecondsByConversation.set(conversation.id, {
        channel: conversation.channel ?? "unknown",
        seconds,
      });
    });
  }

  const slaByChannelMap = new Map<string, number[]>();

  responseSecondsByConversation.forEach(({ channel, seconds }) => {
    const values = slaByChannelMap.get(channel) ?? [];
    values.push(seconds);
    slaByChannelMap.set(channel, values);
  });

  const slaByChannel = Array.from(slaByChannelMap.entries()).map(
    ([channel, values]) => ({
      channel,
      p50Sec: round2(percentile(values, 0.5) ?? 0),
      p90Sec: round2(percentile(values, 0.9) ?? 0),
      withinSlaPct: round2(
        (values.filter((value) => value <= 120).length / values.length) * 100,
      ),
    }),
  );

  const allSlaValues = Array.from(responseSecondsByConversation.values()).map(
    (item) => item.seconds,
  );

  const funnelByChannelMap = new Map<
    string,
    { converted: number; lost: number }
  >();

  conversations.forEach((conversation) => {
    const channel = conversation.channel ?? "unknown";
    if (!funnelByChannelMap.has(channel)) {
      funnelByChannelMap.set(channel, { converted: 0, lost: 0 });
    }
  });

  events.forEach((event) => {
    if (event.event_type !== "lead.converted" && event.event_type !== "lead.lost") {
      return;
    }

    const conversation = conversationMap.get(event.conversation_id);
    const channel = conversation?.channel ?? "unknown";
    const current = funnelByChannelMap.get(channel) ?? { converted: 0, lost: 0 };

    if (event.event_type === "lead.converted") current.converted += 1;
    if (event.event_type === "lead.lost") current.lost += 1;

    funnelByChannelMap.set(channel, current);
  });

  return {
    kpis: {
      leads: conversations.length,
      activeConversations,
      inboundMessages,
      outboundMessages,
      p50FirstResponseSec: percentile(allSlaValues, 0.5),
      p90FirstResponseSec: percentile(allSlaValues, 0.9),
      withinSlaPct: allSlaValues.length
        ? round2(
            (allSlaValues.filter((value) => value <= 120).length /
              allSlaValues.length) *
              100,
          )
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
    funnelByChannel: Array.from(funnelByChannelMap.entries()).map(
      ([channel, value]) => ({
        channel,
        converted: value.converted,
        lost: value.lost,
      }),
    ),
  };
};

export type BacklogItem = {
  conversationId: string;
  contact: string;
  channel: string;
  department: string;
  assignedTo: string;
  lastMessageAt: string;
  lastMessageText: string;
  minutesWaiting: number;
};

export const fetchBacklog = async (
  filters: AnalyticsFilters,
): Promise<BacklogItem[]> => {
  const baseConversationsQuery = supabase
    .from("conversations")
    .select(
      "id,channel,department_id,assigned_user_id,status,last_message_at,contacts:contact_id(first_name,phone),departments:department_id(name),clinic_users:assigned_user_id(name,user_id)",
    )
    .eq("clinic_id", filters.clinicId)
    .in("status", ["open", "pending"])
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(200);

  const { data: conversationsData, error: conversationsError } =
    await applyConversationOptionalFilters(baseConversationsQuery, filters);

  if (conversationsError) throw conversationsError;

  const conversations = conversationsData ?? [];

  if (!conversations.length) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);

  const { data: messagesData, error: messagesError } = await supabase
    .from("messages")
    .select("conversation_id,direction,created_at,text")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (messagesError) throw messagesError;

  const messages = (messagesData ?? []) as MessageRow[];
  const lastMessageByConversation = new Map<string, MessageRow>();

  messages.forEach((message) => {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message);
    }
  });

  return conversations
    .map((conversation) => {
      const lastMessage = lastMessageByConversation.get(conversation.id);

      if (!lastMessage || lastMessage.direction !== "inbound") {
        return null;
      }

      const minutesWaiting =
        (Date.now() - new Date(lastMessage.created_at).getTime()) / 1000 / 60;

      return {
        conversationId: conversation.id,
        contact:
          (conversation.contacts as { first_name?: string; phone?: string })
            ?.first_name ??
          (conversation.contacts as { first_name?: string; phone?: string })
            ?.phone ??
          "Contato sem nome",
        channel: conversation.channel ?? "unknown",
        department:
          (conversation.departments as { name?: string })?.name ??
          "Sem departamento",
        assignedTo:
          (conversation.clinic_users as { name?: string })?.name ??
          "Não atribuído",
        lastMessageAt: lastMessage.created_at,
        lastMessageText: lastMessage.text?.trim() || "Mensagem recebida",
        minutesWaiting: round2(minutesWaiting),
      };
    })
    .filter((item): item is BacklogItem => Boolean(item))
    .sort((a, b) => b.minutesWaiting - a.minutesWaiting);
};
