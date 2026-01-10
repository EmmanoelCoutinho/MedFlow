import React from 'react';
import { MessageSquareIcon } from 'lucide-react';

export const InboxEmpty: React.FC = () => (
  <div className="flex-1 flex items-center justify-center text-center h-full">
    <MessageSquareIcon className="w-16 h-16 text-gray-300 mb-3" />
    <div>
      <h3 className="text-lg font-medium">Selecione uma conversa</h3>
      <p className="text-gray-500">Ou inicie um novo chat</p>
    </div>
  </div>
);
