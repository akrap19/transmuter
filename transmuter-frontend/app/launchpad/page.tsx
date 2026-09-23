import type { Metadata } from "next";
import "@/app/brand/launchpad.css";
import { LaunchpadWizard } from "./launchpad-wizard";

export const metadata: Metadata = {
  title: "Launchpad",
  description:
    "Create your reinforced token on Transmuter. Treasury-backed, non-custodial, with built-in end of life protection.",
};

export default function LaunchpadPage() {
  return (
    <main className="launch-page">
      <LaunchpadWizard />
    </main>
  );
}
