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
    body: "When a project dies, the token may keep trading while treasury and liquidity remain inaccessible, with no defined path to return value to holders.",
  },
];

const constraints = [
  ["Move the treasury", "No", "No", "Protocol-defined recovery"],
  ["Pull scheduled escrow at will", "No", "No", "Rules and governance"],
  ["Release the next team tranche", "No unilateral early release", "No", "Schedule or holder vote"],
  ["Force a holder payout amount", "No", "No", "On-chain ratio"],
  ["Wind down a token unilaterally", "No", "No", "Holder vote and safeguards"],
  ["Rewrite the escrow schedule", "No", "No", "Fixed at launch"],
];

export function ProblemSection() {
  return (
    <section className="problem-section section-shell reveal section-light">
      <p className="eyebrow">THE PROBLEM</p>
      <h2>Launching is easy. Protecting holders afterward is not.</h2>
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
            The founder safeguard can cancel a malicious recovery proposal. It cannot initiate a payout or redirect
            reserves. The boundaries of other emergency governance powers are pending publication.
          </p>
        </div>
      </details>
    </div>
  );
}
