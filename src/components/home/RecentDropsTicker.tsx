"use client";

import { useEffect, useState, useRef } from "react";
import { getRarityConfig } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";

interface Drop {
  id:        string;
  username:  string;
  cardName:  string;
  rarity:    string;
  imageUrl?: string;
  value:     number;
  packName:  string;
  createdAt: string;
}

// Seed data as fallback while API loads or if no openings exist
const SEED: Drop[] = [
  { id:"s1", username:"trainer_x99",  cardName:"Charizard ex SAR",       rarity:"SECRET_RARE",               imageUrl:"", value:412, packName:"Obsidian Flames",  createdAt:"" },
  { id:"s2", username:"pokemstr_",    cardName:"Pikachu VMAX",            rarity:"HYPER_RARE",                imageUrl:"", value:89,  packName:"Crown Zenith",      createdAt:"" },
  { id:"s3", username:"rarePulls",    cardName:"Gardevoir ex UR",         rarity:"ULTRA_RARE",                imageUrl:"", value:55,  packName:"Scarlet & Violet",  createdAt:"" },
  { id:"s4", username:"darktrainer",  cardName:"Lugia V Alt Art",         rarity:"SPECIAL_ILLUSTRATION_RARE", imageUrl:"", value:188, packName:"Silver Tempest",    createdAt:"" },
  { id:"s5", username:"neonpull",     cardName:"Gengar ex Full Art",      rarity:"ILLUSTRATION_RARE",         imageUrl:"", value:37,  packName:"Paldea Evolved",    createdAt:"" },
  { id:"s6", username:"holo_gamer",   cardName:"Rayquaza VMAX",           rarity:"HYPER_RARE",                imageUrl:"", value:145, packName:"Evolving Skies",    createdAt:"" },
  { id:"s7", username:"vault_kira",   cardName:"Umbreon VMAX Alt",        rarity:"SPECIAL_ILLUSTRATION_RARE", imageUrl:"", value:320, packName:"Evolving Skies",    createdAt:"" },
  { id:"s8", username:"p_collector",  cardName:"Mew ex Full Art",         rarity:"ULTRA_RARE",                imageUrl:"", value:72,  packName:"Fusion Strike",     createdAt:"" },
  { id:"s9", username:"shinypull__",  cardName:"Arceus V Alt Art",        rarity:"SPECIAL_ILLUSTRATION_RARE", imageUrl:"", value:210, packName:"Brilliant Stars",   createdAt:"" },
  { id:"s10",username:"deckmaster",   cardName:"Eevee Heroes Umbreon V",  rarity:"ULTRA_RARE",                imageUrl:"", value:95,  packName:"Eevee Heroes",      createdAt:"" },
];

const GOD = new Set(["SECRET_RARE","SPECIAL_ILLUSTRATION_RARE","HYPER_RARE"]);

function timeAgo(iso: string): string {
  if (!iso) return `${Math.floor(Math.random() * 30 + 1)}m`;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  return `${Math.floor(diff/3600)}h`;
}

export function RecentDropsTicker() {
  const [drops, setDrops] = useState<Drop[]>(SEED);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchDrops() {
    try {
      const res  = await fetch("/api/drops");
      const json = await res.json();
      if (json.drops?.length > 0) {
        setDrops(json.drops);
      }
    } catch { /* keep seed data */ }
  }

  useEffect(() => {
    fetchDrops();
    // Poll every 30s
    pollRef.current = setInterval(fetchDrops, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const all = [...drops, ...drops]; // Duplicate for seamless loop

  return (
    <div className="relative overflow-hidden" style={{ borderTop: "1px solid #1E1A35", borderBottom: "1px solid #1E1A35" }}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, #06050F, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, #06050F, transparent)" }} />

      {/* Live label */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-3 gap-1.5" style={{ background: "#0D0B1A", borderRight: "1px solid #1E1A35" }}>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FF4FA8", boxShadow: "0 0 6px #FF4FA8" }} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">Live</span>
      </div>

      <div className="pl-20 py-2.5">
        <div className="ticker-track flex items-center gap-5 w-max">
          {all.map((drop, i) => {
            const cfg   = getRarityConfig(drop.rarity);
            const isGod = GOD.has(drop.rarity);
            return (
              <div
                key={`${drop.id}-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 cursor-default"
                style={{
                  background: `${cfg.color}10`,
                  border:     `1px solid ${cfg.color}30`,
                  boxShadow:  isGod ? `0 0 10px ${cfg.color}25` : "none",
                }}
              >
                {isGod && <span className="text-xs">🔥</span>}
                <span className="text-xs font-semibold text-gray-400">{drop.username}</span>
                <span className="text-[10px] text-gray-600">sacó</span>
                <span className="text-xs font-bold" style={{ color: cfg.color, textShadow: isGod ? `0 0 8px ${cfg.color}` : "none" }}>
                  {drop.cardName}
                </span>
                <span className="text-xs font-black font-mono" style={{ color: "#4FFFB4", textShadow: "0 0 6px #4FFFB440" }}>
                  {formatEUR(drop.value)}
                </span>
                <span className="text-[9px] text-gray-600">{timeAgo(drop.createdAt)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
