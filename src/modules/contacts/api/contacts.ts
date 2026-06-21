import { supabase } from "../../../lib/supabaseClient";
import { mockContactNotes, mockContacts } from "../mocks/contacts";
import type {
  Contact,
  ContactListFilters,
  ContactListResult,
  ContactMetrics,
  ContactNote,
  CreateContactNoteInput,
} from "../types/contacts";

type ContactNoteRow = Omit<ContactNote, "user_name">;

type DbContactRow = {
  id: string;
  clinic_id: string;
  name: string;
  phone: string;
  image_url: string | null;
  last_seen_at: string | null;
  first_seen_at: string | null;
  created_at: string;
};

type ConversationContactSummaryRow = {
  contact_id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  status: "open" | "pending" | "closed";
  assigned_user_id: string | null;
  last_message_at: string | null;
};

type ClinicUserNameRow = {
  user_id: string;
  name: string | null;
};

const shouldUseMockData = (tenantId: string | null) =>
  !tenantId || tenantId === "mock-tenant";

const loadUserNames = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("clinic_users")
    .select("user_id, name")
    .in("user_id", uniqueIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as ClinicUserNameRow[]).map((row) => [
      row.user_id,
      row.name ?? "Usuário",
    ]),
  );
};

const mapConversationChannel = (
  channel: ConversationContactSummaryRow["channel"] | null | undefined,
): Contact["channel"] => {
  if (channel === "instagram") return "instagram";
  if (channel === "messenger") return "facebook";
  return "whatsapp";
};

const mapConversationStatus = (
  status: ConversationContactSummaryRow["status"] | null | undefined,
): Contact["status"] => {
  if (status === "closed") return "inactive";
  return "active";
};

const loadConversationSummaries = async (
  clinicId: string,
  contactIds: string[],
) => {
  if (contactIds.length === 0) {
    return new Map<string, ConversationContactSummaryRow>();
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("contact_id, channel, status, assigned_user_id, last_message_at")
    .eq("clinic_id", clinicId)
    .in("contact_id", contactIds)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  const summaries = new Map<string, ConversationContactSummaryRow>();
  for (const row of (data ?? []) as ConversationContactSummaryRow[]) {
    if (row.contact_id && !summaries.has(row.contact_id)) {
      summaries.set(row.contact_id, row);
    }
  }

  return summaries;
};

const mapDbContact = (
  row: DbContactRow,
  conversation: ConversationContactSummaryRow | undefined,
  userNames = new Map<string, string>(),
): Contact => {
  const assignedUserId = conversation?.assigned_user_id ?? null;

  return {
    id: row.id,
    tenant_id: row.clinic_id,
    name: row.name,
    phone: row.phone,
    email: null,
    avatar_url: row.image_url,
    channel: mapConversationChannel(conversation?.channel),
    status: mapConversationStatus(conversation?.status),
    commercial_status: "lead",
    assigned_user_id: assignedUserId,
    assigned_user_name: assignedUserId
      ? userNames.get(assignedUserId) ?? null
      : null,
    tags: [],
    last_contact_at: row.last_seen_at ?? conversation?.last_message_at ?? null,
    created_at: row.first_seen_at ?? row.created_at,
  };
};

const mapNote = (
  row: ContactNoteRow,
  userNames = new Map<string, string>(),
): ContactNote => ({
  id: row.id,
  contact_id: row.contact_id,
  user_id: row.user_id,
  user_name: userNames.get(row.user_id) ?? null,
  note: row.note,
  created_at: row.created_at,
});

const applyMockFilters = (
  contacts: Contact[],
  filters: ContactListFilters,
): ContactListResult => {
  const normalizedSearch = filters.search.trim().toLowerCase();
  const filtered = contacts.filter((contact) => {
    const matchesSearch =
      !normalizedSearch ||
      contact.name.toLowerCase().includes(normalizedSearch) ||
      contact.phone.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      filters.status === "all" || contact.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const start = (filters.page - 1) * filters.pageSize;
  return {
    contacts: filtered.slice(start, start + filters.pageSize),
    total: filtered.length,
  };
};

export const listContacts = async (
  tenantId: string | null,
  filters: ContactListFilters,
): Promise<ContactListResult> => {
  if (shouldUseMockData(tenantId)) {
    return applyMockFilters(mockContacts, filters);
  }

  let query = supabase
    .from("contacts")
    .select(
      "id, clinic_id, name, phone, image_url, last_seen_at, first_seen_at, created_at",
    )
    .eq("clinic_id", tenantId)
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  const search = filters.search.trim();
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = (data ?? []) as DbContactRow[];
  const summaries = await loadConversationSummaries(
    tenantId,
    rows.map((row) => row.id),
  );
  const userNames = await loadUserNames(
    Array.from(summaries.values())
      .map((summary) => summary.assigned_user_id)
      .filter(Boolean) as string[],
  );

  const mappedContacts = rows.map((row) =>
    mapDbContact(row, summaries.get(row.id), userNames),
  );
  const filteredContacts =
    filters.status === "all"
      ? mappedContacts
      : mappedContacts.filter((contact) => contact.status === filters.status);
  const from = (filters.page - 1) * filters.pageSize;

  return {
    contacts: filteredContacts.slice(from, from + filters.pageSize),
    total: filteredContacts.length,
  };
};

export const getContactMetrics = async (
  tenantId: string | null,
): Promise<ContactMetrics> => {
  const source = shouldUseMockData(tenantId)
    ? mockContacts
    : (
        await supabase
          .from("contacts")
          .select("last_seen_at")
          .eq("clinic_id", tenantId)
      );

  if (!Array.isArray(source)) {
    if (source.error) throw source.error;
  }

  const contacts = Array.isArray(source)
    ? source
    : ((source.data ?? []) as Array<{ last_seen_at: string | null }>);

  const now = Date.now();
  const daysSince = (date: string | null) =>
    date ? (now - new Date(date).getTime()) / 86400000 : Number.POSITIVE_INFINITY;

  return {
    total: contacts.length,
    active: contacts.filter((contact) => {
      const lastSeenAt =
        "last_contact_at" in contact
          ? contact.last_contact_at
          : contact.last_seen_at;
      return daysSince(lastSeenAt) < 30;
    }).length,
    inactive7Days: contacts.filter((contact) => {
      const lastSeenAt =
        "last_contact_at" in contact
          ? contact.last_contact_at
          : contact.last_seen_at;
      return daysSince(lastSeenAt) >= 7;
    }).length,
    inactive30Days: contacts.filter((contact) => {
      const lastSeenAt =
        "last_contact_at" in contact
          ? contact.last_contact_at
          : contact.last_seen_at;
      return daysSince(lastSeenAt) >= 30;
    }).length,
  };
};

export const listContactNotes = async (
  tenantId: string | null,
  contactId: string | null,
): Promise<ContactNote[]> => {
  if (!contactId) return [];

  if (shouldUseMockData(tenantId)) {
    return mockContactNotes.filter((note) => note.contact_id === contactId);
  }

  const { data, error } = await supabase
    .from("contact_notes")
    .select("id, contact_id, user_id, note, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as ContactNoteRow[];
  const userNames = await loadUserNames(rows.map((row) => row.user_id));

  return rows.map((row) => mapNote(row, userNames));
};

export const createContactNote = async (
  tenantId: string | null,
  input: CreateContactNoteInput,
): Promise<ContactNote> => {
  if (shouldUseMockData(tenantId)) {
    return {
      id: `note-${Date.now()}`,
      contact_id: input.contactId,
      user_id: input.userId,
      user_name: "Você",
      note: input.note.trim(),
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("contact_notes")
    .insert({
      contact_id: input.contactId,
      user_id: input.userId,
      note: input.note.trim(),
    })
    .select("id, contact_id, user_id, note, created_at")
    .single();

  if (error) throw error;

  const userNames = await loadUserNames([input.userId]);

  return mapNote(data as ContactNoteRow, userNames);
};

export const deleteContactNote = async (
  tenantId: string | null,
  noteId: string,
) => {
  if (shouldUseMockData(tenantId)) return;

  const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
  if (error) throw error;
};
