import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/transmuter/site-chrome";
import { Wrap } from "@/components/transmuter/wrap";

type CoinPageProps = {
  params: Promise<{ mint: string }>;
};

export async function generateMetadata({ params }: CoinPageProps): Promise<Metadata> {
  const { mint } = await params;
  return {
    title: mint,
    description: `Transmuter launch ${mint}`,
  };
}

export default async function CoinPage({ params }: CoinPageProps) {
  const { mint } = await params;

  return (
    <div className="page-docs">
      <SiteNav />
      <Wrap>
        <header style={{ padding: "48px 0 24px" }}>
          <p className="page-eyebrow">TRANSMUTER · TOKEN</p>
          <h1 className="page-title" style={{ fontSize: "1.6rem", wordBreak: "break-all" }}>
            {mint}
          </h1>
          <p className="page-subtitle">
            This is the token page for a Factory-registered mint. Sale, treasury, and governance
            panels will render here from chain state.
          </p>
        </header>
      </Wrap>
      <SiteFooter />
    </div>
  );
}
