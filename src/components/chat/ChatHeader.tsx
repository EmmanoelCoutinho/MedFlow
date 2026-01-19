import React from "react";
import { Conversation } from "../../types";
import { Button } from "../ui/Button";
import { TbMessageCheck } from "react-icons/tb";
import { HiOutlineSwitchHorizontal } from "react-icons/hi";
import { FiSearch } from "react-icons/fi";
import { CustomTooltip } from "../ui/CustomTooltip";
import { ArrowLeftIcon, TagIcon, MoreVerticalIcon } from "lucide-react";
import { CustomDropdown } from "../ui/CustomDropdown";

interface ChatHeaderProps {
  conversation: Conversation;
  onBack: () => void;
  onManageTags?: () => void;
  onAccept?: () => void;
  acceptDisabled?: boolean;
}
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  onManageTags,
  onAccept,
  acceptDisabled = false,
}) => {
  const initials = conversation.contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatar = conversation.contactAvatar;
  return (
    <div className="sticky top-0 z-30 h-20 border-b border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-[#1E1E1E]" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[#0A84FF] text-white flex items-center justify-center font-medium overflow-hidden">
            {avatar ? (
              <img
                src={avatar}
                alt={`Foto de ${conversation.contactName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <h2 className="font-semibold text-[#1E1E1E]">
              {conversation.contactName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {conversation.contactNumber && (
                <span className="text-xs text-gray-500">
                  {conversation.contactNumber}
                </span>
              )}
              {conversation.tags &&
                conversation.tags.map((tag) => (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white select-none"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CustomTooltip text="Buscar na conversa">
            <Button variant="ghost" size="sm">
              <FiSearch className="w-5 h-5" />
            </Button>
          </CustomTooltip>
          <CustomTooltip text="Traferir conversa">
            <Button variant="ghost" size="sm">
              <HiOutlineSwitchHorizontal className="w-5 h-5" />
            </Button>
          </CustomTooltip>
          <CustomTooltip text="Aceitar conversa">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAccept}
              disabled={acceptDisabled}
              aria-disabled={acceptDisabled}
            >
              <TbMessageCheck className="w-5 h-5" />
            </Button>
          </CustomTooltip>
          <CustomDropdown
            trigger={
              // <CustomTooltip text="Mais opções">
              <Button variant="ghost" size="sm">
                <MoreVerticalIcon className="w-5 h-5" />
              </Button>
              // </CustomTooltip>
            }
            items={[
              {
                label: "Gerenciar Etiquetas",
                icon: <TagIcon className="h-4 w-4" />,
                onSelect: () => onManageTags?.(),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
