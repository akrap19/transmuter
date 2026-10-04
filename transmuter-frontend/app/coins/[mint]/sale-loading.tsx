import { CoinSection } from "@/app/coins/[mint]/coin-section";

const PLACEHOLDERS = ["Raised", "Cap", "Remaining", "Time left", "Closes", "Your deposit"];

export function SaleLoading() {
  return (
    <CoinSection
      title="Sale / Buy"
      lede="Deposit USDC against the remaining cap. Withdraw in full until close. Cap is the sale allocation, not a bonding curve."
    >
      <p className="coin-note" role="status" aria-live="polite">
        Loading the sale from chain.
      </p>
      <div className="coin-stats" aria-hidden="true">
        {PLACEHOLDERS.map((label) => (
          <article key={label}>
            <span>{label}</span>
            <strong className="coin-sale-bar" />
          </article>
        ))}
      </div>
    </CoinSection>
  );
}
