"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/stores/useWalletStore";
import { formatEUR } from "@/lib/utils/format";

export function WalletDisplay() {
  const { balance, fetchBalance } = useWalletStore();

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return (
    <div
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold"
      style={{
        background: "rgba(79,255,180,0.08)",
        border:     "1px solid rgba(79,255,180,0.2)",
        color:      "#4FFFB4",
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: "#4FFFB4", boxShadow: "0 0 6px #4FFFB4" }}
      />
      <span className="font-mono tabular-nums">
        {balance === null ? "···" : formatEUR(balance)}
      </span>
    </div>
  );
}
