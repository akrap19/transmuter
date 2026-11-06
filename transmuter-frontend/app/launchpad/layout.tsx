import { WalletShell } from "@/components/solana/wallet-shell";
import type { ReactNode } from "react";

export default function LaunchpadLayout({ children }: { children: ReactNode }) {
  return <WalletShell>{children}</WalletShell>;
}
