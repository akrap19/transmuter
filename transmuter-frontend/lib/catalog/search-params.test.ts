import { describe, expect, it } from "vitest";
import {
  coinPathWithExplore,
  coinQueryHasFilters,
  explorePathFromCoinSearch,
  parseCoinSearchParams,
  parsePreviewFlag,
  searchParamsFromRecord,
  serializeCoinQuery,
} from "./search-params";

describe("parseCoinSearchParams", () => {
  it("reads search, multi-status, sort, and backing from the query string", () => {
    const query = parseCoinSearchParams(
      new URLSearchParams("q=helix&status=sale&status=voided&sort=marketCapUsd&dir=asc&backing=cSOL"),
    );

    expect(query).toEqual({
      search: "helix",
      status: ["sale", "voided"],
      sort: "marketCapUsd",
      dir: "asc",
      backing: "cSOL",
    });
  });

  it("treats search, status, sort, and backing as filters", () => {
    expect(coinQueryHasFilters({})).toBe(false);
    expect(coinQueryHasFilters(parseCoinSearchParams(new URLSearchParams("q=helix")))).toBe(true);
    expect(coinQueryHasFilters(parseCoinSearchParams(new URLSearchParams("sort=nope")))).toBe(false);
  });

  it("ignores unknown statuses and sort fields", () => {
    const query = parseCoinSearchParams(new URLSearchParams("status=nope&sort=volume&dir=sideways&q="));

    expect(query).toEqual({});
  });

  it("flattens Next.js searchParam records into URLSearchParams", () => {
    const query = parseCoinSearchParams(
      searchParamsFromRecord({ q: "helix", status: ["sale", "voided"], sort: "name" }),
    );

    expect(query).toEqual({ search: "helix", status: ["sale", "voided"], sort: "name" });
  });
});

describe("parsePreviewFlag", () => {
  it("turns on sample-wallet preview only for preview=1", () => {
    expect(parsePreviewFlag(new URLSearchParams("preview=1"))).toBe(true);
    expect(parsePreviewFlag(new URLSearchParams("preview=true"))).toBe(false);
    expect(parsePreviewFlag(new URLSearchParams())).toBe(false);
  });
});

describe("explore return path", () => {
  const filtered = {
    search: "test",
    status: "created" as const,
    sort: "holderCount" as const,
    dir: "desc" as const,
    backing: "cSOL",
  };

  it("keeps Explore filters on the coin link and restores them on the back link", () => {
    const href = coinPathWithExplore("MintHelix", filtered);
    const explore = new URL(href, "http://localhost").searchParams.get("explore");

    expect(href.startsWith("/coins/MintHelix?explore=")).toBe(true);
    expect(explorePathFromCoinSearch(new URLSearchParams({ explore: explore ?? "" }))).toBe(
      "/coins?q=test&status=created&sort=holderCount&dir=desc&backing=cSOL",
    );
  });

  it("returns plain Explore when the coin was not opened from a filtered list", () => {
    expect(coinPathWithExplore("MintHelix", {})).toBe("/coins/MintHelix");
    expect(explorePathFromCoinSearch(new URLSearchParams())).toBe("/coins");
    expect(explorePathFromCoinSearch(new URLSearchParams("explore=https://evil.example/phish"))).toBe("/coins");
  });
});

describe("serializeCoinQuery", () => {
  it("round-trips a query through the URL search params", () => {
    const params = serializeCoinQuery({
      search: "nim",
      status: ["active", "voided"],
      sort: "name",
      dir: "asc",
    });

    expect(parseCoinSearchParams(params)).toEqual({
      search: "nim",
      status: ["active", "voided"],
      sort: "name",
      dir: "asc",
    });
  });
});
