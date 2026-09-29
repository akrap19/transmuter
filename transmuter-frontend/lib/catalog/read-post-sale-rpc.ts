import type { Connection } from "@solana/web3.js";
import type { TransmuterClient } from "@/lib/solana/anchor-client";
import type { PostSaleReaders } from "./read-post-sale";

type Rpc = Pick<Connection, "getAccountInfo" | "getTokenAccountBalance" | "getBalance" | "getTokenSupply">;

export function postSaleReaders(client: TransmuterClient, connection: Rpc): PostSaleReaders {
  return {
    config: client.eolToken.account.config,
    launch: client.factory.account.launch,
    mintIndex: client.factory.account.mintIndex,
    deposit: client.eolToken.account.deposit,
    escrow: client.runwayEscrow.account.escrowConfig,
    accountData: async (address) => {
      const info = await connection.getAccountInfo(address, "confirmed");
      return info ? new Uint8Array(info.data) : null;
    },
    tokenAmount: async (address) => {
      try {
        const balance = await connection.getTokenAccountBalance(address, "confirmed");
        return BigInt(balance.value.amount);
      } catch {
        return BigInt(0);
      }
    },
    lamports: async (address) => BigInt(await connection.getBalance(address, "confirmed")),
    mintSupply: async (address) => {
      try {
        const supply = await connection.getTokenSupply(address, "confirmed");
        return BigInt(supply.value.amount);
      } catch {
        return BigInt(0);
      }
    },
  };
}
