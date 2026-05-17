"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePackStore } from "@/stores/usePackStore";
import { useWalletStore } from "@/stores/useWalletStore";
import { PackCinematic } from "./PackCinematic";
import { CardReveal } from "./CardReveal";
import { RarityBadge } from "@/components/cards/RarityBadge";
import { RARITY_CONFIG, getRarityConfig } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";
import { useAnalytics } from "@/lib/analytics/events";

function packColor(price: string): string {
  const n = Number(price);
  if (n >= 50) return "#FF4FA8";
  if (n >= 20) return "#B44FFF";
  if (n >= 10) return "#4FC3FF";
  return "#4FFFB4";
}

const FLASH_RARITIES = new Set(["ULTRA_RARE","ILLUSTRATION_RARE","SPECIAL_ILLUSTRATION_RARE","HYPER_RARE","SECRET_RARE"]);

type InnerPhase = "cinematic" | "card" | "summary";

interface OpeningExperienceProps {
  packId: string; packName: string; packImageUrl: string;
  price:  string; onClose: () => void;
}

export function OpeningExperience({ packId, packName, packImageUrl, price, onClose }: OpeningExperienceProps) {
  const { phase, result, error, soldCards, startOpening, setResult, setError, markSold, reset } = usePackStore();
  const { fetchBalance } = useWalletStore();
  const { track }        = useAnalytics();

  const [innerPhase,    setInnerPhase]    = useState<InnerPhase>("cinematic");
  const [cardIndex,     setCardIndex]     = useState(0);
  const [sellingCardId, setSellingCardId] = useState<string | null>(null);
  const [flashColor,    setFlashColor]    = useState("#ffffff");
  const [flashActive,   setFlashActive]   = useState(false);
  const [apiReady,      setApiReady]      = useState(false);
  const [sessionStart]                    = useState(() => Date.now());

  const color = packColor(price);

  // Fire API immediately
  useEffect(() => {
    startOpening();
    fetch(`/api/packs/${packId}/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setResult(json.data);
        setApiReady(true);
        track({ event: "pack_opened", packId, packName, pricePaid: Number(price) });
      })
      .catch(() => setError("Error de conexión. Inténtalo de nuevo."));
  }, []); // eslint-disable-line

  const goToCards = useCallback(() => {
    setInnerPhase("card");
    setCardIndex(0);
    // Flash for first card if epic
    if (result?.cards[0] && FLASH_RARITIES.has(result.cards[0].card.rarity)) {
      const cfg = getRarityConfig(result.cards[0].card.rarity);
      setFlashColor(cfg.color);
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 300);
    }
  }, [result]);

  const handleCinematicDone = useCallback(() => {
    if (apiReady) goToCards();
    // If not ready yet, cinematic will stay until apiReady flips
  }, [apiReady, goToCards]);

  useEffect(() => {
    if (apiReady && innerPhase === "cinematic") {
      // API finished while cinematic was playing — transition when cinematic completes
      // (already handled by handleCinematicDone)
    }
  }, [apiReady, innerPhase]);

  function handleNextCard() {
    if (!result) return;
    const next = cardIndex + 1;
    if (next >= result.cards.length) {
      setInnerPhase("summary");
      fetchBalance();
    } else {
      const nextCard = result.cards[next];
      if (nextCard && FLASH_RARITIES.has(nextCard.card.rarity)) {
        const cfg = getRarityConfig(nextCard.card.rarity);
        setFlashColor(cfg.color);
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 300);
      }
      setCardIndex(next);
    }
  }

  async function handleSell(cardId: string) {
    if (!result) return;
    const openedCard = result.cards.find((c) => c.card.id === cardId);
    if (!openedCard?.inventoryItemId) {
      console.error("[SELL] No inventoryItemId for card", cardId);
      return;
    }
    const invItemId = openedCard.inventoryItemId;
    setSellingCardId(cardId);
    try {
      const res  = await fetch(`/api/inventory/${invItemId}/sell`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ quantity: 1 }),
      });
      if (res.ok) {
        markSold(invItemId);
        fetchBalance();
        track({
          event:     "instant_sell",
          cardId,
          cardName:  openedCard.card.name,
          sellPrice: Number(openedCard.instantSellPriceAtDrop ?? 0),
          rarity:    openedCard.card.rarity,
        });
      } else {
        const json = await res.json().catch(() => ({}));
        console.error("[SELL] API error:", json.error ?? res.status);
      }
    } catch (err) {
      console.error("[SELL] Network error:", err);
    } finally {
      setSellingCardId(null);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  const currentCard  = result?.cards[cardIndex];
  const bgAccent     = currentCard && innerPhase === "card"
    ? getRarityConfig(currentCard.card.rarity).color
    : color;
  const totalValue   = result?.cards.reduce((s, c) => s + Number(c.instantSellPriceAtDrop ?? 0), 0) ?? 0;
  const pricePaid    = Number(result?.pricePaid ?? price);
  const isProfit     = totalValue > pricePaid;

  return (
    <>
      {/* Global flash */}
      <AnimatePresence>
        {flashActive && (
          <motion.div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: flashColor }}
            initial={{ opacity: 0.65 }} animate={{ opacity: 0 }} exit={{}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: "rgba(6,5,15,0.96)", backdropFilter: "blur(16px)" }} />

        {/* Dynamic ambient */}
        <motion.div className="absolute inset-0 pointer-events-none"
          animate={{ background: `radial-gradient(ellipse at 50% 40%, ${bgAccent}18 0%, transparent 60%)` }}
          transition={{ duration: 0.6 }}
        />

        {/* Skip button */}
        {innerPhase === "cinematic" && apiReady && (
          <button
            className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
            style={{ background: "#15122A", border: "1px solid #1E1A35" }}
            onClick={goToCards}
          >
            Saltar →
          </button>
        )}

        {/* Close when done */}
        {innerPhase === "summary" && (
          <button
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            style={{ background: "#15122A", border: "1px solid #1E1A35" }}
            onClick={handleClose}
          >✕</button>
        )}

        <div className="relative z-10 w-full max-w-sm mx-auto px-4">
          <AnimatePresence mode="wait">

            {/* CINEMATIC */}
            {innerPhase === "cinematic" && (
              <motion.div key="cinematic"
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25 }}
              >
                {phase === "loading" && (
                  <>
                    <PackCinematic packImageUrl={packImageUrl} packName={packName} packColor={color} onComplete={() => {}} />
                    <motion.div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: "#1E1A35" }}>
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}, #fff)` }}
                        animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }} />
                    </motion.div>
                  </>
                )}
                {(phase === "revealing" || phase === "done") && (
                  <PackCinematic packImageUrl={packImageUrl} packName={packName} packColor={color} onComplete={handleCinematicDone} />
                )}
                {phase === "idle" && error && (
                  <div className="text-center space-y-4 py-12">
                    <p className="text-5xl">⚠️</p>
                    <p className="text-sm font-medium text-red-400">{error}</p>
                    <button onClick={handleClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "#15122A", border: "1px solid #1E1A35" }}>Cerrar</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* CARD REVEAL */}
            {innerPhase === "card" && currentCard && (
              <motion.div key={`card-${cardIndex}`} className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.28 }}
              >
                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mb-2">
                  {result!.cards.map((c, i) => {
                    const cfg = getRarityConfig(c.card.rarity);
                    return (
                      <motion.div key={i}
                        className="rounded-full"
                        style={{
                          width:      i === cardIndex ? 20 : 6,
                          height:     6,
                          background: i < cardIndex ? cfg.color : i === cardIndex ? color : "#1E1A35",
                          boxShadow:  i === cardIndex ? `0 0 8px ${color}` : "none",
                          transition: "all 0.3s",
                        }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">
                  Carta {cardIndex + 1} de {result!.cards.length}
                </p>

                <CardReveal
                  card={currentCard.card as any}
                  instantSellPrice={
                    currentCard.instantSellPriceAtDrop == null
                      ? null
                      : String(currentCard.instantSellPriceAtDrop)
                  }
                  onKeep={handleNextCard}
                  onSell={() => handleSell(currentCard.card.id)}
                  isSelling={sellingCardId === currentCard.card.id}
                />

                <motion.button
                  className="mt-2 text-xs text-gray-600 uppercase tracking-wider hover:text-gray-400 transition-colors"
                  onClick={handleNextCard}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
                >
                  {cardIndex + 1 < (result?.cards.length ?? 1) ? "Siguiente →" : "Ver resumen →"}
                </motion.button>
              </motion.div>
            )}

            {/* SUMMARY */}
            {innerPhase === "summary" && result && (
              <motion.div key="summary" className="space-y-4"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              >
                <div className="text-center mb-2">
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Resultado final</p>
                  <h2 className="text-2xl font-black font-display" style={{
                    background: "linear-gradient(135deg, #F0EEFF, #B44FFF)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>{packName}</h2>
                </div>

                {/* Card grid */}
                <div className="grid grid-cols-5 gap-2">
                  {result.cards.map((oc) => {
                    const cfg    = getRarityConfig(oc.card.rarity);
                    const isSold = oc.inventoryItemId ? soldCards.has(oc.inventoryItemId) : false;
                    return (
                      <motion.div key={oc.position} className="relative rounded-xl overflow-hidden"
                        style={{ aspectRatio: "63/88", border: `1px solid ${isSold ? "#1E1A35" : cfg.color + "50"}`, opacity: isSold ? 0.4 : 1 }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: isSold ? 0.4 : 1 }}
                        transition={{ delay: oc.position * 0.06, type: "spring", damping: 14 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={oc.card.imageUrl} alt={oc.card.name} className="w-full h-full object-contain p-0.5"
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        {isSold && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(6,5,15,0.7)" }}>
                            <span className="text-[8px] font-black text-[#4FFFB4]">SOLD</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Value */}
                <motion.div
                  className="rounded-2xl p-4 flex items-center justify-between"
                  style={{
                    background: isProfit ? "rgba(79,255,180,0.06)" : "rgba(255,79,168,0.06)",
                    border: `1px solid ${isProfit ? "rgba(79,255,180,0.2)" : "rgba(255,79,168,0.2)"}`,
                  }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                >
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Valor total</p>
                    <p className="text-2xl font-black font-mono" style={{ color: isProfit ? "#4FFFB4" : "#FF4FA8", textShadow: `0 0 16px ${isProfit ? "#4FFFB460" : "#FF4FA860"}` }}>
                      {formatEUR(totalValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Pagado</p>
                    <p className="text-base font-bold text-gray-400 font-mono">{formatEUR(pricePaid)}</p>
                    <p className="text-sm font-bold" style={{ color: isProfit ? "#4FFFB4" : "#FF4FA8" }}>
                      {isProfit ? "+" : ""}{formatEUR(totalValue - pricePaid)}
                    </p>
                  </div>
                </motion.div>

                {/* Provably fair */}
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-gray-600 hover:text-gray-400 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Provably Fair
                    <svg className="ml-auto transition-transform group-open:rotate-180" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </summary>
                  <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: "#06050F", border: "1px solid #1E1A35" }}>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-0.5">Server Seed Hash</p>
                      <p className="text-[9px] font-mono text-gray-500 break-all">{result.provablyFair.serverSeedHash}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-0.5">Client Seed</p>
                      <p className="text-[9px] font-mono text-gray-500 break-all">{result.provablyFair.clientSeed}</p>
                    </div>
                  </div>
                </details>

                {/* CTAs */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { reset(); setInnerPhase("cinematic"); setApiReady(false); setCardIndex(0); startOpening();
                    fetch(`/api/packs/${packId}/open`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
                      .then(r => r.json()).then(json => { if (!json.error) { setResult(json.data); setApiReady(true); } });
                  }}
                    className="flex-1 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white"
                    style={{ background: `linear-gradient(135deg, ${color}, #B44FFF)`, boxShadow: `0 0 20px ${color}50` }}>
                    Abrir otro
                  </button>
                  <button onClick={handleClose}
                    className="px-5 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-400"
                    style={{ background: "#15122A", border: "1px solid #1E1A35" }}>
                    Salir
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
