"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePackStore } from "@/stores/usePackStore";
import { PokemonCard } from "@/components/cards/PokemonCard";
import { getRarityConfig } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";

interface OpeningModalProps {
  packId:   string;
  packName: string;
  onClose:  () => void;
}

export function OpeningModal({ packId, packName, onClose }: OpeningModalProps) {
  const {
    phase, result, revealedCount, error, soldCards,
    revealNext, revealAll, markSold, reset,
  } = usePackStore();

  // Auto-advance revealing phase: reveal one card every 600ms
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (phase !== "revealing") return;
    timerRef.current = setTimeout(() => {
      revealNext();
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, revealedCount, revealNext]);

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSell(inventoryItemId: string, cardId: string) {
    // inventoryItemId no disponible aquí directamente — usamos cardId como placeholder
    // En producción: buscar el inventoryItemId correcto vía el inventario
    try {
      // Quick sell via wallet balance optimistic update
      markSold(cardId);
    } catch {
      // silencioso
    }
  }

  // Total value of cards obtained
  const totalValue = result?.cards.reduce((sum, oc) => {
    return sum + Number(oc.instantSellPriceAtDrop ?? 0);
  }, 0) ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: "rgba(6,5,15,0.92)", backdropFilter: "blur(8px)" }}
          onClick={phase === "done" ? handleClose : undefined}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
          style={{
            background: "#0D0B1A",
            border:     "1px solid #1E1A35",
            boxShadow:  "0 0 80px rgba(180,79,255,0.15), 0 40px 80px rgba(0,0,0,0.8)",
          }}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* ── LOADING ─────────────────────────────────────────────── */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-24 px-8">
              <motion.div
                className="w-20 h-20 rounded-full border-4 mb-6"
                style={{ borderColor: "#1E1A35", borderTopColor: "#B44FFF" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <p
                className="text-lg font-black font-display uppercase tracking-widest"
                style={{ color: "#B44FFF", textShadow: "0 0 20px #B44FFF60" }}
              >
                Abriendo sobre…
              </p>
              <p className="text-sm text-gray-500 mt-2">{packName}</p>
            </div>
          )}

          {/* ── REVEALING / DONE ────────────────────────────────────── */}
          {(phase === "revealing" || phase === "done") && result && (
            <>
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-[#1E1A35]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                      Sobre abierto
                    </p>
                    <h2
                      className="text-xl font-black font-display"
                      style={{
                        background: "linear-gradient(135deg, #B44FFF, #4FC3FF)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {packName}
                    </h2>
                  </div>
                  {phase === "done" && (
                    <button
                      onClick={handleClose}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: "#15122A", color: "#8B80A8" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Cards grid */}
              <div className="p-5">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {result.cards.map((oc, i) => {
                    const isRevealed = i < revealedCount;
                    const cfg = getRarityConfig(oc.card.rarity);
                    const isSold = soldCards.has(oc.card.id);

                    return (
                      <AnimatePresence key={oc.position}>
                        {isRevealed ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            transition={{ type: "spring", damping: 18, stiffness: 280 }}
                          >
                            <PokemonCard
                              id={oc.card.id}
                              name={oc.card.name}
                              rarity={oc.card.rarity}
                              imageUrl={oc.card.imageUrl}
                              instantSellPrice={oc.instantSellPriceAtDrop}
                              isSold={isSold}
                              showActions={phase === "done"}
                              onSell={() => handleSell("", oc.card.id)}
                              onKeep={() => {}}
                              size="sm"
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            className="w-full rounded-2xl overflow-hidden"
                            style={{
                              aspectRatio: "63/88",
                              background: "linear-gradient(135deg, #15122A 0%, #0D0B1A 100%)",
                              border: "1px solid #1E1A35",
                            }}
                            animate={{
                              boxShadow: [
                                "0 0 8px rgba(180,79,255,0.2)",
                                "0 0 20px rgba(180,79,255,0.5)",
                                "0 0 8px rgba(180,79,255,0.2)",
                              ],
                            }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                          />
                        )}
                      </AnimatePresence>
                    );
                  })}
                </div>
              </div>

              {/* Footer — summary when done */}
              {phase === "done" && (
                <motion.div
                  className="px-5 pb-6 space-y-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Value summary */}
                  <div
                    className="rounded-xl p-4 flex items-center justify-between"
                    style={{ background: "#15122A", border: "1px solid #1E1A35" }}
                  >
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                        Valor estimado obtenido
                      </p>
                      <p
                        className="text-2xl font-black font-mono"
                        style={{
                          color:      totalValue > Number(result.pricePaid) ? "#4FFFB4" : "#FF4FA8",
                          textShadow: `0 0 16px ${totalValue > Number(result.pricePaid) ? "#4FFFB480" : "#FF4FA880"}`,
                        }}
                      >
                        {formatEUR(totalValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                        Pagado
                      </p>
                      <p className="text-sm font-bold text-gray-400 font-mono">
                        {formatEUR(result.pricePaid)}
                      </p>
                    </div>
                  </div>

                  {/* Provably fair */}
                  <details className="group">
                    <summary
                      className="flex items-center gap-2 cursor-pointer list-none text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Verificación Provably Fair
                      <svg className="ml-auto transition-transform group-open:rotate-180" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </summary>
                    <div
                      className="mt-2 p-3 rounded-xl space-y-1.5"
                      style={{ background: "#06050F", border: "1px solid #1E1A35" }}
                    >
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-0.5">Server Seed Hash</p>
                        <p className="text-[10px] font-mono text-gray-400 break-all">{result.provablyFair.serverSeedHash}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-0.5">Client Seed</p>
                        <p className="text-[10px] font-mono text-gray-400 break-all">{result.provablyFair.clientSeed}</p>
                      </div>
                    </div>
                  </details>

                  {/* CTA */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest text-white transition-all"
                    style={{
                      background: "linear-gradient(135deg, #B44FFF, #4FC3FF)",
                      boxShadow:  "0 0 24px rgba(180,79,255,0.4)",
                    }}
                  >
                    Cerrar
                  </button>
                </motion.div>
              )}

              {/* Reveal all button while revealing */}
              {phase === "revealing" && (
                <div className="px-5 pb-5">
                  <button
                    onClick={revealAll}
                    className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-200"
                    style={{ background: "#15122A", border: "1px solid #1E1A35" }}
                  >
                    Revelar todo
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── ERROR ───────────────────────────────────────────────── */}
          {phase === "idle" && error && (
            <div className="p-8 text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm font-medium" style={{ color: "#FCA5A5" }}>{error}</p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#15122A", border: "1px solid #1E1A35" }}
              >
                Cerrar
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
