import { cn } from "@/lib/utils";
import { BaseComponentProps } from "@/types";

export const Switcher = (props: BaseComponentProps) => {
  return <div className={cn("flex flex-row flex-wrap justify-start gap-4 [&>*]:flex-1", props.className)} {...props} />;
};
