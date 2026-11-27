import Link from "next/link";
import { routes } from "@/lib/routes";

const problems = [
  {
    index: "01",
    title: "Liquidity can disappear.",
    body: "If liquidity is unlocked or controlled by the team, it can be removed, leaving holders with thin or unusable markets.",
  },
  {
    index: "02",
    title: "Teams can stop building.",
    body: "A project can raise capital, release funds, then slow down or abandon development. Holders have no built-in way to force delivery.",
  },
  {
    index: "03",
    title: "Holders can get stuck.",
    body: "When a project dies, the token may keep trading, but its liquidity pools get drained within minutes, with no defined path to return value to holders.",
  },
];

const constraints = [
  [
    "Move the treasury",
    "No",
    "No",
    "Only by redemption, a holder-voted draw into escrow, or end of life. Up to 10% a year can move into escrow, proposed by the creator, passed by holders, then approved by the DAO council or Transmuter. It lowers the redemption value, and at most half of what it adds can be released when it executes.",
  ],
  ["Pull scheduled escrow at will", "No", "No", "It releases on its schedule by itself. Only holders can halt, resume or advance it"],
  ["Release the next team tranche", "No unilateral early release", "No", "Schedule or holder vote"],
  ["Force a holder payout amount", "No", "No", "On-chain redemption value. Redemption is open at any time"],
  [
    "Trigger end of life unilaterally",
    "No",
    "No",
    "Two parties, one of them the creator or a holder with 0.1% of supply, after the trouble condition, then a 30-day vote at two-thirds with a 10% quorum",
  ],
  ["Rewrite the escrow schedule", "No", "No", "Fixed at launch"],
];

export function ProblemSection() {
  return (
    <section className="problem-section section-shell reveal section-light">
      <p className="eyebrow">THE PROBLEM</p>
      <h2>Launching is easy. Protecting holders afterwards is not.</h2>
      <div aria-label="Why Transmuter exists" className="problem-editorial problem-editorial-compact">
        {problems.map((problem) => (
          <article className={`problem-point problem-point-${problem.index === "01" ? "one" : problem.index === "02" ? "two" : "three"}`} key={problem.index}>
            <span className="problem-index">{problem.index}</span>
            <strong className="problem-title">{problem.title}</strong>
            <p>{problem.body}</p>
          </article>
        ))}
      </div>
      <ConstraintTable />
    </section>
  );
}

function ConstraintTable() {
  return (
    <div className="constraint-intro" id="constraints">
      <div className="constraint-teaser">
        <span aria-hidden className="proof-symbol">✳</span>
        <div>
          <p className="eyebrow">THE CONTRACT BOUNDARY</p>
          <h3>The fewer ways to cheat, the less trust you need.</h3>
          <p>See which decisions the team, Transmuter, and the protocol are actually permitted to make.</p>
        </div>
      </div>
      <details className="constraint-disclosure">
        <summary>
          <span>Explore the contract constraints</span>
          <span aria-hidden className="disclosure-sign">+</span>
        </summary>
        <div className="constraint-disclosure-content">
          <div aria-label="Actions available to the team, Transmuter and the protocol" className="constraint-table" role="table">
            <div className="constraint-row head" role="row">
              <span role="columnheader">Action</span>
              <span role="columnheader">Team</span>
              <span role="columnheader">Transmuter</span>
              <span role="columnheader">Protocol</span>
            </div>
            {constraints.map((row) => (
              <div className="constraint-row" key={row[0]} role="row">
                <strong role="cell">{row[0]}</strong>
                <span role="cell">{row[1]}</span>
                <span role="cell">{row[2]}</span>
                <span role="cell">{row[3]}</span>
              </div>
            ))}
          </div>
          <p className="constraint-note">
            Transmuter&apos;s multisig can stop a passed end of life within 48 hours, and the DAO can cancel one.
            Neither can start or force one. The reserves program can be upgraded so bugs can be fixed. For now that
            takes Transmuter&apos;s 3-of-5 multisig, with its own signers; later it will take Transmuter plus the DAO
            council or the DAO&apos;s holders.{" "}
            <Link className="text-link" href={`${routes.docs}#governance`}>
              See the governance section.
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}
