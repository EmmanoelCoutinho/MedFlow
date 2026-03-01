import { useEffect, useMemo, useRef, useState } from "react";
import type { EmojiCategory, EmojiCategoryKey } from "../../constants/emojis";
import { EMOJI_CATEGORIES } from "../../constants/emojis";

type EmojiPickerProps = {
  open: boolean;
  disabled?: boolean;
  pickerRef?: React.RefObject<HTMLDivElement>;
  onPick: (emoji: string) => void;
};

const EMOJI_NAME_HINTS: Record<string, string[]> = {
  "😂": ["risada", "haha", "rindo", "laugh"],
  "❤️": ["coração", "amor", "love", "heart"],
  "👍": ["like", "ok", "boa", "joinha", "thumb"],
  "🙏": ["obrigado", "por favor", "rezar", "pray"],
  "🔥": ["fogo", "top", "hype", "fire"],
  "🎉": ["festa", "parabéns", "party"],
  "😢": ["triste", "choro", "sad", "cry"],
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function EmojiPicker({
  open,
  disabled,
  pickerRef,
  onPick,
}: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] =
    useState<EmojiCategoryKey>("face_and_people");

  // const inputRef = useRef<HTMLInputElement | null>(null);

  const q = normalize(query);

  const filteredCategories: EmojiCategory[] = useMemo(() => {
    if (!q) return EMOJI_CATEGORIES;

    return EMOJI_CATEGORIES.map((cat) => {
      const emojis = cat.emojis.filter((emoji) => {
        if (emoji === query.trim()) return true;

        const hints = EMOJI_NAME_HINTS[emoji] ?? [];
        const inHints = hints.some((h) => normalize(h).includes(q));

        const inCat = (cat.keywords ?? []).some((k) =>
          normalize(k).includes(q),
        );

        return inHints || inCat;
      });

      return { ...cat, emojis };
    }).filter((cat) => cat.emojis.length > 0);
  }, [q, query]);

  const activeCategoryData = useMemo(() => {
    const found =
      filteredCategories.find((c) => c.key === activeCat) ??
      filteredCategories[0];
    return found ?? null;
  }, [filteredCategories, activeCat]);

  if (!open || disabled) return null;

  return (
    <div
      ref={pickerRef as any}
      className="absolute bottom-full left-16 mb-2 w-[360px] max-h-[360px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg"
    >
      {/* Header: busca */}
      {/* <div className="p-2 border-b border-[#E5E7EB]">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar emoji (ex: coração, risada, ok)…"
          className="w-full h-9 px-3 rounded-md border border-[#E5E7EB] outline-none focus:ring-2 focus:ring-black/10"
        />
      </div> */}

      {/* Tabs de categoria */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-[#E5E7EB] overflow-x-auto">
        {(q ? filteredCategories : EMOJI_CATEGORIES).map((cat) => {
          const isActive = activeCategoryData?.key === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCat(cat.key)}
              className={[
                "shrink-0 px-2 py-1 rounded-md text-sm border transition-colors",
                isActive
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-[#111827] border-[#E5E7EB] hover:bg-[#F3F4F6]",
              ].join(" ")}
              title={cat.label}
            >
              <span className="mr-1">{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div className="max-h-[260px] overflow-y-auto overflow-x-hidden p-2 pb-8">
        {!activeCategoryData ? (
          <div className="text-sm text-[#6B7280] p-2">
            Nenhum emoji encontrado.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-sm font-medium text-[#111827]">
                {activeCategoryData.icon} {activeCategoryData.label}
              </div>
              <div className="text-xs text-[#6B7280]">
                {activeCategoryData.emojis.length} itens
              </div>
            </div>

            <div className="grid grid-cols-10 gap-2">
              {activeCategoryData.emojis.map((emoji) => (
                <button
                  key={`${activeCategoryData.key}-${emoji}`}
                  type="button"
                  onClick={() => onPick(emoji)}
                  className="text-xl hover:bg-[#E5E7EB] rounded-lg p-1 leading-none"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer (opcional): quando está buscando, mostrar “todas categorias” em lista */}
      {q && filteredCategories.length > 1 && (
        <div className="border-t border-[#E5E7EB] px-2 py-2 text-xs text-[#6B7280]">
          Mostrando resultados filtrados em {filteredCategories.length}{" "}
          categorias.
        </div>
      )}
    </div>
  );
}
