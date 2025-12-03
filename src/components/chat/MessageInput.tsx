import React, { useState } from 'react';
import { SendIcon, PaperclipIcon, SmileIcon } from 'lucide-react';
import { Button } from '../ui/Button';
interface MessageInputProps {
  onSend: (text: string) => void;
}
export const MessageInput: React.FC<MessageInputProps> = ({
  onSend
}) => {
  const [message, setMessage] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  return <div className="border-t border-[#E5E7EB] bg-white p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex gap-2">
          <button type="button" className="p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors">
            <PaperclipIcon className="w-5 h-5 text-gray-500" />
          </button>
          <button type="button" className="p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors">
            <SmileIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Digite uma mensagem..." rows={1} className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent resize-none max-h-32" />
        <Button type="submit" variant="primary" disabled={!message.trim()} className="px-4">
          <SendIcon className="w-4 h-4" />
        </Button>
      </form>
    </div>;
};