"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { WalletButton } from "@/components/solana/wallet-button";

type WalletGateProps = {
  title: string;
  body: string;
  previewHref?: string;
  children: (wallet: string) => ReactNode;
};

export function WalletGate({ title, body, previewHref, children }: WalletGateProps) {
  const { connected, publicKey } = useWallet();
  const wallet = publicKey?.toBase58();

  if (!connected || !wallet) {
    return (
      <CatalogEmpty title={title} body={body}>
        <WalletButton />
        {previewHref ? (
          <Link href={previewHref} className="btn btn-ghost">
            View sample preview
          </Link>
        ) : null}
      </CatalogEmpty>
    );
  }

  return <>{children(wallet)}</>;
}
