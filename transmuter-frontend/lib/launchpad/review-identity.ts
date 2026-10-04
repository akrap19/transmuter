export type IdentitySocials = {
  tokenWebsite: string;
  tokenTwitter: string;
  tokenTelegram: string;
  tokenDiscord: string;
};

export function identityReviewSocials(state: IdentitySocials): Array<{ label: string; value: string }> {
  return [
    { label: "Website", value: state.tokenWebsite.trim() || "—" },
    { label: "X", value: state.tokenTwitter.trim() || "—" },
    { label: "Telegram", value: state.tokenTelegram.trim() || "—" },
    { label: "Discord", value: state.tokenDiscord.trim() || "—" },
  ];
}
