import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { BaseComponentProps } from "@/types";

export type GridVariants = VariantProps<typeof gridVariants>;

type Props = BaseComponentProps & GridVariants;

const gridVariants = cva("grid gap-4", {
  variants: {
    sm: {
      1: "sm:grid-cols-1",
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-3",
      4: "sm:grid-cols-4",
      5: "sm:grid-cols-5",
      6: "sm:grid-cols-6",
      7: "sm:grid-cols-7",
      8: "sm:grid-cols-8",
      9: "sm:grid-cols-9",
      10: "sm:grid-cols-10",
      11: "sm:grid-cols-11",
      12: "sm:grid-cols-12",
    },
    md: {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
      5: "md:grid-cols-5",
      6: "md:grid-cols-6",
      7: "md:grid-cols-7",
      8: "md:grid-cols-8",
      9: "md:grid-cols-9",
      10: "md:grid-cols-10",
      11: "md:grid-cols-11",
      12: "md:grid-cols-12",
    },
    lg: {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
      6: "lg:grid-cols-6",
      7: "lg:grid-cols-7",
      8: "lg:grid-cols-8",
      9: "lg:grid-cols-9",
      10: "lg:grid-cols-10",
      11: "lg:grid-cols-11",
      12: "lg:grid-cols-12",
    },
    xl: {
      1: "xl:grid-cols-1",
      2: "xl:grid-cols-2",
      3: "xl:grid-cols-3",
      4: "xl:grid-cols-4",
      5: "xl:grid-cols-5",
      6: "xl:grid-cols-6",
      7: "xl:grid-cols-7",
      8: "xl:grid-cols-8",
      9: "xl:grid-cols-9",
      10: "xl:grid-cols-10",
      11: "xl:grid-cols-11",
      12: "xl:grid-cols-12",
    },
    xxl: {
      1: "2xl:grid-cols-1",
      2: "2xl:grid-cols-2",
      3: "2xl:grid-cols-3",
      4: "2xl:grid-cols-4",
      5: "2xl:grid-cols-5",
      6: "2xl:grid-cols-6",
      7: "2xl:grid-cols-7",
      8: "2xl:grid-cols-8",
      9: "2xl:grid-cols-9",
      10: "2xl:grid-cols-10",
      11: "2xl:grid-cols-11",
      12: "2xl:grid-cols-12",
    },
  },
});

export const Grid = ({ className, sm, md, lg, xl, xxl, ...props }: Props) => {
  return <div className={cn(gridVariants({ md, sm, lg, xl, xxl }), className)} {...props} />;
};
