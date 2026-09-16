export function EolSection() {
  return (
    <section id="eol">
      <h2>End of Life</h2>
      <p>
        When a project is finished, holders end it on their terms instead of
        watching it bleed out.
      </p>
      <p>
        <b>1. Trouble gate.</b> Liquidation cannot even be proposed unless the
        token shows real trouble: its price sits within 10% of its reserve value
        for a sustained stretch, its volume falls below 1% of market cap, or an
        escrow freeze has already passed. Either DAO body can also vote the gate
        open directly, so a token cannot be kept artificially &quot;healthy&quot;
        to block a needed wind-down. Opening the gate only permits a proposal;
        it decides nothing. This keeps anyone from proposing the death of an
        obviously healthy token. <b>2. Proposal.</b> Once the gate is open, any
        holder of the token, or a council ambassador, can propose liquidation.{" "}
        <b>3. Vote.</b> A 14-day vote of staked weight decides, needing a{" "}
        <b>67% supermajority</b> with a <b>10% quorum</b>, resolved only at the
        window&apos;s end. <b>4. DAO circuit breaker.</b> The token&apos;s holders
        run this themselves; the DAO never has to approve them, and the DAO votes{" "}
        <b>at the same time, in the same window</b>, not afterwards. The protocol
        DAO community and the elected council each vote alongside the holders; the
        holder outcome stands unless <b>both</b> DAO bodies, each independently
        at <b>67%</b>, land against it, cancelling a passed liquidation or
        carrying a failed one through. One body is never enough. This is what
        answers a hostile takeover: if someone buys up enough supply to vote
        down every liquidation and hold the token hostage, the two bodies together
        can still wind it down. Because liquidation only ever distributes the
        treasury pro-rata, even an override pays every holder their fair share
        and seizes nothing. A failed proposal cannot be re-raised for two weeks.
        Transmuter&apos;s founders also hold a cancel-only emergency veto, checked
        at execution, that can only stop a liquidation, never force one; it
        begins as a multi use precaution early in the protocol&apos;s life and is
        renounced one way only, stepping down to a single use per cycle and
        eventually to nothing as the DAO matures. <b>5. Execution.</b> Anyone can
        then trigger it: pending fees settle, the protocol LP unwinds into
        cTokens for the treasury, minting closes forever, and the token enters
        its final state.
      </p>
      <p>
        After liquidation, <b>redemption stays open forever</b>. Wallet balances
        and staked balances are untouched; every holder redeems against the full
        treasury at the final redemption ratio, whenever they choose.
      </p>
      <p>
        The same logic exists one layer down: if a cToken&apos;s underlying asset
        suffers a verified, sustained collapse, the DAO can end that cToken&apos;s
        life, needing both the elected council and the DAO community at a 67%
        supermajority.
      </p>
      <p>
        <b>What a cToken end of life actually does, and why it is not an attack.</b>{" "}
        It does exactly one thing: it <b>adds</b> a second redemption option.
        Before it, a cSOL holder redeems for SOL. After it, that holder redeems
        for SOL <b>or</b> for tokenized gold, their choice, one or the other on
        each redemption. <b>The underlying redemption never closes.</b> Nothing is
        seized, no balance changes, no supply is minted, and nobody is forced out
        of anything.
      </p>
      <p>
        This is why triggering it falsely gains an attacker nothing. Suppose one
        were somehow passed against a perfectly healthy cSOL. The attacker&apos;s
        reward is the right to swap SOL they could already redeem for gold
        instead, at a price that is deliberately worse for them, while every other
        holder simply carries on redeeming SOL as before. There is no drain to
        perform, either: the gold reserve pays <b>pro rata</b>, so holding 5% of
        the supply is a claim on 5% of the reserve and nothing more. To reach all
        of it you would have to own every token, which means having bought out
        the entire market first. That is not an exploit, it is a purchase.
      </p>
      <p>
        That layer is the chain&apos;s last resort, and it has no further fallback
        because it does not need one.
      </p>
    </section>
  );
}
