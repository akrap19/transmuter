import { cn } from "@/lib/utils";
import type { BaseComponentProps } from "@/types";

export function HeroCorners({ className }: BaseComponentProps) {
  return (
    <div className={cn("corners", className)} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function PerspectiveFloor({ className }: BaseComponentProps) {
  return <div className={cn("floor", className)} aria-hidden="true" />;
}

export function SectionLabel({ children }: BaseComponentProps) {
  return <div className="sec-label">{children}</div>;
}

export function Pill({ children }: BaseComponentProps) {
  return (
    <div className="pill">
      <i aria-hidden="true" />
      {children}
    </div>
  );
}
