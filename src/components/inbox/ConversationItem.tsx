import React from 'react';
import { MessageCircleIcon, InstagramIcon, FacebookIcon } from 'lucide-react';
import { Conversation } from '../../types';
import { Badge } from '../ui/Badge';
interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
}
export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onClick
}) => {
  const getChannelIcon = () => {
    switch (conversation.channel) {
      case 'whatsapp':
        return <MessageCircleIcon className="w-4 h-4 text-green-600" />;
      case 'instagram':
        return <InstagramIcon className="w-4 h-4 text-pink-600" />;
      case 'messenger':
        return <FacebookIcon className="w-4 h-4 text-blue-600" />;
    }
  };
  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `há ${days}d`;
    if (hours > 0) return `há ${hours}h`;
    if (minutes > 0) return `há ${minutes} min`;
    return 'agora';
  };
  const initials = conversation.contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return <div onClick={onClick} className="p-4 hover:bg-[#E5E7EB]/30 cursor-pointer transition-colors">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-[#0A84FF] text-white flex items-center justify-center font-medium flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-[#1E1E1E] truncate">
              {conversation.contactName}
            </h3>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {getTimeAgo(conversation.lastTimestamp)}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate mb-2">
            {conversation.lastMessage}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {getChannelIcon()}
            {conversation.tag && <Badge variant="tag" tag={conversation.tag}>
                {conversation.tag}
              </Badge>}
            {conversation.unreadCount > 0 && <span className="bg-[#0A84FF] text-white text-xs px-2 py-0.5 rounded-full">
                {conversation.unreadCount}
              </span>}
          </div>
        </div>
      </div>
    </div>;
};