import { PublicKey, type Connection } from "@solana/web3.js";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";

/** Anchor `Deposit` account discriminator, base58, for getProgramAccounts memcmp. */
const DEPOSIT_DISC = "RrLVbqSxfbp";

export type DepositPosition = {
  depositor: string;
  amount: bigint;
  claimed: boolean;
};

export type TokenPosition = {
  owner: string;
  amount: bigint;
};

/**
 * Buyers with unclaimed sale credit, plus wallets that hold the token outside
 * protocol vaults. When token accounts cannot be listed, claimed buyers still
 * count so the figure does not drop to zero.
 */
export function countHolders(input: {
  deposits: DepositPosition[];
  tokenAccounts: TokenPosition[];
  tokenAccountsKnown: boolean;
}): number {
  const wallets = new Set<string>();
  for (const deposit of input.deposits) {
    if (deposit.amount <= BigInt(0)) continue;
    if (!deposit.claimed || !input.tokenAccountsKnown) wallets.add(deposit.depositor);
  }
  for (const account of input.tokenAccounts) {
    if (account.amount > BigInt(0)) wallets.add(account.owner);
  }
  return wallets.size;
}

export function decodeDeposit(data: Uint8Array): DepositPosition | null {
  if (data.length < 81) return null;
  const amount = new DataView(data.buffer, data.byteOffset + 72, 8).getBigUint64(0, true);
  return {
    depositor: new PublicKey(data.subarray(40, 72)).toBase58(),
    amount,
    claimed: data[80] === 1,
  };
}

type HolderConnection = Pick<Connection, "getProgramAccounts" | "getTokenLargestAccounts" | "getMultipleAccountsInfo">;

/** Deposit accounts for this config, plus token accounts that are not protocol vaults. */
export async function fetchHolderCount(
  connection: HolderConnection,
  config: PublicKey,
  mint: PublicKey,
  vaults: PublicKey[],
): Promise<number> {
  const programId = new PublicKey(PROGRAM_IDS.eolToken);
  const rows = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [
      { memcmp: { offset: 0, bytes: DEPOSIT_DISC } },
      { memcmp: { offset: 8, bytes: config.toBase58() } },
    ],
  });
  const deposits = rows.flatMap((row) => {
    const decoded = decodeDeposit(row.account.data);
    return decoded ? [decoded] : [];
  });

  const vaultSet = new Set(vaults.map((key) => key.toBase58()));
  let tokenAccounts: TokenPosition[] = [];
  let tokenAccountsKnown = false;
  try {
    const largest = await connection.getTokenLargestAccounts(mint, "confirmed");
    const userAccounts = largest.value.filter(
      (row) => row.amount !== "0" && !vaultSet.has(row.address.toBase58()),
    );
    const infos = userAccounts.length
      ? await connection.getMultipleAccountsInfo(
          userAccounts.map((row) => row.address),
          "confirmed",
        )
      : [];
    tokenAccounts = infos.flatMap((info) => {
      if (!info || info.data.length < 72) return [];
      const amount = new DataView(info.data.buffer, info.data.byteOffset + 64, 8).getBigUint64(0, true);
      return [{ owner: new PublicKey(info.data.subarray(32, 64)).toBase58(), amount }];
    });
    tokenAccountsKnown = true;
  } catch {
    // Public devnet excludes Token-2022 from getProgramAccounts, and the
    // largest-accounts call is rate limited. Deposits still name the buyers.
    tokenAccountsKnown = false;
  }

  return countHolders({ deposits, tokenAccounts, tokenAccountsKnown });
}
