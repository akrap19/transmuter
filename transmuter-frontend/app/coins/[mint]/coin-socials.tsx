import type { CoinSocials } from "@/lib/catalog/types";

const LABELS: Array<[keyof CoinSocials, string]> = [
  ["website", "Website"],
  ["twitter", "Twitter"],
  ["telegram", "Telegram"],
  ["discord", "Discord"],
];

export function CoinSocials({ socials }: { socials: CoinSocials }) {
  const links = LABELS.filter(([key]) => socials[key]);
  if (links.length === 0) {
    return <p className="coin-note">No socials on the metadata uri yet.</p>;
  }

  return (
    <ul className="coin-socials">
      {links.map(([key, label]) => (
        <li key={key}>
          <a href={socials[key] ?? undefined} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
