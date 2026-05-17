// =============================================================================
// app/api/packs/[id]/odds/route.ts
// GET — Probabilidades de un pack (endpoint público, no requiere auth)
//
// Responde con las probabilidades exactas de cada carta para transparencia
// hacia el usuario. No expone serverSeed ni datos internos.
// =============================================================================

import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: packId } = await params;

  const pack = await prisma.pack.findUnique({
    where: { id: packId, status: "ACTIVE" },
    include: {
      cardPool: {
        include: {
          card: {
            select: {
              id:           true,
              name:         true,
              rarity:       true,
              imageUrl:     true,
              currentPrice: true,
              setName:      true,
              cardNumber:   true,
            },
          },
        },
        orderBy: { dropWeight: "desc" },
      },
    },
  });

  if (!pack) {
    return NextResponse.json(
      { error: "Pack no encontrado", code: "PACK_NOT_FOUND" },
      { status: 404 }
    );
  }

  const totalWeight = pack.cardPool.reduce((sum, pc) => sum + pc.dropWeight, 0);

  const odds = pack.cardPool.map((pc) => ({
    card:             pc.card,
    dropWeight:       pc.dropWeight,
    probability:      parseFloat(((pc.dropWeight / totalWeight) * 100).toFixed(4)),
    guaranteedSlot:   pc.guaranteedSlot ?? null,
  }));

  // Agrupar por rareza para la UI
  const byRarity = odds.reduce<Record<string, typeof odds>>((acc, item) => {
    const key = item.card.rarity;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return NextResponse.json({
    data: {
      packId:          pack.id,
      packName:        pack.name,
      cardsPerOpening: pack.cardsPerOpening,
      totalPoolSize:   pack.cardPool.length,
      odds,
      byRarity,
    },
  });
}
