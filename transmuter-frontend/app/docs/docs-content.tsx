import { GlossarySection } from "@/app/docs/docs-sections/glossary";
import { OverviewSection } from "@/app/docs/docs-sections/overview";
import { TokensSection } from "@/app/docs/docs-sections/tokens";
import { ReservesSection } from "@/app/docs/docs-sections/reserves";
import { RatiosSection } from "@/app/docs/docs-sections/ratios";
import { LaunchSection } from "@/app/docs/docs-sections/launch";
import { SaleSection } from "@/app/docs/docs-sections/sale";
import { EscrowSection } from "@/app/docs/docs-sections/escrow";
import { FeesSection } from "@/app/docs/docs-sections/fees";
import { MintToScaleSection } from "@/app/docs/docs-sections/mint-to-scale";
import { StakingSection } from "@/app/docs/docs-sections/staking";
import { EolSection } from "@/app/docs/docs-sections/eol";
import { GovernanceSection } from "@/app/docs/docs-sections/governance";
import { PlatformsSection } from "@/app/docs/docs-sections/platforms";
import { StatusSection } from "@/app/docs/docs-sections/status";

export function DocsContent() {
  return (
    <main>
      <div className="doc-eyebrow">Documentation</div>
      <h1>How Transmuter works</h1>
      <p className="lede">
        Set in the contract, not left to promises. Short on words, precise on numbers.
      </p>

      <GlossarySection />
      <OverviewSection />
      <TokensSection />
      <ReservesSection />
      <RatiosSection />
      <LaunchSection />
      <SaleSection />
      <EscrowSection />
      <FeesSection />
      <MintToScaleSection />
      <StakingSection />
      <EolSection />
      <GovernanceSection />
      <PlatformsSection />
      <StatusSection />
    </main>
  );
}
