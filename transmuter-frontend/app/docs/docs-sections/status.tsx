import { externalLinks, teamEmail } from "@/lib/routes";

export function StatusSection() {
  return (
    <section id="status">
      <h2>Status</h2>
      <p>
        The protocol specification is complete and the first deployment is in
        development, targeting Solana, with independent audits and a public beta
        gating every release. Nothing ships unreviewed.
      </p>
      <p>
        Questions, integrations, early access:{" "}
        <a href={externalLinks.email}>{teamEmail}</a>
      </p>
    </section>
  );
}
