// src/components/chat/MessageBubble.tsx
import React from 'react';
import { DownloadIcon, FileIcon } from 'lucide-react';
import type { Message as UiMessage } from '../../types';

interface MessageBubbleProps {
  message: UiMessage;
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

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatBytes = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return null;

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted =
    unitIndex === 0 || size >= 10
      ? Math.round(size).toString()
      : size.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
};

const getDocumentLabel = (filename?: string, mimeType?: string) => {
  const ext = filename?.split('.').pop();
  if (ext && ext.length <= 6) return ext.toUpperCase();

  if (!mimeType) return 'DOC';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word')) return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return 'XLS';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return 'PPT';
  if (mimeType.startsWith('text/')) return 'TXT';

  return 'DOC';
};

const getDocumentAccentClass = (label: string) => {
  switch (label) {
    case 'PDF':
      return 'bg-red-500';
    case 'DOC':
    case 'DOCX':
      return 'bg-blue-500';
    case 'XLS':
    case 'XLSX':
      return 'bg-emerald-500';
    case 'PPT':
    case 'PPTX':
      return 'bg-amber-500';
    case 'TXT':
      return 'bg-gray-600';
    default:
      return 'bg-gray-500';
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  contactAvatar,
  contactName,
}) => {
  const payload = message.payload ?? {};
  const isClient = message.author === 'cliente';
  const initials = getInitials(contactName);

  // Preferimos sempre o que veio já mapeado
  const mediaUrl =
    message.mediaUrl ??
    (payload?.image?.url ||
      payload?.audio?.url ||
      payload?.sticker?.url ||
      payload?.video?.url ||
      payload?.document?.url ||
      undefined);

  const mediaType =
    message.type ??
    (payload.image
      ? 'image'
      : payload.audio
      ? 'audio'
      : payload.sticker
      ? 'sticker'
      : payload.video
      ? 'video'
      : payload.document
      ? 'document'
      : 'text');

  const captionFromPayload =
    payload?.image?.caption ?? payload?.document?.caption ?? null;

  const displayText = message.text || captionFromPayload || '';

  const documentData =
    payload?.document ??
    payload?.message?.document ??
    payload?.messages?.[0]?.document ??
    payload?.data?.document ??
    payload?.value?.document ??
    payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.document;

  const documentFilename =
    message.filename ?? documentData?.filename ?? documentData?.name ?? undefined;

  const documentFileSize =
    message.fileSize ??
    documentData?.file_size ??
    documentData?.filesize ??
    undefined;

  const documentLabel = getDocumentLabel(
    documentFilename,
    message.mediaMimeType
  );
  const documentSize = formatBytes(documentFileSize);
  const documentMeta = documentSize
    ? `${documentLabel} - ${documentSize}`
    : documentLabel;
  const documentAccentClass = getDocumentAccentClass(documentLabel);

  // Se for apenas áudio, sem texto/legenda, queremos tirar a caixa externa
  const onlyAudio =
    mediaType === 'audio' && (!displayText || !displayText.trim());
  const onlyDocument =
    mediaType === 'document' && (!displayText || !displayText.trim());

  const bubbleBase = 'space-y-2';
  const bubbleClass = onlyAudio || onlyDocument
    ? bubbleBase
    : `${bubbleBase} ${
        isClient
          ? 'rounded-lg px-4 py-3 bg-[#E5E7EB] text-[#1E1E1E]'
          : 'rounded-lg px-4 py-3 bg-[#0A84FF] text-white'
      }`;

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
          <div className={bubbleClass}>
            {/* Mídias */}
            {mediaUrl && (
              <>
                {mediaType === 'image' && (
                  <img
                    src={mediaUrl}
                    alt="Imagem"
                    className="rounded-lg max-w-xs"
                  />
                )}

                {mediaType === 'audio' && (
                  <div
                    className={`
                      flex items-center gap-3 rounded-2xl px-3 py-2
                      ${isClient ? 'bg-[#E5E7EB]' : 'bg-[#0A84FF]'}
                      text-[#1E1E1E]
                    `}
                  >
                    <audio
                      controls
                      className="w-56 h-9 bg-transparent outline-none"
                      src={mediaUrl}
                    >
                      Seu navegador não suporta o player de áudio.
                    </audio>
                  </div>
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
                    className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[#1E1E1E] transition hover:bg-[#F3F4F6]"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${documentAccentClass}`}
                    >
                      <FileIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">
                        {documentFilename || 'Documento'}
                      </p>
                      <p className="text-xs text-[#6B7280]">{documentMeta}</p>
                    </div>
                    <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#D1D5DB] text-[#6B7280]">
                      <DownloadIcon className="h-4 w-4" />
                    </div>
                  </a>
                )}

                {mediaType === 'sticker' && (
                  <img
                    src={mediaUrl}
                    alt="Figurinha"
                    className="rounded-lg max-w-[120px]"
                  />
                )}
              </>
            )}

            {/* Texto / legenda: só mostra se não for o caso de "somente áudio" */}
            {displayText && !onlyAudio ? (
              <p className="text-sm">{displayText}</p>
            ) : null}
          </div>

          <span
            className={`text-xs text-gray-500 mt-1 ${
              isClient ? 'text-left' : 'text-right'
            }`}
          >
            {formatTime(message.createdAt)}
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
