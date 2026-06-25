export type ContactChannel = "whatsapp" | "instagram" | "facebook";

export type ContactStatus = "active" | "inactive" | "archived";

export type CommercialStatus =
  | "lead"
  | "interested"
  | "negotiation"
  | "customer"
  | "lost";

export type Contact = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  channel: ContactChannel;
  status: ContactStatus;
  commercial_status: CommercialStatus;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  tags: string[];
  last_contact_at: string | null;
  created_at: string;
};

export type ContactNote = {
  id: string;
  contact_id: string;
  user_id: string;
  user_name: string | null;
  note: string;
  created_at: string;
};

export type ContactMetrics = {
  total: number;
  active: number;
  inactive7Days: number;
  inactive30Days: number;
};

export type ContactListFilters = {
  search: string;
  status: ContactStatus | "all";
  page: number;
  pageSize: number;
};

export type ContactListResult = {
  contacts: Contact[];
  total: number;
};

export type CreateContactNoteInput = {
  contactId: string;
  userId: string;
  note: string;
};

