import React from 'react';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  contactAvatar?: string;
  contactName?: string;
}

const getInitials = (name?: string) =>
  (name ?? 'Cliente')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  contactAvatar,
  contactName,
}) => {
  const payload: any = message.payload ?? {};
  console.log('💬 message no bubble:', message);

  // WhatsApp normalmente manda messages[0]
  const waMessage = Array.isArray(payload.messages)
    ? payload.messages[0]
    : undefined;

  // 1) Pega a URL da mídia:
  //    - primeiro do campo que sua API já está devolvendo (mediaUrl),
  //    - depois de dentro do payload da Meta.
  const mediaUrl =
    (message as any).image_url ?? // caso você adicione isso depois
    (message as any).mediaUrl ??
    waMessage?.image?.url ??
    waMessage?.audio?.url ??
    waMessage?.sticker?.url ??
    waMessage?.video?.url ??
    waMessage?.document?.url;

  // 2) Tipo da mídia
  const mediaType =
    message.type ??
    waMessage?.type ??
    (waMessage?.image
      ? 'image'
      : waMessage?.audio
      ? 'audio'
      : waMessage?.sticker
      ? 'sticker'
      : waMessage?.video
      ? 'video'
      : waMessage?.document
      ? 'document'
      : undefined);

  // 3) Legenda / texto
  const caption =
    message.text ??
    waMessage?.image?.caption ??
    waMessage?.document?.caption ??
    '';

  console.log('📎 mediaUrl:', mediaUrl);
  console.log('📎 mediaType:', mediaType);

  const isClient = message.author === 'cliente';
  const initials = getInitials(contactName);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const createdAt =
    (message as any).createdAt ??
    (message as any).created_at ??
    new Date().toISOString();

  return (
    <div className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`flex items-end gap-2 max-w-md ${
          isClient ? '' : 'flex-row-reverse'
        }`}
      >
        {isClient && (
          <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center text-xs font-medium flex-shrink-0 overflow-hidden">
            {contactAvatar ? (
              <img
                src={contactAvatar}
                alt={`Foto de ${contactName ?? 'Cliente'}`}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        )}
        <div className="flex flex-col">
          <div
            className={`rounded-lg px-4 py-3 space-y-2 ${
              isClient
                ? 'bg-[#E5E7EB] text-[#1E1E1E]'
                : 'bg-[#0A84FF] text-white'
            }`}
          >
            {mediaUrl && (
              <>
                {(mediaType === 'image' || mediaType === 'sticker') && (
                  <img
                    src={mediaUrl}
                    alt={mediaType === 'sticker' ? 'Figurinha' : 'Imagem'}
                    className="rounded-lg max-w-xs"
                  />
                )}
                {mediaType === 'audio' && (
                  <audio controls className="w-48" src={mediaUrl}>
                    Seu navegador nao suporta o player de audio.
                  </audio>
                )}
                {mediaType === 'video' && (
                  <video
                    controls
                    className="rounded-lg max-w-xs"
                    src={mediaUrl}
                  />
                )}
                {mediaType === 'document' && (
                  <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`text-sm underline ${
                      isClient ? 'text-[#1E1E1E]' : 'text-white'
                    }`}
                  >
                    Abrir documento
                  </a>
                )}
              </>
            )}
            {caption ? <p className="text-sm">{caption}</p> : null}
          </div>
          <span
            className={`text-xs text-gray-500 mt-1 ${
              isClient ? 'text-left' : 'text-right'
            }`}
          >
            {formatTime(createdAt)}
          </span>
        </div>
        {!isClient && (
          <div className="w-8 h-8 rounded-full bg-[#0A84FF] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
            AT
          </div>
        )}
      </div>
    </div>
  );
};
