export const LAUNCH_STATUSES = [
  "created",
  "wired",
  "sale",
  "active",
  "voided",
  "liquidating",
] as const;

export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

export const COIN_SORT_FIELDS = [
  "launchedAt",
  "marketCapUsd",
  "priceUsd",
  "name",
  "holderCount",
  "saleProgressBps",
] as const;

export type CoinSortField = (typeof COIN_SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export type CoinListItem = {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  backing: string;
  status: LaunchStatus;
  priceUsd: number | null;
  marketCapUsd: number | null;
  backingRatioBps: number | null;
  saleProgressBps: number | null;
  holderCount: number;
  launchedAt: number;
  logoUrl: string | null;
  metadataUri: string | null;
};

export type CoinSocials = {
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
};

export type ReserveMintStatus = {
  pathAReady: boolean;
  pathBActivated: boolean;
  governedPct: number;
  mintsThisYear: number;
  yearlyCap: number;
};

export type TreasurySnapshot = {
  cTokenAmount: number;
  unconvertedUsdc: number;
  cTokenPriceUsd: number;
  circulatingSupply: number;
  backingValueUsd: number;
  redemptionRatio: number;
  reserveMint: ReserveMintStatus;
};

export type SaleSnapshot = {
  capUsdc: number;
  raisedUsdc: number;
  remainingUsdc: number;
  priceUsd: number;
  closesAt: number;
  depositsOpen: boolean;
  myDepositUsdc: number;
};

export type TradePool = {
  label: "EOL/USDC" | "EOL/SOL";
  pool: string;
  href: string;
};

export type TradeSnapshot = {
  pools: TradePool[];
};

export type CoinStake = {
  staked: number;
  weight: number;
  voterLockedUntil: number | null;
  walletBalance: number;
  feeBps: number;
  liquidated: boolean;
};

export type ChartPoint = {
  t: number;
  priceUsd: number;
  volumeUsd: number;
};

export type CoinDetail = CoinListItem & {
  description: string;
  socials: CoinSocials;
  treasury: TreasurySnapshot;
  sale: SaleSnapshot | null;
  trade: TradeSnapshot | null;
  chart: ChartPoint[];
  stake: CoinStake | null;
  votes: CoinVote[];
};

export type CoinQuery = {
  search?: string;
  status?: LaunchStatus | LaunchStatus[];
  backing?: string;
  sort?: CoinSortField;
  dir?: SortDir;
  limit?: number;
  offset?: number;
};

export type CoinQueryResult = {
  items: CoinListItem[];
  total: number;
};

export type TokenAccountBalance = {
  mint: string;
  amount: number;
};

export type HeldCoin = CoinListItem & { amount: number };

export type Holding = {
  mint: string;
  name: string;
  symbol: string;
  amount: number;
  valueUsd: number | null;
};

export type StakePosition = {
  mint: string;
  name: string;
  symbol: string;
  staked: number;
  weight: number;
  voterLockedUntil: number | null;
};

export type ClaimableKind = "vesting" | "redemption" | "escrow";

export type Claimable = {
  mint: string;
  name: string;
  symbol: string;
  kind: ClaimableKind;
  amount: number;
  asset: string;
};

export type OpenVoteKind =
  | "liquidation"
  | "reserve_mint"
  | "escrow_halt"
  | "escrow_resume"
  | "escrow_advance";

export type CoinVote = {
  kind: OpenVoteKind;
  closesAt: number;
  yesWeight: number;
  noWeight: number;
  quorumBps: number;
  passBps: number;
  denom: number;
};

export type OpenVote = {
  mint: string;
  name: string;
  symbol: string;
  kind: OpenVoteKind;
  closesAt: number;
  yesWeight: number;
  noWeight: number;
  quorumBps: number;
};

export type PortfolioInput = {
  holdings: Holding[];
  stakes: StakePosition[];
  claimables: Claimable[];
  openVotes: OpenVote[];
};

export type PortfolioTotals = {
  holdingsUsd: number;
  stakedCount: number;
  claimableCount: number;
  openVoteCount: number;
};

export type PortfolioSnapshot = PortfolioInput & {
  totals: PortfolioTotals;
};
