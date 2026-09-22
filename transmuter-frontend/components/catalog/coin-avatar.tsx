"use client";

import { useState } from "react";

type CoinAvatarProps = {
  symbol: string;
  logoUrl?: string | null;
};

export function CoinAvatar({ symbol, logoUrl }: CoinAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = symbol.slice(0, 2);

  if (!logoUrl || failed) {
    return (
      <span className="catalog-avatar" aria-hidden>
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="catalog-avatar"
      src={logoUrl}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
