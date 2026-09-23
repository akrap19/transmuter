"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { WalletButton } from "@/components/solana/wallet-button";
import { headerLinks } from "@/lib/marketing/nav";
import { isActivePath, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);

  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="site-header" data-header="">
      <BrandMark />
      <button
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
        className="nav-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span />
        <span />
      </button>
      <nav className={cn("site-nav", open && "open")} data-nav="">
        {headerLinks.map((link) => {
          const current = !link.href.includes("#") && isActivePath(pathname, link.href);

          return (
            <Link className={cn(current && "is-current")} href={link.href} key={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          );
        })}
        <Link className="nav-cta" href={routes.access} onClick={() => setOpen(false)}>
          Get early access
        </Link>
        <WalletButton className="nav-wallet" variant="nav" />
      </nav>
    </header>
  );
}
