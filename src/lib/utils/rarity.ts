// =============================================================================
// lib/utils/rarity.ts
// No longer imports from @prisma/client since SQLite schema uses String for rarity.
// =============================================================================

export const CARD_RARITIES = [
  "COMMON", "UNCOMMON", "RARE", "DOUBLE_RARE", "ULTRA_RARE",
  "ILLUSTRATION_RARE", "SPECIAL_ILLUSTRATION_RARE", "HYPER_RARE",
  "SECRET_RARE", "GOD_HIT",
] as const;

export type CardRarity = typeof CARD_RARITIES[number];

export const RARITY_CONFIG: Record<CardRarity, {
  label:     string;
  color:     string;
  glow:      string;
  intensity: "low" | "medium" | "high" | "ultra";
}> = {
  COMMON:                    { label: "Común",                color: "#9CA3AF", glow: "rgba(156,163,175,0.35)", intensity: "low"    },
  UNCOMMON:                  { label: "Poco Común",           color: "#34D399", glow: "rgba(52,211,153,0.35)",  intensity: "low"    },
  RARE:                      { label: "Rara",                 color: "#60A5FA", glow: "rgba(96,165,250,0.45)",  intensity: "medium" },
  DOUBLE_RARE:               { label: "Doble Rara",           color: "#A78BFA", glow: "rgba(167,139,250,0.45)", intensity: "medium" },
  ULTRA_RARE:                { label: "Ultra Rara",           color: "#F59E0B", glow: "rgba(245,158,11,0.55)",  intensity: "high"   },
  ILLUSTRATION_RARE:         { label: "Ilustración Rara",     color: "#FB923C", glow: "rgba(251,146,60,0.55)",  intensity: "high"   },
  SPECIAL_ILLUSTRATION_RARE: { label: "Ilustración Especial", color: "#EC4899", glow: "rgba(236,72,153,0.65)",  intensity: "ultra"  },
  HYPER_RARE:                { label: "Hiper Rara",           color: "#B44FFF", glow: "rgba(180,79,255,0.75)",  intensity: "ultra"  },
  SECRET_RARE:               { label: "Secreta",              color: "#EF4444", glow: "rgba(239,68,68,0.75)",   intensity: "ultra"  },
  GOD_HIT:                   { label: "GOD HIT 🔥",           color: "#FFD700", glow: "rgba(255,215,0,0.9)",    intensity: "ultra"  },
};

export function getRarityConfig(rarity: string) {
  return RARITY_CONFIG[rarity as CardRarity] ?? RARITY_CONFIG.COMMON;
}

export function isValidRarity(r: string): r is CardRarity {
  return CARD_RARITIES.includes(r as CardRarity);
}
