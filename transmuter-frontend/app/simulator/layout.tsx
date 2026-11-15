import { JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function CalculatorLayout({ children }: { children: ReactNode }) {
  return <div className={jetbrains.variable}>{children}</div>;
}
