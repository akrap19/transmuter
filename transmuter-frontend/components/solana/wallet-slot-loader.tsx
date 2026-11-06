"use client";

import dynamic from "next/dynamic";

const WalletSlot = dynamic(() => import("@/components/solana/wallet-slot").then((mod) => mod.WalletSlot), {
  ssr: false,
});

export function WalletSlotLoader() {
  return <WalletSlot />;
}
