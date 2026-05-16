import { supabase } from "../../../lib/supabaseClient";

export type ResolveAudienceType = "all_contacts" | "tag" | "manual_selection";

export interface ResolveAudienceInput {
  clinicId: string;
  audienceType: ResolveAudienceType;
  audienceFilters: Record<string, unknown>;
}

export interface ResolvedAudienceContact {
  contactId: string;
  conversationId: string | null;
  name: string | null;
  phone: string | null;
  variables: Record<string, unknown>;
}

type ConversationAudienceRow = {
  id: string;
  contact_id: string | null;
  contacts:
    | {
        id: string;
        name: string | null;
        phone: string | null;
      }
    | Array<{
        id: string;
        name: string | null;
        phone: string | null;
      }>
    | null;
  conversation_tags:
    | Array<{
        tag_id: string | null;
      }>
    | null;
};

const getContactRow = (
  value: ConversationAudienceRow["contacts"],
): { id: string; name: string | null; phone: string | null } | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const dedupeAudience = (rows: ResolvedAudienceContact[]) => {
  const map = new Map<string, ResolvedAudienceContact>();

  rows.forEach((row) => {
    if (!row.phone) return;
    if (!map.has(row.contactId)) {
      map.set(row.contactId, row);
    }
  });

  return Array.from(map.values());
};

const loadConversationAudience = async (clinicId: string) => {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
        id,
        contact_id,
        contacts:contact_id (
          id,
          name,
          phone
        ),
        conversation_tags (
          tag_id
        )
      `,
    )
    .eq("clinic_id", clinicId)
    .not("contact_id", "is", null)
    .order("last_message_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as ConversationAudienceRow[];
};

export const resolveAudience = async ({
  clinicId,
  audienceType,
  audienceFilters,
}: ResolveAudienceInput): Promise<ResolvedAudienceContact[]> => {
  const conversations = await loadConversationAudience(clinicId);

  if (audienceType === "tag") {
    const tagLabel = String(audienceFilters.tagLabel ?? "").trim();

    if (!tagLabel) return [];

    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("clinic_id", clinicId)
      .ilike("name", tagLabel)
      .maybeSingle();

    if (tagError) throw tagError;
    if (!tag?.id) return [];

    return dedupeAudience(
      conversations
        .filter((row) =>
          (row.conversation_tags ?? []).some((item) => item.tag_id === tag.id),
        )
        .map((row) => {
          const contact = getContactRow(row.contacts);
          return {
            contactId: row.contact_id ?? contact?.id ?? "",
            conversationId: row.id,
            name: contact?.name ?? null,
            phone: contact?.phone ?? null,
            variables: {},
          };
        })
        .filter((row) => row.contactId),
    );
  }

  if (audienceType === "manual_selection") {
    const rawSelection = String(audienceFilters.manualSelection ?? "").trim();
    if (!rawSelection) return [];

    const tokens = rawSelection
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (tokens.length === 0) return [];

    const normalizedTokens = tokens.map((item) => item.toLowerCase());
    const normalizedPhoneTokens = tokens.map(normalizePhone).filter(Boolean);

    return dedupeAudience(
      conversations
        .filter((row) => {
          const contact = getContactRow(row.contacts);
          const name = contact?.name?.toLowerCase() ?? "";
          const phone = contact?.phone ?? "";
          const phoneDigits = normalizePhone(phone);

          return normalizedTokens.some(
            (token) =>
              token === (row.contact_id ?? "").toLowerCase() ||
              token === (contact?.id ?? "").toLowerCase() ||
              (name && name.includes(token)),
          )
            ? true
            : normalizedPhoneTokens.some(
                (token) => token.length > 0 && phoneDigits.includes(token),
              );
        })
        .map((row) => {
          const contact = getContactRow(row.contacts);
          return {
            contactId: row.contact_id ?? contact?.id ?? "",
            conversationId: row.id,
            name: contact?.name ?? null,
            phone: contact?.phone ?? null,
            variables: {},
          };
        })
        .filter((row) => row.contactId),
    );
  }

  return dedupeAudience(
    conversations
      .map((row) => {
        const contact = getContactRow(row.contacts);
        return {
          contactId: row.contact_id ?? contact?.id ?? "",
          conversationId: row.id,
          name: contact?.name ?? null,
          phone: contact?.phone ?? null,
          variables: {},
        };
      })
      .filter((row) => row.contactId),
  );
};
