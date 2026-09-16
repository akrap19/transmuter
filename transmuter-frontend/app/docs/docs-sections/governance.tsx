export function GovernanceSection() {
  return (
    <section id="governance">
      <h2>Governance</h2>
      <p>
        Transmuter runs on <b>Mutually Assured Alignment</b>. The model is built
        so that harming one party harms whoever tries it first, and acting in the
        protocol&apos;s interest becomes the same as acting in your own.
      </p>
      <p>
        Everything consequential is <b>opt-in</b>: a change or action takes effect
        only when a vote actively approves it, never by default. The things put to
        a vote are always things that matter, so nothing meaningful happens to a
        token unless its holders decide it.
      </p>
      <p>
        Authority sits in layers, none of them us. <b>Token holders</b> govern
        their own token: they decide changes to it, approve a Mint to Scale, and
        decide its end of life. The <b>protocol DAO and its elected council</b> of
        7 to 100 (10 to 50 at genesis) are not rulers but guardians. Their power
        is deliberately narrow, to stand against a hostile takeover. For a
        token&apos;s end of life, the DAO can only override the holders when{" "}
        <b>both bodies move together</b>, each at 67%, never either alone. For
        changes at the protocol level, authority takes{" "}
        <b>any two of three groups</b>, the DAO community, the council, and the
        founders, so no single party can force a change or block one by sitting
        out; if any one group is ever captured, the other two can still keep the
        protocol moving. The DAO elects and can impeach the council. The layers
        check each other, so no single party, captured or hostile, can force an
        outcome the others would refuse.
      </p>
      <p>
        Two forces keep it honest. <b>Deterrence:</b> anyone who votes for a
        harmful change is held through a short lock afterwards, so if it damages
        the token it damages them first. <b>Incentives:</b> the people who steer
        governance well earn a share of protocol fees, revocable by the community
        or the founders if they act in bad faith. Good stewardship is paid, bad
        faith is removed. And against an active attack there is a <b>freeze</b>:
        any two of the three groups can freeze a staked position that is being
        used to push a harmful vote, which stops it voting and unstaking without
        ever touching a wallet balance or a transfer. Frozen tokens are never
        seized or redistributed, so a mistaken freeze is fully reversible, but
        an attacker&apos;s capital can be trapped for as long as the attack lasts.
      </p>
      <p>
        It is the same logic that secures a blockchain. No single validator can
        rewrite Solana, and taking over enough of them to try is too expensive to
        be worth it. Spread authority across many aligned parties and capture
        stops being a switch someone can flip; it becomes a cost almost nobody
        can pay.
      </p>
      <p>
        There are <b>no hidden admin keys</b>. Treasuries move only through
        redemption and voted, on-chain execution. Two founder powers exist, and we
        would rather describe them plainly than let you find them in the code.
      </p>
      <p>
        The first is a <b>veto</b>. It can only ever cancel a pending end of life
        or liquidation, never trigger or accelerate one, and it steps down one way
        as a community matures until it is gone.
      </p>
      <p>
        The second is an <b>emergency action</b>, and it can push rather than only
        block. A protocol that sells itself as a safety layer cannot sit and wait
        for a week long vote while an exploit drains a contract, so this one
        executes the moment it is authorised. Early on, founders authorise it
        alone. After that authority sunsets, it needs the founders <b>plus</b> the
        council or the holders, and the council can clear it in minutes rather
        than days. What makes it safe is not a delay, it is what the power cannot
        reach: an emergency action can{" "}
        <b>
          never move a treasury, mint a token, alter a balance, block a redemption,
          or force a liquidation
        </b>
        . It can pause a contract and ship a fix. You can always redeem, even
        while a contract is paused. Every use is public on chain, any two of the
        three governing groups can reverse it afterwards, and the founders only
        phase ends automatically, at a deadline fixed in the contract before
        launch, or the moment the DAO proves it is alive, whichever comes first.
        We can also end it early, and never restart it.
      </p>
      <p>
        We think that is the honest trade. The worst a founder can do with this
        power is halt a contract for a while, in public, and have the DAO undo it.
        There is no version of it that ends with your funds moved or new supply
        printed, because those actions are not in its reach.
      </p>
    </section>
  );
}
