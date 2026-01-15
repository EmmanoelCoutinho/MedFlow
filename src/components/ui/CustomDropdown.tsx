import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type UnxetDropdownItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type UnxetDropdownProps = {
  trigger: React.ReactNode;
  items: UnxetDropdownItem[];
  align?: "start" | "end";
  side?: "bottom" | "top";
  offset?: number;
  widthClassName?: string; // ex: "w-56"
};

export const CustomDropdown: React.FC<UnxetDropdownProps> = ({
  trigger,
  items,
  align = "end",
  side = "bottom",
  offset = 8,
  widthClassName = "w-56",
}) => {
  const triggerWrapRef = useRef<HTMLSpanElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // const enabledItems = useMemo(() => items.filter((i) => !i.disabled), [items]);

  const computePosition = () => {
    const el = triggerWrapRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const top = side === "bottom" ? r.bottom + offset : r.top - offset; // (top real ajustado após medir menu)

    // left calculado por alinhamento; ajustado depois para viewport bounds
    const left = align === "start" ? r.left : r.right; // end: vamos subtrair a largura do menu depois

    setPos({ top, left });
  };

  // abre e calcula posição
  const toggle = () => {
    setOpen((v) => !v);
  };

  // quando abre: calcula posição e ajusta a posição final com base no tamanho do menu e viewport
  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    if (!pos) return;

    const menu = menuRef.current;
    const trig = triggerWrapRef.current;
    if (!menu || !trig) return;

    const r = trig.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let left = align === "start" ? r.left : r.right - menuRect.width;

    let top =
      side === "bottom" ? r.bottom + offset : r.top - offset - menuRect.height;

    // clamp dentro da viewport
    const padding = 8;
    const maxLeft = window.innerWidth - menuRect.width - padding;
    const maxTop = window.innerHeight - menuRect.height - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    setPos({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.top, pos?.left, align, side, offset]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerWrapRef.current?.contains(t)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onReposition = () => computePosition();

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const handleSelect = (item: UnxetDropdownItem) => {
    if (item.disabled) return;
    item.onSelect();
    setOpen(false);
  };

  return (
    <>
      {/* wrapper com ref próprio (não depende de forwardRef do Button) */}
      <span ref={triggerWrapRef} className="inline-flex" onClick={toggle}>
        {trigger}
      </span>

      {open && pos
        ? createPortal(
            <div className="fixed inset-0 z-[9999]">
              {/* overlay invisível só pra garantir click fora em qualquer lugar */}
              <div className="absolute inset-0" />

              <div
                ref={menuRef}
                style={{ top: pos.top, left: pos.left }}
                className={[
                  "absolute",
                  widthClassName,
                  "rounded-xl border border-gray-200 bg-white p-1 shadow-lg",
                ].join(" ")}
              >
                {items.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Nenhuma ação disponível
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {items.map((item, idx) => (
                      <button
                        key={`${item.label}-${idx}`}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => handleSelect(item)}
                        className={[
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left",
                          item.disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-100",
                          item.danger ? "text-red-600" : "text-gray-700",
                        ].join(" ")}
                      >
                        {item.icon ? (
                          <span className="inline-flex h-4 w-4 items-center justify-center">
                            {item.icon}
                          </span>
                        ) : null}
                        <span className="flex-1">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};
