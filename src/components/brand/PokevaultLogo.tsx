// PokéVault brand components — uses generated PNG assets in /public/branding/
import Image from "next/image";

interface LogoProps {
  variant?: "principal" | "horizontal" | "compact" | "text" | "icon";
  height?:  number;
  className?: string;
  priority?: boolean;
}

// Aspect ratios for each variant (measured from generated PNGs)
const RATIOS: Record<string, number> = {
  principal:  580 / 190,  // 3.05
  horizontal: 480 / 90,   // 5.33
  compact:    300 / 65,   // 4.6
  text:       380 / 76,   // 5.0
  icon:       256 / 256,  // 1.0
};

const SRCS: Record<string, string> = {
  principal:  "/branding/logo-principal.png",
  horizontal: "/branding/logo-horizontal.png",
  compact:    "/branding/logo-compact.png",
  text:       "/branding/logo-text.png",
  icon:       "/branding/icon-vault.png",
};

export function PokevaultLogo({
  variant = "horizontal",
  height  = 40,
  className = "",
  priority = false,
}: LogoProps) {
  const ratio = RATIOS[variant] ?? 3;
  const width = Math.round(height * ratio);

  return (
    <Image
      src={SRCS[variant]}
      alt="PokéVault"
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized
      style={{ objectFit: "contain" }}
    />
  );
}

export function PokevaultIcon({
  size = 40,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/branding/icon-vault.png"
      alt="PokéVault"
      width={size}
      height={size}
      className={className}
      priority={priority}
      unoptimized
      style={{ objectFit: "contain" }}
    />
  );
}

// Badge image for pack rarity displays
export function RarityBadgeImage({
  type,
  size = 48,
  className = "",
}: {
  type: "featured" | "legendary" | "god-hit" | "rare" | "epic" | "collector" | "new";
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/badges/badge-${type}.png`}
      alt={type}
      width={size}
      height={size}
      className={className}
      unoptimized
      style={{ objectFit: "contain" }}
    />
  );
}
