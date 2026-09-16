import { GlossarySection } from "@/app/docs/docs-sections/glossary";
import { ChainSection } from "@/app/docs/docs-sections/chain";
import { EolSection } from "@/app/docs/docs-sections/eol";
import { EscrowSection } from "@/app/docs/docs-sections/escrow";
import { FeesSection } from "@/app/docs/docs-sections/fees";
import { GovernanceSection } from "@/app/docs/docs-sections/governance";
import { LaunchSection } from "@/app/docs/docs-sections/launch";
import { MintToScaleSection } from "@/app/docs/docs-sections/mint-to-scale";
import { OverviewSection } from "@/app/docs/docs-sections/overview";
import { RatiosSection } from "@/app/docs/docs-sections/ratios";
import { SaleSection } from "@/app/docs/docs-sections/sale";
import { StatusSection } from "@/app/docs/docs-sections/status";
import { TokensSection } from "@/app/docs/docs-sections/tokens";

export function DocsContent() {
  return (
    <main>
      <div className="doc-eyebrow">Documentation</div>
      <h1>How Transmuter works</h1>
      <p className="lede">
        Everything below is enforced by contracts, not promises. Short on words,
        precise on numbers.
      </p>

      <GlossarySection />
      <OverviewSection />
      <TokensSection />
      <ChainSection />
      <RatiosSection />
      <LaunchSection />
      <SaleSection />
      <EscrowSection />
      <FeesSection />
      <MintToScaleSection />
      <EolSection />
      <GovernanceSection />
      <StatusSection />
    </main>
  );
}
