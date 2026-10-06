import { fetchCoinList } from "./api";
import { claimablesFromCoin } from "./claimables";
import { heldCoins } from "./my-coins";
import { buildPortfolio, holdingsFromCoins } from "./portfolio";
import type {
  Claimable,
  CoinEscrow,
  CoinListItem,
  CoinRedeem,
  CoinStake,
  CoinVesting,
  CoinVote,
  OpenVote,
  PortfolioSnapshot,
  StakePosition,
  TokenAccountBalance,
} from "./types";

export type LivePortfolioPosition = {
  stake: CoinStake | null;
  vesting: CoinVesting | null;
  escrow: CoinEscrow | null;
  redeem: CoinRedeem | null;
  votes: CoinVote[];
};

type AssembleInput = {
  catalog: CoinListItem[];
  accounts: TokenAccountBalance[];
  positions: Array<{ coin: CoinListItem; position: LivePortfolioPosition }>;
  wallet: string;
  now: number;
};

export function assemblePortfolio(input: AssembleInput): PortfolioSnapshot {
  const holdings = holdingsFromCoins(heldCoins(input.catalog, input.accounts));
  const held = new Set(holdings.map((row) => row.mint));
  const stakes: StakePosition[] = [];
  const claimables: Claimable[] = [];
  const openVotes: OpenVote[] = [];

  for (const { coin, position } of input.positions) {
    if (position.stake && position.stake.staked > 0) {
      stakes.push({
        mint: coin.mint,
        name: coin.name,
        symbol: coin.symbol,
        staked: position.stake.staked,
        weight: position.stake.weight,
        voterLockedUntil: position.stake.voterLockedUntil,
      });
    }

    const claims = claimablesFromCoin(
      {
        mint: coin.mint,
        name: coin.name,
        symbol: coin.symbol,
        vesting: position.vesting,
        redeem: position.redeem,
        escrow: position.escrow,
      },
      input.wallet,
      input.now,
    );
    claimables.push(...claims);

    const involved =
      coin.creator === input.wallet ||
      (position.stake?.staked ?? 0) > 0 ||
      held.has(coin.mint) ||
      claims.length > 0;
    if (!involved) continue;

    for (const vote of position.votes) {
      openVotes.push({
        mint: coin.mint,
        name: coin.name,
        symbol: coin.symbol,
        kind: vote.kind,
        closesAt: vote.closesAt,
        yesWeight: vote.yesWeight,
        noWeight: vote.noWeight,
        quorumBps: vote.quorumBps,
      });
    }
  }

  return buildPortfolio({ holdings, stakes, claimables, openVotes });
}

export async function loadLivePortfolio(input: {
  wallet: string;
  accounts: TokenAccountBalance[];
  now: number;
  readPosition: (coin: CoinListItem) => Promise<LivePortfolioPosition | null>;
  fetchFn?: typeof fetch;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true; snapshot: PortfolioSnapshot } | { ok: false }> {
  const fetched = await fetchCoinList({}, { fetchFn: input.fetchFn, env: input.env });
  if (!fetched.ok) return { ok: false };

  const settled = await Promise.all(
    fetched.data.items.map(async (coin) => {
      try {
        const position = await input.readPosition(coin);
        return position ? { coin, position } : null;
      } catch {
        return null;
      }
    }),
  );

  return {
    ok: true,
    snapshot: assemblePortfolio({
      catalog: fetched.data.items,
      accounts: input.accounts,
      positions: settled.filter((row): row is { coin: CoinListItem; position: LivePortfolioPosition } => row != null),
      wallet: input.wallet,
      now: input.now,
    }),
  };
}
