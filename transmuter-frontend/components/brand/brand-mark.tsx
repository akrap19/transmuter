import Link from "next/link";
import { LogoMark } from "@/components/transmuter/logo-mark";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Link aria-label="Transmuter home" className={cn("brand", className)} href={routes.home}>
      <span aria-hidden className="brand-mark">
        <LogoMark size={28} />
      </span>
      <span>TRANSMUTER</span>
    </Link>
  );
}
