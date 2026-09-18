import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { runLifecycle } from "../scripts/lifecycle";

describe("lifecycle keeper (launch through redemption)", () => {
  it("launch → sale → finalize → convert → fees → set_price reserve mint → vote → liquidation → redeem", async function () {
    this.timeout(240_000);
    const provider = anchor.AnchorProvider.env();
    const result = await runLifecycle(provider);
    expect(result.convertDone).to.equal(true);
    expect(result.oracleSnapped).to.equal(true);
    expect(result.reserveMinted).to.equal(true);
    expect(result.liquidated).to.equal(true);
    expect(result.redeemed).to.equal(true);
    expect(result.status).to.equal(3);
  });
});
