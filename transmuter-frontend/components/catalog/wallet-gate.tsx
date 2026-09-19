"use client";

import type { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { WalletButton } from "@/components/solana/wallet-button";

type WalletGateProps = {
  title: string;
  body: string;
  children: (wallet: string) => ReactNode;
};

export function WalletGate({ title, body, children }: WalletGateProps) {
  const { connected, publicKey } = useWallet();
  const wallet = publicKey?.toBase58();

  if (!connected || !wallet) {
    return (
      <CatalogEmpty title={title} body={body}>
        <WalletButton />
      </CatalogEmpty>
    );
  }

  return <>{children(wallet)}</>;
}
