"use client";

import { getRarityConfig } from "@/lib/utils/rarity";

interface RarityBadgeProps {
  rarity: string;
  size?:  "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "px-2 py-0.5 text-[9px] gap-1",
  md: "px-3 py-1 text-[10px] gap-1.5",
  lg: "px-4 py-1.5 text-xs gap-2",
};

export function RarityBadge({ rarity, size = "md" }: RarityBadgeProps) {
  const cfg = getRarityConfig(rarity);

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-widest ${sizeMap[size]}`}
      style={{
        background:  `${cfg.color}15`,
        border:      `1px solid ${cfg.color}50`,
        color:        cfg.color,
        boxShadow:   `0 0 8px ${cfg.glow}`,
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width:      size === "sm" ? 5 : 6,
          height:     size === "sm" ? 5 : 6,
          background: cfg.color,
          boxShadow:  `0 0 6px ${cfg.color}`,
        }}
      />
      {cfg.label}
    </span>
  );
}
