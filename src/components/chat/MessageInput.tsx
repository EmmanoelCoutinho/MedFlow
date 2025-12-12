import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, SmileIcon } from 'lucide-react';
import { Button } from '../ui/Button';
interface MessageInputProps {
  onSend: (text: string) => void;
}
export const MessageInput: React.FC<MessageInputProps> = ({
  onSend
}) => {
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const emojis = [
    '😀','😁','😂','🤣','😃','😄','😅','😊','😍','😘','😗','😙','😚','🤗','🤩','🤔',
    '🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌',
    '😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🫠','🥲','😢','😭','😤','😠','😡',
    '🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤭','🤫','🤥','😶‍🌫️','😇',
    '😈','👿','👍','👎','👏','🙌','🙏','🤝','💪','👌','🤌','🤏','✌️','🤟','🤘','🤙',
    '🫶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗',
    '💖','💘','💝','💤','💢','💥','💫','💦','✨','🔥','🌟','⭐','⚡'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!pickerRef.current) return;
      if (pickerRef.current.contains(event.target as Node)) return;
      setShowEmojis(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage('');
      setShowEmojis(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => `${prev}${emoji}`);
    setShowEmojis(false);
  };

  return <div className="fixed inset-x-0 bottom-0 border-t border-[#E5E7EB] bg-white p-4 z-30 shadow-sm">
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
        <div className="flex gap-2">
          <button type="button" className="p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors">
            <PaperclipIcon className="w-5 h-5 text-gray-500" />
          </button>
          <button type="button" onClick={() => setShowEmojis((v) => !v)} className="p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors">
            <SmileIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Digite uma mensagem..." rows={1} className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent resize-none max-h-32" />
        <Button type="submit" variant="primary" disabled={!message.trim()} className="px-4">
          <SendIcon className="w-4 h-4" />
        </Button>

        {showEmojis && (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-16 mb-2 w-72 max-h-[300px] overflow-y-auto overflow-x-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg p-2 grid grid-cols-8 gap-2"
          >
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl hover:bg-[#E5E7EB] rounded-lg p-1 leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>;
};
