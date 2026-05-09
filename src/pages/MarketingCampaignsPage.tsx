import React, { useMemo, useState } from "react";
import {
  BarChart3Icon,
  CheckCircle2Icon,
  EyeIcon,
  MegaphoneIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import PreTitleIcon from "../components/ui/PreTitleIcon";

type MarketingTab = "templates" | "campaigns";
type TemplateStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "paused"
  | "disabled"
  | "archived";
type TemplateCategory = "marketing" | "utility" | "authentication";
type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "partially_failed"
  | "failed"
  | "cancelled";
type AudienceType = "all" | "tag" | "manual";
type DeliveryMode = "now" | "scheduled";
type CampaignWizardStep = 1 | 2 | 3 | 4 | 5;

type Template = {
  id: string;
  internalName: string;
  metaName: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  body: string;
  variablesExample: string;
  footer: string;
  buttons: string[];
  whatsappAccount: string;
  updatedAt: string;
};

type Campaign = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  audienceType: AudienceType;
  audienceLabel: string;
  status: CampaignStatus;
  sendMode: DeliveryMode;
  sendAt: string;
  totalContacts: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  createdAt: string;
  channelLabel: string;
};

type CampaignRecipientStatus =
  | "scheduled"
  | "sent"
  | "delivered"
  | "read"
  | "replied"
  | "failed";

type CampaignRecipient = {
  id: string;
  campaignId: string;
  name: string;
  phone: string;
  status: CampaignRecipientStatus;
  readAt: string | null;
  replied: boolean;
  conversation: string;
  error: string | null;
};

type TemplateFormState = {
  internalName: string;
  metaName: string;
  category: TemplateCategory;
  language: string;
  body: string;
  variablesExample: string;
  footer: string;
  buttonsText: string;
  whatsappAccount: string;
};

type CampaignFormState = {
  name: string;
  description: string;
  channelLabel: string;
  templateId: string;
  audienceType: AudienceType;
  tagLabel: string;
  manualSelection: string;
  sendMode: DeliveryMode;
  scheduledAt: string;
};

type SummaryCardProps = {
  label: string;
  value: string;
  hint: string;
};

type TableActionProps = {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

type ModalShellProps = {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
};

const templateStatusMap: Record<
  TemplateStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Rascunho",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  submitted: {
    label: "Enviado",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  pending: {
    label: "Em análise",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Aprovado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Rejeitado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  paused: {
    label: "Pausado",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  disabled: {
    label: "Desativado",
    className: "border-gray-200 bg-gray-100 text-gray-600",
  },
  archived: {
    label: "Arquivado",
    className: "border-stone-200 bg-stone-100 text-stone-700",
  },
};

const templateCategoryMap: Record<TemplateCategory, string> = {
  marketing: "Marketing",
  utility: "Utilidade",
  authentication: "Autenticação",
};

const campaignStatusMap: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Rascunho",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  scheduled: {
    label: "Agendada",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  sending: {
    label: "Enviando",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  sent: {
    label: "Enviada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  partially_failed: {
    label: "Parcialmente falhou",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  failed: {
    label: "Falhou",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  cancelled: {
    label: "Cancelada",
    className: "border-stone-200 bg-stone-100 text-stone-700",
  },
};

const recipientStatusMap: Record<
  CampaignRecipientStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Agendado",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  sent: {
    label: "Enviado",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  delivered: {
    label: "Entregue",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  read: {
    label: "Lido",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  replied: {
    label: "Respondeu",
    className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  },
  failed: {
    label: "Erro",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const initialTemplates: Template[] = [
  {
    id: "tpl-1",
    internalName: "Boas-vindas premium",
    metaName: "boas_vindas_premium",
    category: "marketing",
    language: "pt-BR",
    status: "approved",
    body:
      "Olá, {{1}}. Preparamos uma condição especial para você conhecer nossos serviços com suporte dedicado.",
    variablesExample: "{{1}} = Nome do contato",
    footer: "Oferta válida por tempo limitado.",
    buttons: ["Falar com consultor", "Ver detalhes"],
    whatsappAccount: "WhatsApp Principal • +55 11 4000-1000",
    updatedAt: "2026-04-28T10:15:00",
  },
  {
    id: "tpl-2",
    internalName: "Lembrete de renovação",
    metaName: "lembrete_renovacao",
    category: "utility",
    language: "pt-BR",
    status: "pending",
    body:
      "Olá, {{1}}. Sua renovação está próxima. Caso precise de apoio, nossa equipe está disponível para orientar os próximos passos.",
    variablesExample: "{{1}} = Nome do contato",
    footer: "Equipe de relacionamento",
    buttons: ["Falar agora"],
    whatsappAccount: "WhatsApp Financeiro • +55 11 4000-2000",
    updatedAt: "2026-04-27T15:40:00",
  },
  {
    id: "tpl-3",
    internalName: "Código de verificação",
    metaName: "codigo_verificacao_portal",
    category: "authentication",
    language: "pt-BR",
    status: "approved",
    body: "Seu código de verificação é {{1}}. Ele expira em {{2}} minutos.",
    variablesExample: "{{1}} = Código | {{2}} = Tempo de expiração",
    footer: "",
    buttons: [],
    whatsappAccount: "WhatsApp Login • +55 11 4000-3000",
    updatedAt: "2026-04-25T08:20:00",
  },
  {
    id: "tpl-4",
    internalName: "Campanha de reativação",
    metaName: "campanha_reativacao_abril",
    category: "marketing",
    language: "es",
    status: "rejected",
    body:
      "Hola, {{1}}. Tenemos una nueva oportunidad para retomar su jornada con nuestro equipo.",
    variablesExample: "{{1}} = Nombre del contacto",
    footer: "Atención comercial",
    buttons: ["Hablar con soporte"],
    whatsappAccount: "WhatsApp LATAM • +55 11 4000-4000",
    updatedAt: "2026-04-20T13:10:00",
  },
  {
    id: "tpl-5",
    internalName: "Oferta de upgrade anual",
    metaName: "oferta_upgrade_anual",
    category: "marketing",
    language: "pt-BR",
    status: "draft",
    body:
      "Olá, {{1}}. Seu plano pode evoluir com recursos extras para sua operação.",
    variablesExample: "{{1}} = Nome do contato",
    footer: "Consulte disponibilidade por conta.",
    buttons: ["Quero conhecer"],
    whatsappAccount: "WhatsApp Comercial • +55 11 4000-5000",
    updatedAt: "2026-04-29T09:00:00",
  },
];

const initialCampaigns: Campaign[] = [
  {
    id: "cmp-1",
    name: "Upsell base ativa",
    description: "Campanha com foco em clientes com uso recorrente.",
    templateId: "tpl-1",
    audienceType: "tag",
    audienceLabel: "Contatos com tag Premium",
    status: "sending",
    sendMode: "now",
    sendAt: "2026-04-30T09:30:00",
    totalContacts: 420,
    delivered: 378,
    read: 241,
    replied: 56,
    failed: 14,
    createdAt: "2026-04-30T08:50:00",
    channelLabel: "WhatsApp Principal • +55 11 4000-1000",
  },
  {
    id: "cmp-2",
    name: "Renovação carteira abril",
    description: "Ação de relacionamento com carteira em expiração.",
    templateId: "tpl-1",
    audienceType: "all",
    audienceLabel: "Todos os contatos elegíveis",
    status: "scheduled",
    sendMode: "scheduled",
    sendAt: "2026-05-02T14:00:00",
    totalContacts: 860,
    delivered: 0,
    read: 0,
    replied: 0,
    failed: 0,
    createdAt: "2026-04-29T16:10:00",
    channelLabel: "WhatsApp Principal • +55 11 4000-1000",
  },
  {
    id: "cmp-3",
    name: "Onboarding portal seguro",
    description: "Comunicado para novos acessos liberados.",
    templateId: "tpl-3",
    audienceType: "manual",
    audienceLabel: "Seleção manual • 120 contatos",
    status: "sent",
    sendMode: "now",
    sendAt: "2026-04-26T11:00:00",
    totalContacts: 120,
    delivered: 118,
    read: 91,
    replied: 17,
    failed: 2,
    createdAt: "2026-04-26T10:30:00",
    channelLabel: "WhatsApp Login • +55 11 4000-3000",
  },
];

const initialRecipients: CampaignRecipient[] = [
  {
    id: "rcp-1",
    campaignId: "cmp-1",
    name: "Mariana Costa",
    phone: "+55 11 99999-0001",
    status: "replied",
    readAt: "2026-04-30T09:48:00",
    replied: true,
    conversation: "Solicitou detalhes do plano anual.",
    error: null,
  },
  {
    id: "rcp-2",
    campaignId: "cmp-1",
    name: "Carlos Nunes",
    phone: "+55 11 99999-0002",
    status: "read",
    readAt: "2026-04-30T09:50:00",
    replied: false,
    conversation: "Ainda sem retorno.",
    error: null,
  },
  {
    id: "rcp-3",
    campaignId: "cmp-1",
    name: "Fernanda Lima",
    phone: "+55 11 99999-0003",
    status: "delivered",
    readAt: null,
    replied: false,
    conversation: "Mensagem entregue.",
    error: null,
  },
  {
    id: "rcp-4",
    campaignId: "cmp-1",
    name: "Ricardo Alves",
    phone: "+55 11 99999-0004",
    status: "failed",
    readAt: null,
    replied: false,
    conversation: "Não houve abertura de conversa.",
    error: "Número sem opt-in válido.",
  },
  {
    id: "rcp-5",
    campaignId: "cmp-2",
    name: "Patrícia Gomes",
    phone: "+55 21 98888-1001",
    status: "scheduled",
    readAt: null,
    replied: false,
    conversation: "Envio programado.",
    error: null,
  },
  {
    id: "rcp-6",
    campaignId: "cmp-2",
    name: "Eduardo Salles",
    phone: "+55 21 98888-1002",
    status: "scheduled",
    readAt: null,
    replied: false,
    conversation: "Envio programado.",
    error: null,
  },
  {
    id: "rcp-7",
    campaignId: "cmp-3",
    name: "Ana Júlia Dias",
    phone: "+55 31 97777-2001",
    status: "replied",
    readAt: "2026-04-26T11:15:00",
    replied: true,
    conversation: "Confirmou recebimento do acesso.",
    error: null,
  },
  {
    id: "rcp-8",
    campaignId: "cmp-3",
    name: "Pedro Rocha",
    phone: "+55 31 97777-2002",
    status: "failed",
    readAt: null,
    replied: false,
    conversation: "Falha de entrega.",
    error: "Telefone inválido para o canal.",
  },
];

const whatsappAccountOptions = [
  "WhatsApp Principal • +55 11 4000-1000",
  "WhatsApp Financeiro • +55 11 4000-2000",
  "WhatsApp Login • +55 11 4000-3000",
  "WhatsApp LATAM • +55 11 4000-4000",
  "WhatsApp Comercial • +55 11 4000-5000",
] as const;

const normalizeMetaTemplateName = (value: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, " ")
    .trim()
    .replace(/[\s_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "novo_template";
};

const defaultTemplateForm = (): TemplateFormState => ({
  internalName: "",
  metaName: "",
  category: "marketing",
  language: "pt-BR",
  body: "",
  variablesExample: "",
  footer: "",
  buttonsText: "",
  whatsappAccount: whatsappAccountOptions[0],
});

const defaultCampaignForm = (): CampaignFormState => ({
  name: "",
  description: "",
  channelLabel: "WhatsApp Principal • +55 11 4000-1000",
  templateId: "",
  audienceType: "all",
  tagLabel: "Clientes VIP",
  manualSelection: "",
  sendMode: "now",
  scheduledAt: "2026-05-03T10:00",
});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const makeRate = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;

const makeTemplateId = () =>
  `tpl-${Math.random().toString(36).slice(2, 8).toLowerCase()}`;

const makeCampaignId = () =>
  `cmp-${Math.random().toString(36).slice(2, 8).toLowerCase()}`;

const makeRecipientId = () =>
  `rcp-${Math.random().toString(36).slice(2, 8).toLowerCase()}`;

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, hint }) => (
  <Card className="rounded-2xl p-5">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{hint}</p>
  </Card>
);

const StatusBadge = ({
  label,
  className,
}: {
  label: string;
  className: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
  >
    {label}
  </span>
);

const TableAction: React.FC<TableActionProps> = ({
  label,
  onClick,
  tone = "default",
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`text-sm font-medium transition ${
      tone === "danger"
        ? "text-rose-600 hover:text-rose-700"
        : "text-slate-600 hover:text-slate-900"
    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
  >
    {label}
  </button>
);

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  children,
  widthClassName = "max-w-5xl",
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
    <div
      className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${widthClassName}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="text-sm font-medium text-slate-800">{label}</span>
    {children}
    {hint ? (
      <span className="mt-2 block text-xs text-slate-500">{hint}</span>
    ) : null}
  </label>
);

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export const MarketingCampaignsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MarketingTab>("templates");
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [recipients, setRecipients] =
    useState<CampaignRecipient[]>(initialRecipients);

  const [templateModalMode, setTemplateModalMode] = useState<
    "create" | "edit" | "view" | null
  >(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(
    defaultTemplateForm(),
  );
  const [metaNameManuallyEdited, setMetaNameManuallyEdited] = useState(false);

  const [campaignModalMode, setCampaignModalMode] = useState<
    "create" | "edit" | null
  >(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [campaignStep, setCampaignStep] = useState<CampaignWizardStep>(1);
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(
    defaultCampaignForm(),
  );
  const [metricsCampaignId, setMetricsCampaignId] = useState<string | null>(
    null,
  );

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const selectedCampaign = useMemo(
    () => campaigns.find((item) => item.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const metricsCampaign = useMemo(
    () => campaigns.find((item) => item.id === metricsCampaignId) ?? null,
    [campaigns, metricsCampaignId],
  );

  const approvedTemplates = useMemo(
    () => templates.filter((item) => item.status === "approved"),
    [templates],
  );

  const metricsRecipients = useMemo(
    () => recipients.filter((item) => item.campaignId === metricsCampaignId),
    [metricsCampaignId, recipients],
  );

  const selectedCampaignTemplate = useMemo(
    () =>
      approvedTemplates.find((item) => item.id === campaignForm.templateId) ??
      null,
    [approvedTemplates, campaignForm.templateId],
  );

  const templateSummary = useMemo(() => {
    const approved = templates.filter((item) => item.status === "approved").length;
    const pending = templates.filter(
      (item) => item.status === "pending" || item.status === "submitted",
    ).length;
    const rejected = templates.filter((item) => item.status === "rejected").length;

    return {
      total: templates.length,
      approved,
      pending,
      rejected,
    };
  }, [templates]);

  const campaignSummary = useMemo(() => {
    const active = campaigns.filter((item) => item.status === "sending").length;
    const scheduled = campaigns.filter(
      (item) => item.status === "scheduled",
    ).length;
    const sent = campaigns.filter((item) => item.status === "sent").length;
    const replies = campaigns.reduce((total, item) => total + item.replied, 0);

    return {
      active,
      scheduled,
      sent,
      replies,
    };
  }, [campaigns]);

  const resetTemplateForm = () => {
    setTemplateForm(defaultTemplateForm());
    setSelectedTemplateId(null);
    setTemplateModalMode(null);
    setMetaNameManuallyEdited(false);
  };

  const resetCampaignForm = () => {
    setCampaignForm(defaultCampaignForm());
    setSelectedCampaignId(null);
    setCampaignModalMode(null);
    setCampaignStep(1);
  };

  const openTemplateModal = (
    mode: "create" | "edit" | "view",
    template?: Template,
  ) => {
    if (template) {
      setSelectedTemplateId(template.id);
      setTemplateForm({
        internalName: template.internalName,
        metaName: template.metaName,
        category: template.category,
        language: "pt-BR",
        body: template.body,
        variablesExample: template.variablesExample,
        footer: template.footer,
        buttonsText: template.buttons.join("\n"),
        whatsappAccount: template.whatsappAccount,
      });
      setMetaNameManuallyEdited(true);
    } else {
      setSelectedTemplateId(null);
      setTemplateForm(defaultTemplateForm());
      setMetaNameManuallyEdited(false);
    }

    setTemplateModalMode(mode);
  };

  const openCampaignModal = (
    mode: "create" | "edit",
    campaign?: Campaign,
  ) => {
    if (campaign) {
      setSelectedCampaignId(campaign.id);
      setCampaignForm({
        name: campaign.name,
        description: campaign.description,
        channelLabel: campaign.channelLabel,
        templateId: campaign.templateId,
        audienceType: campaign.audienceType,
        tagLabel:
          campaign.audienceType === "tag"
            ? campaign.audienceLabel.replace("Contatos com tag ", "")
            : "Clientes VIP",
        manualSelection:
          campaign.audienceType === "manual"
            ? campaign.audienceLabel.replace("Seleção manual • ", "")
            : "",
        sendMode: campaign.sendMode,
        scheduledAt:
          campaign.sendMode === "scheduled"
            ? campaign.sendAt.slice(0, 16)
            : defaultCampaignForm().scheduledAt,
      });
    } else {
      setSelectedCampaignId(null);
      setCampaignForm({
        ...defaultCampaignForm(),
        templateId: approvedTemplates[0]?.id ?? "",
      });
    }

    setCampaignStep(1);
    setCampaignModalMode(mode);
  };

  const handleTemplateFieldChange = <K extends keyof TemplateFormState>(
    field: K,
    value: TemplateFormState[K],
  ) => {
    setTemplateForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCampaignFieldChange = <K extends keyof CampaignFormState>(
    field: K,
    value: CampaignFormState[K],
  ) => {
    setCampaignForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveTemplate = () => {
    const now = new Date().toISOString();
    const nextTemplate: Template = {
      id: selectedTemplateId ?? makeTemplateId(),
      internalName: templateForm.internalName.trim() || "Novo template",
      metaName: normalizeMetaTemplateName(
        templateForm.metaName.trim() || templateForm.internalName.trim(),
      ),
      category: templateForm.category,
      language: "pt-BR",
      status:
        selectedTemplate?.status && templateModalMode === "edit"
          ? selectedTemplate.status
          : "draft",
      body: templateForm.body.trim(),
      variablesExample: templateForm.variablesExample.trim(),
      footer: templateForm.footer.trim(),
      buttons: templateForm.buttonsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      whatsappAccount: templateForm.whatsappAccount.trim(),
      updatedAt: now,
    };

    setTemplates((current) => {
      if (templateModalMode === "edit" && selectedTemplateId) {
        return current.map((item) =>
          item.id === selectedTemplateId ? nextTemplate : item,
        );
      }

      return [nextTemplate, ...current];
    });

    resetTemplateForm();
  };

  const handleTemplateAction = (
    action: "submit" | "duplicate" | "archive",
    template: Template,
  ) => {
    if (action === "submit") {
      setTemplates((current) =>
        current.map((item) =>
          item.id === template.id
            ? {
                ...item,
                status: "submitted",
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      return;
    }

    if (action === "archive") {
      setTemplates((current) =>
        current.map((item) =>
          item.id === template.id
            ? {
                ...item,
                status: "archived",
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      return;
    }

    const duplicatedTemplate: Template = {
      ...template,
      id: makeTemplateId(),
      internalName: `${template.internalName} • Cópia`,
      metaName: `${template.metaName}_copia`,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };

    setTemplates((current) => [duplicatedTemplate, ...current]);
  };

  const buildAudienceLabel = () => {
    if (campaignForm.audienceType === "tag") {
      return `Contatos com tag ${campaignForm.tagLabel.trim() || "Clientes VIP"}`;
    }

    if (campaignForm.audienceType === "manual") {
      return `Seleção manual • ${
        campaignForm.manualSelection.trim() || "30 contatos"
      }`;
    }

    return "Todos os contatos elegíveis";
  };

  const estimateAudienceSize = () => {
    if (campaignForm.audienceType === "tag") return 240;
    if (campaignForm.audienceType === "manual") return 45;
    return 820;
  };

  const createMockRecipients = (
    campaignId: string,
    template: Template,
    total: number,
    mode: DeliveryMode,
  ): CampaignRecipient[] => {
    const baseNames = [
      "João Martins",
      "Beatriz Melo",
      "Sofia Ribeiro",
      "Marcelo Prado",
      "Camila Torres",
    ];

    return baseNames.map((name, index) => {
      const status: CampaignRecipientStatus =
        mode === "scheduled"
          ? "scheduled"
          : index === 0
            ? "replied"
            : index === 1
              ? "read"
              : index === 2
                ? "delivered"
                : index === 3
                  ? "sent"
                  : "failed";

      return {
        id: makeRecipientId(),
        campaignId,
        name,
        phone: `+55 11 98888-10${index}`,
        status,
        readAt:
          status === "read" || status === "replied"
            ? new Date().toISOString()
            : null,
        replied: status === "replied",
        conversation:
          status === "replied"
            ? `Interagiu com o template ${template.internalName}.`
            : `Recebeu a campanha de ${total} contatos.`,
        error: status === "failed" ? "Contato sem janela elegível." : null,
      };
    });
  };

  const handleSaveCampaign = () => {
    const template = approvedTemplates.find(
      (item) => item.id === campaignForm.templateId,
    );

    if (!template) return;

    const isScheduled = campaignForm.sendMode === "scheduled";
    const totalContacts = estimateAudienceSize();
    const delivered = isScheduled ? 0 : Math.round(totalContacts * 0.88);
    const read = isScheduled ? 0 : Math.round(totalContacts * 0.59);
    const replied = isScheduled ? 0 : Math.round(totalContacts * 0.12);
    const failed = isScheduled ? 0 : Math.max(totalContacts - delivered, 0);
    const now = new Date().toISOString();
    const sendAt = isScheduled
      ? new Date(campaignForm.scheduledAt).toISOString()
      : now;

    const nextCampaign: Campaign = {
      id: selectedCampaignId ?? makeCampaignId(),
      name: campaignForm.name.trim() || "Nova campanha",
      description: campaignForm.description.trim(),
      templateId: template.id,
      audienceType: campaignForm.audienceType,
      audienceLabel: buildAudienceLabel(),
      status: isScheduled ? "scheduled" : "sending",
      sendMode: campaignForm.sendMode,
      sendAt,
      totalContacts,
      delivered,
      read,
      replied,
      failed,
      createdAt: selectedCampaign?.createdAt ?? now,
      channelLabel: campaignForm.channelLabel.trim(),
    };

    setCampaigns((current) => {
      if (campaignModalMode === "edit" && selectedCampaignId) {
        return current.map((item) =>
          item.id === selectedCampaignId ? nextCampaign : item,
        );
      }

      return [nextCampaign, ...current];
    });

    if (campaignModalMode === "edit" && selectedCampaignId) {
      setRecipients((current) => [
        ...current.filter((item) => item.campaignId !== selectedCampaignId),
        ...createMockRecipients(
          selectedCampaignId,
          template,
          totalContacts,
          campaignForm.sendMode,
        ),
      ]);
    } else {
      setRecipients((current) => [
        ...createMockRecipients(
          nextCampaign.id,
          template,
          totalContacts,
          campaignForm.sendMode,
        ),
        ...current,
      ]);
    }

    resetCampaignForm();
    setActiveTab("campaigns");
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const duplicated: Campaign = {
      ...campaign,
      id: makeCampaignId(),
      name: `${campaign.name} • Cópia`,
      status: "draft",
      sendMode: "scheduled",
      sendAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      delivered: 0,
      read: 0,
      replied: 0,
      failed: 0,
    };

    setCampaigns((current) => [duplicated, ...current]);
    setRecipients((current) => [
      ...current.filter((item) => item.campaignId !== duplicated.id),
      ...current
        .filter((item) => item.campaignId === campaign.id)
        .map((item) => ({
          ...item,
          id: makeRecipientId(),
          campaignId: duplicated.id,
          status: "scheduled" as CampaignRecipientStatus,
          readAt: null,
          replied: false,
          error: null,
          conversation: "Cópia preparada para revisão antes do envio.",
        })),
    ]);
  };

  const handleCancelCampaign = (campaignId: string) => {
    setCampaigns((current) =>
      current.map((item) =>
        item.id === campaignId ? { ...item, status: "cancelled" } : item,
      ),
    );
  };

  const canAdvanceCampaignStep = () => {
    if (campaignStep === 1) {
      return campaignForm.name.trim().length > 0;
    }

    if (campaignStep === 2) {
      return campaignForm.templateId.length > 0;
    }

    if (campaignStep === 3) {
      return (
        campaignForm.audienceType !== "manual" ||
        campaignForm.manualSelection.trim().length > 0
      );
    }

    if (campaignStep === 4) {
      return (
        campaignForm.sendMode !== "scheduled" ||
        campaignForm.scheduledAt.trim().length > 0
      );
    }

    return true;
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <PreTitleIcon icon={MegaphoneIcon} />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Marketing / Campanhas
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Crie modelos aprovados pela Meta e envie campanhas segmentadas
                para seus contatos.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: "templates" as const, label: "Templates" },
            { key: "campaigns" as const, label: "Campanhas" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === "templates" ? (
          <div className="space-y-6 pb-10">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total de templates"
                value={String(templateSummary.total)}
                hint="Biblioteca ativa da operação."
              />
              <SummaryCard
                label="Aprovados"
                value={String(templateSummary.approved)}
                hint="Prontos para uso em campanhas."
              />
              <SummaryCard
                label="Em análise"
                value={String(templateSummary.pending)}
                hint="Aguardando validação da Meta."
              />
              <SummaryCard
                label="Rejeitados"
                value={String(templateSummary.rejected)}
                hint="Precisam de revisão antes do reenvio."
              />
            </div>

            <Card className="rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Campanhas com modelos aprovados pela Meta
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Organize os modelos por categoria, idioma e conta
                    vinculada antes de publicar em produção.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => openTemplateModal("create")}
                  className="rounded-full"
                >
                  <span className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Criar template
                  </span>
                </Button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Nome</th>
                      <th className="pb-3 pr-4">Categoria</th>
                      <th className="pb-3 pr-4">Idioma</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Última atualização</th>
                      <th className="pb-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {templates.map((template) => (
                      <tr key={template.id} className="align-top">
                        <td className="py-4 pr-4">
                          <div>
                            <p className="font-medium text-slate-900">
                              {template.internalName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Meta: {template.metaName}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {templateCategoryMap[template.category]}
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {template.language}
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge {...templateStatusMap[template.status]} />
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {formatDateTime(template.updatedAt)}
                        </td>
                        <td className="py-4">
                          <div className="flex min-w-[320px] flex-wrap gap-x-4 gap-y-2">
                            <TableAction
                              label="Visualizar"
                              onClick={() => openTemplateModal("view", template)}
                            />
                            <TableAction
                              label="Editar"
                              onClick={() => openTemplateModal("edit", template)}
                            />
                            <TableAction
                              label="Enviar para Meta"
                              onClick={() =>
                                handleTemplateAction("submit", template)
                              }
                              disabled={
                                template.status === "approved" ||
                                template.status === "pending" ||
                                template.status === "submitted" ||
                                template.status === "archived"
                              }
                            />
                            <TableAction
                              label="Duplicar"
                              onClick={() =>
                                handleTemplateAction("duplicate", template)
                              }
                            />
                            <TableAction
                              label="Arquivar"
                              onClick={() =>
                                handleTemplateAction("archive", template)
                              }
                              disabled={template.status === "archived"}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 pb-10">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Campanhas ativas"
                value={String(campaignSummary.active)}
                hint="Em execução neste momento."
              />
              <SummaryCard
                label="Agendadas"
                value={String(campaignSummary.scheduled)}
                hint="Prontas para o próximo envio."
              />
              <SummaryCard
                label="Enviadas"
                value={String(campaignSummary.sent)}
                hint="Histórico recente de campanhas concluídas."
              />
              <SummaryCard
                label="Respostas geradas"
                value={String(campaignSummary.replies)}
                hint="Conversas iniciadas pelas campanhas."
              />
            </div>

            <Card className="rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Envie mensagens para públicos segmentados
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Selecione apenas templates aprovados e acompanhe entrega,
                    leitura e respostas.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => openCampaignModal("create")}
                  disabled={approvedTemplates.length === 0}
                  className="rounded-full"
                >
                  <span className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Criar campanha
                  </span>
                </Button>
              </div>

              {approvedTemplates.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Nenhum template aprovado está disponível no momento. Crie ou
                  aprove um modelo antes de montar a campanha.
                </div>
              ) : null}

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-[1200px] divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Nome</th>
                      <th className="pb-3 pr-4">Template usado</th>
                      <th className="pb-3 pr-4">Público</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Envio</th>
                      <th className="pb-3 pr-4">Total</th>
                      <th className="pb-3 pr-4">Entregues</th>
                      <th className="pb-3 pr-4">Lidas</th>
                      <th className="pb-3 pr-4">Respostas</th>
                      <th className="pb-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((campaign) => {
                      const template = templates.find(
                        (item) => item.id === campaign.templateId,
                      );
                      const canCancel =
                        campaign.status === "draft" ||
                        campaign.status === "scheduled" ||
                        campaign.status === "sending";

                      return (
                        <tr key={campaign.id} className="align-top">
                          <td className="py-4 pr-4">
                            <div>
                              <p className="font-medium text-slate-900">
                                {campaign.name}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {campaign.channelLabel}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {template?.internalName ?? "Template removido"}
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {campaign.audienceLabel}
                          </td>
                          <td className="py-4 pr-4">
                            <StatusBadge {...campaignStatusMap[campaign.status]} />
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {formatDateTime(campaign.sendAt)}
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {campaign.totalContacts}
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {campaign.delivered}
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {campaign.read}
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-600">
                            {campaign.replied}
                          </td>
                          <td className="py-4">
                            <div className="flex min-w-[290px] flex-wrap gap-x-4 gap-y-2">
                              <TableAction
                                label="Ver métricas"
                                onClick={() => setMetricsCampaignId(campaign.id)}
                              />
                              <TableAction
                                label="Editar"
                                onClick={() => openCampaignModal("edit", campaign)}
                              />
                              <TableAction
                                label="Duplicar"
                                onClick={() => handleDuplicateCampaign(campaign)}
                              />
                              <TableAction
                                label="Cancelar"
                                onClick={() => handleCancelCampaign(campaign.id)}
                                tone="danger"
                                disabled={!canCancel}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {templateModalMode ? (
        <ModalShell
          title={
            templateModalMode === "create"
              ? "Criar template"
              : templateModalMode === "edit"
                ? "Editar template"
                : "Visualizar template"
          }
          subtitle="Estruture o modelo com os campos usados pela Meta e mantenha o conteúdo pronto para revisão."
          onClose={resetTemplateForm}
          widthClassName="max-w-4xl"
        >
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome interno">
                  <input
                    value={templateForm.internalName}
                    onChange={(event) => {
                      const nextInternalName = event.target.value;
                      const previousGenerated = normalizeMetaTemplateName(
                        templateForm.internalName,
                      );

                      handleTemplateFieldChange(
                        "internalName",
                        nextInternalName,
                      );

                      if (
                        !metaNameManuallyEdited ||
                        templateForm.metaName.trim() === "" ||
                        templateForm.metaName === previousGenerated
                      ) {
                        handleTemplateFieldChange(
                          "metaName",
                          normalizeMetaTemplateName(nextInternalName),
                        );
                        setMetaNameManuallyEdited(false);
                      }
                    }}
                    disabled={templateModalMode === "view"}
                    className={inputClassName}
                    placeholder="Ex: Reativação carteira premium"
                  />
                </Field>
                <Field label="Nome do template na Meta">
                  <input
                    value={templateForm.metaName}
                    onChange={(event) => {
                      handleTemplateFieldChange("metaName", event.target.value);
                      setMetaNameManuallyEdited(true);
                    }}
                    disabled={templateModalMode === "view"}
                    className={inputClassName}
                    placeholder="Ex: reativacao_carteira_premium"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Categoria">
                  <select
                    value={templateForm.category}
                    onChange={(event) =>
                      handleTemplateFieldChange(
                        "category",
                        event.target.value as TemplateCategory,
                      )
                    }
                    disabled={templateModalMode === "view"}
                    className={inputClassName}
                  >
                    {Object.entries(templateCategoryMap).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Idioma">
                  <input
                    value={templateForm.language}
                    disabled
                    readOnly
                    className={inputClassName}
                  />
                </Field>
                <Field label="Número/conta vinculada">
                  <select
                    value={templateForm.whatsappAccount}
                    onChange={(event) =>
                      handleTemplateFieldChange(
                        "whatsappAccount",
                        event.target.value,
                      )
                    }
                    disabled={
                      templateModalMode === "view" ||
                      whatsappAccountOptions.length <= 1
                    }
                    className={inputClassName}
                  >
                    {whatsappAccountOptions.map((account) => (
                      <option key={account} value={account}>
                        {account}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Corpo da mensagem">
                <textarea
                  value={templateForm.body}
                  onChange={(event) =>
                    handleTemplateFieldChange("body", event.target.value)
                  }
                  disabled={templateModalMode === "view"}
                  rows={7}
                  className={inputClassName}
                  placeholder="Escreva a mensagem principal do template."
                />
              </Field>

              <Field
                label="Variáveis/exemplos"
                hint="Exemplo: {{1}} = Nome do contato | {{2}} = Data agendada"
              >
                <textarea
                  value={templateForm.variablesExample}
                  onChange={(event) =>
                    handleTemplateFieldChange(
                      "variablesExample",
                      event.target.value,
                    )
                  }
                  disabled={templateModalMode === "view"}
                  rows={3}
                  className={inputClassName}
                  placeholder="Descreva o uso das variáveis para revisão interna."
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Rodapé opcional">
                  <textarea
                    value={templateForm.footer}
                    onChange={(event) =>
                      handleTemplateFieldChange("footer", event.target.value)
                    }
                    disabled={templateModalMode === "view"}
                    rows={3}
                    className={inputClassName}
                    placeholder="Texto complementar opcional."
                  />
                </Field>
                <Field
                  label="Botões opcionais"
                  hint="Use uma linha por botão. Exemplo: Falar com consultor"
                >
                  <textarea
                    value={templateForm.buttonsText}
                    onChange={(event) =>
                      handleTemplateFieldChange("buttonsText", event.target.value)
                    }
                    disabled={templateModalMode === "view"}
                    rows={3}
                    className={inputClassName}
                    placeholder="Adicionar CTA opcional"
                  />
                </Field>
              </div>
            </div>

            <Card className="h-fit rounded-3xl border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Preview</h3>
              </div>
              <div className="mt-4 rounded-[28px] bg-[#0f172a] p-3">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">
                    {templateForm.internalName || "Novo template"}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {templateForm.body ||
                      "A prévia da mensagem aparecerá aqui conforme os campos forem preenchidos."}
                  </p>
                  {templateForm.footer ? (
                    <p className="mt-3 text-xs text-slate-400">
                      {templateForm.footer}
                    </p>
                  ) : null}
                  {templateForm.buttonsText.trim() ? (
                    <div className="mt-4 space-y-2">
                      {templateForm.buttonsText
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-blue-600"
                          >
                            {item}
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
                  Conteúdo pronto para revisão antes do envio à Meta.
                </div>
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <Button type="button" variant="ghost" onClick={resetTemplateForm}>
              Fechar
            </Button>
            {templateModalMode !== "view" ? (
              <Button
                type="button"
                onClick={handleSaveTemplate}
                className="rounded-full"
              >
                {templateModalMode === "edit"
                  ? "Salvar alterações"
                  : "Criar template"}
              </Button>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {campaignModalMode ? (
        <ModalShell
          title={
            campaignModalMode === "create"
              ? "Criar campanha"
              : "Editar campanha"
          }
          subtitle="Monte uma campanha em etapas simples usando apenas modelos aprovados pela Meta."
          onClose={resetCampaignForm}
          widthClassName="max-w-5xl"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {[
                { step: 1 as CampaignWizardStep, label: "Informações" },
                { step: 2 as CampaignWizardStep, label: "Template" },
                { step: 3 as CampaignWizardStep, label: "Público" },
                { step: 4 as CampaignWizardStep, label: "Agendamento" },
                { step: 5 as CampaignWizardStep, label: "Revisão" },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`rounded-full px-3 py-2 text-sm font-medium ${
                    campaignStep === item.step
                      ? "bg-blue-600 text-white"
                      : campaignStep > item.step
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.step}. {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              {campaignStep === 1 ? (
                <>
                  <Field label="Nome da campanha">
                    <input
                      value={campaignForm.name}
                      onChange={(event) =>
                        handleCampaignFieldChange("name", event.target.value)
                      }
                      className={inputClassName}
                      placeholder="Ex: Reengajamento carteira ativa"
                    />
                  </Field>
                  <Field label="Descrição interna opcional">
                    <textarea
                      value={campaignForm.description}
                      onChange={(event) =>
                        handleCampaignFieldChange(
                          "description",
                          event.target.value,
                        )
                      }
                      rows={4}
                      className={inputClassName}
                      placeholder="Contexto interno para a equipe acompanhar o objetivo da campanha."
                    />
                  </Field>
                  <Field label="Número/canal de envio">
                    <input
                      value={campaignForm.channelLabel}
                      onChange={(event) =>
                        handleCampaignFieldChange(
                          "channelLabel",
                          event.target.value,
                        )
                      }
                      className={inputClassName}
                    />
                  </Field>
                </>
              ) : null}

              {campaignStep === 2 ? (
                <>
                  {approvedTemplates.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Nenhum template aprovado está disponível para seleção.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {approvedTemplates.map((template) => {
                        const isSelected = campaignForm.templateId === template.id;

                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() =>
                              handleCampaignFieldChange("templateId", template.id)
                            }
                            className={`rounded-3xl border p-4 text-left transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {template.internalName}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {templateCategoryMap[template.category]} •{" "}
                                  {template.language}
                                </p>
                              </div>
                              <StatusBadge
                                {...templateStatusMap[template.status]}
                              />
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-700">
                              {template.body}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : null}

              {campaignStep === 3 ? (
                <div className="space-y-4">
                  {[
                    {
                      value: "all" as AudienceType,
                      title: "Todos os contatos",
                      description:
                        "Use a base elegível da operação para ampliar o alcance.",
                    },
                    {
                      value: "tag" as AudienceType,
                      title: "Contatos com tag",
                      description:
                        "Envie mensagens para segmentos já organizados pela equipe.",
                    },
                    {
                      value: "manual" as AudienceType,
                      title: "Seleção manual",
                      description:
                        "Defina manualmente um lote específico para a campanha.",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        handleCampaignFieldChange("audienceType", option.value)
                      }
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        campaignForm.audienceType === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">
                        {option.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {option.description}
                      </p>
                    </button>
                  ))}

                  {campaignForm.audienceType === "tag" ? (
                    <Field label="Nome da tag">
                      <input
                        value={campaignForm.tagLabel}
                        onChange={(event) =>
                          handleCampaignFieldChange("tagLabel", event.target.value)
                        }
                        className={inputClassName}
                        placeholder="Ex: Clientes VIP"
                      />
                    </Field>
                  ) : null}

                  {campaignForm.audienceType === "manual" ? (
                    <Field
                      label="Seleção manual"
                      hint="Informe o lote ou uma descrição simples da audiência."
                    >
                      <input
                        value={campaignForm.manualSelection}
                        onChange={(event) =>
                          handleCampaignFieldChange(
                            "manualSelection",
                            event.target.value,
                          )
                        }
                        className={inputClassName}
                        placeholder="Ex: 45 contatos prioritários"
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}

              {campaignStep === 4 ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => handleCampaignFieldChange("sendMode", "now")}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      campaignForm.sendMode === "now"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">Enviar agora</p>
                    <p className="mt-1 text-sm text-slate-500">
                      A campanha será criada já como execução simulada.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCampaignFieldChange("sendMode", "scheduled")
                    }
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      campaignForm.sendMode === "scheduled"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">
                      Agendar envio
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Programe a data e hora para a próxima janela de envio.
                    </p>
                  </button>

                  {campaignForm.sendMode === "scheduled" ? (
                    <Field label="Data e hora">
                      <input
                        type="datetime-local"
                        value={campaignForm.scheduledAt}
                        onChange={(event) =>
                          handleCampaignFieldChange(
                            "scheduledAt",
                            event.target.value,
                          )
                        }
                        className={inputClassName}
                      />
                    </Field>
                  ) : null}
                </div>
              ) : null}

              {campaignStep === 5 ? (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Nome da campanha
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {campaignForm.name || "Nova campanha"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Template selecionado
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedCampaignTemplate?.internalName ??
                        "Nenhum template selecionado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Público</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {buildAudienceLabel()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Envio</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {campaignForm.sendMode === "scheduled"
                        ? `Agendado para ${formatDateTime(
                            new Date(campaignForm.scheduledAt).toISOString(),
                          )}`
                        : "Envio imediato simulado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Estimativa inicial
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {estimateAudienceSize()} contatos
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <Card className="h-fit rounded-3xl p-5">
              <h3 className="font-semibold text-slate-900">
                Resumo da campanha
              </h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">Template</p>
                  <p className="mt-2 leading-6">
                    {selectedCampaignTemplate?.body ??
                      "Selecione um template aprovado para visualizar a mensagem."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MegaphoneIcon className="h-4 w-4 text-blue-600" />
                  {campaignForm.channelLabel}
                </div>
                <div className="flex items-center gap-2">
                  <PlayCircleIcon className="h-4 w-4 text-emerald-600" />
                  {buildAudienceLabel()}
                </div>
                <div className="flex items-center gap-2">
                  {campaignForm.sendMode === "scheduled" ? (
                    <PauseCircleIcon className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <SendIcon className="h-4 w-4 text-sky-600" />
                  )}
                  {campaignForm.sendMode === "scheduled"
                    ? `Agendamento em ${formatDateTime(
                        new Date(campaignForm.scheduledAt).toISOString(),
                      )}`
                    : "Campanha criada para envio imediato simulado"}
                </div>
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <Button type="button" variant="ghost" onClick={resetCampaignForm}>
              Cancelar
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setCampaignStep((current) =>
                    Math.max(1, current - 1) as CampaignWizardStep,
                  )
                }
                disabled={campaignStep === 1}
              >
                Voltar
              </Button>
              {campaignStep < 5 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setCampaignStep((current) =>
                      Math.min(5, current + 1) as CampaignWizardStep,
                    )
                  }
                  disabled={!canAdvanceCampaignStep()}
                  className="rounded-full"
                >
                  Próxima etapa
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSaveCampaign}
                  disabled={!selectedCampaignTemplate}
                  className="rounded-full"
                >
                  {campaignModalMode === "edit"
                    ? "Salvar campanha"
                    : "Confirmar campanha"}
                </Button>
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}

      {metricsCampaign ? (
        <ModalShell
          title="Métricas da campanha"
          subtitle="Acompanhe indicadores simulados de entrega, leitura e respostas."
          onClose={() => setMetricsCampaignId(null)}
          widthClassName="max-w-6xl"
        >
          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Taxa de entrega"
                value={formatPercent(
                  makeRate(metricsCampaign.delivered, metricsCampaign.totalContacts),
                )}
                hint={`${metricsCampaign.delivered} entregues de ${metricsCampaign.totalContacts}.`}
              />
              <SummaryCard
                label="Taxa de leitura"
                value={formatPercent(
                  makeRate(metricsCampaign.read, metricsCampaign.totalContacts),
                )}
                hint={`${metricsCampaign.read} mensagens lidas.`}
              />
              <SummaryCard
                label="Taxa de resposta"
                value={formatPercent(
                  makeRate(metricsCampaign.replied, metricsCampaign.totalContacts),
                )}
                hint={`${metricsCampaign.replied} respostas registradas.`}
              />
              <SummaryCard
                label="Erros"
                value={String(metricsCampaign.failed)}
                hint="Monitoramento de contatos com falha."
              />
            </div>

            <Card className="rounded-3xl p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Nome da campanha
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge {...campaignStatusMap[metricsCampaign.status]} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Template usado
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {templates.find((item) => item.id === metricsCampaign.templateId)
                      ?.internalName ?? "Template removido"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Público</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.audienceLabel}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Criada em</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(metricsCampaign.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Enviada/agendada em
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(metricsCampaign.sendAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total selecionado
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.totalContacts}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total enviado
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.delivered + metricsCampaign.failed}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total entregue
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.delivered}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total lido</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.read}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total respondido
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.replied}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total com erro
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {metricsCampaign.failed}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3Icon className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Destinatários simulados
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1050px] divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4">Nome</th>
                      <th className="pb-3 pr-4">Telefone</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Lida em</th>
                      <th className="pb-3 pr-4">Respondeu?</th>
                      <th className="pb-3 pr-4">Conversa</th>
                      <th className="pb-3">Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metricsRecipients.map((recipient) => (
                      <tr key={recipient.id} className="align-top">
                        <td className="py-4 pr-4 font-medium text-slate-900">
                          {recipient.name}
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {recipient.phone}
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge
                            {...recipientStatusMap[recipient.status]}
                          />
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {recipient.readAt ? formatDateTime(recipient.readAt) : "—"}
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {recipient.replied ? "Sim" : "Não"}
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {recipient.conversation}
                        </td>
                        <td className="py-4 text-sm text-slate-600">
                          {recipient.error ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMetricsCampaignId(null)}
            >
              Fechar
            </Button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
};
