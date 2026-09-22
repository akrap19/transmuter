"use client";

import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { MOCK_PREVIEW_WALLET } from "@/lib/catalog/mock";
import { routes } from "@/lib/routes";
import { useOwnedBalances } from "@/components/catalog/use-owned-balances";
import { MyCoinsLists } from "./my-coins-lists";

type MyCoinsViewProps = {
  preview: boolean;
};

export function MyCoinsView({ preview }: MyCoinsViewProps) {
  if (preview) {
    return (
      <>
        <CatalogBanner />
        <MyCoinsLists wallet={MOCK_PREVIEW_WALLET} />
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
  return (
    <>
      <CatalogBanner />
      <MyCoinsLists wallet={wallet} accounts={accounts ?? []} />
    </>
  );
}
