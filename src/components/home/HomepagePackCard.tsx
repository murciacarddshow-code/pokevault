"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEUR } from "@/lib/utils/format";
import { PackImage } from "@/components/packs/PackImage";

function getTierColor(price: number): string {
  if (price >= 150) return "#FFD700";
  if (price >= 50)  return "#FF4FA8";
  if (price >= 20)  return "#B44FFF";
  if (price >= 10)  return "#4FC3FF";
  return "#4FFFB4";
}

interface HomepagePackCardProps {
  id:         string;
  slug:       string;
  name:       string;
  imageUrl:   string;
  price:      number;
  isFeatured: boolean;
  openings:   number;
}

export function HomepagePackCard({
  slug, name, imageUrl, price, isFeatured, openings,
}: HomepagePackCardProps) {
  const [hovered, setHovered] = useState(false);
  const color = getTierColor(price);

  return (
    <Link href={`/packs/${slug}`}>
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{
          background: "#0D0B1A",
          border:     `1px solid ${hovered ? color + "50" : "#1E1A35"}`,
          boxShadow:  hovered ? `0 0 24px ${color}30, 0 16px 32px rgba(0,0,0,0.5)` : "none",
          transition: "border 0.2s, box-shadow 0.2s, transform 0.2s",
          transform:  hovered ? "translateY(-4px)" : "translateY(0)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isFeatured && (
          <div
            className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase"
            style={{ background: color, color: "#fff", boxShadow: `0 0 8px ${color}` }}
          >
            HOT
          </div>
        )}

        {/* Image */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "3/4", position: "relative",
            background: `radial-gradient(ellipse at 50% 40%, ${color}15 0%, transparent 70%)` }}
        >
          <PackImage src={imageUrl} alt={name} accentColor={color} fill sizes="200px" className="object-contain" />
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs font-bold text-white truncate mb-1">{name}</p>
          <p className="text-base font-black font-mono" style={{ color, textShadow: `0 0 8px ${color}60` }}>
            {formatEUR(price)}
          </p>
          {openings > 0 && (
            <p className="text-[9px] text-gray-600 mt-1">{openings.toLocaleString("es-ES")} aperturas</p>
          )}
        </div>
      </div>
    </Link>
  );
}
