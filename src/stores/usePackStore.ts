import { create } from "zustand";

export interface OpenedCard {
  position:               number;
  inventoryItemId:        string | null;   // ← NEW: needed for sell API call
  marketPriceAtDrop:      number | null;
  instantSellPriceAtDrop: number | null;
  card: {
    id:               string;
    name:             string;
    rarity:           string;
    imageUrl:         string;
    imageHdUrl:       string | null;
    setName:          string;
    cardNumber:       string;
    currentPrice:     number | null;
    instantSellPrice: number | null;
  };
}

export interface OpeningResult {
  openingId:    string;
  packId:       string;
  packName:     string;
  pricePaid:    number;
  cards:        OpenedCard[];
  provablyFair: { serverSeedHash: string; clientSeed: string; algorithm: string };
  balanceAfter: number;
  createdAt:    string;
}

type OpeningPhase = "idle" | "loading" | "revealing" | "done";

interface PackStore {
  phase:         OpeningPhase;
  result:        OpeningResult | null;
  revealedCount: number;
  error:         string | null;
  soldCards:     Set<string>;  // inventoryItemIds already sold this session

  startOpening: () => void;
  setResult:    (result: OpeningResult) => void;
  setError:     (error: string) => void;
  revealNext:   () => void;
  revealAll:    () => void;
  markSold:     (inventoryItemId: string) => void;
  reset:        () => void;
}

export const usePackStore = create<PackStore>((set, get) => ({
  phase:         "idle",
  result:        null,
  revealedCount: 0,
  error:         null,
  soldCards:     new Set(),

  startOpening: () =>
    set({ phase: "loading", result: null, error: null, revealedCount: 0, soldCards: new Set() }),

  setResult: (result) =>
    set({ phase: "revealing", result, revealedCount: 0 }),

  setError: (error) =>
    set({ phase: "idle", error }),

  revealNext: () => {
    const { result, revealedCount } = get();
    if (!result) return;
    const next = revealedCount + 1;
    set(next >= result.cards.length
      ? { revealedCount: next, phase: "done" }
      : { revealedCount: next });
  },

  revealAll: () => {
    const { result } = get();
    if (!result) return;
    set({ revealedCount: result.cards.length, phase: "done" });
  },

  markSold: (inventoryItemId) =>
    set((s) => ({ soldCards: new Set([...s.soldCards, inventoryItemId]) })),

  reset: () =>
    set({ phase: "idle", result: null, revealedCount: 0, error: null, soldCards: new Set() }),
}));
