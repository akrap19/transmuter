import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { footerColumns } from "@/lib/marketing/nav";
import { externalLinks, teamEmail } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="site-footer section-shell expanded-footer">
      <div className="footer-lead">
        <BrandMark className="footer-brand" />
        <p>Value recovery infrastructure for tokens.</p>
      </div>
      <div className="footer-columns">
        {footerColumns.map((column) => (
          <div key={column.title}>
            <strong>{column.title}</strong>
            {column.links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <small>
        <a
          aria-label="Studio 19"
          className="studio19-link"
          href={externalLinks.studio19}
          rel="noopener"
          target="_blank"
        >
          <img alt="Studio 19" className="studio19-logo" height={18} src="/studio19-logo.png" width={90} />
        </a>
        <span className="footer-meta-copy">
          © 2026 Transmuter ·{" "}
          <a href={externalLinks.twitter} rel="noopener" target="_blank">
            @TransmuterTMI
          </a>
          {" · "}
          <a href={externalLinks.email}>{teamEmail}</a>
        </span>
      </small>
    </footer>
  );
}
