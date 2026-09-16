import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

describe("mock pyth", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const pyth = (anchor.workspace as Record<string, Program>).mockPyth
    ?? (anchor.workspace as Record<string, Program>).MockPyth;
  const payer = provider.wallet.publicKey;

  it("sets price, confidence, and publish time", async () => {
    const [feed] = PublicKey.findProgramAddressSync(
      [Buffer.from("price_feed"), payer.toBuffer()],
      pyth.programId,
    );

    await pyth.methods
      .initialize(-8)
      .accounts({ payer, priceFeed: feed })
      .rpc();

    await pyth.methods
      .setPrice(new anchor.BN(148_000_000), new anchor.BN(25_000), new anchor.BN(1_700_000_000))
      .accounts({ priceFeed: feed, owner: payer })
      .rpc();

    const acc = await pyth.account.priceFeed.fetch(feed);
    expect(acc.expo).to.equal(-8);
    expect(acc.price.toNumber()).to.equal(148_000_000);
    expect(acc.conf.toNumber()).to.equal(25_000);
    expect(acc.publishTime.toNumber()).to.equal(1_700_000_000);
  });
});
