import { PropsWithClassName } from "@/types";
import packageJSON from "../../package.json";
import { cn } from "@/lib/utils";

export const ProjectVersion = (props: PropsWithClassName) => {
  return <p className={cn("text-xs text-bright-blue", props.className)}> v.{packageJSON.version}</p>;
};
