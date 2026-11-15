"use client";

import { useLayoutEffect, useRef } from "react";
import { mountValueCalculator } from "./engine";
import { calculatorMarkup } from "./markup";
import "./calculator.css";
import "./simulator.css";

export function ValueCalculator() {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = calculatorMarkup;
    return mountValueCalculator(host);
  }, []);

  return <div className="value-calc" ref={hostRef} />;
}
