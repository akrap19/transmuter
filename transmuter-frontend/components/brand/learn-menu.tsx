"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { learnMenu } from "@/lib/marketing/nav";
import { isActivePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const isAnchor = (href: string) => href.includes("#");

export function LearnMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionActive = learnMenu.links.some((link) => !isAnchor(link.href) && isActivePath(pathname, link.href));

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div className={cn("learn-dropdown", open && "is-open")} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn("learn-trigger", sectionActive && "is-current")}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {learnMenu.label}
        <ChevronDown aria-hidden className="learn-chevron" size={14} />
      </button>
      <div className="learn-menu" role="menu">
        {learnMenu.links.map((link) => {
          const current = !isAnchor(link.href) && isActivePath(pathname, link.href);

          return (
            <Link
              className={cn("learn-menu-item", current && "is-current")}
              href={link.href}
              key={link.href}
              role="menuitem"
              onClick={handleNavigate}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
