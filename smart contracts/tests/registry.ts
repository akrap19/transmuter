import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { FOUNDER } from "./read-constants";
import { decodeRegistryConfigPrefix } from "./registry-layout";

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

describe("registry shim (ambassador + council vote)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const registry = anchor.workspace.TransmuterRegistry as Program;
  const payer = provider.wallet.publicKey;
  const team = payer;
  const daoProgram = PublicKey.unique();
  const config = pda([Buffer.from("config")], registry.programId);
  const stranger = PublicKey.unique();

  it("initialises a streaming-decodable config prefix with ambassadorCount = 0", async () => {
    await registry.methods
      .initialize(team, [], 0, daoProgram, 7)
      .accounts({
        payer,
        config,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const raw = await provider.connection.getAccountInfo(config);
    expect(raw).to.not.equal(null);
    const decoded = decodeRegistryConfigPrefix(raw!.data);
    expect(decoded.team.equals(team)).to.equal(true);
    expect(decoded.founders).to.have.length(0);
    expect(decoded.founderThreshold).to.equal(0);
    expect(decoded.daoProgram.equals(daoProgram)).to.equal(true);
    expect(decoded.ambassadorCount).to.equal(0);
    expect(decoded.maxAmbassadors).to.equal(7);
    expect(decoded.genesisLocked).to.equal(true);
    // Shim-only suffix (is_shim, bump) must sit AFTER the prefix so a
    // real Registry can append its own fields without breaking consumers.
    expect(decoded.prefixEnd < raw!.data.length, "trailing bytes after prefix").to.equal(
      true,
    );
    expect(raw!.data[decoded.prefixEnd]).to.equal(1);
  });

  it("isAmbassador is false and getAmbassadorCount is 0 — never divide by this", async () => {
    const isAmb = await registry.methods
      .isAmbassador(stranger)
      .accounts({ config })
      .view();
    const count = await registry.methods.getAmbassadorCount().accounts({ config }).view();
    const all = await registry.methods.getAllAmbassadors().accounts({ config }).view();
    expect(isAmb).to.equal(false);
    expect(Number(count)).to.equal(0);
    expect(all).to.deep.equal([]);
  });

  it("getCouncilLiquidationResult answers exists=true, quorumMet=false", async () => {
    const proposalId = Array.from({ length: 32 }, (_, i) => i);
    const result = await registry.methods
      .getCouncilLiquidationResult(proposalId)
      .accounts({ config })
      .view();
    expect(result.exists).to.equal(true);
    expect(result.quorumMet).to.equal(false);
    expect(result.passed).to.equal(false);
    expect(result.yesWeight.toNumber()).to.equal(0);
    expect(result.noWeight.toNumber()).to.equal(0);
    // quorumMet is its own field — not inferred from passed.
    expect(result.resolved).to.equal(true);
    expect(Object.keys(result)).to.deep.equal([
      "exists",
      "resolved",
      "passed",
      "yesWeight",
      "noWeight",
      "quorumMet",
      "closesAt",
    ]);
  });

  it("openCouncilLiquidationVote reverts when windowEnd is not in the future", async () => {
    const proposalId = Array.from({ length: 32 }, () => 1);
    const now = Math.floor(Date.now() / 1000);
    try {
      await registry.methods
        .openCouncilLiquidationVote(proposalId, new anchor.BN(now - 1))
        .accounts({ config })
        .rpc();
      expect.fail("expected WindowEnd");
    } catch (err: unknown) {
      expect(String(err)).to.include("WindowEnd");
    }
  });

  it("streaming decoder still reads the prefix when extra bytes follow", () => {
    const prefix = decodeRegistryConfigPrefix(
      Buffer.concat([
        Buffer.alloc(8),
        team.toBuffer(),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from([2]),
        daoProgram.toBuffer(),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from([7, 0, 0, 0]),
        Buffer.from([1]),
        Buffer.alloc(64, 0xab),
      ]),
    );
    expect(prefix.ambassadorCount).to.equal(0);
    expect(prefix.founderThreshold).to.equal(2);
    expect(prefix.genesisLocked).to.equal(true);
    expect(prefix.maxAmbassadors).to.equal(7);
    expect(prefix.daoProgram.equals(daoProgram)).to.equal(true);
  });

  it("pins VoteType discriminants used by the council/DAO door", () => {
    expect(FOUNDER.VOTE_LIQ_DAO).to.equal(5);
    expect(FOUNDER.VOTE_GATE1_FALLBACK).to.equal(10);
  });
});
