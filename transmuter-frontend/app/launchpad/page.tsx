import type { Metadata } from "next";
import "@/app/brand/launchpad.css";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { routes } from "@/lib/routes";
import { marketingPageGraph } from "@/lib/seo/json-ld";
import { marketingPageMetadata } from "@/lib/seo/page-metadata";
import { LaunchpadWizard } from "./launchpad-wizard";

const launchpadTitle = "Create your EOL token";
const launchpadDescription =
  "Create an EOL token on Transmuter. Isolated treasury, contract-owned liquidity, and end of life rules fixed before trading.";

export const metadata: Metadata = marketingPageMetadata({
  path: routes.launchpad,
  title: launchpadTitle,
  description: launchpadDescription,
});

export default function LaunchpadPage() {
  return (
    <main className="launch-page">
      <JsonLdScript
        data={marketingPageGraph({
          path: routes.launchpad,
          name: launchpadTitle,
          description: launchpadDescription,
          breadcrumbs: [
            { name: "Transmuter", path: "/" },
            { name: "Launchpad", path: routes.launchpad },
          ],
        })}
      />
      <LaunchpadWizard />
    </main>
  );
}
