import { cn } from "@/lib/utils";
import { BaseComponentProps } from "@/types";

export const Split = (props: BaseComponentProps) => {
  return <div className={cn("flex flex-wrap justify-between gap-4", props.className)}>{props.children}</div>;
};
