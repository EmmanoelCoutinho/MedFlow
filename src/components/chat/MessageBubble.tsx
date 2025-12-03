import React from 'react';
import { Message } from '../../types';
interface MessageBubbleProps {
  message: Message;
}
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message
}) => {
  const isClient = message.author === 'cliente';
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <div className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex items-end gap-2 max-w-md ${isClient ? '' : 'flex-row-reverse'}`}>
        {isClient && <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center text-xs font-medium flex-shrink-0">
            CL
          </div>}
        <div className="flex flex-col">
          <div className={`rounded-lg px-4 py-3 ${isClient ? 'bg-[#E5E7EB] text-[#1E1E1E]' : 'bg-[#0A84FF] text-white'}`}>
            {message.text && <p className="text-sm">{message.text}</p>}
            {message.mediaUrl && <img src={message.mediaUrl} alt="Mídia" className="mt-2 rounded-lg max-w-xs" />}
          </div>
          <span className={`text-xs text-gray-500 mt-1 ${isClient ? 'text-left' : 'text-right'}`}>
            {formatTime(message.createdAt)}
          </span>
        </div>
        {!isClient && <div className="w-8 h-8 rounded-full bg-[#0A84FF] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
            AT
          </div>}
      </div>
    </div>;
};