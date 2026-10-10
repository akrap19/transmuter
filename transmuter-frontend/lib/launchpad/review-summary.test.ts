import { describe, expect, it } from "vitest";
import { launchReviewSections } from "./review-summary";
import { initialLaunchpadState, type LaunchpadState } from "./types";

function rows(title: string, state: LaunchpadState = initialLaunchpadState) {
  const section = launchReviewSections(state, null).find((item) => item.title === title);
  return Object.fromEntries((section?.rows ?? []).map((row) => [row.label, row.value]));
}

describe("launchReviewSections", () => {
  it("includes identity fields the wizard collects", () => {
    const identity = rows("Token Identity", {
      ...initialLaunchpadState,
      tokenName: "Aero",
      tokenTicker: "AERO",
      tokenDesc: "A treasury-backed token.",
      logoFileName: "aero.png",
      tokenWebsite: "https://aero.example",
    });

    expect(identity.Name).toBe("Aero");
    expect(identity.Ticker).toBe("$AERO");
    expect(identity.Description).toBe("A treasury-backed token.");
    expect(identity.Logo).toBe("aero.png");
    expect(identity.Website).toBe("https://aero.example");
    expect(identity.X).toBe("—");
  });

  it("includes the tokenomics inputs that were missing from review", () => {
    const tokenomics = rows("Tokenomics", {
      ...initialLaunchpadState,
      allocLP: 20,
      allocTeam: 10,
      allocPublic: 70,
      escrowNeed: "15000",
      treasuryBackingPct: 12,
      targetRaise: "70000",
      saleWindow: "2.5",
      tokenSupply: "1000000",
      toggles: { ...initialLaunchpadState.toggles, daoAirdrop: true },
      daoAirdropPct: 2,
      vesting: "12 Month Linear",
    });

    expect(tokenomics["Liquidity pool"]).toBe("20%");
    expect(tokenomics.Team).toBe("10%");
    expect(tokenomics["Public sale"]).toBe("70%");
    expect(tokenomics["DAO Airdrop"]).toBe("Yes - 2% of supply");
    expect(tokenomics.Vesting).toBe("12 Month Linear");
    expect(tokenomics["Target Escrow Raise"]).toBe("$15,000");
    expect(tokenomics["Treasury backing"]).toBe("12% of MCP");
    expect(tokenomics["Total Target Raise"]).toBe("$70,000");
    expect(tokenomics["Sale Window"]).toBe("2.5 days");
    expect(tokenomics["Sale Type"]).toBe("Fixed price");
    expect(tokenomics["Start Price"]).toBeUndefined();
  });

  it("adds dutch and overflow fields only for those sale types", () => {
    const dutch = rows("Tokenomics", {
      ...initialLaunchpadState,
      saleType: "dutch",
      dutchStartPrice: "0.01",
      dutchDecayRate: "1.0",
      dutchDecayInterval: "10",
    });
    expect(dutch["Sale Type"]).toBe("Reverse Dutch");
    expect(dutch["Start Price"]).toBe("$0.01");
    expect(dutch["Decay Step"]).toBe("1.0% / interval");
    expect(dutch["Decay Interval"]).toBe("10 min");

    const overflow = rows("Tokenomics", {
      ...initialLaunchpadState,
      saleType: "overflow",
      overflowCap: "",
      overflowForego: 0,
    });
    expect(overflow["Sale Type"]).toBe("Overflow pool");
    expect(overflow["Raise Cap"]).toBe("No cap");
    expect(overflow["Forego Surplus Escrow"]).toBe("75%");
  });

  it("keeps backing and fees, and leaves sale window with tokenomics", () => {
    const backing = rows("Backing");
    expect(backing["Backing basket"]).toBe("Solana 100%");
    expect(backing["Total"]).toBe("100%");
    expect(backing["Backing"]).toBeUndefined();
    expect(backing["Mint to Scale band"]).toBe("7% open · 20% close");

    const short = rows("Backing", {
      ...initialLaunchpadState,
      backingBasket: [
        { asset: "SOL", weight: 40 },
        { asset: "BTC", weight: 10 },
        { asset: "GOLD", weight: 0 },
        { asset: "SPX", weight: 0 },
      ],
    });
    expect(short["Total"]).toBe("50%");
    expect(short["Backing"]).toBe("Overall backing must be 100%.");
    expect(backing["Gov. Vote Window"]).toBe("48h");
    expect(backing["Sale Window"]).toBeUndefined();

    const fees = rows("Fee Structure", {
      ...initialLaunchpadState,
      toggles: { daoAirdrop: false, burnFee: true, creatorFee: false },
      fees: { ...initialLaunchpadState.fees, burnFee: 0.05 },
    });
    expect(fees["Total TX Fee"]).toBe("0.60%");
    expect(fees["→ Reserve"]).toBe("0.10%");
    expect(fees["→ Gold"]).toBeUndefined();
    expect(fees["→ S&P"]).toBeUndefined();
    expect(fees["Burn Fee"]).toBe("0.05%");
    expect(fees["Creator Fee"]).toBe("Off");
  });
});
