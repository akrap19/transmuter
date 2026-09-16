"use client";
import { motion } from "motion/react";

import { PropsWithChildren } from "react";

export const SlideInFromTop = (props: PropsWithChildren) => {
  return (
    <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
      {props.children}
    </motion.div>
  );
};
