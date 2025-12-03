import React from 'react';
import { Tag, Channel } from '../../types';
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'tag' | 'channel' | 'success' | 'warning';
  tag?: Tag;
  channel?: Channel;
}
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  tag,
  channel
}) => {
  const getTagColor = (tag?: Tag) => {
    switch (tag) {
      case 'Pacientes':
        return 'bg-blue-100 text-blue-700';
      case 'Médicos':
        return 'bg-purple-100 text-purple-700';
      case 'Vendas':
        return 'bg-green-100 text-green-700';
      case 'Suporte':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  const getChannelColor = (channel?: Channel) => {
    switch (channel) {
      case 'whatsapp':
        return 'bg-green-100 text-green-700';
      case 'instagram':
        return 'bg-pink-100 text-pink-700';
      case 'messenger':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    tag: getTagColor(tag),
    channel: getChannelColor(channel),
    success: 'bg-[#22C55E]/10 text-[#22C55E]',
    warning: 'bg-[#F97316]/10 text-[#F97316]'
  };
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>;
};