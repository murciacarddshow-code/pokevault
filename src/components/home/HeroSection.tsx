"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Animated counter hook
function useCounter(target: number, duration = 2, decimals = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const progress = Math.min((Date.now() - start) / (duration * 1000), 1);
          const ease     = 1 - Math.pow(1 - progress, 3);
          setValue(parseFloat((target * ease).toFixed(decimals)));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, decimals]);

  return { value, ref };
}

// Floating card visual
function FloatingCard({ delay, x, y, rotation, rarity, emoji }: { delay: number; x: string; y: string; rotation: number; rarity: string; emoji: string }) {
  const colors: Record<string, string> = {
    god:   "#F59E0B",
    ultra: "#B44FFF",
    epic:  "#EC4899",
    rare:  "#60A5FA",
  };
  const color = colors[rarity] ?? "#60A5FA";

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, rotate: rotation }}
      animate={{ y: [0, -12, 0], rotate: [rotation, rotation + 3, rotation] }}
      transition={{ duration: 3 + delay * 0.5, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <div
        className="w-16 h-22 rounded-xl flex items-center justify-center text-2xl"
        style={{
          width:     64,
          height:    88,
          background: `linear-gradient(160deg, ${color}25, #0D0B1A)`,
          border:    `1px solid ${color}50`,
          boxShadow: `0 0 20px ${color}40`,
        }}
      >
        {emoji}
      </div>
    </motion.div>
  );
}

const FLOATING_CARDS = [
  { delay:0,   x:"-5%",  y:"15%",  rotation:-15, rarity:"god",   emoji:"🔥" },
  { delay:0.6, x:"95%",  y:"20%",  rotation:12,  rarity:"ultra", emoji:"⚡" },
  { delay:1.2, x:"-8%",  y:"65%",  rotation:-8,  rarity:"epic",  emoji:"👻" },
  { delay:0.4, x:"93%",  y:"60%",  rotation:18,  rarity:"rare",  emoji:"🌊" },
  { delay:1.8, x:"8%",   y:"40%",  rotation:-20, rarity:"ultra", emoji:"💎" },
  { delay:1.0, x:"88%",  y:"40%",  rotation:10,  rarity:"god",   emoji:"🐉" },
];

export function HeroSection() {
  const { value: openings, ref: ref1 } = useCounter(48291,   2.2);
  const { value: prize,    ref: ref2 } = useCounter(2.1,     2.5, 1);
  const { value: users,    ref: ref3 } = useCounter(12450,   2.0);

  return (
    <section className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-32">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ background: "#B44FFF" }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.28, 0.18], x: [0, 30, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-18"
          style={{ background: "#4FC3FF" }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.14, 0.24, 0.14], x: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute top-1/3 right-1/3 w-[300px] h-[300px] rounded-full blur-[100px] opacity-14"
          style={{ background: "#FF4FA8" }}
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Animated grid */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(#B44FFF 1px, transparent 1px), linear-gradient(90deg, #B44FFF 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
          animate={{ opacity: [0.018, 0.035, 0.018] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      {/* Floating card decorations — desktop only */}
      <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
        {FLOATING_CARDS.map((c, i) => <FloatingCard key={i} {...c} />)}
      </div>

      {/* Content */}
      <div className="relative text-center px-4 max-w-2xl mx-auto">

        {/* Live badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
          style={{ background: "rgba(180,79,255,0.1)", border: "1px solid rgba(180,79,255,0.3)" }}
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FF4FA8", boxShadow: "0 0 6px #FF4FA8" }} />
          <span className="text-xs font-bold uppercase tracking-widest text-[#B44FFF]">Aperturas en vivo ahora</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 className="font-black font-display leading-[0.88] mb-7"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <motion.span
            className="block text-5xl sm:text-7xl"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F0EEFF 35%, #B44FFF 65%, #4FC3FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            ABRE SOBRES
          </motion.span>
          <span
            className="block text-3xl sm:text-5xl mt-3"
            style={{ background: "linear-gradient(135deg, #FF4FA8, #B44FFF, #4FC3FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            POKÉMON PREMIUM
          </span>
        </motion.h1>

        <motion.p
          className="text-gray-400 text-base sm:text-lg max-w-sm mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        >
          Aperturas digitales verificadas. Vende al instante al precio de mercado.
          Cada apertura es única e irreproducible.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        >
          <Link href="/packs">
            <motion.div
              className="relative px-8 py-4 rounded-2xl font-black font-display text-lg uppercase tracking-widest text-white overflow-hidden cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B44FFF 0%, #FF4FA8 50%, #4FC3FF 100%)", boxShadow: "0 0 30px rgba(180,79,255,0.5), 0 0 60px rgba(180,79,255,0.2)" }}
              whileHover={{ scale: 1.04, boxShadow: "0 0 45px rgba(180,79,255,0.7), 0 0 90px rgba(180,79,255,0.3)" }}
              whileTap={{ scale: 0.97 }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
              />
              <span className="relative z-10">Explorar Packs</span>
            </motion.div>
          </Link>

          <Link href="/register">
            <motion.div
              className="px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest cursor-pointer"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}
              whileHover={{ background: "rgba(255,255,255,0.09)", borderColor: "rgba(180,79,255,0.5)", color: "#F0EEFF" }}
              whileTap={{ scale: 0.97 }}
            >
              Empezar gratis →
            </motion.div>
          </Link>
        </motion.div>

        {/* Animated stats */}
        <motion.div
          className="grid grid-cols-3 gap-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >
          {[
            { ref: ref1, value: openings, label: "Aperturas",       format: (v: number) => v.toLocaleString("es-ES"),  suffix: "+" },
            { ref: ref2, value: prize,    label: "En premios",      format: (v: number) => `€${v.toFixed(1)}M`,        suffix: ""  },
            { ref: ref3, value: users,    label: "Coleccionistas",  format: (v: number) => v.toLocaleString("es-ES"),  suffix: "+" },
          ].map((stat, i) => (
            <div key={i} ref={stat.ref as any} className="text-center">
              <motion.p
                className="text-2xl sm:text-3xl font-black font-mono"
                style={{ background: "linear-gradient(135deg, #B44FFF, #4FC3FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {stat.format(stat.value)}{stat.suffix}
              </motion.p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
