import React from 'react';
import { ArrowLeftIcon, MoreVerticalIcon } from 'lucide-react';
import { Conversation } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
interface ChatHeaderProps {
  conversation: Conversation;
  onBack: () => void;
}
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack
}) => {
  const initials = conversation.contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
              {conversation.tag && (
                <Badge variant="tag" tag={conversation.tag}>
                  {conversation.tag}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <MoreVerticalIcon className="w-4 h-4" />
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            variant="secondary"
            size="sm"
          >
            Finalizar Chat  
          </Button>
        </div>
      </div>
    </div>
  );
};
