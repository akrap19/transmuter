import { CoinAvatar } from "@/components/catalog/coin-avatar";
import { coinPath } from "@/lib/routes";
import Link from "next/link";

type CoinIdentityProps = {
  mint: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
};

export function CoinIdentity({ mint, name, symbol, logoUrl }: CoinIdentityProps) {
  return (
    <Link href={coinPath(mint)} className="catalog-identity">
      <CoinAvatar symbol={symbol} logoUrl={logoUrl} />
      <span>
        <span className="catalog-name">{name}</span>
        <span className="catalog-symbol">${symbol}</span>
      </span>
    </Link>
  );
}
