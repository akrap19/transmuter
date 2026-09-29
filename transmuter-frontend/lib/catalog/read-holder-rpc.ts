import type { Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type { TransmuterClient } from "@/lib/solana/anchor-client";
import type { HolderReaders } from "./read-holder";

type Rpc = Pick<Connection, "getTokenAccountBalance" | "getTokenSupply">;

export function holderReaders(client: TransmuterClient, connection: Rpc): HolderReaders {
  return {
    config: client.eolToken.account.config,
    stakeConfig: client.staking.account.stakeConfig,
    stakeAccount: client.staking.account.stakeAccount,
    vestingConfig: client.vesting.account.vestingConfig,
    vestingEntry: client.vesting.account.vestingEntry,
    escrowConfig: client.runwayEscrow.account.escrowConfig,
    redeemState: client.eolToken.account.redeemState,
    tokenAmount: async (address) => {
      try {
        const balance = await connection.getTokenAccountBalance(address, "confirmed");
        return BigInt(balance.value.amount);
      } catch {
        return BigInt(0);
      }
    },
    mintSupply: async (address) => {
      try {
        const supply = await connection.getTokenSupply(address, "confirmed");
        return BigInt(supply.value.amount);
      } catch {
        return BigInt(0);
      }
    },
    walletToken: async (mint, owner) => {
      const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
      try {
        const balance = await connection.getTokenAccountBalance(ata, "confirmed");
        return BigInt(balance.value.amount);
      } catch {
        return BigInt(0);
      }
    },
  };
}
