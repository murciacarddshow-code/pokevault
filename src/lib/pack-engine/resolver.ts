// =============================================================================
// lib/pack-engine/resolver.ts — Atomic pack opening, Float/SQLite compatible
// =============================================================================

import { prisma } from "@/lib/db/prisma";
import { generateSeed, hashSeed } from "./rng";
import { resolveCards } from "./probability";
import { PackErrors } from "./errors";
import { auditLog, AUDIT } from "@/lib/audit/log";

export interface OpenPackInput {
  userId:      string;
  packId:      string;
  clientSeed?: string;
}

export interface OpenedCard {
  position:               number;
  card: {
    id:              string;
    name:            string;
    rarity:          string;
    imageUrl:        string;
    imageHdUrl:      string | null;
    setName:         string;
    cardNumber:      string;
    currentPrice:    number | null;
    instantSellPrice:number | null;
  };
  marketPriceAtDrop:      number | null;
  instantSellPriceAtDrop: number | null;
}

export interface OpenPackResult {
  openingId:    string;
  packId:       string;
  packName:     string;
  pricePaid:    number;
  cards:        OpenedCard[];
  provablyFair: {
    serverSeedHash: string;
    clientSeed:     string;
    algorithm:      string;
  };
  balanceAfter: number;
  createdAt:    Date;
}

// ── Validations (reads only, before transaction) ──────────────────────────────

async function validate(userId: string, packId: string, clientSeed: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where:  { id: userId },
    select: { isBanned: true },
  });
  if (user.isBanned) throw PackErrors.USER_BANNED();

  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    include: {
      cardPool: {
        include: { card: true },
        orderBy: { dropWeight: "asc" },
      },
    },
  });

  if (!pack)                     throw PackErrors.NOT_FOUND();
  if (pack.status !== "ACTIVE")  throw PackErrors.NOT_ACTIVE();
  if (!pack.cardPool.length)     throw PackErrors.EMPTY_POOL();

  if (!clientSeed || clientSeed.length === 0 || clientSeed.length > 256) {
    throw PackErrors.INVALID_CLIENT_SEED();
  }

  // Daily limit check
  if (pack.dailyLimit && pack.dailyLimit > 0) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await prisma.packOpening.count({
      where: { userId, packId, createdAt: { gte: startOfDay } },
    });
    if (count >= pack.dailyLimit) throw PackErrors.DAILY_LIMIT_REACHED(pack.dailyLimit);
  }

  // Global daily limit
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { globalDailyPackLimit: true },
  });
  if (settings?.globalDailyPackLimit && settings.globalDailyPackLimit > 0) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await prisma.packOpening.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });
    if (count >= settings.globalDailyPackLimit) {
      throw PackErrors.DAILY_LIMIT_REACHED(settings.globalDailyPackLimit);
    }
  }

  return pack;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function openPack(input: OpenPackInput): Promise<OpenPackResult> {
  const { userId, packId } = input;
  const clientSeed = input.clientSeed?.trim() || generateSeed();

  const pack = await validate(userId, packId, clientSeed);

  const serverSeed     = generateSeed();
  const serverSeedHash = hashSeed(serverSeed);

  const resolvedEntries = resolveCards(
    pack.cardPool as any,
    pack.cardsPerOpening,
    serverSeed,
    clientSeed
  );

  // ── Atomic transaction ──────────────────────────────────────────────────────
  const { opening, balanceAfter, inventoryItemIds } = await prisma.$transaction(async (tx) => {
    // STEP 1 — Check wallet balance
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw PackErrors.WALLET_NOT_FOUND();
    if (wallet.balance < pack.price) {
      throw PackErrors.INSUFFICIENT_BALANCE(
        pack.price.toFixed(2),
        wallet.balance.toFixed(2)
      );
    }

    // STEP 2 — Deduct balance
    const newBalance = parseFloat((wallet.balance - pack.price).toFixed(2));
    await tx.wallet.update({
      where: { userId },
      data:  { balance: newBalance },
    });

    // STEP 3 — WalletTransaction
    const walletTx = await tx.walletTransaction.create({
      data: {
        walletId:      wallet.id,
        userId,
        type:          "PACK_PURCHASE",
        status:        "COMPLETED",
        amount:        -pack.price,
        balanceBefore: wallet.balance,
        balanceAfter:  newBalance,
        description:   `Apertura: ${pack.name}`,
        metadata:      JSON.stringify({ packId, packName: pack.name }),
      },
    });

    // STEP 4 — PackOpening + PackOpeningCards
    const opening = await tx.packOpening.create({
      data: {
        userId,
        packId,
        walletTransactionId: walletTx.id,
        pricePaid:           pack.price,
        serverSeed,
        serverSeedHash,
        clientSeed,
        cards: {
          create: resolvedEntries.map((entry, i) => ({
            cardId:                 entry.card.id,
            position:               i + 1,
            marketPriceAtDrop:      entry.card.currentPrice      ?? null,
            instantSellPriceAtDrop: entry.card.instantSellPrice  ?? null,
          })),
        },
      },
      include: {
        cards: {
          orderBy: { position: "asc" },
          include: { card: true },
        },
      },
    });

    // STEP 5 — Upsert inventory, collect inventoryItemIds
    const inventoryItemIds: Record<string, string> = {}; // cardId → inventoryItemId
    for (const entry of resolvedEntries) {
      const existing = await tx.inventoryItem.findUnique({
        where: { userId_cardId: { userId, cardId: entry.card.id } },
      });
      if (existing) {
        const updated = await tx.inventoryItem.update({
          where: { userId_cardId: { userId, cardId: entry.card.id } },
          data:  { quantity: { increment: 1 } },
        });
        inventoryItemIds[entry.card.id] = updated.id;
      } else {
        const created = await tx.inventoryItem.create({
          data: { userId, cardId: entry.card.id, quantity: 1 },
        });
        inventoryItemIds[entry.card.id] = created.id;
      }
    }

    return { opening, balanceAfter: newBalance, inventoryItemIds };
  }, { timeout: 15000 });
  // ── End transaction ─────────────────────────────────────────────────────────

  await auditLog({
    userId,
    action:     AUDIT.PACK_OPENED,
    success:    true,
    targetId:   opening.id,
    targetType: "PackOpening",
    metadata:   {
      packId,
      packName:    pack.name,
      pricePaid:   pack.price,
      balanceAfter,
      serverSeedHash,
      clientSeed,
    },
  });

  return {
    openingId: opening.id,
    packId,
    packName:  pack.name,
    pricePaid: pack.price,
    cards: opening.cards.map((oc: any) => ({
      position:               oc.position,
      card:                   oc.card,
      marketPriceAtDrop:      oc.marketPriceAtDrop      ?? null,
      instantSellPriceAtDrop: oc.instantSellPriceAtDrop ?? null,
      inventoryItemId:        inventoryItemIds[oc.card.id] ?? null,
    })),
    provablyFair: {
      serverSeedHash,
      clientSeed,
      algorithm: "HMAC-SHA256(key=serverSeed, data=clientSeed:nonce) >> UInt32BE / 2^32",
    },
    balanceAfter,
    createdAt: opening.createdAt,
  };
}
