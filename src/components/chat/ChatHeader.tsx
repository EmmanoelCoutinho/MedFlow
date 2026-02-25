import React, { useMemo, useState } from "react";
import { Conversation } from "../../types";
import { Button } from "../ui/Button";
import { TbMessageCheck, TbMessageOff } from "react-icons/tb";
import { HiOutlineSwitchHorizontal } from "react-icons/hi";
import { FiSearch } from "react-icons/fi";
import { CustomTooltip } from "../ui/CustomTooltip";
import { ArrowLeftIcon, TagIcon, MoreVerticalIcon } from "lucide-react";
import { CustomDropdown } from "../ui/CustomDropdown";

interface ChatHeaderProps {
  conversation: Conversation;
  onBack: () => void;
  onManageTags?: () => void;
  onAccept?: () => Promise<void> | void;
  onTransfer?: () => void;
  onSearch?: () => void;
  onRefresh?: () => Promise<void> | void;
  onClose?: () => Promise<void> | void;
  acceptDisabled?: boolean;
  transferDisabled?: boolean;
  closeDisabled?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  onManageTags,
  onAccept,
  onTransfer,
  onSearch,
  onRefresh,
  onClose,
  acceptDisabled = false,
  transferDisabled = false,
  closeDisabled = false,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const initials = useMemo(() => {
    const name = (conversation.contactName ?? "").trim();
    if (!name) return "--";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [conversation.contactName]);

  const avatar = conversation.contactAvatar;

  const handleAccept = async () => {
    if (!onAccept || acceptDisabled || isAccepting) return;

    try {
      setIsAccepting(true);
      await onAccept();
      await onRefresh?.();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleClose = async () => {
    if (!onClose || closeDisabled || isClosing) return;

    try {
      setIsClosing(true);
      await onClose();
      await onRefresh?.();
    } finally {
      setIsClosing(false);
    }
  };

  const acceptIsDisabled = acceptDisabled || isAccepting;
  const closeIsDisabled = closeDisabled || isClosing;

  return (
    <div className="sticky top-0 z-30 h-20 border-b border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 transition-colors hover:bg-[#E5E7EB]"
          >
            <ArrowLeftIcon className="h-5 w-5 text-[#1E1E1E]" />
          </button>

          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#0A84FF] font-medium text-white">
            {avatar ? (
              <img
                src={avatar}
                alt={`Foto de ${conversation.contactName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div>
            <h2 className="font-semibold text-[#1E1E1E]">
              {conversation.contactName}
            </h2>

            <div className="mt-0.5 flex items-center gap-2">
              {conversation.contactNumber && (
                <span className="text-xs text-gray-500">
                  {conversation.contactNumber}
                </span>
              )}

              {conversation.tags?.map((tag) => (
                <span
                  key={tag.id ?? tag.name}
                  className="inline-flex select-none rounded-full px-3 py-1 text-xs font-medium text-white"
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
            <Button variant="ghost" size="sm" onClick={onSearch}>
              <FiSearch className="h-5 w-5" />
            </Button>
          </CustomTooltip>

          <CustomTooltip
            text={isClosing ? "Finalizando..." : "Finalizar conversa"}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={closeIsDisabled || !onClose}
              aria-disabled={closeIsDisabled || !onClose}
            >
              <TbMessageOff className="h-5 w-5" />
            </Button>
          </CustomTooltip>

          <CustomTooltip text="Transferir conversa">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTransfer}
              disabled={transferDisabled || !onTransfer}
              aria-disabled={transferDisabled || !onTransfer}
            >
              <HiOutlineSwitchHorizontal className="h-5 w-5" />
            </Button>
          </CustomTooltip>

          <CustomTooltip
            text={isAccepting ? "Aceitando..." : "Aceitar conversa"}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAccept}
              disabled={acceptIsDisabled || !onAccept}
              aria-disabled={acceptIsDisabled || !onAccept}
            >
              <TbMessageCheck className="h-5 w-5" />
            </Button>
          </CustomTooltip>

          <CustomDropdown
            trigger={
              <Button variant="ghost" size="sm">
                <MoreVerticalIcon className="h-5 w-5" />
              </Button>
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
