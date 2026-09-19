import { describe, expect, it } from "vitest";
import { parseCoinSearchParams, searchParamsFromRecord, serializeCoinQuery } from "./search-params";

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
