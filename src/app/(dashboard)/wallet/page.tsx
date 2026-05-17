"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useWallet } from "@/hooks/useWallet";
import { formatEUR } from "@/lib/utils/format";
import { track } from "@/lib/analytics/events";

const QUICK_AMOUNTS = [10, 25, 50, 100, 200, 500] as const;

const TX_STYLE: Record<string, { icon: string; color: string; label: string }> = {
  DEPOSIT:          { icon: "↓",  color: "#4FFFB4", label: "Recarga"       },
  PACK_PURCHASE:    { icon: "🃏", color: "#B44FFF", label: "Sobre abierto" },
  INSTANT_SELL:     { icon: "💰", color: "#4FFFB4", label: "Venta"         },
  REFUND:           { icon: "↩",  color: "#4FC3FF", label: "Devolución"    },
  ADMIN_ADJUSTMENT: { icon: "⚡", color: "#F59E0B", label: "Ajuste"        },
};

function TxIcon({ type }: { type: string }) {
  const s = TX_STYLE[type] ?? { icon: "·", color: "#9CA3AF", label: type };
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-bold"
      style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, color: s.color }}
    >
      {s.icon}
    </div>
  );
}

function WalletPageInner() {
  const searchParams = useSearchParams();
  const {
    balance, balanceLoading,
    transactions, txMeta, txLoading,
    depositing, depositErr,
    deposit,
    refetchBalance, refetchTransactions,
    txPage,
  } = useWallet();

  const [success, setSuccess]       = useState(false);
  const [addedAmt, setAddedAmt]     = useState<number | null>(null);
  const [customAmt, setCustomAmt]   = useState(50);

  // Handle Stripe success return
  const stripeSuccess = searchParams.get("success") === "1";
  const stripeCancelled = searchParams.get("cancelled") === "1";
  const stripeAmt = searchParams.get("amount");

  useEffect(() => {
    if (stripeSuccess) { refetchBalance(); refetchTransactions(1); }
  }, [stripeSuccess, refetchBalance, refetchTransactions]);

  async function handleQuickAdd(amount: number) {
    track({ event: "deposit_start", amount });
    const ok = await deposit(amount);
    if (ok) {
      setAddedAmt(amount);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-16">

      {/* Toast */}
      <AnimatePresence>
        {(success || stripeSuccess) && (
          <motion.div
            className="mb-6 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(79,255,180,0.08)", border: "1px solid rgba(79,255,180,0.25)" }}
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <span className="text-xl">✅</span>
            <div>
              <p className="font-bold text-sm text-white">¡Saldo añadido!</p>
              <p className="text-xs text-gray-400">+{addedAmt ?? stripeAmt}€ añadidos a tu wallet</p>
            </div>
          </motion.div>
        )}
        {stripeCancelled && (
          <motion.div
            className="mb-6 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(255,79,168,0.08)", border: "1px solid rgba(255,79,168,0.25)" }}
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <span className="text-xl">ℹ️</span>
            <p className="text-sm text-gray-300">Pago cancelado. Tu saldo no ha cambiado.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance card */}
      <motion.div
        className="rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(180,79,255,0.15) 0%, rgba(79,195,255,0.08) 100%)",
          border:     "1px solid rgba(180,79,255,0.25)",
          boxShadow:  "0 0 40px rgba(180,79,255,0.08)",
        }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none" style={{ background: "#B44FFF" }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-[50px] opacity-15 pointer-events-none" style={{ background: "#4FC3FF" }} />

        <div className="relative z-10">
          <p className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-2">Saldo disponible</p>
          {balanceLoading ? (
            <div className="h-14 w-40 rounded-xl animate-pulse" style={{ background: "#1E1A35" }} />
          ) : (
            <motion.p
              className="text-5xl font-black font-mono"
              style={{ color: "#4FFFB4", textShadow: "0 0 24px #4FFFB460" }}
              key={balance}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {balance !== null ? formatEUR(balance) : "—"}
            </motion.p>
          )}
          <p className="text-xs text-gray-600 mt-1">Saldo virtual · Solo para demo</p>
        </div>
      </motion.div>

      {/* ── DEMO QUICK ADD ───────────────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #4FFFB4, #4FC3FF)" }} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Añadir saldo demo</h2>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: "rgba(79,255,180,0.12)", color: "#4FFFB4", border: "1px solid rgba(79,255,180,0.25)" }}>
            DEMO
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-4">Saldo instantáneo para probar la plataforma. Sin pasarela de pago.</p>

        {/* Quick amounts */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_AMOUNTS.map((amt) => (
            <motion.button
              key={amt}
              onClick={() => handleQuickAdd(amt)}
              disabled={depositing}
              className="py-3 rounded-xl font-black font-mono text-lg transition-all disabled:opacity-50"
              style={{
                background: "rgba(79,255,180,0.08)",
                border:     "1px solid rgba(79,255,180,0.2)",
                color:      "#4FFFB4",
              }}
              whileHover={{ scale: 1.04, background: "rgba(79,255,180,0.14)" }}
              whileTap={{ scale: 0.96 }}
            >
              +{amt}€
            </motion.button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex gap-2">
          <input
            type="number"
            min={1} max={10000}
            value={customAmt}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) setCustomAmt(v);
            }}
            className="flex-1 rounded-xl px-4 py-3 font-mono font-bold text-white text-lg outline-none"
            style={{ background: "#15122A", border: "1px solid #1E1A35" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#4FFFB450"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#1E1A35"; }}
          />
          <motion.button
            onClick={() => handleQuickAdd(customAmt)}
            disabled={depositing || customAmt <= 0}
            className="px-5 rounded-xl font-black text-sm uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4FFFB4, #4FC3FF)", color: "#06050F" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {depositing ? "…" : "Añadir"}
          </motion.button>
        </div>

        {depositErr && (
          <div className="mt-3 rounded-xl px-4 py-2.5 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}>
            {depositErr}
          </div>
        )}
      </motion.div>

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #B44FFF, #4FC3FF)" }} />
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">Historial</h2>
          </div>
          {txMeta && (
            <span className="text-xs text-gray-600">{txMeta.total} transacciones</span>
          )}
        </div>

        {txLoading && transactions.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#0D0B1A" }} />
            ))}
          </div>
        )}

        {!txLoading && transactions.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-sm">Sin transacciones todavía.</p>
            <p className="text-xs mt-1">Añade saldo para empezar.</p>
          </div>
        )}

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {transactions.map((tx, i) => {
              const s    = TX_STYLE[tx.type] ?? { icon: "·", color: "#9CA3AF", label: tx.type };
              const isPos = Number(tx.amount) >= 0;
              const date = new Date(tx.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
              const time = new Date(tx.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-2xl p-3.5"
                  style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ borderColor: "#2A2545", background: "#100E1F" }}
                >
                  <TxIcon type={tx.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{tx.description ?? s.label}</p>
                    <p className="text-[10px] text-gray-600">{date} · {time}</p>
                  </div>
                  {tx.status !== "COMPLETED" && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: tx.status === "PENDING" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                        color:      tx.status === "PENDING" ? "#F59E0B" : "#EF4444",
                      }}
                    >
                      {tx.status === "PENDING" ? "Pendiente" : "Fallido"}
                    </span>
                  )}
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-black font-mono"
                      style={{ color: isPos ? "#4FFFB4" : "#FF4FA8", textShadow: `0 0 8px ${isPos ? "#4FFFB440" : "#FF4FA840"}` }}
                    >
                      {isPos ? "+" : ""}{formatEUR(tx.amount)}
                    </p>
                    <p className="text-[10px] text-gray-600 font-mono">≡ {formatEUR(tx.balanceAfter)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {txMeta && txMeta.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => refetchTransactions(txPage - 1)}
              disabled={txPage <= 1}
              className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 disabled:opacity-30 transition-colors hover:text-white"
              style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-600">{txPage} / {txMeta.pages}</span>
            <button
              onClick={() => refetchTransactions(txPage + 1)}
              disabled={txPage >= txMeta.pages}
              className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 disabled:opacity-30 transition-colors hover:text-white"
              style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto pb-16"><div className="h-48 rounded-3xl animate-pulse" style={{background:"#0D0B1A"}} /></div>}>
      <WalletPageInner />
    </Suspense>
  );
}
