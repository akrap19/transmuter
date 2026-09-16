import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PropsWithClassName } from "@/types";

type GoldButtonProps = PropsWithClassName & {
  href?: string;
  variant?: "gold" | "ghost";
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function GoldButton({
  href,
  variant = "gold",
  className,
  children,
  type = "button",
  onClick,
  disabled,
}: GoldButtonProps) {
  const classes = cn(
    "btn",
    variant === "gold" ? "btn-gold" : "btn-ghost",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
