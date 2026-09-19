"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { useCallback } from "react";
import { resolveCtokens } from "@/lib/launchpad/ctokens";
import { resolveMediaEndpoint, uploadMedia } from "@/lib/launchpad/media";
import { submitCreateLaunch, type FactoryCreateLaunchClient } from "@/lib/launchpad/submit-launch";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { useLaunchpad } from "./launchpad-context";

export function useSubmitLaunch() {
  const { state, dispatch } = useLaunchpad();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const busy = state.launchStatus === "uploading" || state.launchStatus === "signing";

  const submit = useCallback(async () => {
    if (!wallet || !publicKey) {
      dispatch({ type: "LAUNCH_ERROR", error: "Connect a wallet to launch." });
      return;
    }

    dispatch({ type: "LAUNCH_STATUS", status: "uploading" });
    try {
      const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const client = createTransmuterClient(provider);
      const result = await submitCreateLaunch({
        state,
        wallet: publicKey.toBase58(),
        nowSeconds: Math.floor(Date.now() / 1000),
        whitelist: resolveCtokens(),
        daoContract: PROGRAM_IDS.dao,
        generateMint: () => Keypair.generate(),
        factory: client.factory as unknown as FactoryCreateLaunchClient,
        upload: (file) => uploadMedia(file, { endpoint: resolveMediaEndpoint() }),
        onStatus: (status) => dispatch({ type: "LAUNCH_STATUS", status }),
      });
      dispatch({
        type: "LAUNCH_SUCCESS",
        mint: result.mint,
        signature: result.signature,
        launchId: result.launchId,
        metadataUri: result.metadataUri,
      });
    } catch (error) {
      dispatch({
        type: "LAUNCH_ERROR",
        error: error instanceof Error ? error.message : "Launch failed",
      });
    }
  }, [connection, dispatch, publicKey, state, wallet]);

  return { submit, busy, connected };
}
