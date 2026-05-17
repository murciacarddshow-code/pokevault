"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OpeningExperience } from "@/components/opening/OpeningExperience";
import { formatEUR } from "@/lib/utils/format";

interface OpenPackButtonProps {
  packId:       string;
  packName:     string;
  packImageUrl: string;
  price:        string;
  disabled?:    boolean;
}

export function OpenPackButton({
  packId, packName, packImageUrl, price, disabled,
}: OpenPackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="relative w-full py-4 rounded-2xl font-black font-display text-lg uppercase tracking-widest text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, #B44FFF 0%, #FF4FA8 50%, #4FC3FF 100%)",
          boxShadow:  "0 0 30px rgba(180,79,255,0.5), 0 0 60px rgba(180,79,255,0.2)",
        }}
        whileHover={!disabled ? {
          scale:     1.02,
          boxShadow: "0 0 40px rgba(180,79,255,0.7), 0 0 80px rgba(180,79,255,0.35)",
        } : {}}
        whileTap={!disabled ? { scale: 0.97 } : {}}
        transition={{ duration: 0.15 }}
      >
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
        />
        <span className="relative z-10">
          Open Pack — {formatEUR(price)}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <OpeningExperience
            packId={packId}
            packName={packName}
            packImageUrl={packImageUrl}
            price={price}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
