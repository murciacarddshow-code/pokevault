// lib/sell-engine/executor.ts — Float/SQLite compatible

import { prisma } from "@/lib/db/prisma";
import { computeSellPrice } from "./calculator";
import { SellErrors } from "./errors";
import { auditLog, AUDIT } from "@/lib/audit/log";

export interface ExecuteSellInput {
  userId:          string;
  inventoryItemId: string;
  quantityToSell?: number;
}

export interface ExecuteSellResult {
  sellId:             string;
  cardId:             string;
  cardName:           string;
  cardRarity:         string;
  quantitySold:       number;
  sellPrice:          number;
  pricePerUnit:       number;
  marketPriceRef:     number;
  marginApplied:      number;
  balanceAfter:       number;
  inventoryRemaining: number;
  createdAt:          Date;
}

export async function executeSell(input: ExecuteSellInput): Promise<ExecuteSellResult> {
  const { userId, inventoryItemId } = input;
  const quantityToSell = Math.max(1, Math.floor(input.quantityToSell ?? 1));

  // Pre-transaction validations
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isBanned: true } });
  if (user.isBanned) throw SellErrors.USER_BANNED();

  const item = await prisma.inventoryItem.findUnique({
    where:   { id: inventoryItemId },
    include: { card: true },
  });
  if (!item)                  throw SellErrors.ITEM_NOT_FOUND();
  if (item.userId !== userId) throw SellErrors.NOT_OWNER();
  if (item.quantity <= 0)     throw SellErrors.ZERO_QUANTITY();
  if (quantityToSell > item.quantity) throw SellErrors.QUANTITY_EXCEEDS_STOCK(item.quantity);

  const settings = await prisma.appSettings.findUniqueOrThrow({
    where:  { id: "singleton" },
    select: { instantSellMargin: true },
  });

  const priceResult = computeSellPrice(item.card as any, settings, quantityToSell);
  const pricePerUnit = parseFloat((priceResult.sellPrice / quantityToSell).toFixed(2));

  // Atomic transaction
  const { instantSell, balanceAfter, inventoryRemaining } = await prisma.$transaction(
    async (tx) => {
      // Re-verify inside tx
      const freshItem = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (!freshItem || freshItem.userId !== userId) throw SellErrors.ITEM_NOT_FOUND();
      if (freshItem.quantity <= 0)     throw SellErrors.ZERO_QUANTITY();
      if (quantityToSell > freshItem.quantity) throw SellErrors.QUANTITY_EXCEEDS_STOCK(freshItem.quantity);

      // Decrement or delete inventory
      let inventoryRemaining = 0;
      if (freshItem.quantity - quantityToSell > 0) {
        const updated = await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data:  { quantity: { decrement: quantityToSell } },
        });
        inventoryRemaining = updated.quantity;
      } else {
        await tx.inventoryItem.delete({ where: { id: inventoryItemId } });
      }

      // Credit wallet
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw SellErrors.WALLET_NOT_FOUND();

      const newBalance = parseFloat((wallet.balance + priceResult.sellPrice).toFixed(2));
      await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });

      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId:      wallet.id,
          userId,
          type:          "INSTANT_SELL",
          status:        "COMPLETED",
          amount:        priceResult.sellPrice,
          balanceBefore: wallet.balance,
          balanceAfter:  newBalance,
          description:   `Venta: ${item.card.name}${quantityToSell > 1 ? ` ×${quantityToSell}` : ""}`,
          metadata:      JSON.stringify({
            cardId:        item.card.id,
            cardName:      item.card.name,
            rarity:        item.card.rarity,
            quantitySold:  quantityToSell,
            pricePerUnit,
            marketPriceRef:priceResult.marketPriceRef,
            marginApplied: priceResult.marginApplied,
          }),
        },
      });

      const instantSell = await tx.instantSell.create({
        data: {
          userId,
          cardId:              item.card.id,
          inventoryItemId,     // snapshot ref
          walletTransactionId: walletTx.id,
          sellPrice:           priceResult.sellPrice,
          cardMarketPriceRef:  priceResult.marketPriceRef,
          marginApplied:       priceResult.marginApplied,
          status:              "COMPLETED",
        },
      });

      return { instantSell, balanceAfter: newBalance, inventoryRemaining };
    },
    { timeout: 10000 }
  );

  await auditLog({
    userId,
    action:     AUDIT.CARD_SOLD,
    success:    true,
    targetId:   instantSell.id,
    targetType: "InstantSell",
    metadata: {
      cardId:        item.card.id,
      cardName:      item.card.name,
      quantitySold:  quantityToSell,
      sellPrice:     priceResult.sellPrice,
      balanceAfter,
    },
  });

  return {
    sellId:             instantSell.id,
    cardId:             item.card.id,
    cardName:           item.card.name,
    cardRarity:         item.card.rarity,
    quantitySold:       quantityToSell,
    sellPrice:          priceResult.sellPrice,
    pricePerUnit,
    marketPriceRef:     priceResult.marketPriceRef,
    marginApplied:      priceResult.marginApplied,
    balanceAfter,
    inventoryRemaining,
    createdAt:          instantSell.createdAt,
  };
}
