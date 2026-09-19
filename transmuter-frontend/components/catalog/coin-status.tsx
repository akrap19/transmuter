import { formatStatus } from "@/lib/catalog/format";
import { cn } from "@/lib/utils";

type CoinStatusProps = {
  status: string;
};

export function CoinStatus({ status }: CoinStatusProps) {
  return <span className={cn("catalog-status", `is-${status}`)}>{formatStatus(status)}</span>;
}
