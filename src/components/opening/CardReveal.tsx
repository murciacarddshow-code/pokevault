"use client";

import { useState, useEffect, useCallback } from "react";
import { CardImage } from "@/components/cards/CardImage";
import { motion, AnimatePresence } from "framer-motion";
import type { CardRarity } from "@/lib/utils/rarity";
import { RARITY_CONFIG, getRarityConfig } from "@/lib/utils/rarity";
import { RarityBadge } from "@/components/cards/RarityBadge";
import { formatEUR } from "@/lib/utils/format";
import { ParticleBurst, FloatingSparkles, ScreenShake, ChromaticAberration, ConfettiBurst, PulsingGlowRing } from "./Particles";
import { useSound } from "@/hooks/useSound";
import { useAnalytics } from "@/lib/analytics/events";

// ── Rarity tier helpers ───────────────────────────────────────────────────────

const TIER_RANK: Record<CardRarity, number> = {
  COMMON:0, UNCOMMON:1, RARE:2, DOUBLE_RARE:3,
  ULTRA_RARE:4, ILLUSTRATION_RARE:4,
  SPECIAL_ILLUSTRATION_RARE:5, HYPER_RARE:5,
  SECRET_RARE:6,
};

function rarityTier(r: CardRarity): "common"|"rare"|"epic"|"ultra"|"god" {
  const rank = TIER_RANK[r] ?? 0;
  if (rank >= 6) return "god";
  if (rank >= 5) return "ultra";
  if (rank >= 4) return "epic";
  if (rank >= 2) return "rare";
  return "common";
}

// BIG_HIT threshold in EUR
const BIG_HIT_THRESHOLD = 20;

// ── Fakeout system ────────────────────────────────────────────────────────────
// Selects a "decoy rarity" shown briefly before the real reveal.
// NEVER alters the real result — purely cosmetic.

function pickFakeoutRarity(realRarity: CardRarity): CardRarity | null {
  const realRank = TIER_RANK[realRarity] ?? 0;
  // Only fakeout for rare+ cards: show a lower rarity first
  if (realRank < 2) return null;
  // 65% chance to fakeout for epic+, 35% for rare
  const chance = realRank >= 4 ? 0.65 : 0.35;
  if (Math.random() > chance) return null;

  // Pick a rarity 1-2 tiers below real
  const decoyRank = Math.max(0, realRank - 1 - Math.floor(Math.random() * 2));
  const byRank: Record<number, CardRarity> = {
    0: "COMMON", 1: "UNCOMMON", 2: "RARE", 3: "DOUBLE_RARE",
    4: "ULTRA_RARE", 5: "HYPER_RARE",
  };
  return byRank[decoyRank] ?? "RARE";
}

// ── Near-miss scroll list ─────────────────────────────────────────────────────
// Shows "nearby" cards scrolling past before the real card appears.
// Uses the same card pool images passed from above — no extra DB query.

interface NearMissScrollProps {
  realCard: CardRevealProps["card"];
  onDone: () => void;
}

function NearMissScroll({ realCard, onDone }: NearMissScrollProps) {
  // Generate fake "nearby" entries with slight color variations
  const decoys = Array.from({ length: 7 }, (_, i) => ({
    id:  `decoy-${i}`,
    name: i === 3 ? realCard.name : `Card ${Math.floor(Math.random() * 100)}`,
    imageUrl: realCard.imageUrl, // Use real image — just scroll speed creates tension
    isReal: i === 6, // Last one snaps to real
  }));

  return (
    <motion.div
      className="w-full overflow-hidden rounded-2xl"
      style={{ height: 88, background: "#0D0B1A", border: "1px solid #1E1A35" }}
    >
      <motion.div
        className="flex items-center gap-3 px-2"
        style={{ height: "100%" }}
        animate={{ x: [0, -(decoys.length - 2) * 80] }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.6, 1] }}
        onAnimationComplete={onDone}
      >
        {decoys.map((d) => (
          <motion.div
            key={d.id}
            className="relative flex-shrink-0 rounded-lg overflow-hidden"
            style={{
              width: 60, height: 80,
              border: d.isReal ? "2px solid #B44FFF" : "1px solid #1E1A35",
              boxShadow: d.isReal ? "0 0 16px #B44FFF80" : "none",
            }}
          >
            <CardImage src={d.imageUrl} alt={d.name} rarity="COMMON" fill className="object-contain p-0.5" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ── Big Hit Celebration ───────────────────────────────────────────────────────

function BigHitOverlay({ value, color, onDismiss }: { value: string; color: string; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3200); return () => clearTimeout(t); }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${color}30 0%, transparent 60%)` }} />

      {/* BIG HIT text */}
      <motion.div
        className="text-center relative z-10"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 10, stiffness: 200 }}
      >
        <motion.p
          className="font-black font-display text-6xl sm:text-8xl uppercase leading-none"
          style={{
            background:           `linear-gradient(135deg, ${color}, #fff, ${color})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            filter:               `drop-shadow(0 0 40px ${color})`,
          }}
          animate={{ scale: [1, 1.04, 1], filter: [`drop-shadow(0 0 40px ${color})`, `drop-shadow(0 0 70px ${color})`, `drop-shadow(0 0 40px ${color})`] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          BIG HIT
        </motion.p>

        {/* Value counter */}
        <motion.p
          className="text-3xl sm:text-5xl font-black font-mono mt-2"
          style={{ color: "#4FFFB4", textShadow: "0 0 30px #4FFFB4" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {formatEUR(value)}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ── Main CardReveal Component ─────────────────────────────────────────────────

interface CardRevealProps {
  card: {
    id: string; name: string; rarity: CardRarity;
    imageUrl: string; setName: string; cardNumber: string;
  };
  instantSellPrice: string | null;
  onKeep:   () => void;
  onSell:   () => void;
  isSelling?: boolean;
}

type RevealPhase = "waiting" | "nearmiss" | "fakeout" | "reveal" | "done";

export function CardReveal({ card, instantSellPrice, onKeep, onSell, isSelling }: CardRevealProps) {
  const [phase,         setPhase]         = useState<RevealPhase>("waiting");
  const [particles,     setParticles]     = useState(false);
  const [fakeRarity,    setFakeRarity]    = useState<CardRarity | null>(null);
  const [shakeActive,   setShakeActive]   = useState(false);
  const [chromaActive,  setChromaActive]  = useState(false);
  const [bigHit,        setBigHit]        = useState(false);
  const [confetti,      setConfetti]      = useState(false);
  const [flashActive,   setFlashActive]   = useState(false);
  const [flashColor,    setFlashColor]    = useState("#ffffff");

  const cfg    = getRarityConfig(card.rarity);
  const tier   = rarityTier(card.rarity);
  const { play, playSync } = useSound();
  const { track }          = useAnalytics();
  const isBigHit = Number(instantSellPrice ?? 0) >= BIG_HIT_THRESHOLD;

  const triggerReveal = useCallback(async () => {
    setPhase("reveal");

    // Sound based on tier
    if (tier === "god")        { await play("card_god");   }
    else if (tier === "ultra") { await play("card_ultra"); }
    else if (tier === "epic")  { await play("card_epic");  }
    else if (tier === "rare")  { await play("card_rare");  }
    else                       { play("card_flip");        }

    // Particles
    setTimeout(() => { setParticles(true); setTimeout(() => setParticles(false), 1200); }, 400);

    // Screen effects for epic+
    if (tier === "epic" || tier === "ultra" || tier === "god") {
      setTimeout(() => { setFlashColor(cfg.color); setFlashActive(true); setTimeout(() => setFlashActive(false), 300); }, 300);
      setTimeout(() => { setChromaActive(true); setTimeout(() => setChromaActive(false), 500); }, 350);
    }

    // Screen shake for ultra+
    if (tier === "ultra" || tier === "god") {
      setTimeout(() => { setShakeActive(true); setTimeout(() => setShakeActive(false), 600); }, 350);
    }

    // Big hit celebration
    if (isBigHit) {
      setTimeout(() => {
        setBigHit(true);
        setConfetti(true);
        play("big_hit");
        track({ event: "big_hit", cardId: card.id, cardName: card.name, value: Number(instantSellPrice ?? 0), rarity: card.rarity });
        setTimeout(() => setBigHit(false), 3500);
        setTimeout(() => setConfetti(false), 4000);
      }, 900);
    }

    track({ event: "pack_opened" as any, cardId: card.id } as any);
    setTimeout(() => setPhase("done"), 600);
  }, [tier, cfg, isBigHit, card, instantSellPrice, play, track]);

  // Orchestrate the reveal sequence
  useEffect(() => {
    const fakeout = pickFakeoutRarity(card.rarity);

    if (fakeout && tier !== "common") {
      // Phase 1: Near-miss scroll
      const t1 = setTimeout(() => setPhase("nearmiss"), 100);
      return () => clearTimeout(t1);
    } else {
      // No fakeout — straight to reveal
      const t = setTimeout(triggerReveal, 200);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line

  function handleNearMissDone() {
    const fakeout = pickFakeoutRarity(card.rarity);
    if (!fakeout) { triggerReveal(); return; }

    // Show fakeout rarity briefly
    setFakeRarity(fakeout);
    setPhase("fakeout");
    playSync("fakeout");

    // Brief tension pause, then the real reveal
    setTimeout(() => {
      setFakeRarity(null);
      triggerReveal();
    }, 700 + Math.random() * 400);
  }

  const displayRarity = fakeRarity ?? card.rarity;
  const displayCfg    = getRarityConfig(displayRarity);
  const isRevealed    = phase === "reveal" || phase === "done";

  // Card visual state
  const isGod   = tier === "god";
  const isUltra = tier === "ultra";
  const isEpic  = tier === "epic";

  const cardBoxShadow = isRevealed
    ? isGod   ? `0 0 50px ${cfg.color}, 0 0 100px ${cfg.color}60, 0 0 200px ${cfg.color}20`
    : isUltra ? `0 0 35px ${cfg.color}90, 0 0 70px ${cfg.color}50`
    : isEpic  ? `0 0 22px ${cfg.color}80, 0 0 44px ${cfg.color}40`
    : `0 0 14px ${cfg.color}50`
    : "none";

  return (
    <>
      {/* Global overlay effects */}
      <ConfettiBurst active={confetti} />
      <ChromaticAberration active={chromaActive} />

      {/* Flash */}
      <AnimatePresence>
        {flashActive && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ background: flashColor }}
            initial={{ opacity: 0.65 }}
            animate={{ opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Big Hit overlay */}
      <AnimatePresence>
        {bigHit && <BigHitOverlay value={instantSellPrice ?? "0"} color={cfg.color} onDismiss={() => setBigHit(false)} />}
      </AnimatePresence>

      <ScreenShake active={shakeActive} intensity={isGod ? 1.5 : 1}>
        <div className="flex flex-col items-center gap-5 w-full px-4">

          {/* Near-miss scroll */}
          {phase === "nearmiss" && (
            <motion.div
              className="w-full max-w-[280px]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-center text-xs text-gray-600 uppercase tracking-widest mb-3">
                Seleccionando…
              </p>
              <NearMissScroll realCard={card} onDone={handleNearMissDone} />
            </motion.div>
          )}

          {/* Fakeout rarity flash */}
          {phase === "fakeout" && fakeRarity && (
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
            >
              <div
                className="w-52 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  height:    308,
                  background: `linear-gradient(160deg, ${displayCfg.color}20, #0D0B1A)`,
                  border:    `2px solid ${displayCfg.color}50`,
                  boxShadow: `0 0 20px ${displayCfg.color}50`,
                }}
              >
                <div className="text-center space-y-2 px-4">
                  <RarityBadge rarity={displayRarity} size="lg" />
                  <p className="text-sm font-bold text-gray-400 mt-2">...</p>
                </div>
              </div>
              <motion.p
                className="text-xs text-gray-500 uppercase tracking-widest"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              >
                ¿Será esta?
              </motion.p>
            </motion.div>
          )}

          {/* Real card reveal */}
          {(phase === "reveal" || phase === "done") && (
            <motion.div
              key="real-card"
              className="flex flex-col items-center gap-5 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Card */}
              <div className="relative" style={{ perspective: "1000px" }}>
                <motion.div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    width:     220,
                    height:    308,
                    border:    isGod ? "2px solid #F59E0B" : `2px solid ${cfg.color}60`,
                    boxShadow: cardBoxShadow,
                    animation: isGod ? "godBorder 1.5s linear infinite" : "none",
                  }}
                  initial={{ rotateY: 90, scale: 0.7, opacity: 0 }}
                  animate={{ rotateY: 0, scale: isGod ? 1.07 : isUltra ? 1.04 : 1, opacity: 1 }}
                  transition={{ duration: 0.45, type: "spring", damping: 14, stiffness: 200 }}
                  whileHover={{ scale: isGod ? 1.1 : 1.04 }}
                >
                  {/* Background tint */}
                  <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${cfg.color}18 0%, #0D0B1A 55%)` }} />

                  {/* Holographic shine */}
                  {(isEpic || isUltra || isGod) && (
                    <motion.div
                      className="absolute inset-0 z-10 pointer-events-none holo-shine"
                      animate={{ backgroundPosition: ["0% 0%", "200% 200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    />
                  )}

                  {/* Image */}
                  <div className="absolute inset-2">
                    <CardImage src={card.imageUrl} alt={card.name} rarity={card.rarity} fill className="object-contain" sizes="220px" priority />
                  </div>

                  {/* God sparkles */}
                  {isGod && <FloatingSparkles color={cfg.color} />}

                  {/* Particles */}
                  <ParticleBurst active={particles} color={cfg.color} count={isGod ? 36 : isUltra ? 26 : 18} />

                  {/* Pulsing glow ring for epic+ */}
                  {(isEpic || isUltra || isGod) && <PulsingGlowRing color={cfg.color} intensity={isGod ? 1.8 : isUltra ? 1.3 : 1} />}
                </motion.div>

                {/* Ground glow shadow */}
                <motion.div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-36 h-8 rounded-full blur-xl pointer-events-none"
                  style={{ background: cfg.color }}
                  animate={{ opacity: [0.3, 0.65, 0.3], scaleX: [1, 1.15, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </div>

              {/* Card info */}
              <motion.div
                className="text-center space-y-2 w-full max-w-[260px]"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <motion.div
                  className="flex justify-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring", damping: 11 }}
                >
                  <RarityBadge rarity={card.rarity} size="lg" />
                </motion.div>

                <motion.h3
                  className="text-xl font-black font-display"
                  style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.color}80` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {card.name}
                </motion.h3>

                <p className="text-xs text-gray-500">{card.setName} · {card.cardNumber}</p>

                {instantSellPrice && (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring", damping: 13 }}
                  >
                    <p className="text-xs text-gray-600 uppercase tracking-wider mb-0.5">Valor de venta</p>
                    <p
                      className="text-3xl font-black font-mono"
                      style={{ color: "#4FFFB4", textShadow: "0 0 24px #4FFFB480" }}
                    >
                      {formatEUR(instantSellPrice)}
                    </p>
                    {isBigHit && (
                      <motion.p
                        className="text-xs font-bold uppercase tracking-widest mt-1"
                        style={{ color: cfg.color }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        🔥 Big Hit
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Action buttons */}
              <AnimatePresence>
                {phase === "done" && (
                  <motion.div
                    className="flex gap-3 w-full max-w-[260px]"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                  >
                    {instantSellPrice && (
                      <motion.button
                        className="flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider relative overflow-hidden"
                        style={{
                          background: isSelling ? "rgba(79,255,180,0.2)" : "linear-gradient(135deg, #4FFFB4, #2DD4BF)",
                          boxShadow:  isSelling ? "none" : "0 0 20px #4FFFB460",
                          color:      isSelling ? "#4FFFB4" : "#06050F",
                        }}
                        whileHover={!isSelling ? { scale: 1.03, boxShadow: "0 0 28px #4FFFB480" } : {}}
                        whileTap={!isSelling ? { scale: 0.96 } : {}}
                        onClick={() => { play("sell"); onSell(); }}
                        disabled={isSelling}
                      >
                        {isSelling ? (
                          <span className="flex items-center justify-center gap-2">
                            <motion.div className="w-4 h-4 rounded-full border-2 border-[#4FFFB4] border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }} />
                            Vendiendo
                          </span>
                        ) : `Vender ${formatEUR(instantSellPrice)}`}
                      </motion.button>
                    )}
                    <motion.button
                      className="flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider"
                      style={{ background: "rgba(180,79,255,0.12)", border: "1px solid rgba(180,79,255,0.4)", color: "#B44FFF" }}
                      whileHover={{ scale: 1.03, background: "rgba(180,79,255,0.22)", boxShadow: "0 0 20px rgba(180,79,255,0.4)" }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { play("keep"); onKeep(); }}
                    >
                      Guardar
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </ScreenShake>
    </>
  );
}
