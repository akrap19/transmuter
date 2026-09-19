import Link from "next/link";
import { coinPath } from "@/lib/routes";

type CoinIdentityProps = {
  mint: string;
  name: string;
  symbol: string;
};

export function CoinIdentity({ mint, name, symbol }: CoinIdentityProps) {
  return (
    <Link href={coinPath(mint)} className="catalog-identity">
      <span className="catalog-avatar" aria-hidden>
        {symbol.slice(0, 2)}
      </span>
      <span>
        <span className="catalog-name">{name}</span>
        <span className="catalog-symbol">${symbol}</span>
      </span>
    </Link>
  );
}
