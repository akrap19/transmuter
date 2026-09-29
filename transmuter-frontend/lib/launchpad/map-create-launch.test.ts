import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { CTOKEN_RESERVE_FEE, PROTOCOL_FEE } from "./fee-calculator";
import { mapLaunchpadToCreateLaunch } from "./map-create-launch";
import { initialLaunchpadState, type LaunchpadState } from "./types";

const CSOL = "So11111111111111111111111111111111111111112";
const CBTC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const TEAM = "11111111111111111111111111111111";
const DAO = "6obevHvyADNmvyysyj8QBfgUQUbbhZU4CvMtghbRHw3W";
const NOW = 1_700_000_000;

function launchState(overrides: Partial<LaunchpadState> = {}): LaunchpadState {
  return {
    ...initialLaunchpadState,
    tokenName: "Aero Protocol",
    tokenTicker: "AERO",
    tokenSupply: "1000000",
    escrowNeed: "0",
    targetRaise: "70000",
    saleType: "fixed",
    saleWindow: "1 week",
    allocLP: 20,
    allocTeam: 10,
    allocPublic: 70,
    allocInvestors: 0,
    showInvestors: false,
    vesting: "12 Month Linear",
    selectedCToken: {
      name: "cSOL",
      icon: "◎",
      base: "SOL",
      eol: "Isolated gold reserve",
      mint: CSOL,
    },
    autoMintTrigger: 7,
    autoMintDeactivate: 20,
    voteWindow: 48,
    toggles: { daoAirdrop: false, burnFee: false, creatorFee: false },
    fees: {
      ...initialLaunchpadState.fees,
      totalFee: 0.5,
      lpFee: 0.15,
      treasuryFee: 0.15,
      burnFee: 0,
      creatorFee: 0,
    },
    ...overrides,
  };
}

function map(state: LaunchpadState = launchState()) {
  return mapLaunchpadToCreateLaunch({
    state,
    nowSeconds: NOW,
    teamRecipient: TEAM,
    daoContract: DAO,
    whitelist: [
      { name: "cSOL", icon: "◎", base: "SOL", eol: "Isolated gold reserve", mint: CSOL },
      { name: "cBTC", icon: "₿", base: "BTC", eol: "Isolated gold reserve", mint: CBTC },
    ],
  });
}

describe("mapLaunchpadToCreateLaunch", () => {
  it("maps a feasible FIXED wizard state onto Factory createLaunch params and whitelist accounts", () => {
    const { params, accounts } = map();

    expect(params.name).toBe("Aero Protocol");
    expect(params.symbol).toBe("AERO");
    expect(params.decimals).toBe(9);
    expect(params.saleType).toBe(0);
    expect(params.salePrice.toString()).toBe("100000");
    expect(params.targetRaise.toString()).toBe("70000000000");
    expect(params.totalSupply.toString()).toBe("1000000000000000");
    expect(params.saleBps).toBe(7000);
    expect(params.lpBps).toBe(2000);
    expect(params.teamBps).toBe(1000);
    expect(params.investorBps).toBe(0);
    expect(params.daoBps).toBe(0);
    expect(params.lpSolShareBps).toBe(5000);
    expect(params.lpUsdcShareBps).toBe(5000);
    expect(params.escrowFundingNeed.toString()).toBe("0");
    expect(params.saleEnd.toString()).toBe(String(NOW + 7 * 24 * 3600));
    expect(params.governedMintPctBps).toBe(1000);
    expect(params.reserveMintActivatePct.toString()).toBe("7");
    expect(params.reserveMintDeactivatePct.toString()).toBe("20");
    expect(params.reserveMintDurationSecs.toString()).toBe(String(6 * 3600));
    expect(params.reserveMintVoteWindowSecs.toString()).toBe(String(48 * 3600));
    expect(params.liqVoteWindowSecs.toString()).toBe(String(14 * 24 * 3600));
    expect(params.convertChunk.toString()).toBe("0");
    expect(params.transferFeeBps).toBe(50);
    expect(params.feeLpBps).toBe(15);
    expect(params.feeTreasuryBps).toBe(15);
    expect(params.feeCtokenBps).toBe(5);
    expect(params.feeProtocolBps).toBe(15);
    expect(params.feeCreatorBps).toBe(0);
    expect(params.feeBurnBps).toBe(0);
    expect(params.forfeitDest).toBe(0);
    expect(params.vestingSchedule).toBe(2);
    expect(params.feeCtokenBps).toBe(Math.round(CTOKEN_RESERVE_FEE * 100));
    expect(params.feeProtocolBps).toBe(Math.round(PROTOCOL_FEE * 100));

    expect(accounts.backingCtoken.toBase58()).toBe(CSOL);
    expect(accounts.fallbackCtoken.toBase58()).toBe(CBTC);
    expect(accounts.teamRecipient.toBase58()).toBe(TEAM);
    expect(accounts.daoContract.toBase58()).toBe(DAO);
    expect(accounts.backingListing).toBeInstanceOf(PublicKey);
    expect(accounts.fallbackListing).toBeInstanceOf(PublicKey);
  });

  it("converts a 1 week sale window and vesting presets to chain units", () => {
    expect(map(launchState({ vesting: "None" })).params.vestingSchedule).toBe(0);
    expect(map(launchState({ vesting: "6 Month Cliff" })).params.vestingSchedule).toBe(1);
    expect(map(launchState({ vesting: "24 Month Linear" })).params.vestingSchedule).toBe(3);
    expect(map(launchState({ vesting: "6M Cliff + 18M Linear" })).params.vestingSchedule).toBe(4);
    expect(map(launchState({ saleWindow: "2 days" })).params.saleEnd.toString()).toBe(
      String(NOW + 2 * 24 * 3600),
    );
    expect(map(launchState({ saleWindow: "60 days" })).params.saleEnd.toString()).toBe(
      String(NOW + 60 * 24 * 3600),
    );
  });

  it("rejects sale types, investor allocations, and custom vesting the chain cannot snapshot", () => {
    expect(() => map(launchState({ saleType: "dutch" }))).toThrow(/FIXED/i);
    expect(() => map(launchState({ saleType: "overflow" }))).toThrow(/FIXED/i);
    expect(() =>
      map(launchState({ showInvestors: true, allocInvestors: 10, allocPublic: 60 })),
    ).toThrow(/investor/i);
    expect(() => map(launchState({ vesting: "Custom" }))).toThrow(/vesting/i);
  });
});
