import type { Connection } from "@solana/web3.js";
import type { TransmuterClient } from "@/lib/solana/anchor-client";
import { decodeMintSupply, decodeTokenAmount } from "@/lib/solana/batch-connection";
import type { PostSaleReaders } from "./read-post-sale";

type Rpc = Pick<Connection, "getAccountInfo">;

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
    tokenAmount: async (address) => decodeTokenAmount(await connection.getAccountInfo(address, "confirmed")),
    lamports: async (address) => {
      const info = await connection.getAccountInfo(address, "confirmed");
      return info ? BigInt(info.lamports) : BigInt(0);
    },
    mintSupply: async (address) => decodeMintSupply(await connection.getAccountInfo(address, "confirmed")),
  };
}
