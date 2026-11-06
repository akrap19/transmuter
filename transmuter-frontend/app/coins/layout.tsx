import { WalletShell } from "@/components/solana/wallet-shell";
import type { ReactNode } from "react";

export default function CoinsLayout({ children }: { children: ReactNode }) {
  return <WalletShell>{children}</WalletShell>;
}
