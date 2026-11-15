import "@/app/wallet.css";
import { SolanaProvider } from "@/components/solana/solana-provider";
import { WalletSlotLoader } from "@/components/solana/wallet-slot-loader";
import type { ReactNode } from "react";

/** Wallet adapter, its CSS, and the header connect control on every page. */
export function WalletShell({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider>
      <WalletSlotLoader />
      {children}
    </SolanaProvider>
  );
}
