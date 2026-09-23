"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExploreSelect } from "@/components/catalog/explore-select";
import { formatStatus } from "@/lib/catalog/format";
import { serializeCoinQuery } from "@/lib/catalog/search-params";
import { LAUNCH_STATUSES, type CoinQuery, type LaunchStatus } from "@/lib/catalog/types";
import { routes } from "@/lib/routes";

const ALL = "all";
const SEARCH_DELAY_MS = 200;

const STATUS_OPTIONS = [
  { value: ALL, label: "All (incl. VOIDED)" },
  ...LAUNCH_STATUSES.map((status) => ({ value: status, label: formatStatus(status) })),
];

const BACKING_OPTIONS = [
  { value: ALL, label: "All" },
  { value: "cSOL", label: "cSOL" },
  { value: "cBTC", label: "cBTC" },
];

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
  const searchTimer = useRef<number>(0);
  const lastAppliedSearch = useRef(query.search);
  const [search, setSearch] = useState(query.search ?? "");
  const [searchFromUrl, setSearchFromUrl] = useState(query.search);

  if (query.search !== searchFromUrl) {
    setSearchFromUrl(query.search);
    if (query.search !== lastAppliedSearch.current) {
      lastAppliedSearch.current = query.search;
      setSearch(query.search ?? "");
    }
  }

  function apply(next: CoinQuery) {
    const qs = serializeCoinQuery(next).toString();
    router.replace(qs ? `${routes.coins}?${qs}` : routes.coins);
  }

  function applySearch(value: string, extra: Partial<CoinQuery> = {}) {
    const nextSearch = value.trim() || undefined;
    lastAppliedSearch.current = nextSearch;
    apply({ ...query, ...extra, search: nextSearch });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => applySearch(value), SEARCH_DELAY_MS);
  }

  return (
    <form
      className="explore-toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        window.clearTimeout(searchTimer.current);
        applySearch(search);
      }}
    >
      <label className="explore-field explore-field-search">
        <span>Search</span>
        <input
          name="q"
          type="search"
          placeholder="Name, ticker, or mint"
          value={search}
          autoComplete="off"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <ExploreSelect
        label="Status"
        value={Array.isArray(query.status) ? ALL : (query.status ?? ALL)}
        options={STATUS_OPTIONS}
        onValueChange={(value) =>
          applySearch(search, { status: value === ALL ? undefined : (value as LaunchStatus) })
        }
      />
      <ExploreSelect
        label="Backing"
        value={query.backing ?? ALL}
        options={BACKING_OPTIONS}
        onValueChange={(value) => applySearch(search, { backing: value === ALL ? undefined : value })}
      />
      <ExploreSelect
        label="Sort"
        value={sortValue(query)}
        options={[...SORTS]}
        onValueChange={(value) => {
          const [sort, dir] = value.split(":") as [CoinQuery["sort"], CoinQuery["dir"]];
          applySearch(search, { sort, dir });
        }}
      />
    </form>
  );
}
