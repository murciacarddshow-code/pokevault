"use client";

import { useState, useEffect } from "react";
import { PackImage } from "@/components/packs/PackImage";
import { motion, AnimatePresence } from "framer-motion";
import { useSound } from "@/hooks/useSound";

type Phase = "idle" | "appear" | "float" | "shake" | "crack" | "flash" | "done";

interface PackCinematicProps {
  packImageUrl: string;
  packName:     string;
  packColor:    string;
  onComplete:   () => void;
  skip?:        boolean;
}

// Crack/tear lines drawn on canvas for the opening effect
function CrackOverlay({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <motion.svg
      className="absolute inset-0 pointer-events-none z-10"
      viewBox="0 0 200 260"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.7] }}
      transition={{ duration: 0.25 }}
    >
      {/* Radial crack lines emanating from centre */}
      {[
        "M100,130 L30,20",   "M100,130 L5,100",   "M100,130 L20,200",
        "M100,130 L80,260",  "M100,130 L140,260",  "M100,130 L195,200",
        "M100,130 L195,80",  "M100,130 L165,10",
      ].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={i % 2 === 0 ? 1.5 : 0.8}
          fill="none"
          opacity={0.8}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2, delay: i * 0.02 }}
        />
      ))}
      {/* Bright centre burst */}
      <motion.circle cx="100" cy="130" r="18"
        fill={color} opacity="0"
        animate={{ r: [4, 35], opacity: [0.8, 0] }}
        transition={{ duration: 0.35 }}
      />
    </motion.svg>
  );
}

// Floating particle ring
function ParticleRing({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const r = 80 + Math.random() * 40;
    return {
      x: 100 + Math.cos(angle) * r,
      y: 130 + Math.sin(angle) * r,
      size: 2 + Math.random() * 4,
      delay: i * 0.03,
    };
  });
  return (
    <svg className="absolute inset-0 pointer-events-none z-10" viewBox="0 0 200 260">
      {particles.map((p, i) => (
        <motion.circle
          key={i} cx="100" cy="130" r={p.size}
          fill={color}
          initial={{ cx: 100, cy: 130, opacity: 1, r: 2 }}
          animate={{ cx: p.x, cy: p.y, opacity: 0, r: p.size }}
          transition={{ duration: 0.6, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

export function PackCinematic({
  packImageUrl, packName, packColor, onComplete, skip = false,
}: PackCinematicProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [flashActive, setFlashActive] = useState(false);
  const { play } = useSound();

  useEffect(() => {
    if (skip) { onComplete(); return; }

    const go = async () => {
      // 1. Pack appears from below with bounce
      setPhase("appear");
      await delay(600);

      // 2. Gentle float
      setPhase("float");
      await delay(300);

      // 3. Shake intensifies
      setPhase("shake");
      play("pack_shake");
      await delay(250);

      play("pack_shake");
      await delay(200);

      play("pack_shake");
      await delay(150);

      // 4. Crack effect
      setPhase("crack");
      await delay(200);

      // 5. Flash
      setFlashActive(true);
      play("pack_open");
      await delay(60);
      setFlashActive(false);
      await delay(60);
      setFlashActive(true);
      await delay(80);
      setFlashActive(false);
      setPhase("flash");

      // 6. Done
      await delay(120);
      setPhase("done");
      await delay(80);
      onComplete();
    };

    go();
  }, []); // eslint-disable-line

  return (
    <div className="relative flex items-center justify-center w-full h-full min-h-[360px]">

      {/* Deep background glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${packColor}35 0%, transparent 70%)`,
        }}
        animate={
          phase === "shake" || phase === "crack"
            ? { opacity: [0.6, 1, 0.7, 1, 0.8], scale: [1, 1.08, 0.97, 1.06, 1] }
            : phase === "appear" || phase === "float"
            ? { opacity: [0, 0.7] }
            : {}
        }
        transition={{ duration: 0.4 }}
      />

      {/* Outer ring pulse */}
      <AnimatePresence>
        {(phase === "shake" || phase === "crack") && (
          <motion.div
            className="absolute rounded-full"
            style={{ width: 300, height: 300, border: `1.5px solid ${packColor}`, left: "50%", top: "50%", marginLeft: -150, marginTop: -150 }}
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Flash overlay */}
      <AnimatePresence>
        {flashActive && (
          <motion.div
            className="absolute inset-0 z-30 rounded-xl"
            style={{ background: packColor }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* PACK CONTAINER */}
      <AnimatePresence>
        {phase !== "done" && (
          <motion.div
            className="relative"
            style={{ width: 220, height: 300 }}
            initial={{ scale: 0.3, opacity: 0, y: 60 }}
            animate={
              phase === "appear"
                ? { scale: 1, opacity: 1, y: 0, rotate: 0 }
              : phase === "float"
                ? { scale: 1.03, y: -6, rotate: 1 }
              : phase === "shake"
                ? {
                    scale:  [1.03, 1.1, 0.97, 1.13, 0.95, 1.12, 1.0, 1.08],
                    rotate: [1, -5, 6, -7, 6, -5, 4, -2, 1],
                    y:      [-6, -12, -3, -15, -4, -13, -5, -10, -6],
                  }
              : phase === "crack"
                ? { scale: 1.2, rotate: 0, y: -18 }
              : phase === "flash"
                ? { scale: 2.2, opacity: 0, y: -50 }
              : { scale: 0.3, opacity: 0 }
            }
            transition={
              phase === "appear"  ? { type: "spring", damping: 14, stiffness: 180 }
              : phase === "shake" ? { duration: 0.45, ease: "easeInOut" }
              : phase === "crack" ? { duration: 0.15, type: "spring", stiffness: 400 }
              : phase === "flash" ? { duration: 0.18 }
              : { duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
            }
          >
            {/* Glow halo behind pack */}
            <motion.div
              className="absolute rounded-2xl"
              style={{
                inset: -12,
                background: `radial-gradient(ellipse at 50% 50%, ${packColor}50, transparent 70%)`,
                filter: "blur(8px)",
              }}
              animate={
                phase === "shake" || phase === "crack"
                  ? { opacity: [0.6, 1, 0.7, 1] }
                  : { opacity: 0.5 }
              }
              transition={{ duration: 0.3 }}
            />

            {/* Hard glow border */}
            <motion.div
              className="absolute rounded-2xl pointer-events-none"
              style={{ inset: 0, boxShadow: `0 0 0 1.5px ${packColor}80, 0 0 40px ${packColor}60, 0 0 80px ${packColor}30` }}
              animate={
                phase === "shake" ? { boxShadow: [`0 0 0 1.5px ${packColor}, 0 0 60px ${packColor}, 0 0 100px ${packColor}60`, `0 0 0 2px ${packColor}, 0 0 80px ${packColor}CC, 0 0 120px ${packColor}80`] }
                : {}
              }
              transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse" }}
            />

            {/* Pack image — use extracted opening asset if no specific pack image, else pack image */}
            <PackImage
              src={packImageUrl || "/opening/pokevault-pack.png"}
              alt={packName}
              fill
              className="object-contain"
              priority
            />

            {/* Crack + particle effects */}
            <CrackOverlay active={phase === "crack"} color={packColor} />
            <ParticleRing active={phase === "crack" || phase === "flash"} color={packColor} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pack name label */}
      <AnimatePresence>
        {(phase === "appear" || phase === "float" || phase === "shake") && (
          <motion.div
            className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.3em]"
              style={{ color: packColor, textShadow: `0 0 16px ${packColor}` }}
            >
              {packName}
            </p>
            <motion.p
              className="text-[10px] text-gray-600 uppercase tracking-widest"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              Abriendo…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
