import React, { useState, useRef, useEffect } from "react";
import {
  SendIcon,
  PaperclipIcon,
  SmileIcon,
  ImageIcon,
  FileIcon,
  LockIcon,
  MicIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { emojis } from "../../constants/emojis";
import { supabase } from "../../lib/supabaseClient";

type SendableInput =
  | string
  | {
      type: "text" | "image" | "audio" | "document";
      text?: string;
      mediaUrl?: string;
      mediaMimeType?: string;
      filename?: string;
      fileSize?: number;
    };

interface MessageInputProps {
  onSend: (input: SendableInput) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  disabledReason,
}) => {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const pickerRef = useRef<HTMLDivElement | null>(null);
  const attachmentsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Fecha popups ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (pickerRef.current && pickerRef.current.contains(target)) return;
      if (attachmentsRef.current && attachmentsRef.current.contains(target))
        return;

      setShowEmojis(false);
      setShowAttachments(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Se ficar disabled, fecha popups e para gravação
  useEffect(() => {
    if (!disabled) return;

    setShowEmojis(false);
    setShowAttachments(false);

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    stopStreamTracks();
    setIsRecording(false);
    setIsSendingAudio(false);
  }, [disabled]);

  // Limpa gravação e stream ao desmontar
  useEffect(
    () => () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      stopStreamTracks();
    },
    [],
  );

  // Contador de gravação
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return undefined;
    }
    const id = window.setInterval(
      () => setRecordSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(id);
  }, [isRecording]);

  const stopStreamTracks = () => {
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
      setShowEmojis(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (disabled) return;

    setMessage((prev) => `${prev}${emoji}`);
    setShowEmojis(false);
  };

  const AUDIO_CONVERTER_URL = import.meta.env.VITE_AUDIO_CONVERTER_URL;
  const AUDIO_CONVERTER_KEY = import.meta.env.VITE_AUDIO_CONVERTER_KEY;

  const convertWebmToOgg = async (webmBlob: Blob): Promise<Blob> => {
    const fd = new FormData();
    fd.append("file", webmBlob, `voice-${Date.now()}.webm`);

    const res = await fetch(`${AUDIO_CONVERTER_URL}/v1/convert-webm-to-ogg`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AUDIO_CONVERTER_KEY}`,
      },
      body: fd,
    });

    if (!res.ok) {
      const maybeJson = await res.json().catch(() => null);
      const msg =
        maybeJson?.error || `Falha ao converter áudio (HTTP ${res.status})`;
      throw new Error(msg);
    }

    const oggBlob = await res.blob();

    if (!oggBlob || oggBlob.size === 0) {
      throw new Error("Conversão retornou arquivo vazio");
    }

    return oggBlob;
  };

  // Upload genérico para Supabase (imagem / audio / documento)
  const uploadFileToSupabase = async (
    file: File,
    kind: "image" | "audio" | "document",
  ) => {
    const extFromName = file.name.split(".").pop();
    const defaultExt =
      kind === "image" ? "jpg" : kind === "audio" ? "mp3" : "bin";

    const fileExt = (extFromName || defaultExt).toLowerCase();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const folder =
      kind === "image"
        ? "outbound-images"
        : kind === "audio"
          ? "outbound-audios"
          : "outbound-documents";

    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("whatsapp-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType:
          file.type ||
          (kind === "image"
            ? "image/jpeg"
            : kind === "audio"
              ? "audio/mpeg"
              : "application/octet-stream"),
      });

    if (uploadError) {
      console.error("Erro ao fazer upload no Storage:", uploadError);
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;
    console.log(`[uploadFileToSupabase] ${kind} URL pública:`, publicUrl);

    return { publicUrl, path: filePath };
  };

  const sendAudioBlob = async (blob: Blob) => {
    if (disabled) return;
    if (!blob || blob.size === 0) return;

    const oggBlob = await convertWebmToOgg(blob);

    const oggFile = new File([oggBlob], `audio-${Date.now()}.ogg`, {
      type: "audio/ogg",
    });

    const { publicUrl } = await uploadFileToSupabase(oggFile, "audio");

    onSend({
      type: "audio",
      mediaUrl: publicUrl,
      mediaMimeType: "audio/ogg",
    });
  };

  // 🎙 Inicia gravação
  const startRecording = async () => {
    if (disabled) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Seu navegador nao permite gravacao de audio.");
      return;
    }

    try {
      setShowAttachments(false);
      setShowEmojis(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;

      const preferredMime = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          setIsSendingAudio(true);

          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          await sendAudioBlob(blob);
        } catch (err) {
          console.error("Erro ao finalizar gravacao:", err);
          alert("Nao foi possivel enviar o audio.");
        } finally {
          setIsRecording(false);
          setIsSendingAudio(false);
          stopStreamTracks();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
    } catch (err) {
      console.error("Erro ao iniciar gravacao:", err);
      alert("Nao foi possivel acessar o microfone.");
      stopStreamTracks();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  const handlePrimaryClick = () => {
    if (disabled) return;

    const hasText = Boolean(message.trim());

    if (hasText) {
      onSend(message.trim());
      setMessage("");
      setShowEmojis(false);
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    startRecording();
  };

  const handleAttachmentClick = () => {
    if (disabled) return;

    setShowAttachments((prev) => !prev);
    setShowEmojis(false);
  };

  const handleImageOption = () => {
    if (disabled) return;

    setShowAttachments(false);
    fileInputRef.current?.click();
  };

  const handleAudioOption = () => {
    if (disabled) return;

    setShowAttachments(false);
    audioInputRef.current?.click();
  };

  // Imagens (JPG/PNG)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      e.target.value = "";
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allFiles = Array.from(files);
    const validImages = allFiles.filter((file) =>
      ["image/jpeg", "image/png"].includes(file.type),
    );

    if (validImages.length === 0) {
      alert("Por enquanto só aceitamos imagens JPG ou PNG.");
      e.target.value = "";
      return;
    }

    if (validImages.length < allFiles.length) {
      console.warn("Alguns arquivos foram ignorados por não serem JPG/PNG.");
      alert("Algumas imagens foram ignoradas por não serem JPG ou PNG.");
    }

    try {
      for (const file of validImages) {
        const { publicUrl } = await uploadFileToSupabase(file, "image");

        onSend({
          type: "image",
          mediaUrl: publicUrl,
          mediaMimeType: file.type || "image/jpeg",
        });
      }
    } catch (err) {
      console.error("Erro ao enviar imagens:", err);
      alert("Ocorreu um erro ao enviar a imagem. Tente novamente.");
    } finally {
      e.target.value = "";
    }
  };

  // Audio selecionado manualmente
  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      e.target.value = "";
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.type.startsWith("audio/")) {
      console.warn("Arquivo selecionado não é áudio");
      e.target.value = "";
      return;
    }

    try {
      const { publicUrl } = await uploadFileToSupabase(file, "audio");

      onSend({
        type: "audio",
        mediaUrl: publicUrl,
        mediaMimeType: file.type || "audio/*",
      });
    } catch (err) {
      console.error("Erro ao enviar áudio:", err);
    } finally {
      e.target.value = "";
    }
  };

  const handleDocumentChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (disabled) {
      e.target.value = "";
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      const { publicUrl } = await uploadFileToSupabase(file, "document");

      onSend({
        type: "document",
        mediaUrl: publicUrl,
        mediaMimeType: file.type || "application/octet-stream",
        filename: file.name,
        fileSize: file.size,
        text: message.trim() || undefined,
      });

      setMessage("");
    } catch (err) {
      console.error("Erro ao enviar documento:", err);
      alert("Não foi possível enviar o documento.");
    } finally {
      e.target.value = "";
    }
  };

  const formatRecordTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  };

  const placeholderText = disabled
    ? disabledReason || "Você não tem permissão para responder esta conversa."
    : "Digite uma mensagem...";

  return (
    <div className="sticky bottom-0 border-t border-[#E5E7EB] bg-white p-4 z-20 shadow-sm">
      {disabled && (
        <div className="mb-2 flex items-center gap-2 text-xs text-[#6B7280]">
          <LockIcon className="w-4 h-4" />
          <span>
            {disabledReason || "Apenas o atendente responsável pode responder."}
          </span>
        </div>
      )}

      {isRecording && !disabled && (
        <div className="flex items-center gap-2 mb-2 text-sm text-[#1F2937]">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="font-medium">Gravando...</span>
          <span className="text-[#6B7280]">
            {formatRecordTime(recordSeconds)}
          </span>
          <span className="text-[#9CA3AF] text-xs">
            Toque no botão para concluir e enviar
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAttachmentClick}
            disabled={disabled}
            className="relative p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <PaperclipIcon className="w-5 h-5 text-gray-500" />

            {showAttachments && !disabled && (
              <div
                ref={attachmentsRef}
                className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-[#E5E7EB] bg-white shadow-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={handleImageOption}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#F3F4F6] transition-colors"
                >
                  <span className="flex items-center gap-2 text-[#1F2937]">
                    <ImageIcon className="w-4 h-4" />
                    Imagem
                  </span>
                  <span className="text-xs text-[#6B7280]">Selecionar</span>
                </button>

                {/* <button
                  type="button"
                  onClick={handleAudioOption}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#F3F4F6] transition-colors"
                >
                  <span className="flex items-center gap-2 text-[#1F2937]">
                    <MicIcon className="w-4 h-4" />
                    Áudio
                  </span>
                  <span className="text-xs text-[#6B7280]">Selecionar</span>
                </button> */}

                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    setShowAttachments(false);
                    docInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#F3F4F6] transition-colors"
                >
                  <span className="flex items-center gap-2 text-[#1F2937]">
                    <FileIcon className="w-4 h-4" />
                    Documento
                  </span>
                  <span className="text-xs text-[#6B7280]">Selecionar</span>
                </button>
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setShowEmojis((v) => !v);
              setShowAttachments(false);
            }}
            className="p-2 hover:bg-[#E5E7EB] rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <SmileIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          rows={1}
          disabled={disabled}
          className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent resize-none max-h-32 disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed"
        />

        <Button
          type="button"
          variant="primary"
          className={`px-4 ${
            isRecording ? "bg-red-500 hover:bg-red-600 focus:ring-red-500" : ""
          }`}
          disabled={disabled || isSendingAudio}
          isLoading={isSendingAudio}
          onClick={handlePrimaryClick}
        >
          {disabled ? (
            <LockIcon className="w-4 h-4" />
          ) : message.trim() || isRecording ? (
            <SendIcon className="w-4 h-4" />
          ) : (
            <MicIcon className="w-4 h-4" />
          )}
        </Button>

        {showEmojis && !disabled && (
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

      {/* Inputs "invisíveis" para arquivos */}
      <input
        style={{ display: "none" }}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="invisible"
        onChange={handleFileChange}
      />

      <input
        style={{ display: "none" }}
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="invisible"
        onChange={handleAudioChange}
      />

      <input
        style={{ display: "none" }}
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
        className="invisible"
        onChange={handleDocumentChange}
      />
    </div>
  );
};
