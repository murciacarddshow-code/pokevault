"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRarityConfig } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";
import { useWalletStore } from "@/stores/useWalletStore";
import { CardImage } from "@/components/cards/CardImage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: string; name: string; rarity: string; imageUrl: string;
  setName: string; cardNumber: string;
  currentPrice: number | null; instantSellPrice: number | null;
}
interface InventoryItem { id: string; quantity: number; obtainedAt: string; card: Card }
interface InventoryData {
  items: InventoryItem[];
  meta: { page: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  summary: { totalCards: number; totalItems: number; estimatedValue: string };
}

// ─── Physical Redemption Form ─────────────────────────────────────────────────

function PhysicalRedeemModal({
  item, onClose, onSuccess,
}: { item: InventoryItem; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    fullName: "", address: "", city: "", postalCode: "", country: "", phone: "",
  });
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const cfg = getRarityConfig(item.card.rarity);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.fullName || !form.address || !form.city || !form.postalCode || !form.country) {
      setError("Rellena todos los campos obligatorios.");
      return;
    }
    setLoading(true); setError(null);
    const res  = await fetch(`/api/inventory/${item.id}/redeem`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Error al crear la solicitud."); return; }
    onSuccess();
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#15122A", border: "1px solid #1E1A35",
    borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none",
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div className="absolute inset-0" style={{ background:"rgba(6,5,15,0.92)", backdropFilter:"blur(8px)" }} onClick={onClose} />
      <motion.div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[90vh]"
        style={{ background:"#0D0B1A", border:"1px solid #1E1A35", boxShadow:"0 0 60px rgba(180,79,255,0.12)" }}
        initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"spring", damping:28, stiffness:280 }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#1E1A35] flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Pedir carta física</h2>
            <p className="text-xs text-gray-500 mt-0.5" style={{ color: cfg.color }}>{item.card.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white"
            style={{ background:"#15122A" }}>✕</button>
        </div>

        <div className="p-5 space-y-3">
          {/* Info */}
          <div className="rounded-xl p-3 text-xs text-gray-400 space-y-0.5"
            style={{ background:"rgba(180,79,255,0.06)", border:"1px solid rgba(180,79,255,0.15)" }}>
            <p>🚚 Envío gratuito — procesamos la solicitud en 3-5 días hábiles.</p>
            <p>📦 Se descontará 1 unidad de tu inventario al confirmar.</p>
          </div>

          {[
            { key:"fullName",   label:"Nombre completo *",   placeholder:"Ana García López"     },
            { key:"address",    label:"Dirección *",         placeholder:"Calle Mayor, 15, 2ºA"  },
            { key:"city",       label:"Ciudad *",            placeholder:"Madrid"               },
            { key:"postalCode", label:"Código postal *",     placeholder:"28001"                },
            { key:"country",    label:"País *",              placeholder:"España"               },
            { key:"phone",      label:"Teléfono (opcional)", placeholder:"+34 600 000 000"       },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={e => update(key, e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#B44FFF60"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,79,255,0.1)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "#1E1A35";   e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          ))}

          {error && (
            <div className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#FCA5A5" }}>
              {error}
            </div>
          )}

          <motion.button onClick={submit} disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider text-white mt-2"
            style={{ background:"linear-gradient(135deg, #B44FFF, #FF4FA8)", boxShadow:"0 0 20px rgba(180,79,255,0.4)" }}
            whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>
            {loading ? "Enviando solicitud…" : "Confirmar solicitud"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Card grid item ───────────────────────────────────────────────────────────

function InventoryCard({
  item, onSell, onRedeem,
}: { item: InventoryItem; onSell: (id: string) => Promise<void>; onRedeem: (item: InventoryItem) => void }) {
  const [selling, setSelling] = useState(false);
  const cfg = getRarityConfig(item.card.rarity);

  async function handleSell() {
    setSelling(true);
    await onSell(item.id);
    setSelling(false);
  }

  return (
    <motion.div className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{ background:`linear-gradient(160deg,${cfg.color}12 0%,#0D0B1A 100%)`, border:`1px solid ${cfg.color}30`, boxShadow:`0 0 10px ${cfg.glow}` }}
      whileHover={{ y:-3, boxShadow:`0 0 20px ${cfg.glow}` }} transition={{ duration:0.18 }}>

      {/* Rarity strip */}
      <div className="px-2 py-0.5 text-center text-[9px] font-black uppercase tracking-widest"
        style={{ background:`${cfg.color}18`, borderBottom:`1px solid ${cfg.color}25`, color:cfg.color }}>
        {cfg.label}
      </div>

      {/* Image */}
      <div className="relative w-full" style={{ height:120 }}>
        <CardImage src={item.card.imageUrl} alt={item.card.name} rarity={item.card.rarity} fill sizes="160px" />
        {item.quantity > 1 && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
            style={{ background:cfg.color, color:"#06050F" }}>
            ×{item.quantity}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex-1">
        <p className="text-xs font-bold text-white truncate">{item.card.name}</p>
        <p className="text-[9px] text-gray-500 truncate mb-1.5">{item.card.setName} · {item.card.cardNumber}</p>
        {item.card.instantSellPrice
          ? <p className="text-sm font-black font-mono" style={{ color:"#4FFFB4", textShadow:"0 0 8px #4FFFB450" }}>{formatEUR(item.card.instantSellPrice)}</p>
          : <p className="text-xs text-gray-600">Sin precio</p>
        }
      </div>

      {/* Actions */}
      <div className="flex border-t" style={{ borderColor:"#1E1A35" }}>
        {item.card.instantSellPrice && (
          <button onClick={handleSell} disabled={selling}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors"
            style={{ background:selling?"rgba(79,255,180,0.05)":"rgba(79,255,180,0.1)", color:"#4FFFB4", borderRight:"1px solid #1E1A35" }}>
            {selling ? "…" : "Vender"}
          </button>
        )}
        <button onClick={() => onRedeem(item)}
          className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider transition-colors"
          style={{ background:"rgba(180,79,255,0.08)", color:"#B44FFF" }}>
          📦 Físico
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const RARITIES = ["GOD_HIT","SECRET_RARE","HYPER_RARE","SPECIAL_ILLUSTRATION_RARE","ULTRA_RARE","ILLUSTRATION_RARE","DOUBLE_RARE","RARE","UNCOMMON","COMMON"];

export default function InventoryPage() {
  const [data,          setData]        = useState<InventoryData | null>(null);
  const [loading,       setLoading]     = useState(true);
  const [page,          setPage]        = useState(1);
  const [filterRarity,  setFilter]      = useState("");
  const [sortBy,        setSort]        = useState("obtainedAt");
  const [sortOrder,     setOrder]       = useState("desc");
  const [notification,  setNotif]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [redeemItem,    setRedeemItem]  = useState<InventoryItem | null>(null);
  const [sellingAll,    setSellingAll]  = useState(false);
  const [sellAllConfirm, setSellAllConfirm] = useState(false);
  const { fetchBalance } = useWalletStore();
  // Prevent double-clicks on sell operations
  const sellAllInFlight = useRef(false);

  const notify = (msg: string, ok = true) => {
    setNotif({ msg, ok });
    setTimeout(() => setNotif(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "24", sort: sortBy, order: sortOrder,
        ...(filterRarity ? { rarity: filterRarity } : {}),
      });
      const res  = await fetch(`/api/inventory?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch { /* silent */ }
    finally   { setLoading(false); }
  }, [page, filterRarity, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  async function handleSell(inventoryItemId: string): Promise<void> {
    const res  = await fetch(`/api/inventory/${inventoryItemId}/sell`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1 }),
    });
    const json = await res.json();
    if (res.ok) {
      notify(`✅ Vendida — +${formatEUR(json.data.sellPrice)}`);
      // Await both — don't fire-and-forget
      await fetchBalance();
      load();
    } else {
      notify(json.error ?? "Error al vender", false);
    }
  }

  function handleRedeemSuccess() {
    notify("📦 Solicitud creada — procesaremos tu carta en breve.");
    load();
  }

  async function handleSellAll() {
    if (sellAllInFlight.current) return;
    sellAllInFlight.current = true;
    setSellingAll(true);
    setSellAllConfirm(false);
    try {
      const res  = await fetch("/api/inventory/sell-all", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        // Fetch ground-truth balance from server — no optimistic update
        await fetchBalance();
        notify(`✅ Vendidas ${json.data.cardsSold} cartas — +${formatEUR(json.data.totalAmount)}`);
        load();
      } else {
        notify(json.error ?? "Error al vender", false);
      }
    } catch {
      notify("Error de conexión", false);
    } finally {
      setSellingAll(false);
      sellAllInFlight.current = false;
    }
  }

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-600 mb-1">Tu colección</p>
          <h1 className="text-4xl font-black font-display" style={{
            background:"linear-gradient(135deg,#F0EEFF 0%,#B44FFF 50%,#4FC3FF 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>INVENTARIO</h1>
        </div>

        {/* Sell All button */}
        {data && data.summary.totalCards > 0 && (
          <div className="flex-shrink-0">
            {!sellAllConfirm ? (
              <motion.button
                onClick={() => setSellAllConfirm(true)}
                className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider"
                style={{ background: "rgba(79,255,180,0.1)", border: "1px solid rgba(79,255,180,0.25)", color: "#4FFFB4" }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                💰 Vender todo
              </motion.button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">¿Seguro?</span>
                <motion.button
                  onClick={handleSellAll}
                  disabled={sellingAll}
                  className="px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #4FFFB4, #4FC3FF)", color: "#06050F" }}
                  whileTap={{ scale: 0.97 }}
                >
                  {sellingAll ? "…" : "Sí, vender"}
                </motion.button>
                <button
                  onClick={() => setSellAllConfirm(false)}
                  className="px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-white"
                  style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div className="mb-4 rounded-xl px-4 py-3 text-sm font-bold"
            style={{
              background: notification.ok ? "rgba(79,255,180,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${notification.ok ? "rgba(79,255,180,0.3)" : "rgba(239,68,68,0.3)"}`,
              color:  notification.ok ? "#4FFFB4" : "#FCA5A5",
            }}
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      {data && data.summary.totalItems > 0 && (
        <div className="flex items-center gap-6 mb-6 p-4 rounded-2xl"
          style={{ background:"#0D0B1A", border:"1px solid #1E1A35" }}>
          <div className="text-center">
            <p className="text-2xl font-black font-mono" style={{ color:"#B44FFF" }}>{data.summary.totalCards}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Cartas</p>
          </div>
          <div className="w-px h-8" style={{ background:"#1E1A35" }} />
          <div className="text-center">
            <p className="text-2xl font-black font-mono" style={{ color:"#4FFFB4" }}>{formatEUR(data.summary.estimatedValue)}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Valor estimado</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select value={filterRarity} onChange={e => { setFilter(e.target.value); setPage(1); }}
          className="rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
          style={{ background:"#0D0B1A", border:"1px solid #1E1A35" }}>
          <option value="">Todas las rarezas</option>
          {RARITIES.map(r => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
        </select>
        <select value={`${sortBy}-${sortOrder}`}
          onChange={e => { const [s,o] = e.target.value.split("-"); setSort(s); setOrder(o); setPage(1); }}
          className="rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
          style={{ background:"#0D0B1A", border:"1px solid #1E1A35" }}>
          <option value="obtainedAt-desc">Más recientes</option>
          <option value="obtainedAt-asc">Más antiguas</option>
          <option value="value-desc">Mayor valor</option>
          <option value="rarity-desc">Más rara</option>
          <option value="name-asc">A–Z</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height:220, background:"#0D0B1A" }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <motion.div className="text-6xl mb-4" animate={{ y:[0,-6,0] }} transition={{ duration:2, repeat:Infinity }}>📦</motion.div>
          <p className="text-lg font-bold text-gray-400 mb-2">Tu inventario está vacío</p>
          <p className="text-sm text-gray-600 mb-6">Abre packs para conseguir cartas</p>
          <a href="/packs" className="px-6 py-3 rounded-xl font-bold text-sm text-white uppercase tracking-wider"
            style={{ background:"linear-gradient(135deg,#B44FFF,#FF4FA8)", boxShadow:"0 0 20px rgba(180,79,255,0.4)" }}>
            Ver Packs
          </a>
        </div>
      )}

      {/* Grid */}
      {!loading && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <AnimatePresence>
              {data.items.map((item, i) => (
                <motion.div key={item.id}
                  initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                  transition={{ delay:i * 0.03 }}>
                  <InventoryCard item={item} onSell={handleSell} onRedeem={setRedeemItem} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setPage(p => p-1)} disabled={!data.meta.hasPrev}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 disabled:opacity-30"
                style={{ background:"#0D0B1A", border:"1px solid #1E1A35" }}>← Anterior</button>
              <span className="text-xs text-gray-600">{page} / {data.meta.totalPages}</span>
              <button onClick={() => setPage(p => p+1)} disabled={!data.meta.hasNext}
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 disabled:opacity-30"
                style={{ background:"#0D0B1A", border:"1px solid #1E1A35" }}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {/* Physical redemption modal */}
      <AnimatePresence>
        {redeemItem && (
          <PhysicalRedeemModal
            item={redeemItem}
            onClose={() => setRedeemItem(null)}
            onSuccess={handleRedeemSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
