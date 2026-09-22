"use client";

import { useRouter } from "next/navigation";
import { formatStatus } from "@/lib/catalog/format";
import { serializeCoinQuery } from "@/lib/catalog/search-params";
import { LAUNCH_STATUSES, type CoinQuery, type LaunchStatus } from "@/lib/catalog/types";
import { routes } from "@/lib/routes";

const SORTS = [
  { value: "launchedAt:desc", label: "Newest" },
  { value: "launchedAt:asc", label: "Oldest" },
  { value: "marketCapUsd:desc", label: "Market cap" },
  { value: "priceUsd:desc", label: "Price" },
  { value: "name:asc", label: "Name" },
  { value: "holderCount:desc", label: "Holders" },
] as const;

type ExploreToolbarProps = {
  query: CoinQuery;
};

function sortValue(query: CoinQuery) {
  return `${query.sort ?? "launchedAt"}:${query.dir ?? "desc"}`;
}

export function ExploreToolbar({ query }: ExploreToolbarProps) {
  const router = useRouter();

  function apply(next: CoinQuery) {
    const qs = serializeCoinQuery(next).toString();
    router.replace(qs ? `${routes.coins}?${qs}` : routes.coins);
  }

  return (
    <form
      className="catalog-toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        apply({ ...query, search: String(data.get("q") ?? "") || undefined });
      }}
    >
      <label className="catalog-field">
        <span>Search</span>
        <input name="q" type="search" placeholder="Name, ticker, or mint" defaultValue={query.search ?? ""} />
      </label>
      <label className="catalog-field">
        <span>Status</span>
        <select
          value={Array.isArray(query.status) ? "" : (query.status ?? "")}
          onChange={(event) => apply({ ...query, status: (event.target.value || undefined) as LaunchStatus | undefined })}
        >
          <option value="">All (incl. VOIDED)</option>
          {LAUNCH_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="catalog-field">
        <span>Backing</span>
        <select
          value={query.backing ?? ""}
          onChange={(event) => apply({ ...query, backing: event.target.value || undefined })}
        >
          <option value="">All</option>
          <option value="cSOL">cSOL</option>
          <option value="cBTC">cBTC</option>
        </select>
      </label>
      <label className="catalog-field">
        <span>Sort</span>
        <select
          value={sortValue(query)}
          onChange={(event) => {
            const [sort, dir] = event.target.value.split(":") as [CoinQuery["sort"], CoinQuery["dir"]];
            apply({ ...query, sort, dir });
          }}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-gold catalog-search-btn">
        Search
      </button>
    </form>
  );
}
