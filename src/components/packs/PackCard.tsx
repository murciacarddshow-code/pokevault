"use client";

import { useState } from "react";
import { PackImage } from "@/components/packs/PackImage";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatEUR } from "@/lib/utils/format";

// Tier visual = paleta de glow según precio
function getTierColors(price: number): { primary: string; secondary: string; label: string } {
  if (price >= 50) return { primary: "#FF4FA8", secondary: "#B44FFF", label: "LEGENDARY" };
  if (price >= 20) return { primary: "#B44FFF", secondary: "#4FC3FF", label: "EPIC"      };
  if (price >= 10) return { primary: "#4FC3FF", secondary: "#4FFFB4", label: "RARE"      };
  return              { primary: "#4FFFB4", secondary: "#60A5FA", label: "STANDARD"   };
}

interface PackCardProps {
  id:          string;
  slug:        string;
  name:        string;
  description?: string | null;
  imageUrl:    string;
  price:       string;
  isFeatured?: boolean;
}

export function PackCard({ id, slug, name, description, imageUrl, price, isFeatured }: PackCardProps) {
  const [hovered, setHovered] = useState(false);
  const tier   = getTierColors(Number(price));
  const priceNum = Number(price);

  return (
    <Link href={`/packs/${slug}`}>
      <motion.div
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{
          background: "#0D0B1A",
          border:     `1px solid ${hovered ? tier.primary + "60" : "#1E1A35"}`,
          boxShadow:  hovered
            ? `0 0 32px ${tier.primary}40, 0 0 64px ${tier.primary}20, 0 24px 48px rgba(0,0,0,0.6)`
            : `0 4px 24px rgba(0,0,0,0.3)`,
          transition: "border 0.2s, box-shadow 0.2s",
        }}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        {/* Featured badge */}
        {isFeatured && (
          <div
            className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
            style={{
              background: tier.primary,
              color:      "#fff",
              boxShadow:  `0 0 12px ${tier.primary}`,
            }}
          >
            Featured
          </div>
        )}

        {/* Tier badge */}
        <div
          className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
          style={{
            background: `${tier.primary}20`,
            border:     `1px solid ${tier.primary}50`,
            color:      tier.primary,
          }}
        >
          {tier.label}
        </div>

        {/* Image area — portrait ratio 3:4 matches booster packs (taller than wide) */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "3/4",
            background: `radial-gradient(ellipse at 50% 40%, ${tier.primary}15 0%, transparent 70%)`,
          }}
        >
          <PackImage
            src={imageUrl}
            alt={name}
            accentColor={tier.primary}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          />
        </div>

        {/* Divider line with glow */}
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${tier.primary}60, ${tier.secondary}60, transparent)`,
          }}
        />

        {/* Info */}
        <div className="p-4">
          <h3
            className="font-black font-display text-lg leading-tight mb-1"
            style={{
              color:      hovered ? tier.primary : "#F0EEFF",
              transition: "color 0.2s",
              textShadow: hovered ? `0 0 16px ${tier.primary}60` : "none",
            }}
          >
            {name}
          </h3>

          {description && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Precio</p>
              <p
                className="text-xl font-black font-mono"
                style={{
                  color:      tier.primary,
                  textShadow: `0 0 12px ${tier.primary}80`,
                }}
              >
                {formatEUR(priceNum)}
              </p>
            </div>

            <div
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: hovered
                  ? `linear-gradient(135deg, ${tier.primary}, ${tier.secondary})`
                  : `${tier.primary}15`,
                border:     `1px solid ${tier.primary}40`,
                color:      hovered ? "#fff" : tier.primary,
                boxShadow:  hovered ? `0 0 16px ${tier.primary}60` : "none",
              }}
            >
              Abrir
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
