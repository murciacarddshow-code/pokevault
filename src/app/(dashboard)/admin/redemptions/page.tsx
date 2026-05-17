import { auth }   from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { getRarityConfig } from "@/lib/utils/rarity";
import { formatEUR } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

async function getRedemptions() {
  return prisma.physicalRedemption.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      card:            { select: { name: true, rarity: true, imageUrl: true, currentPrice: true } },
      shippingAddress: true,
      user:            { select: { email: true, username: true } },
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "#F59E0B",
  APPROVED:   "#60A5FA",
  PREPARING:  "#A78BFA",
  SHIPPED:    "#34D399",
  DELIVERED:  "#4FFFB4",
  CANCELLED:  "#EF4444",
};

export default async function AdminRedemptionsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const redemptions = await getRedemptions();

  return (
    <div className="pb-16">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-600 mb-1">Admin</p>
        <h1 className="text-3xl font-black font-display" style={{
          background: "linear-gradient(135deg,#F0EEFF,#B44FFF)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Solicitudes Físicas
        </h1>
        <p className="text-sm text-gray-500 mt-1">{redemptions.length} solicitudes totales</p>
      </div>

      {redemptions.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">No hay solicitudes todavía.</p>
        </div>
      )}

      {redemptions.length > 0 && (
        <div className="space-y-3">
          {redemptions.map((r) => {
            const cfg   = getRarityConfig(r.card.rarity);
            const color = STATUS_COLORS[r.status] ?? "#9CA3AF";
            return (
              <div key={r.id} className="rounded-2xl p-4"
                style={{ background:"#0D0B1A", border:"1px solid #1E1A35" }}>
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  {/* Card info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ border:`1px solid ${cfg.color}40`, background:`${cfg.color}10` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.card.imageUrl} alt={r.card.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{r.card.name}</p>
                      <p className="text-[10px] font-bold uppercase" style={{ color: cfg.color }}>{cfg.label}</p>
                      {r.card.currentPrice && (
                        <p className="text-xs text-gray-500 font-mono">{formatEUR(r.card.currentPrice)}</p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                      style={{ background:`${color}20`, color, border:`1px solid ${color}40` }}>
                      {r.status}
                    </span>
                  </div>
                </div>

                {/* Shipping address */}
                <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3"
                  style={{ borderColor:"#1E1A35" }}>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Usuario</p>
                    <p className="text-xs text-gray-300">{r.user.username ?? r.user.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Dirección</p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {r.shippingAddress.fullName}<br />
                      {r.shippingAddress.address}<br />
                      {r.shippingAddress.postalCode} {r.shippingAddress.city}, {r.shippingAddress.country}
                      {r.shippingAddress.phone && <><br />{r.shippingAddress.phone}</>}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <p className="text-[9px] text-gray-600 font-mono">
                    {new Date(r.createdAt).toLocaleString("es-ES")}
                  </p>
                  <p className="text-[9px] text-gray-700 font-mono truncate">ID: {r.id}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
