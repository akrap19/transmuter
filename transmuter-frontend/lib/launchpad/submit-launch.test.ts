import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { initialLaunchpadState, type LaunchpadState } from "./types";
import { submitCreateLaunch } from "./submit-launch";

const CSOL = "So11111111111111111111111111111111111111112";
const CBTC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const TEAM = "11111111111111111111111111111111";
const DAO = "6obevHvyADNmvyysyj8QBfgUQUbbhZU4CvMtghbRHw3W";
const MINT = Keypair.fromSeed(new Uint8Array(32).fill(7));

function launchState(overrides: Partial<LaunchpadState> = {}): LaunchpadState {
  return {
    ...initialLaunchpadState,
    tokenName: "Aero Protocol",
    tokenTicker: "AERO",
    tokenDesc: "Treasury-backed",
    tokenWebsite: "https://aero.example",
    tokenTwitter: "@aero",
    tokenSupply: "1000000",
    escrowNeed: "0",
    targetRaise: "70000",
    saleType: "fixed",
    allocLP: 20,
    allocTeam: 10,
    allocPublic: 70,
    allocInvestors: 0,
    selectedCToken: {
      name: "cSOL",
      icon: "◎",
      base: "SOL",
      eol: "Isolated gold reserve",
      mint: CSOL,
    },
    toggles: { daoAirdrop: false, burnFee: false, creatorFee: false },
    fees: {
      ...initialLaunchpadState.fees,
      totalFee: 0.5,
      lpFee: 0.15,
      treasuryFee: 0.15,
      burnFee: 0,
      creatorFee: 0,
    },
    logoUrl: "data:image/png;base64,AQID",
    logoFileName: "logo.png",
    ...overrides,
  };
}

function mockFactory(totalLaunches = 3) {
  const rpc = vi.fn().mockResolvedValue("5".repeat(88));
  const accounts = vi.fn().mockReturnValue({ rpc });
  const createLaunch = vi.fn().mockReturnValue({ accounts });
  return {
    program: {
      methods: { createLaunch },
      account: {
        factoryConfig: {
          fetch: vi.fn().mockResolvedValue({ totalLaunches: new BN(totalLaunches) }),
        },
      },
    },
    rpc,
    accounts,
    createLaunch,
  };
}

describe("submitCreateLaunch", () => {
  it("uploads logo + Metaplex JSON then sends Factory createLaunch for the next launch id", async () => {
    const factory = mockFactory(3);
    const uploads: Array<{ filename: string; contentType: string }> = [];
    const result = await submitCreateLaunch({
      state: launchState(),
      wallet: TEAM,
      nowSeconds: 1_700_000_000,
      whitelist: [
        { name: "cSOL", icon: "◎", base: "SOL", eol: "Isolated gold reserve", mint: CSOL },
        { name: "cBTC", icon: "₿", base: "BTC", eol: "Isolated gold reserve", mint: CBTC },
      ],
      daoContract: DAO,
      generateMint: () => MINT,
      factory: factory.program as never,
      upload: async (file) => {
        uploads.push({ filename: file.filename, contentType: file.contentType });
        if (file.contentType === "application/json") {
          return { url: "https://cdn.example/aero.json" };
        }
        return { url: "https://cdn.example/logo.png" };
      },
    });

    expect(uploads[0]).toEqual({ filename: "logo.png", contentType: "image/png" });
    expect(uploads[1]).toEqual({ filename: "aero.json", contentType: "application/json" });
    expect(result).toMatchObject({
      signature: "5".repeat(88),
      launchId: 3,
      mint: MINT.publicKey.toBase58(),
      metadataUri: "https://cdn.example/aero.json",
    });
    expect(factory.createLaunch).toHaveBeenCalledOnce();
    const [launchId] = factory.createLaunch.mock.calls[0] as [BN, Record<string, unknown>];
    expect(launchId.toString()).toBe("3");
    const accountArg = factory.accounts.mock.calls[0][0] as { mint: PublicKey; creator: PublicKey };
    expect(accountArg.mint.equals(MINT.publicKey)).toBe(true);
    expect(accountArg.creator.toBase58()).toBe(TEAM);
    expect(factory.rpc).toHaveBeenCalledOnce();
  });

  it("still creates metadata when no logo is chosen", async () => {
    const factory = mockFactory(0);
    const uploads: string[] = [];
    const result = await submitCreateLaunch({
      state: launchState({ logoUrl: null, logoFileName: null }),
      wallet: TEAM,
      nowSeconds: 1_700_000_000,
      whitelist: [
        { name: "cSOL", icon: "◎", base: "SOL", eol: "Isolated gold reserve", mint: CSOL },
        { name: "cBTC", icon: "₿", base: "BTC", eol: "Isolated gold reserve", mint: CBTC },
      ],
      daoContract: DAO,
      generateMint: () => MINT,
      factory: factory.program as never,
      upload: async (file) => {
        uploads.push(file.contentType);
        return { url: "https://cdn.example/aero.json" };
      },
    });

    expect(uploads).toEqual(["application/json"]);
    expect(result.metadataUri).toBe("https://cdn.example/aero.json");
  });
});
