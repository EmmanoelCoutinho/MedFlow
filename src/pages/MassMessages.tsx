import React, { useState } from "react";
import { 
  SendIcon, 
  UsersIcon, 
  TagIcon, 
  MessageSquareTextIcon, 
  AlertCircleIcon, 
  CheckCircle2Icon,
  RefreshCwIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  EyeIcon,
  Trash2Icon,
  BanIcon 
} from "lucide-react";
import { toast } from "react-toastify";
import { useMassMessages } from "../hooks/useMassMessages";
import { useCampaignStatus, Campaign, QueueItem } from "../hooks/useCampaignStatus";

type TargetType = "all" | "tags" | "departments";

export const MassMessagesPage: React.FC = () => {
  const [targetType, setTargetType] = useState<TargetType>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [totalEnviados, setTotalEnviados] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { triggerMassCampaign, loading: sending } = useMassMessages();

  const availableTags = [
    { id: "1", name: "Retorno", color: "bg-blue-500" },
    { id: "2", name: "Novo Paciente", color: "bg-green-500" },
    { id: "3", name: "Inadimplente", color: "bg-red-500" },
  ];

  const availableDepartments = [
    { id: "dep1", name: "Cardiologia" },
    { id: "dep2", name: "Pediatria" },
    { id: "dep3", name: "Ortopedia" },
  ];

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleDepartmentToggle = (depId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(depId) ? prev.filter(id => id !== depId) : [...prev, depId]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error("Por favor, escreve uma mensagem para o disparo.");
      return;
    }

    if (targetType === "tags" && selectedTags.length === 0) {
      toast.error("Seleciona pelo menos uma etiqueta.");
      return;
    }

    if (targetType === "departments" && selectedDepartments.length === 0) {
      toast.error("Seleciona pelo menos um departamento.");
      return;
    }

    const selectedIds = targetType === "tags" ? selectedTags : selectedDepartments;

    try {
      const res = await triggerMassCampaign({
        targetType,
        selectedIds,
        messageTemplate: message,
      });

      if (res?.success) {
        setSuccess(true);
        setTotalEnviados(res.total);
        toast.success(`Campanha iniciada para ${res.total} contatos!`);
        
        setMessage("");
        setSelectedTags([]);
        setSelectedDepartments([]);
        
        // Força a tabela de histórico abaixo a recarregar instantaneamente
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || "Falha ao iniciar campanha. Verifique os filtros.");
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 flex flex-col items-center w-full">
      <div className="w-full max-w-4xl">
        
        {/* Cabeçalho */}
        <div className="flex flex-col mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mensagens em Massa</h1>
          <p className="text-sm text-gray-500">
            Envia notificações e alertas em lote filtrando por segmentos específicos.
          </p>
        </div>

        {/* Alerta de Sucesso Dinâmico */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-fadeIn">
            <CheckCircle2Icon className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Campanha disparada com sucesso!</p>
              <p className="text-sm opacity-90">
                O sistema gerou a fila e está processando os envios para <strong>{totalEnviados} contatos</strong> em segundo plano.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setSuccess(false)} 
              className="ml-auto text-sm font-semibold hover:underline"
            >
              Novo disparo
            </button>
          </div>
        )}

        {/* Formulário de Configuração do Disparo */}
        <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna da Esquerda: Filtros de Destinatários */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-blue-500" />
                1. Destinatários
              </h3>
              
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetType === "all" ? "border-blue-500 bg-blue-50/40" : "border-gray-200 hover:bg-gray-50"
                }`}>
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="target" 
                      checked={targetType === "all"} 
                      onChange={() => setTargetType("all")}
                      className="peer appearance-none h-5 w-5 rounded-full border-2 border-gray-300 checked:border-blue-600 transition-all cursor-pointer"
                    />
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-blue-600 scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className={`text-sm font-medium ${targetType === "all" ? "text-blue-900" : "text-gray-700"}`}>
                    Todos os contactos
                  </span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetType === "tags" ? "border-blue-500 bg-blue-50/40" : "border-gray-200 hover:bg-gray-50"
                }`}>
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="target" 
                      checked={targetType === "tags"} 
                      onChange={() => setTargetType("tags")}
                      className="peer appearance-none h-5 w-5 rounded-full border-2 border-gray-300 checked:border-blue-600 transition-all cursor-pointer"
                    />
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-blue-600 scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className={`text-sm font-medium ${targetType === "tags" ? "text-blue-900" : "text-gray-700"}`}>
                    Filtrar por Etiquetas
                  </span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  targetType === "departments" ? "border-blue-500 bg-blue-50/40" : "border-gray-200 hover:bg-gray-50"
                }`}>
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="radio" 
                      name="target" 
                      checked={targetType === "departments"} 
                      onChange={() => setTargetType("departments")}
                      className="peer appearance-none h-5 w-5 rounded-full border-2 border-gray-300 checked:border-blue-600 transition-all cursor-pointer"
                    />
                    <div className="absolute h-2.5 w-2.5 rounded-full bg-blue-600 scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className={`text-sm font-medium ${targetType === "departments" ? "text-blue-900" : "text-gray-700"}`}>
                    Filtrar por Departamento
                  </span>
                </label>
              </div>
            </div>

            {/* Filtros Condicionais de Etiquetas */}
            {targetType === "tags" && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-t-2 border-t-blue-500 animate-fadeIn">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <TagIcon className="h-3 w-3" /> Selecionar Etiquetas
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableTags.map(tag => {
                    const isTagSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                          isTagSelected ? 'bg-blue-50/20 border-blue-200 text-blue-900' : 'border-transparent text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="relative flex items-center justify-center flex-shrink-0">
                          <input 
                            type="checkbox"
                            checked={isTagSelected}
                            readOnly
                            className="peer appearance-none h-5 w-5 rounded-md border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer focus:outline-none"
                          />
                          <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${tag.color} flex-shrink-0`} />
                        <span className="truncate">{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filtros Condicionais de Departamentos */}
            {targetType === "departments" && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-t-2 border-t-blue-500 animate-fadeIn">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Selecionar Departamentos
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableDepartments.map(dep => {
                    const isDepSelected = selectedDepartments.includes(dep.id);
                    return (
                      <label key={dep.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        isDepSelected ? "border-blue-200 bg-blue-50/20 text-blue-900" : "border-transparent hover:bg-gray-50 text-gray-700"
                      }`}>
                        <div className="relative flex items-center justify-center flex-shrink-0">
                          <input 
                            type="checkbox"
                            checked={isDepSelected}
                            onChange={() => handleDepartmentToggle(dep.id)}
                            className="peer appearance-none h-5 w-5 rounded-md border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer focus:outline-none"
                          />
                          <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">{dep.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Coluna da Direita: Editor da Mensagem */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquareTextIcon className="h-4 w-4 text-blue-500" />
                2. Conteúdo da Mensagem
              </h3>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreve aqui o texto do disparo em massa... Podes usar {nome} para personalizar a mensagem."
                rows={8}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm placeholder-gray-400 focus:outline-none"
              />

              <div className="mt-2 flex gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Dica: Use <code className="font-bold">{"{nome}"}</code> para saudar o cliente.
                </span>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-xs">
                <AlertCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso Importante:</strong> Disparos em lote frequentes no WhatsApp sem interação prévia podem causar o banimento do número. Recomenda-se adicionar intervalos de tempo (delay) entre os envios no backend.
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className={`flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors ${
                    sending ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <SendIcon className="h-4 w-4" />
                  {sending ? "Criando lote de disparos..." : "Iniciar Disparo em Massa"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Componente de histórico renderizado logo abaixo */}
        <CampaignHistory key={refreshTrigger} />

      </div>
    </div>
  );
};

/* ==========================================================================
   💡 COMPONENTE SECUNDÁRIO: HISTÓRICO DE DISPAROS (Gerenciamento Completo)
   ========================================================================== */
interface CampaignHistoryProps {
  key?: number;
}

const CampaignHistory: React.FC<CampaignHistoryProps> = () => {
  const { campaigns, loading, refresh, getCampaignDetails, cancelCampaign, deleteCampaign } = useCampaignStatus();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [details, setDetails] = useState<QueueItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleViewDetails = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setLoadingDetails(true);
    try {
      const data = await getCampaignDetails(campaign.id);
      setDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCancel = async (campaignId: string) => {
    if (!window.confirm("Tens a certeza que desejas cancelar esta campanha? As mensagens ainda pendentes na fila não serão enviadas.")) return;
    
    setActionLoading(campaignId);
    try {
      await cancelCampaign(campaignId);
      toast.success("Campanha cancelada e fila de pendentes limpa!");
      refresh();
    } catch (err) {
      toast.error("Falha ao cancelar a campanha.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm("Tens a certeza que desejas apagar o histórico desta campanha? Isto removerá todos os relatórios vinculados a ela de forma permanente.")) return;

    setActionLoading(campaignId);
    try {
      await deleteCampaign(campaignId);
      toast.success("Histórico da campanha removido com sucesso!");
      refresh();
    } catch (err) {
      toast.error("Falha ao apagar a campanha.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm w-full animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Histórico de Disparos</h3>
          <p className="text-xs text-gray-500">Acompanhe a taxa de entrega, cancele ou remova envios.</p>
        </div>
        <button 
          type="button"
          onClick={refresh} 
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg border transition-colors text-gray-600 disabled:opacity-50"
        >
          <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Mensagem</th>
              <th className="p-3">Segmento</th>
              <th className="p-3">Progresso</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-sm text-gray-400">
                  Nenhum disparo realizado até ao momento.
                </td>
              </tr>
            ) : (
              campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-gray-50/50">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(camp.created_at).toLocaleString("pt-PT")}
                  </td>
                  <td className="p-3 max-w-xs truncate">{camp.message}</td>
                  <td className="p-3 uppercase text-xs font-semibold text-blue-600">{camp.target_type}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all" 
                          style={{ width: `${camp.total_targets > 0 ? ((camp.sent_count || 0) / camp.total_targets) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{camp.sent_count}/{camp.total_targets}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      camp.status === "completed" ? "bg-green-50 text-green-700" :
                      camp.status === "processing" ? "bg-blue-50 text-blue-700 animate-pulse" :
                      camp.status === "cancelled" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"
                    }`}>
                      {camp.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      
                      <button 
                        type="button"
                        onClick={() => handleViewDetails(camp)}
                        disabled={actionLoading === camp.id}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md inline-flex items-center gap-1 text-xs transition-colors"
                        title="Ver Detalhes"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </button>

                      {(camp.status === "pending" || camp.status === "processing") && (
                        <button 
                          type="button"
                          onClick={() => handleCancel(camp.id)}
                          disabled={actionLoading === camp.id}
                          className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-md inline-flex items-center gap-1 text-xs transition-colors"
                          title="Cancelar envios restantes"
                        >
                          <BanIcon className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button 
                        type="button"
                        onClick={() => handleDelete(camp.id)}
                        disabled={actionLoading === camp.id}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-md inline-flex items-center gap-1 text-xs transition-colors"
                        title="Apagar histórico"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                      
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Relatório Lateral */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-xl flex flex-col justify-between">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h4 className="font-bold text-gray-800 text-lg">Relatório de Entrega</h4>
                <button type="button" onClick={() => setSelectedCampaign(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
              </div>
              
              <div className="text-xs bg-gray-50 p-3 rounded-lg border mb-4 text-gray-600">
                <p><strong>Mensagem Original:</strong></p>
                <p className="italic mt-1 line-clamp-3">"{selectedCampaign.message}"</p>
              </div>

              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Destinatários individuais</h5>
              
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-[calc(100vh-250px)]">
                {loadingDetails ? (
                  <p className="text-sm text-gray-400 text-center py-4">Carregando números...</p>
                ) : (
                  details.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 text-sm">
                      <span className="font-mono text-gray-700">{item.phone_text}</span>
                      <div className="flex items-center gap-2">
                        {item.status === "sent" && (
                          <span className="text-green-600 flex items-center gap-1 text-xs bg-green-50 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircleIcon className="h-3 w-3" /> Recebido
                          </span>
                        )}
                        {item.status === "failed" && (
                          <span className="text-red-600 flex items-center gap-1 text-xs bg-red-50 px-2 py-0.5 rounded-full font-medium" title={item.error_message || ""}>
                            <XCircleIcon className="h-3 w-3" /> Falhou
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span className="text-amber-600 flex items-center gap-1 text-xs bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            <ClockIcon className="h-3 w-3 animate-spin" /> Na Fila
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};