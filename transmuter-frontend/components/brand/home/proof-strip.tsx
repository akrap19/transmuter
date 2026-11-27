const points = [
  "An isolated treasury from the first block",
  "Pools nobody can pull or drain",
  "An escrow schedule or none, fixed at launch",
  "At most half the escrow can be released at finalisation",
];

export function ProofStrip() {
  return (
    <section className="proof-strip section-shell reveal">
      <h2>Built for Solana. Defined before trading.</h2>
      <div aria-label="Transmuter launch structure" className="proof-marquee">
        <div className="proof-track">
          <div className="proof-points">
            {points.map((point) => (
              <span key={point}>
                <i />
                {point}
              </span>
            ))}
          </div>
          <div aria-hidden className="proof-points">
            {points.map((point) => (
              <span key={point}>
                <i />
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
