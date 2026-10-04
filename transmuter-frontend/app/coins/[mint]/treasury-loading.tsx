import { CoinSection } from "@/app/coins/[mint]/coin-section";

export function TreasuryLoading({ backing }: { backing: string }) {
  const placeholders = [`${backing} treasury`, "Unconverted USDC", "Backing value", "Redemption"];

  return (
    <CoinSection
      title="Treasury transparency"
      lede={`Every backing read counts unconverted USDC. Redemption is quantity-based (${backing} / circulating), not an oracle price.`}
    >
      <p className="coin-note" role="status" aria-live="polite">
        Loading the treasury from chain.
      </p>
      <div className="coin-stats" aria-hidden="true">
        {placeholders.map((label) => (
          <article key={label}>
            <span>{label}</span>
            <strong className="coin-sale-bar" />
          </article>
        ))}
      </div>
    </CoinSection>
  );
}
