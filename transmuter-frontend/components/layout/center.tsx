import { cn } from "@/lib/utils";
import { BaseComponentProps } from "@/types";

export const Center = (props: BaseComponentProps) => {
  return <div className={cn("flex flex-wrap justify-center gap-4", props.className)}>{props.children}</div>;
};
