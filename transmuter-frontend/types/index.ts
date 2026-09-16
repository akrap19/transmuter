import type { PropsWithChildren } from "react";

export type PropsWithClassName = {
  className?: string;
};

export type BaseComponentProps = PropsWithChildren & PropsWithClassName;
