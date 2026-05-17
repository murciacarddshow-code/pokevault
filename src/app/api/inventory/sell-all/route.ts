// POST /api/inventory/sell-all
//
// Sells ALL available inventory items for the authenticated user.
//
// ROOT BUG FIXED:
//   InstantSell.walletTransactionId is @unique (one-to-one with WalletTransaction).
//   The previous version created ONE WalletTransaction and N InstantSell records
//   all pointing at it — failing with a unique-constraint violation on the 2nd item,
//   silently rolling back the entire $transaction.
//
// FIX:
//   Create one WalletTransaction + one InstantSell per item, each atomic.
//   Wallet balance is updated in a single outer transaction after all items
//   are processed, so the balance is always consistent.

import { auth }   from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { computeSellPrice } from "@/lib/sell-engine/calculator";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = session.user.id;

  // ── 1. Load settings, wallet and inventory ──────────────────────────────────
  const [settings, wallet, items] = await Promise.all([
    prisma.appSettings.findUnique({
      where:  { id: "singleton" },
      select: { instantSellMargin: true },
    }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.inventoryItem.findMany({
      where:   { userId, quantity: { gt: 0 } },
      include: { card: { select: { id: true, name: true, currentPrice: true, instantSellPrice: true } } },
    }),
  ]);

  if (!wallet) {
    return NextResponse.json({ error: "Wallet no encontrado" }, { status: 404 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "No hay cartas en tu inventario" }, { status: 400 });
  }

  const margin = settings?.instantSellMargin ?? 0.65;

  // ── 2. Find blocked items (pending physical redemptions) ────────────────────
  const blocked = await prisma.physicalRedemption.findMany({
    where: {
      userId,
      inventoryItemId: { in: items.map(i => i.id) },
      status: { in: ["PENDING", "APPROVED", "PREPARING", "SHIPPED"] },
    },
    select: { inventoryItemId: true },
  });
  const blockedIds = new Set(blocked.map(r => r.inventoryItemId));

  // ── 3. Build sellable list ───────────────────────────────────────────────────
  const settingsObj = { instantSellMargin: margin };

  const sellable: {
    itemId:        string;
    cardId:        string;
    cardName:      string;
    quantity:      number;
    sellPrice:     number;
    marketPriceRef:number;
    marginApplied: number;
  }[] = [];

  for (const item of items) {
    if (blockedIds.has(item.id)) continue;
    let pr;
    try { pr = computeSellPrice(item.card as any, settingsObj, item.quantity); }
    catch { continue; } // no price — skip
    if (pr.sellPrice <= 0) continue;
    sellable.push({
      itemId:        item.id,
      cardId:        item.card.id,
      cardName:      item.card.name,
      quantity:      item.quantity,
      sellPrice:     pr.sellPrice,
      marketPriceRef:pr.marketPriceRef,
      marginApplied: pr.marginApplied,
    });
  }

  if (sellable.length === 0) {
    return NextResponse.json({
      error: blockedIds.size > 0
        ? "Todas las cartas están bloqueadas por solicitudes físicas"
        : "No hay cartas con precio de venta",
    }, { status: 400 });
  }

  const totalValue   = parseFloat(sellable.reduce((s, i) => s + i.sellPrice, 0).toFixed(2));
  const cardsSold    = sellable.reduce((s, i) => s + i.quantity, 0);
  const balanceBefore= parseFloat(Number(wallet.balance).toFixed(2));
  const balanceAfter = parseFloat((balanceBefore + totalValue).toFixed(2));

  // ── 4. Single atomic transaction ─────────────────────────────────────────────
  // Each sellable item gets its OWN WalletTransaction + InstantSell pair,
  // satisfying the @unique constraint on InstantSell.walletTransactionId.
  // The wallet balance is updated once at the end.
  await prisma.$transaction(async (tx) => {
    // a) Update wallet balance once
    await tx.wallet.update({
      where: { userId },
      data:  { balance: balanceAfter },
    });

    // b) For each item: create WalletTransaction + InstantSell + zero inventory
    let runningBalance = balanceBefore;
    for (const item of sellable) {
      runningBalance = parseFloat((runningBalance + item.sellPrice).toFixed(2));

      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId:      wallet.id,
          userId,
          type:          "INSTANT_SELL",
          status:        "COMPLETED",
          amount:        item.sellPrice,
          balanceBefore: parseFloat((runningBalance - item.sellPrice).toFixed(2)),
          balanceAfter:  runningBalance,
          description:   `Venta: ${item.cardName}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`,
          metadata:      JSON.stringify({ sellAll: true, cardId: item.cardId, quantity: item.quantity }),
        },
      });

      await tx.instantSell.create({
        data: {
          userId,
          cardId:              item.cardId,
          inventoryItemId:     item.itemId,
          walletTransactionId: walletTx.id,   // unique per record ✓
          sellPrice:           item.sellPrice,
          cardMarketPriceRef:  item.marketPriceRef,
          marginApplied:       item.marginApplied,
          status:              "COMPLETED",
        },
      });

      await tx.inventoryItem.delete({
        where: { id: item.itemId },
      });
    }
  }, { timeout: 30000 });

  // ── 5. Re-read balance from DB (ground truth) ─────────────────────────────
  const updated = await prisma.wallet.findUnique({
    where:  { userId },
    select: { balance: true },
  });

  return NextResponse.json({
    data: {
      totalAmount: totalValue,
      itemsSold:   sellable.length,
      cardsSold,
      skipped:     items.length - sellable.length,
      newBalance:  parseFloat(Number(updated!.balance).toFixed(2)),
    },
  });
}
