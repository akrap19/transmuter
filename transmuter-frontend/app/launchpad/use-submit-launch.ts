"use client";

import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { useCallback } from "react";
import { resolveCtokens } from "@/lib/launchpad/ctokens";
import { resolveMediaEndpoint, uploadMedia } from "@/lib/launchpad/media";
import { browserSession, saveMintSecret, savePendingWire } from "@/lib/launchpad/mint-secret";
import { LaunchValidationError } from "@/lib/launchpad/map-create-launch";
import { submitCreateLaunch, type FactoryCreateLaunchClient } from "@/lib/launchpad/submit-launch";
import { createTransmuterClient } from "@/lib/solana/anchor-client";
import { PROGRAM_IDS } from "@/lib/solana/program-ids";
import { toastError, toastSuccess } from "@/lib/toast";
import { useLaunchpad } from "./launchpad-context";

export function useSubmitLaunch() {
  const { state, dispatch } = useLaunchpad();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const busy = state.launchStatus === "uploading" || state.launchStatus === "signing";

  const submit = useCallback(async () => {
    if (!wallet || !publicKey) {
      const message = "Connect a wallet to launch.";
      toastError(message);
      dispatch({ type: "LAUNCH_ERROR", error: message });
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
      const storage = browserSession();
      if (storage) {
        saveMintSecret(storage, result.launchId, result.mintSecretKey);
        savePendingWire(storage, {
          launchId: result.launchId,
          mint: result.mint,
          tokenName: state.tokenName.trim(),
          tokenTicker: state.tokenTicker.trim().toUpperCase(),
          backingName: state.selectedCToken.name,
        });
      }
      dispatch({
        type: "LAUNCH_SUCCESS",
        mint: result.mint,
        signature: result.signature,
        launchId: result.launchId,
        metadataUri: result.metadataUri,
      });
      toastSuccess("Launch created. Continue with wiring.");
    } catch (error) {
      if (error instanceof LaunchValidationError) {
        dispatch({ type: "LAUNCH_ERROR", error: error.issues.join("\n") });
        return;
      }
      const message = error instanceof Error ? error.message : "Launch failed";
      toastError(message);
      dispatch({ type: "LAUNCH_ERROR", error: message });
    }
  }, [connection, dispatch, publicKey, state, wallet]);

  return { submit, busy, connected };
}
