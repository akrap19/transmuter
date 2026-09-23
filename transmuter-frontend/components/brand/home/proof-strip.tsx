const points = [
  "An isolated treasury from the first block",
  "Contract-owned liquidity, not a team wallet",
  "An escrow schedule or none, fixed at launch",
];

export function ProofStrip() {
  return (
    <section className="proof-strip section-shell reveal">
      <p>Built for Solana. Defined before trading.</p>
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
