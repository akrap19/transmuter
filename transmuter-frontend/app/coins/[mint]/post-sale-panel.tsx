import { PostSaleActions } from "@/app/coins/[mint]/post-sale-actions";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import type { PostSaleKind } from "@/lib/catalog/post-sale";
import type { PostSaleChain } from "@/lib/catalog/submit-post-sale";

export function PostSalePanel({
  offers,
  note,
  chain,
  onConfirmed,
}: {
  offers: PostSaleKind[];
  note: string | null;
  chain: PostSaleChain | null;
  onConfirmed: () => void;
}) {
  if (offers.length === 0 && !note) return null;

  return (
    <CoinSection
      title="Finalize & claim"
      lede={
        note ??
        "Seeds the Raydium pools and converts the remaining USDC into the backing cToken. Each buyer claims their own tokens."
      }
    >
      {offers.length > 0 && chain ? <PostSaleActions offers={offers} chain={chain} onConfirmed={onConfirmed} /> : null}
    </CoinSection>
  );
}
