"use client";

import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

type Variant = "glass" | "brand" | "light";

type Props = {
  text: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  disabled?: boolean;
  sideOffset?: number;
  variant?: Variant;

  /** Se quiser forçar as cores da marca (quando variant="brand") */
  accentHex?: string; // ex: "#0A84FF" ou "#22C55E"
  contentClassName?: string;
};

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<Variant, string> = {
  // Mais premium: escuro com glass, gradiente e ring sutil
  glass: cn(
    "text-slate-900",
    "bg-white/95",
    "border border-slate-200/80",
    "shadow-xl shadow-black/10",
    "backdrop-blur-md",
    "ring-1 ring-black/5",
  ),

  // “Unxet signature”: fundo escuro + borda com acento/shine + faixa lateral
  brand: cn(
    "text-slate-900",
    "bg-white/95",
    "border border-slate-200/80",
    "shadow-xl shadow-black/10",
    "backdrop-blur-md",
    "ring-1 ring-black/5",
  ),

  // Claro, mas ainda com personalidade
  light: cn(
    "text-slate-900",
    "bg-white/95",
    "border border-slate-200/80",
    "shadow-xl shadow-black/10",
    "backdrop-blur-md",
    "ring-1 ring-black/5",
  ),
};

export function CustomTooltip({
  text,
  children,
  side = "top",
  align = "center",
  delayDuration = 200,
  disabled = false,
  sideOffset = 10,
  variant = "brand",
  accentHex = "#0A84FF",
  contentClassName,
}: Props) {
  void accentHex;

  if (disabled) return <>{children}</>;

  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="inline-flex">{children}</span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={cn(
              "z-[9999] select-none rounded-2xl px-3 py-2 text-xs leading-tight",
              "will-change-[transform,opacity]",
              "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
              "data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-1",
              "data-[side=bottom]:slide-in-from-top-1",
              "data-[side=left]:slide-in-from-right-1",
              "data-[side=right]:slide-in-from-left-1",
              variantClasses[variant],
              contentClassName,
            )}
          >
            {/* Faixa/acento “Unxet” */}
            <span className="relative block">{text}</span>

            <Tooltip.Arrow className="fill-white/95" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
