// =============================================================================
// app/api/packs/[id]/verify/route.ts
// GET — Verificación Provably Fair de una apertura
//
// Permite al usuario verificar que su apertura no fue manipulada.
// Solo devuelve serverSeed cuando el opening está marcado como revealed=true.
//
// Flujo:
//   1. Usuario abre sobre → recibe serverSeedHash (hash público)
//   2. Cuando quiere verificar → llama este endpoint con openingId
//   3. Servidor devuelve serverSeed (revelado)
//   4. Usuario computa SHA256(serverSeed) y comprueba que == serverSeedHash
//   5. Usuario reproduce los rolls con HMAC-SHA256 y verifica las cartas
// =============================================================================

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { verifySeed, reproduceOpeningRolls } from "@/lib/pack-engine/rng";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: packId } = await params;
  const openingId = req.nextUrl.searchParams.get("openingId");

  if (!openingId) {
    return NextResponse.json(
      { error: "openingId requerido como query param", code: "MISSING_PARAM" },
      { status: 400 }
    );
  }

  const opening = await prisma.packOpening.findUnique({
    where: { id: openingId },
    include: {
      cards: {
        orderBy: { position: "asc" },
        include: { card: { select: { id: true, name: true, rarity: true } } },
      },
      pack: {
        include: {
          cardPool: {
            include: { card: { select: { id: true, name: true, rarity: true } } },
            orderBy: { dropWeight: "asc" },
          },
        },
      },
    },
  });

  if (!opening) {
    return NextResponse.json({ error: "Apertura no encontrada", code: "NOT_FOUND" }, { status: 404 });
  }

  // Solo el propietario puede verificar su apertura
  if (opening.userId !== session.user.id) {
    return NextResponse.json({ error: "Acceso denegado", code: "FORBIDDEN" }, { status: 403 });
  }

  if (opening.packId !== packId) {
    return NextResponse.json({ error: "Apertura no pertenece a este pack", code: "MISMATCH" }, { status: 400 });
  }

  // Marcar como revealed si no lo estaba
  if (!opening.revealed) {
    await prisma.packOpening.update({
      where: { id: openingId },
      data:  { revealed: true },
    });
  }

  const clientSeed = opening.clientSeed ?? "";
  const rolls = reproduceOpeningRolls(opening.serverSeed, clientSeed, opening.pack.cardsPerOpening);

  // Verificar integridad
  const seedVerified = verifySeed(opening.serverSeed, opening.serverSeedHash);

  // Reconstruir qué carta correspondería a cada roll (para que el usuario pueda verificar)
  const totalWeight = opening.pack.cardPool.reduce((sum, pc) => sum + pc.dropWeight, 0);
  const reproducedCards = rolls.map((roll, i) => {
    const threshold = roll * totalWeight;
    let cumulative = 0;
    for (const entry of opening.pack.cardPool) {
      cumulative += entry.dropWeight;
      if (threshold < cumulative) {
        return {
          position:    i + 1,
          roll:        parseFloat(roll.toFixed(8)),
          resolvedCard: { id: entry.card.id, name: entry.card.name, rarity: entry.card.rarity },
        };
      }
    }
    const last = opening.pack.cardPool[opening.pack.cardPool.length - 1];
    return {
      position: i + 1,
      roll:     parseFloat(roll.toFixed(8)),
      resolvedCard: { id: last.card.id, name: last.card.name, rarity: last.card.rarity },
    };
  });

  return NextResponse.json({
    data: {
      openingId,
      seedVerified,
      provablyFair: {
        serverSeed:     opening.serverSeed,   // Revelado ahora que se verifica
        serverSeedHash: opening.serverSeedHash,
        clientSeed,
        algorithm: "HMAC-SHA256(key=serverSeed, data=clientSeed:nonce) >> UInt32BE / 2^32",
        instructions: [
          "1. Calcula SHA256(serverSeed) y comprueba que es igual a serverSeedHash",
          "2. Para cada nonce (0, 1, 2...): HMAC-SHA256(key=serverSeed, data=clientSeed:nonce)",
          "3. Lee los primeros 4 bytes como UInt32BE, divide por 0x100000000",
          "4. Multiplica por totalWeight del pool y recorre acumulando pesos",
        ],
      },
      actualCards: opening.cards.map((oc) => ({
        position: oc.position,
        card:     { id: oc.card.id, name: oc.card.name, rarity: oc.card.rarity },
      })),
      reproducedCards,
      cardsMatch: reproducedCards.every((rc, i) =>
        rc.resolvedCard.id === (opening.cards[i]?.card.id ?? "")
      ),
    },
  });
}
