export function GovernanceSection() {
  return (
    <>
      <section id="for-launch-platforms">
        <h2>For Launch Platforms</h2>
        <p>
          Transmuter is infrastructure, not only a launchpad. Other platforms can run their launches
          on it and give their tokens the same reserves, escrow and end of life procedure.
        </p>
        <p>
          A platform keeps its own users and its own launches, and can add its own fee on top.
          Transmuter&apos;s share stays the same everywhere: 0.15% on transfers and redemptions,
          0.25% on mints and at end of life.
        </p>
        <p>
          Every launch on the infrastructure is built on Transmuter&apos;s cTokens, so every one
          strengthens the reserve layer beneath all the others.
        </p>
      </section>

      <section id="governance">
        <h2>Governance</h2>
        <p>
          Transmuter runs on <strong>Mutually Assured Alignment</strong>. Harming the protocol
          harms whoever tries it first, so acting in its interest becomes the same as acting in your
          own.
        </p>
        <p>
          Everything consequential is <strong>opt-in</strong>: nothing meaningful happens to a token
          unless a vote actively approves it.
        </p>
        <p>
          <strong>Who decides what.</strong>
        </p>
        <ul>
          <li>
            <strong>Token holders</strong> govern their own token: its settings, its Mint to Scale
            events and its end of life.
          </li>
          <li>
            <strong>The protocol DAO and its elected council</strong> of 7 to 100 (10 to 50 at
            genesis) are guardians, not rulers. Their power is deliberately narrow: to stand against
            a hostile takeover. On a token&apos;s end of life they can only override holders when
            both bodies act together.
          </li>
          <li>
            <strong>Protocol level changes</strong> need any two of three groups: the DAO community,
            the council and the founders. No single party can force a change or block one by sitting
            out.
          </li>
        </ul>
        <p>
          <strong>What can change after launch, and what cannot.</strong>
        </p>
        <ul>
          <li>The escrow schedule cannot be rewritten by anyone. Holders can halt it and advance one
            tranche.</li>
          <li>Fees can move through governance, only within bounds set before launch.</li>
          <li>The treasury moves only through redemption and end of life.</li>
        </ul>
        <p>
          <strong>Deterrence and incentives.</strong> Anyone who votes for a harmful change is held
          through a short lock afterwards, so if it damages the token it damages them first. People
          who steer governance well earn a share of protocol fees, revocable if they act in bad
          faith. Any two of the three governing groups can freeze a staked position being used to
          push a harmful vote. A freeze stops it voting and unstaking, never touches a wallet
          balance, and is fully reversible.
        </p>
        <p>
          <strong>No hidden admin keys.</strong> Two founder powers exist, and we would rather
          describe them than have you find them in the code.
        </p>
        <p>
          The first is the <strong>cancel-only veto</strong> described above.
        </p>
        <p>
          The second is an <strong>emergency action</strong>, for when an exploit is live and a
          week-long vote would be too slow. Early on, the founders can authorise it alone; after
          that it needs the founders plus the council or the holders. It can pause a contract and
          ship a fix. It can <strong>never move a treasury, mint a token, alter a balance, block a
          redemption or force an end of life</strong>. You can always redeem, even while a contract
          is paused. Every use is public, any two of the three groups can reverse it, and the
          founders&apos; sole authority ends automatically at a deadline fixed before launch, or as
          soon as the DAO proves it is active.
        </p>
        <p>
          The worst a founder can do with it is halt a contract for a while, in public, and have the
          DAO undo it.
        </p>
      </section>
    </>
  );
}
