"use client";

import { CatalogBanner } from "@/components/catalog/catalog-banner";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { CoinTable } from "@/components/catalog/coin-table";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { formatAmount } from "@/lib/catalog/format";
import { listCreated, listHeld } from "@/lib/catalog/client";
import { MOCK_PREVIEW_WALLET } from "@/lib/catalog/mock";

function withSample<T>(walletItems: T[], sampleItems: T[]) {
  return walletItems.length > 0 ? walletItems : sampleItems;
}

export function MyCoinsView() {
  return (
    <WalletGate
      title="Connect to see your coins"
      body="Wallet address is identity. Connect to list launches you created and EOL tokens you hold."
    >
      {(wallet) => {
        const created = withSample(listCreated(wallet), listCreated(MOCK_PREVIEW_WALLET));
        const held = withSample(listHeld(wallet), listHeld(MOCK_PREVIEW_WALLET));

        return (
          <>
            <CatalogBanner />
            <section className="catalog-section">
              <h2>Created</h2>
              <p>Factory registry entries whose creator is this wallet.</p>
              {created.length === 0 ? (
                <CatalogEmpty title="No created launches" body="Launches you deploy will land here, including VOIDED sales." />
              ) : (
                <CoinTable items={created} />
              )}
            </section>
            <section className="catalog-section">
              <h2>Held</h2>
              <p>Token accounts intersected with known EOL mints.</p>
              {held.length === 0 ? (
                <CatalogEmpty title="No holdings" body="Balances on indexed Transmuter mints will show here." />
              ) : (
                <CoinTable items={held} extraLabel="Amount" extra={(item) => <span className="catalog-extra">{formatAmount(item.amount)}</span>} />
              )}
            </section>
          </>
        );
      }}
    </WalletGate>
  );
}
