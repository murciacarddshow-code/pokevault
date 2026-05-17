"use client";

import { useState } from "react";
import { CardImage } from "@/components/cards/CardImage";
import { motion } from "framer-motion";
import { RarityBadge } from "./RarityBadge";
import { getRarityConfig } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";

interface PokemonCardProps {
  id:               string;
  name:             string;
  rarity:           string;
  imageUrl:         string;
  setName?:         string;
  cardNumber?:      string;
  marketPrice?:     string | null;
  instantSellPrice?: string | null;
  quantity?:        number;
  isSold?:          boolean;
  onSell?:          () => void;
  onKeep?:          () => void;
  showActions?:     boolean;
  size?:            "sm" | "md" | "lg";
}

const cardSizes = {
  sm: { card: "w-32",  image: 128, nameSize: "text-xs",  priceSize: "text-xs"  },
  md: { card: "w-44",  image: 176, nameSize: "text-sm",  priceSize: "text-sm"  },
  lg: { card: "w-56",  image: 224, nameSize: "text-base",priceSize: "text-base"},
};

export function PokemonCard({
  id, name, rarity, imageUrl, setName, cardNumber,
  marketPrice, instantSellPrice, quantity,
  isSold = false, onSell, onKeep, showActions = false,
  size = "md",
}: PokemonCardProps) {
  const [hovered, setHovered] = useState(false);
  const cfg    = getRarityConfig(rarity);
  const sizing = cardSizes[size];

  const isUltra = cfg.intensity === "ultra" || cfg.intensity === "high";

  return (
    <motion.div
      className={`relative flex-shrink-0 ${sizing.card} rounded-2xl overflow-hidden cursor-pointer select-none`}
      style={{
        background: `linear-gradient(160deg, #15122A 0%, #0D0B1A 100%)`,
        border:     `1px solid ${hovered ? cfg.color + "60" : cfg.color + "25"}`,
        boxShadow:  hovered
          ? `0 0 28px ${cfg.glow}, 0 0 56px ${cfg.glow}, 0 20px 40px rgba(0,0,0,0.7)`
          : `0 0 12px ${cfg.glow}`,
        opacity: isSold ? 0.45 : 1,
      }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Sold overlay */}
      {isSold && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
          style={{ background: "rgba(6,5,15,0.75)" }}>
          <span className="text-xs font-black uppercase tracking-widest"
            style={{ color: "#4FFFB4", textShadow: "0 0 12px #4FFFB4" }}>
            Vendida
          </span>
        </div>
      )}

      {/* Shimmer on ultra rares when hovered */}
      {isUltra && hovered && (
        <div
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl"
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${cfg.color}30 50%, transparent 60%)`,
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Rarity label strip */}
      <div
        className="px-3 py-1 text-center"
        style={{
          background:  `${cfg.color}18`,
          borderBottom: `1px solid ${cfg.color}30`,
        }}
      >
        <span
          className="text-[9px] font-black uppercase tracking-[0.2em]"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Card image */}
      <div
        className="relative w-full"
        style={{ height: sizing.image, background: `linear-gradient(180deg, ${cfg.color}08 0%, transparent 60%)` }}
      >
        <CardImage
          src={imageUrl}
          alt={name}
          rarity={rarity}
          fill
          className="object-contain p-2"
          sizes={`${sizing.image}px`}
        />
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className={`font-bold text-white truncate ${sizing.nameSize}`}>{name}</p>
        {setName && (
          <p className="text-[10px] text-gray-500 truncate">
            {setName} {cardNumber ? `· ${cardNumber}` : ""}
          </p>
        )}
        {quantity && quantity > 1 && (
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: "#1E1A35", color: "#8B80A8" }}
          >
            ×{quantity}
          </span>
        )}
        {instantSellPrice && (
          <p
            className={`font-black font-mono ${sizing.priceSize}`}
            style={{ color: "#4FFFB4", textShadow: "0 0 8px #4FFFB480" }}
          >
            {formatEUR(instantSellPrice)}
          </p>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !isSold && (
        <div className="px-3 pb-3 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSell?.(); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
            style={{
              background: "rgba(79,255,180,0.1)",
              border:     "1px solid rgba(79,255,180,0.3)",
              color:      "#4FFFB4",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(79,255,180,0.2)";
              e.currentTarget.style.boxShadow  = "0 0 12px rgba(79,255,180,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(79,255,180,0.1)";
              e.currentTarget.style.boxShadow  = "none";
            }}
          >
            Vender
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onKeep?.(); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
            style={{
              background: "rgba(180,79,255,0.1)",
              border:     "1px solid rgba(180,79,255,0.3)",
              color:      "#B44FFF",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(180,79,255,0.2)";
              e.currentTarget.style.boxShadow  = "0 0 12px rgba(180,79,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(180,79,255,0.1)";
              e.currentTarget.style.boxShadow  = "none";
            }}
          >
            Guardar
          </button>
        </div>
      )}
    </motion.div>
  );
}
