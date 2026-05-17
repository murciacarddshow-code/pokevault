// lib/sell-engine/calculator.ts
// Uses Float (not Decimal) — compatible with SQLite schema.

import { SellErrors } from "./errors";

export interface CardForSell {
  name:            string;
  currentPrice:    number | null;
  instantSellPrice:number | null;
}

export interface AppSettingsForSell {
  instantSellMargin: number;
}

export interface SellPriceResult {
  sellPrice:      number;
  marketPriceRef: number;
  marginApplied:  number;
  priceSource:    "precomputed" | "calculated";
}

export function computeSellPrice(
  card: CardForSell,
  settings: AppSettingsForSell,
  quantity: number = 1
): SellPriceResult {
  const margin = settings.instantSellMargin;

  // Priority 1: use precalculated instantSellPrice
  if (card.instantSellPrice && card.instantSellPrice > 0) {
    const perUnit     = card.instantSellPrice;
    const marketRef   = card.currentPrice ?? card.instantSellPrice / margin;
    return {
      sellPrice:      parseFloat((perUnit * quantity).toFixed(2)),
      marketPriceRef: parseFloat(marketRef.toFixed(2)),
      marginApplied:  margin,
      priceSource:    "precomputed",
    };
  }

  // Priority 2: calculate from currentPrice
  if (card.currentPrice && card.currentPrice > 0) {
    const perUnit = card.currentPrice * margin;
    return {
      sellPrice:      parseFloat((perUnit * quantity).toFixed(2)),
      marketPriceRef: parseFloat(card.currentPrice.toFixed(2)),
      marginApplied:  margin,
      priceSource:    "calculated",
    };
  }

  // No price available
  throw SellErrors.NO_PRICE(card.name);
}
