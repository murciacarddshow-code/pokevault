"use client";

import { useState } from "react";
import Image from "next/image";
import { getRarityConfig } from "@/lib/utils/rarity";

interface CardImageProps {
  src:        string;
  alt:        string;
  rarity?:    string;
  fill?:      boolean;
  width?:     number;
  height?:    number;
  className?: string;
  sizes?:     string;
  priority?:  boolean;
}

export function CardImage({
  src, alt, rarity = "COMMON", fill, width, height,
  className = "object-contain", sizes, priority,
}: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const cfg = getRarityConfig(rarity);

  // Premium fallback — shown when image fails or src is empty
  const Fallback = () => {
    const style: React.CSSProperties = fill
      ? { position: "absolute", inset: 0 }
      : { width: width ?? "100%", height: height ?? "100%" };
    return (
      <div style={{
        ...style,
        background:    `linear-gradient(145deg, ${cfg.color}25 0%, #06050F 55%, ${cfg.color}15 100%)`,
        borderRadius:  8,
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        justifyContent:"center",
        gap:           8,
        overflow:      "hidden",
        position:      fill ? "absolute" : "relative",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: `2px solid ${cfg.color}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `radial-gradient(circle, ${cfg.color}20, transparent)`,
          boxShadow: `0 0 20px ${cfg.color}40`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `1.5px solid ${cfg.color}70`,
            background: `${cfg.color}18`,
          }}/>
        </div>
        <span style={{
          fontSize: 8, fontWeight: 800, color: cfg.color,
          letterSpacing: "0.12em", opacity: 0.65,
          textTransform: "uppercase", fontFamily: "monospace",
        }}>
          PokéVault
        </span>
      </div>
    );
  };

  if (failed || !src) return <Fallback />;

  // All card images are external (images.pokemontcg.io) — always unoptimized
  // so Next.js passes the URL directly to the browser without transformation.
  // This avoids "hostname not configured" errors and serves the CDN URL as-is.
  const props = {
    src,
    alt,
    className,
    sizes,
    priority,
    unoptimized: true,    // always — pokemontcg.io serves its own optimized images
    onError: () => setFailed(true),
  };

  if (fill) return <Image {...props} fill />;
  return <Image {...props} width={width!} height={height!} />;
}
