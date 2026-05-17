// =============================================================================
// app/api/drops/route.ts
// GET — Recent notable drops for the live ticker.
// Returns the last N PackOpeningCard rows where marketPriceAtDrop >= threshold.
// Public endpoint (no auth required) — usernames are already public.
// =============================================================================

import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

const THRESHOLD_EUR = 5; // Only show cards worth €5+ in the ticker
const LIMIT         = 40;

// Cache for 30s — avoids hammering DB on every poll
let cache: { data: unknown; expires: number } | null = null;

export async function GET(req: NextRequest) {
  const now = Date.now();
  if (cache && now < cache.expires) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=30" },
    });
  }

  try {
    const rows = await prisma.packOpeningCard.findMany({
      where: {
        marketPriceAtDrop: { gte: THRESHOLD_EUR },
      },
      orderBy: { opening: { createdAt: "desc" } },
      take: LIMIT,
      select: {
        id:                    true,
        marketPriceAtDrop:     true,
        instantSellPriceAtDrop:true,
        opening: {
          select: {
            createdAt: true,
            pack:      { select: { name: true } },
            user:      { select: { username: true } },
          },
        },
        card: {
          select: {
            name:     true,
            rarity:   true,
            imageUrl: true,
          },
        },
      },
    });

    const drops = rows.map((row) => ({
      id:        row.id,
      username:  row.opening.user.username ?? "trainer",
      cardName:  row.card.name,
      rarity:    row.card.rarity,
      imageUrl:  row.card.imageUrl,
      packName:  row.opening.pack.name,
      value:     Number(row.marketPriceAtDrop ?? 0),
      sellValue: Number(row.instantSellPriceAtDrop ?? 0),
      createdAt: row.opening.createdAt.toISOString(),
    }));

    const result = { drops };
    cache = { data: result, expires: now + 30_000 };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=30" },
    });
  } catch (err) {
    console.error("[DROPS]", err);
    return NextResponse.json({ drops: [] });
  }
}
