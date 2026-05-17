// lib/pack-engine/probability.ts — Float-based, SQLite compatible

import { seededRandom } from "./rng";

export interface CardForPool {
  id:              string;
  name:            string;
  rarity:          string;
  imageUrl:        string;
  imageHdUrl?:     string | null;
  setName:         string;
  cardNumber:      string;
  currentPrice:    number | null;
  instantSellPrice:number | null;
}

export interface PoolEntry {
  id:             string;
  packId:         string;
  cardId:         string;
  dropWeight:     number;
  guaranteedSlot: number | null;
  card:           CardForPool;
}

export function selectCardFromPool(pool: PoolEntry[], roll: number): PoolEntry {
  const totalWeight = pool.reduce((sum, e) => sum + e.dropWeight, 0);
  const threshold   = roll * totalWeight;
  let cumulative    = 0;
  for (const entry of pool) {
    cumulative += entry.dropWeight;
    if (threshold < cumulative) return entry;
  }
  return pool[pool.length - 1];
}

export function resolveCards(
  pool: PoolEntry[],
  cardsPerOpening: number,
  serverSeed: string,
  clientSeed: string
): PoolEntry[] {
  const results: (PoolEntry | null)[] = Array(cardsPerOpening).fill(null);

  // Guaranteed slots (1-based)
  for (const entry of pool.filter(e => e.guaranteedSlot != null)) {
    const idx = entry.guaranteedSlot! - 1;
    if (idx >= 0 && idx < cardsPerOpening && results[idx] === null) {
      results[idx] = entry;
    }
  }

  // General pool for remaining slots
  const generalPool = pool.filter(e => e.guaranteedSlot == null);
  const activePool  = generalPool.length > 0 ? generalPool : pool;

  for (let i = 0; i < cardsPerOpening; i++) {
    if (results[i] !== null) continue;
    const roll = seededRandom(serverSeed, clientSeed, i);
    results[i] = selectCardFromPool(activePool, roll);
  }

  return results as PoolEntry[];
}

export function calculateEV(
  pool: PoolEntry[],
  cardsPerOpening: number,
  packPrice: number
): { evPerOpening: number; evRatio: number; houseEdgePercent: number } {
  const totalWeight = pool.reduce((sum, e) => sum + e.dropWeight, 0);
  const evPerCard   = pool.reduce((sum, e) => {
    return sum + (e.dropWeight / totalWeight) * (e.card.currentPrice ?? 0);
  }, 0);
  const evPerOpening    = evPerCard * cardsPerOpening;
  const evRatio         = packPrice > 0 ? evPerOpening / packPrice : 0;
  const houseEdgePercent= Math.max(0, (1 - evRatio) * 100);
  return {
    evPerOpening:     parseFloat(evPerOpening.toFixed(4)),
    evRatio:          parseFloat(evRatio.toFixed(4)),
    houseEdgePercent: parseFloat(houseEdgePercent.toFixed(2)),
  };
}
