import { create } from "zustand";

interface WalletState {
  balance:      number | null;
  currency:     string;
  isLoading:    boolean;
  lastFetchedAt: number;        // unix ms — detect stale reads
  setBalance:   (balance: number) => void;
  fetchBalance: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance:       null,
  currency:      "EUR",
  isLoading:     false,
  lastFetchedAt: 0,

  // Only use setBalance for optimistic updates that are IMMEDIATELY followed by fetchBalance.
  // Prefer fetchBalance() directly whenever possible.
  setBalance: (balance) => set({ balance, lastFetchedAt: Date.now() }),

  fetchBalance: async () => {
    // Prevent concurrent fetches
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const res  = await fetch("/api/wallet/balance", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const b    = typeof data.balance === "number" ? data.balance : parseFloat(data.balance);
      set({ balance: b, lastFetchedAt: Date.now() });
    } catch {
      // Silently ignore — keep previous value
    } finally {
      set({ isLoading: false });
    }
  },
}));
