"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WalletButton } from "@/components/solana/wallet-button";

/** Renders the connect control into the header after hydration, so crawlers never see wallet copy. */
export function WalletSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("wallet-slot"));
  }, []);

  if (!slot) return null;
  return createPortal(<WalletButton className="nav-wallet" variant="nav" />, slot);
}
