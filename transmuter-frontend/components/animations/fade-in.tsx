"use client";

import { motion } from "motion/react";

import { PropsWithChildren } from "react";

export const FadeIn = (props: PropsWithChildren) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {props.children}
    </motion.div>
  );
};
