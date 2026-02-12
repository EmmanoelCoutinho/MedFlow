import React from "react";
import type { ConversationEvent } from "../../types";

interface SystemEventBubbleProps {
  event: ConversationEvent;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return time;
};

const getActorLabel = (event: ConversationEvent) =>
  event.performedByName || "Sistema";

const getEventText = (event: ConversationEvent) => {
  const actor = getActorLabel(event);
  const meta = event.metadata ?? {};

  switch (event.type) {
    case "conversation_accepted":
      return `${actor} aceitou a conversa`;
    case "sector_transferred": {
      const toSector = meta.to_department_name ?? "outro setor";
      return `${actor} transferiu para ${toSector}`;
    }
    case "user_transferred": {
      const toUser = meta.to_user_name ?? "outro atendente";
      return `${actor} atribuiu a conversa para ${toUser}`;
    }
    case "tag_added": {
      const tag = meta.tag_name ?? "uma etiqueta";
      return `${actor} adicionou ${tag}`;
    }
    case "tag_removed": {
      const tag = meta.tag_name ?? "uma etiqueta";
      return `${actor} removeu ${tag}`;
    }
    case "status_changed": {
      const nextStatus = meta.to_status ?? "novo status";
      return `${actor} alterou o status para ${nextStatus}`;
    }
    default:
      return `${actor} registrou um evento`;
  }
};

export const SystemEventBubble: React.FC<SystemEventBubbleProps> = ({
  event,
}) => {
  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs text-[#6B7280]">
        <span>{getEventText(event)}</span>
        <span className="ml-2 text-[#9CA3AF]">
          {formatTime(event.createdAt)}
        </span>
      </div>
    </div>
  );
};
