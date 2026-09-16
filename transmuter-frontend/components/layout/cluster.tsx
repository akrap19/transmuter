import { cn } from "@/lib/utils";
import { BaseComponentProps } from "@/types";

export const Cluster = (props: BaseComponentProps) => {
  return <div className={cn("flex flex-wrap gap-4", props.className)}>{props.children}</div>;
};
