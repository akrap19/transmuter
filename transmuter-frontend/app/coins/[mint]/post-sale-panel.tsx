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
        "Convert remaining USDC into the backing cToken, seed a Raydium pool when the LP vault still holds inventory, and claim purchased tokens."
      }
    >
      {offers.length > 0 && chain ? <PostSaleActions offers={offers} chain={chain} onConfirmed={onConfirmed} /> : null}
    </CoinSection>
  );
}
