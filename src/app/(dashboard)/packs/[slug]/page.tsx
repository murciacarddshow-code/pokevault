import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { RarityBadge } from "@/components/cards/RarityBadge";
import { PackImage } from "@/components/packs/PackImage";
import { CardImage } from "@/components/cards/CardImage";
import { OpenPackButton } from "@/components/packs/OpenPackButton";
import { RARITY_CONFIG, getRarityConfig, CARD_RARITIES } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

async function getPackBySlug(slug: string) {
  return prisma.pack.findUnique({
    where: { slug, status: "ACTIVE" },
    include: {
      cardPool: {
        include: {
          card: {
            select: {
              id:           true,
              name:         true,
              rarity:       true,
              imageUrl:     true,
              setName:      true,
              cardNumber:   true,
              currentPrice: true,
              instantSellPrice: true,
            },
          },
        },
        orderBy: { dropWeight: "desc" },
      },
      _count: { select: { openings: true } },
    },
  });
}

function getTierGlow(price: number) {
  if (price >= 50) return { color: "#FF4FA8", label: "LEGENDARY" };
  if (price >= 20) return { color: "#B44FFF", label: "EPIC" };
  if (price >= 10) return { color: "#4FC3FF", label: "RARE" };
  return              { color: "#4FFFB4",  label: "STANDARD" };
}

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();
  const { slug } = await params;
  const pack = await getPackBySlug(slug);
  if (!pack) notFound();

  const totalWeight = pack.cardPool.reduce((s, pc) => s + pc.dropWeight, 0);
  const tier = getTierGlow(Number(pack.price));

  // Group cards by rarity for the odds table
  const byRarity = pack.cardPool.reduce<Record<string, typeof pack.cardPool>>((acc, pc) => {
    const key = pc.card.rarity;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pc);
    return acc;
  }, {});

  // Rarity display order (rarest last in the visual, so they stand out)
  const rarityOrder: string[] = [
    "COMMON", "UNCOMMON", "RARE", "DOUBLE_RARE", "ULTRA_RARE",
    "ILLUSTRATION_RARE", "SPECIAL_ILLUSTRATION_RARE", "HYPER_RARE", "SECRET_RARE", "GOD_HIT",
  ];

  return (
    <div className="pb-20">
      {/* Back link */}
      <a
        href="/packs"
        className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-8 uppercase tracking-wider font-semibold"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Todos los packs
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

        {/* ── LEFT: Pack visual + open button ──────────────────────── */}
        <div className="space-y-5">
          {/* Pack hero image */}
          <div
            className="relative w-full rounded-3xl overflow-hidden"
            style={{
              aspectRatio: "3/4",
              background:  `radial-gradient(ellipse at 50% 40%, ${tier.color}20 0%, #0D0B1A 70%)`,
              border:      `1px solid ${tier.color}30`,
              boxShadow:   `0 0 60px ${tier.color}20, 0 0 120px ${tier.color}10`,
            }}
          >
            {/* Tier badge */}
            <div
              className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
              style={{
                background: `${tier.color}20`,
                border:     `1px solid ${tier.color}50`,
                color:      tier.color,
                boxShadow:  `0 0 12px ${tier.color}40`,
              }}
            >
              {tier.label}
            </div>

            <PackImage
              src={pack.imageUrl}
              alt={pack.name}
              accentColor={tier.color}
              fill
              className="object-contain p-3"
              priority
            />
          </div>

          {/* Pack meta */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
          >
            <div>
              <h1
                className="text-3xl font-black font-display leading-tight mb-1"
                style={{
                  background: `linear-gradient(135deg, #F0EEFF, ${tier.color})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {pack.name}
              </h1>
              {pack.description && (
                <p className="text-sm text-gray-500 leading-relaxed">{pack.description}</p>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Precio",      value: formatEUR(pack.price.toFixed(2)) },
                { label: "Cartas",      value: String(pack.cardsPerOpening) },
                { label: "Pool total",  value: String(pack.cardPool.length) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "#15122A", border: "1px solid #1E1A35" }}
                >
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p
                    className="text-lg font-black font-mono"
                    style={{ color: tier.color, textShadow: `0 0 10px ${tier.color}60` }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Open button */}
          <OpenPackButton
            packId={pack.id}
            packName={pack.name}
            packImageUrl={pack.imageUrl}
            price={pack.price.toFixed(2)}
          />

          {/* Openings counter */}
          {pack._count.openings > 0 && (
            <p className="text-center text-xs text-gray-600">
              {pack._count.openings.toLocaleString("es-ES")} aperturas realizadas
            </p>
          )}
        </div>

        {/* ── RIGHT: Odds table ────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: `linear-gradient(180deg, ${tier.color}, #4FC3FF)`, boxShadow: `0 0 8px ${tier.color}` }}
            />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
              Posibles cartas
            </h2>
          </div>

          <div className="space-y-4">
            {rarityOrder
              .filter((r) => byRarity[r]?.length > 0)
              .reverse() // Raras primero visualmente
              .map((rarity) => {
                const cards = byRarity[rarity];
                const cfg   = getRarityConfig(rarity);
                const rarityProb = cards.reduce((s, pc) => s + pc.dropWeight, 0) / totalWeight * 100;

                return (
                  <div key={rarity}>
                    {/* Rarity group header */}
                    <div className="flex items-center justify-between mb-2">
                      <RarityBadge rarity={rarity} size="sm" />
                      <span
                        className="text-xs font-mono font-bold"
                        style={{ color: cfg.color }}
                      >
                        {rarityProb < 0.1 ? "<0.1" : rarityProb.toFixed(1)}%
                      </span>
                    </div>

                    {/* Cards in this rarity */}
                    <div className="space-y-1.5">
                      {cards.map((pc) => {
                        const probRaw = pc.dropWeight / totalWeight * 100;
                        const prob = probRaw < 0.01 ? "<0.01" : probRaw.toFixed(2);
                        return (
                          <div
                            key={pc.id}
                            className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#15122A]"
                            style={{ background: "#0D0B1A", border: "1px solid #1E1A35" }}
                          >
                            {/* Card thumbnail */}
                            <div
                              className="relative flex-shrink-0 w-9 h-12 rounded-lg overflow-hidden"
                              style={{
                                background: `${cfg.color}10`,
                                border:     `1px solid ${cfg.color}30`,
                                boxShadow:  `0 0 8px ${cfg.glow}`,
                              }}
                            >
                              <CardImage
                                src={pc.card.imageUrl}
                                alt={pc.card.name}
                                rarity={pc.card.rarity}
                                fill
                                className="object-contain p-0.5"
                                sizes="36px"
                              />
                            </div>

                            {/* Name + set */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{pc.card.name}</p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {pc.card.setName} · {pc.card.cardNumber}
                              </p>
                            </div>

                            {/* Price */}
                            {pc.card.instantSellPrice && (
                              <p
                                className="text-xs font-mono font-bold flex-shrink-0"
                                style={{ color: "#4FFFB4" }}
                              >
                                {formatEUR(pc.card.instantSellPrice.toFixed(2))}
                              </p>
                            )}

                            {/* Probability */}
                            <div className="flex-shrink-0 text-right">
                              <p
                                className="text-xs font-mono font-black"
                                style={{ color: cfg.color }}
                              >
                                {prob}%
                              </p>
                              {/* Mini bar */}
                              <div
                                className="h-0.5 rounded-full mt-1"
                                style={{
                                  width:      "48px",
                                  background: "#1E1A35",
                                  overflow:   "hidden",
                                }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width:      `${Math.max(1, Math.min(100, Number(probRaw) * 5))}%`,
                                    background: cfg.color,
                                    boxShadow:  `0 0 4px ${cfg.color}`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
