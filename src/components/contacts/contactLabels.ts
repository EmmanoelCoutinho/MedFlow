import type {
  CommercialStatus,
  ContactChannel,
  ContactStatus,
} from "../../modules/contacts/types/contacts";

export const channelLabels: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

export const statusLabels: Record<ContactStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const commercialStatusLabels: Record<CommercialStatus, string> = {
  lead: "Lead",
  interested: "Interessado",
  negotiation: "Negociação",
  customer: "Cliente",
  lost: "Perdido",
};

export const formatDateTime = (value: string | null) => {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
