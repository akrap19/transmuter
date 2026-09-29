"use client";

import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { listCreated, listHeld } from "@/lib/catalog/client";
import { MOCK_PREVIEW_WALLET } from "@/lib/catalog/mock";
import { routes } from "@/lib/routes";
import { useOwnedBalances } from "@/components/catalog/use-owned-balances";
import { MyCoinsLists } from "./my-coins-lists";
import { useMyCoins } from "./use-my-coins";

type MyCoinsViewProps = {
  preview: boolean;
};

export function MyCoinsView({ preview }: MyCoinsViewProps) {
  if (preview) {
    return (
      <>
        <CatalogBanner />
        <MyCoinsLists created={listCreated(MOCK_PREVIEW_WALLET)} held={listHeld(MOCK_PREVIEW_WALLET)} />
      </>
    );
  }

  return (
    <WalletGate
      title="Connect to see your coins"
      body="Wallet address is identity. Connect to list launches you created and EOL tokens you hold."
      previewHref={`${routes.myCoins}?preview=1`}
    >
      {(wallet) => <ConnectedCoins wallet={wallet} />}
    </WalletGate>
  );
}

function ConnectedCoins({ wallet }: { wallet: string }) {
  const accounts = useOwnedBalances(wallet);
  const mine = useMyCoins(wallet, accounts);

  if (mine.loading) return <p className="coin-lede">Loading launches and token accounts…</p>;
  if (mine.error) {
    return (
      <CatalogEmpty
        title="Index unavailable"
        body="Created launches come from the catalog API. Holdings still use this wallet's token accounts once the index responds."
      />
    );
  }

  return <MyCoinsLists created={mine.created} held={mine.held} />;
}
