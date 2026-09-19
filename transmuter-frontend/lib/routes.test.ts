import { describe, expect, it } from "vitest";
import { coinPath, isActivePath, routes } from "./routes";

describe("isActivePath", () => {
  it("treats coin detail as part of Explore and does not light Home for other pages", () => {
    expect(isActivePath("/coins/MintHelix", routes.coins)).toBe(true);
    expect(isActivePath("/launchpad", routes.home)).toBe(false);
    expect(coinPath("MintHelix")).toBe("/coins/MintHelix");
  });
});
