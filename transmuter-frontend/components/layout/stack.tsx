import { cn } from "@/lib/utils";
import { BaseComponentProps } from "@/types";

export const Stack = (props: BaseComponentProps) => {
  return <div className={cn("flex flex-col gap-4", props.className)}>{props.children}</div>;
};
