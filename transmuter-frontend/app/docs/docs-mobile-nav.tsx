"use client";

import { useEffect, useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { docsNavGroups } from "@/app/docs/docs-nav-data";

function DocsNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {docsNavGroups.map((group) => (
        <div key={group.label}>
          <div className="side-label">{group.label}</div>
          {group.links.map((link) => (
            <a key={link.href} href={link.href} onClick={onNavigate}>
              {link.label}
            </a>
          ))}
        </div>
      ))}
    </>
  );
}

export function DocsMobileNav() {
  const [open, setOpen] = useState(false);

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
    <>
      <div className="docs-mobile-nav">
        <div className="docs-nav-container">
          <aside
            id="docs-nav-drawer"
            className={cn("docs-drawer", open && "is-open")}
            aria-hidden={!open}
          >
            <nav className="docs-drawer-nav">
              <DocsNavLinks onNavigate={() => setOpen(false)} />
            </nav>
          </aside>

          <button
            type="button"
            className="docs-nav-toggle"
            aria-expanded={open}
            aria-controls="docs-nav-drawer"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={18} /> : <ChevronUp size={18} />}
            <span className="docs-nav-toggle-label">Docs navigation</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        className={cn("nav-drawer-backdrop docs-drawer-backdrop", open && "is-open")}
        aria-label="Close documentation menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
    </>
  );
}
