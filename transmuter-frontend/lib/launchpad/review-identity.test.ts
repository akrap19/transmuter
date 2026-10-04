import { describe, expect, it } from "vitest";
import { identityReviewSocials } from "./review-identity";

describe("identityReviewSocials", () => {
  it("shows website, X, Telegram, and Discord on review", () => {
    expect(
      identityReviewSocials({
        tokenWebsite: "https://aero.example",
        tokenTwitter: "@aero",
        tokenTelegram: "https://t.me/aero",
        tokenDiscord: "https://discord.gg/aero",
      }),
    ).toEqual([
      { label: "Website", value: "https://aero.example" },
      { label: "X", value: "@aero" },
      { label: "Telegram", value: "https://t.me/aero" },
      { label: "Discord", value: "https://discord.gg/aero" },
    ]);
  });

  it("shows a dash when a social is blank", () => {
    expect(
      identityReviewSocials({
        tokenWebsite: "  ",
        tokenTwitter: "",
        tokenTelegram: "",
        tokenDiscord: "",
      }).map((row) => row.value),
    ).toEqual(["—", "—", "—", "—"]);
  });
});
