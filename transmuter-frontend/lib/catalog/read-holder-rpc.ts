import type { Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type { TransmuterClient } from "@/lib/solana/anchor-client";
import { decodeMintSupply, decodeTokenAmount } from "@/lib/solana/batch-connection";
import type { HolderReaders } from "./read-holder";

type Rpc = Pick<Connection, "getAccountInfo">;

export function holderReaders(client: TransmuterClient, connection: Rpc): HolderReaders {
  return {
    config: client.eolToken.account.config,
    stakeConfig: client.staking.account.stakeConfig,
    stakeAccount: client.staking.account.stakeAccount,
    vestingConfig: client.vesting.account.vestingConfig,
    vestingEntry: client.vesting.account.vestingEntry,
    escrowConfig: client.runwayEscrow.account.escrowConfig,
    redeemState: client.eolToken.account.redeemState,
    tokenAmount: async (address) => decodeTokenAmount(await connection.getAccountInfo(address, "confirmed")),
    mintSupply: async (address) => decodeMintSupply(await connection.getAccountInfo(address, "confirmed")),
    walletToken: async (mint, owner) => {
      const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID);
      return decodeTokenAmount(await connection.getAccountInfo(ata, "confirmed"));
    },
  };
}
