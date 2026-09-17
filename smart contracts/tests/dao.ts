import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { FOUNDER } from "./read-constants";

function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

describe("dao shim (community vote)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const dao = anchor.workspace.TransmuterDao as Program;
  const payer = provider.wallet.publicKey;
  const config = pda([Buffer.from("config")], dao.programId);
  const proposalId = Array.from({ length: 32 }, (_, i) => (i + 3) % 256);

  it("initialises and getCommunityVoteResult answers exists=true, quorumMet=false", async () => {
    await dao.methods
      .initialize()
      .accounts({
        payer,
        config,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const result = await dao.methods
      .getCommunityVoteResult(proposalId)
      .accounts({ config })
      .view();
    expect(result.exists).to.equal(true);
    expect(result.quorumMet).to.equal(false);
    expect(result.passed).to.equal(false);
    expect(result.resolved).to.equal(true);
    expect(result.yesWeight.toNumber()).to.equal(0);
    expect(result.noWeight.toNumber()).to.equal(0);
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

  it("openCommunityVote is (proposalId, voteType, windowEnd) and accepts VOTE_LIQ_DAO", async () => {
    const windowEnd = Math.floor(Date.now() / 1000) + 14 * 24 * 3600;
    await dao.methods
      .openCommunityVote(proposalId, FOUNDER.VOTE_LIQ_DAO, new anchor.BN(windowEnd))
      .accounts({ config })
      .rpc();
    const result = await dao.methods
      .getCommunityVoteResult(proposalId)
      .accounts({ config })
      .view();
    expect(result.exists).to.equal(true);
    expect(result.quorumMet).to.equal(false);
  });

  it("openCommunityVote reverts a past windowEnd and action-bearing types", async () => {
    const now = Math.floor(Date.now() / 1000);
    try {
      await dao.methods
        .openCommunityVote(proposalId, FOUNDER.VOTE_LIQ_DAO, new anchor.BN(now - 1))
        .accounts({ config })
        .rpc();
      expect.fail("expected WindowEnd");
    } catch (err: unknown) {
      expect(String(err)).to.include("WindowEnd");
    }
    try {
      await dao.methods
        .openCommunityVote(
          proposalId,
          FOUNDER.VOTE_SENSITIVE,
          new anchor.BN(now + 3600),
        )
        .accounts({ config })
        .rpc();
      expect.fail("expected WrongVoteType");
    } catch (err: unknown) {
      expect(String(err)).to.include("WrongVoteType");
    }
  });

  it("VoteType discriminants never shift; GATE1_FALLBACK stays last", () => {
    expect(FOUNDER.VOTE_SENSITIVE).to.equal(0);
    expect(FOUNDER.VOTE_UPGRADE).to.equal(1);
    expect(FOUNDER.VOTE_AMBASSADOR).to.equal(2);
    expect(FOUNDER.VOTE_DAO_INTERNAL).to.equal(3);
    expect(FOUNDER.VOTE_EOL_GATE3).to.equal(4);
    expect(FOUNDER.VOTE_LIQ_DAO).to.equal(5);
    expect(FOUNDER.VOTE_FREEZE).to.equal(6);
    expect(FOUNDER.VOTE_GATE_OPEN).to.equal(7);
    expect(FOUNDER.VOTE_EMERGENCY).to.equal(8);
    expect(FOUNDER.VOTE_ESCROW_DAO).to.equal(9);
    expect(FOUNDER.VOTE_GATE1_FALLBACK).to.equal(10);
  });
});
