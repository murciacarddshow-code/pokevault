"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletStore } from "@/stores/useWalletStore";

export interface WalletTransaction {
  id:           string;
  type:         string;
  status:       string;
  amount:       string;
  balanceAfter: string;
  description:  string | null;
  metadata:     Record<string, unknown>;
  createdAt:    string;
}

interface TransactionPage {
  data: WalletTransaction[];
  meta: { page: number; pages: number; total: number; hasNext: boolean };
}

export function useWallet() {
  const { balance, isLoading: balanceLoading, fetchBalance } = useWalletStore();

  const [txPage,     setTxPage]    = useState<TransactionPage | null>(null);
  const [txLoading,  setTxLoading] = useState(false);
  const [txPageNum,  setTxPageNum] = useState(1);
  const [depositing, setDepositing] = useState(false);
  const [depositErr, setDepositErr] = useState<string | null>(null);

  // Prevent multiple simultaneous deposit calls
  const depositInFlight = useRef(false);

  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const res  = await fetch(`/api/wallet/transactions?page=${page}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setTxPage(json);
      setTxPageNum(page);
    } catch { /* silent */ }
    finally { setTxLoading(false); }
  }, []);

  // Initial load
  useEffect(() => {
    fetchBalance();
    fetchTransactions(1);
  }, []); // eslint-disable-line

  const deposit = useCallback(async (amount: number): Promise<boolean> => {
    if (depositInFlight.current) return false;
    depositInFlight.current = true;
    setDepositing(true);
    setDepositErr(null);

    try {
      const res  = await fetch("/api/wallet/deposit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount }),
      });
      const json = await res.json();

      if (!res.ok) {
        setDepositErr(json.error ?? "Error al iniciar el pago");
        return false;
      }

      if (json.demo) {
        // Always re-read from server — never trust the calculated value alone
        await fetchBalance();
        await fetchTransactions(1);
        return true;
      }

      // Stripe mode — redirect to checkout
      if (json.url) {
        window.location.href = json.url;
      }
      return true;
    } catch {
      setDepositErr("Error de conexión");
      return false;
    } finally {
      setDepositing(false);
      depositInFlight.current = false;
    }
  }, [fetchBalance, fetchTransactions]);

  return {
    balance,
    balanceLoading,
    transactions:        txPage?.data ?? [],
    txMeta:              txPage?.meta,
    txLoading,
    depositing,
    depositErr,
    deposit,
    refetchBalance:      fetchBalance,
    refetchTransactions: fetchTransactions,
    txPage:              txPageNum,
  };
}
