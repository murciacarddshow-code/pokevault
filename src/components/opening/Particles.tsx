"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// ── Particle Burst ─────────────────────────────────────────────────────────────

interface Particle {
  id: number; x: number; y: number;
  angle: number; dist: number; size: number;
  color: string; delay: number; shape: "circle" | "square";
}

function genParticles(color: string, count: number): Particle[] {
  const palette = [color, "#ffffff", "#F59E0B", color + "bb", "#fff8"];
  return Array.from({ length: count }, (_, i) => ({
    id:    i,
    x:     50, y: 50,
    angle: (360 / count) * i + (Math.random() * 30 - 15),
    dist:  70 + Math.random() * 80,
    size:  2 + Math.random() * 6,
    color: palette[Math.floor(Math.random() * palette.length)],
    delay: Math.random() * 0.12,
    shape: Math.random() > 0.7 ? "square" : "circle",
  }));
}

export function ParticleBurst({ active, color, count = 20 }: { active: boolean; color: string; count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => { if (active) setParticles(genParticles(color, count)); }, [active, color, count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {active && particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx  = Math.cos(rad) * p.dist;
          const ty  = Math.sin(rad) * p.dist;
          return (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                translateX: "-50%", translateY: "-50%",
              }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: 0, x: tx, y: ty, scale: 0, rotate: p.shape === "square" ? 180 : 0 }}
              exit={{}}
              transition={{ duration: 0.65 + Math.random() * 0.35, delay: p.delay, ease: [0.2, 1, 0.6, 1] }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Floating Sparkles ─────────────────────────────────────────────────────────

export function FloatingSparkles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${8 + Math.random() * 84}%`,
            top:  `${8 + Math.random() * 84}%`,
            width: 1.5 + Math.random() * 3,
            height: 1.5 + Math.random() * 3,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
          animate={{ opacity: [0,1,0], y: [0, -(24 + Math.random() * 20)], scale: [0,1,0] }}
          transition={{ duration: 1.4 + Math.random() * 0.8, delay: i * 0.18, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ── Screen Flash ──────────────────────────────────────────────────────────────

export function ScreenFlash({ active, color }: { active: boolean; color: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none"
          style={{ background: color }}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          exit={{}}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Screen Shake ──────────────────────────────────────────────────────────────

export function ScreenShake({ active, intensity = 1, children }: {
  active: boolean; intensity?: number; children: React.ReactNode;
}) {
  const controls = useAnimation();
  useEffect(() => {
    if (!active) return;
    const m = intensity;
    controls.start({
      x: [0, -m*6, m*5, -m*4, m*3, -m*2, m, 0],
      y: [0,  m*3, -m*4, m*2, -m*2, m, 0, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });
  }, [active, intensity, controls]);
  return <motion.div animate={controls}>{children}</motion.div>;
}

// ── Chromatic Aberration ──────────────────────────────────────────────────────

export function ChromaticAberration({ active, intensity = 1 }: { active: boolean; intensity?: number }) {
  const px = intensity * 2;
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[99] pointer-events-none"
          style={{
            boxShadow: `inset ${px}px 0 0 rgba(255,0,0,0.08), inset -${px}px 0 0 rgba(0,255,255,0.08)`,
            mixBlendMode: "screen" as any,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          exit={{}}
          transition={{ duration: 0.35, times: [0, 0.1, 0.6, 1] }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Confetti Burst ────────────────────────────────────────────────────────────

interface Confetto { id: number; x: number; vx: number; color: string; size: number; rotation: number; rotSpeed: number; }

export function ConfettiBurst({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<Confetto[]>([]);
  const palette = ["#B44FFF","#4FC3FF","#FF4FA8","#4FFFB4","#F59E0B","#fff","#EC4899","#60A5FA"];

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    setPieces(Array.from({ length: 60 }, (_, i) => ({
      id:       i,
      x:        10 + Math.random() * 80,
      vx:       (Math.random() - 0.5) * 240,
      color:    palette[Math.floor(Math.random() * palette.length)],
      size:     4 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 720,
    })));
    const t = setTimeout(() => setPieces([]), 3500);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="fixed inset-0 z-[98] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: "-2%", width: p.size, height: p.size * 0.5, background: p.color, borderRadius: 1 }}
            initial={{ y: 0, x: 0, rotate: p.rotation, opacity: 1 }}
            animate={{ y: ["0vh","110vh"], x: [0, p.vx], rotate: [p.rotation, p.rotation + p.rotSpeed], opacity: [1,1,0] }}
            transition={{ duration: 2 + Math.random() * 1.5, delay: Math.random() * 0.6, ease: "easeIn" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Pulsing Glow Ring ─────────────────────────────────────────────────────────

export function PulsingGlowRing({ color, intensity = 1 }: { color: string; intensity?: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-2xl pointer-events-none"
      animate={{ boxShadow: [`0 0 ${20*intensity}px ${color}60`, `0 0 ${45*intensity}px ${color}90`, `0 0 ${20*intensity}px ${color}60`] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    />
  );
}
