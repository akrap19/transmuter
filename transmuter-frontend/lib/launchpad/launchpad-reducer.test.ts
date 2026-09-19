import { describe, expect, it } from "vitest";
import { launchpadReducer } from "./launchpad-reducer";
import { initialLaunchpadState } from "./types";

describe("launchpadReducer launch status", () => {
  it("tracks createLaunch progress instead of flipping launched immediately", () => {
    const uploading = launchpadReducer(initialLaunchpadState, { type: "LAUNCH_STATUS", status: "uploading" });
    expect(uploading.launched).toBe(false);
    expect(uploading.launchStatus).toBe("uploading");

    const signing = launchpadReducer(uploading, { type: "LAUNCH_STATUS", status: "signing" });
    expect(signing.launchStatus).toBe("signing");

    const failed = launchpadReducer(signing, {
      type: "LAUNCH_ERROR",
      error: "wallet refused",
    });
    expect(failed.launched).toBe(false);
    expect(failed.launchStatus).toBe("error");
    expect(failed.launchError).toBe("wallet refused");
  });

  it("records the mint, signature, and metadata uri on success so the token page can link", () => {
    const success = launchpadReducer(initialLaunchpadState, {
      type: "LAUNCH_SUCCESS",
      mint: "Mint111111111111111111111111111111111111111",
      signature: "sig",
      launchId: 3,
      metadataUri: "https://cdn.example/aero.json",
    });

    expect(success.launched).toBe(true);
    expect(success.launchStatus).toBe("success");
    expect(success.launchedMint).toBe("Mint111111111111111111111111111111111111111");
    expect(success.launchSignature).toBe("sig");
    expect(success.launchId).toBe(3);
    expect(success.metadataUri).toBe("https://cdn.example/aero.json");
  });
});
