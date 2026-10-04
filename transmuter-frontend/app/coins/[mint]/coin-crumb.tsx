import Link from "next/link";

export function CoinCrumb({ href }: { href: string }) {
  return (
    <nav className="coin-crumb" aria-label="Coins">
      <Link href={href} className="coin-back">
        <span aria-hidden="true">←</span>
        All coins
      </Link>
    </nav>
  );
}
