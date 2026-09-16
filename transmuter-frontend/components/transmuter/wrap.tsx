import { cn } from "@/lib/utils";
import type { BaseComponentProps } from "@/types";

export function Wrap({ children, className }: BaseComponentProps) {
  return <div className={cn("wrap", className)}>{children}</div>;
}
