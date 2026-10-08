import { describe, expect, it } from "vitest";
import {
  WIRE_DAO,
  WIRE_EOL,
  WIRE_ESCROW,
  WIRE_POOL_SOL,
  WIRE_POOL_USDC,
  WIRE_REGISTER,
  WIRE_STAKING,
  WIRE_VAULTS,
  WIRE_VESTING,
  buildWireChecklist,
  nextWireStep,
  wiringComplete,
} from "./wire-plan";

const BASE =
  WIRE_EOL | WIRE_STAKING | WIRE_REGISTER | WIRE_DAO | WIRE_POOL_USDC | WIRE_POOL_SOL | WIRE_VAULTS;

describe("buildWireChecklist", () => {
  it("lists the permissionless cranks and skips vesting and escrow when the launch does not require them", () => {
    const steps = buildWireChecklist({
      requiredMask: BASE,
      wiredMask: 0,
      treasuryAtaExists: false,
    }).map((step) => step.id);

    expect(steps).toEqual([
      "eol",
      "staking",
      "treasuryAta",
      "register",
      "dao",
      "poolUsdc",
      "poolSol",
      "vaults",
    ]);
  });

  it("inserts vesting and escrow when those bits are in the required mask", () => {
    const steps = buildWireChecklist({
      requiredMask: BASE | WIRE_VESTING | WIRE_ESCROW,
      wiredMask: 0,
      treasuryAtaExists: false,
    }).map((step) => step.id);

    expect(steps).toEqual([
      "eol",
      "staking",
      "vesting",
      "escrow",
      "treasuryAta",
      "register",
      "dao",
      "poolUsdc",
      "poolSol",
      "vaults",
    ]);
  });

  it("marks landed bits done and points the next crank at the first gap", () => {
    const steps = buildWireChecklist({
      requiredMask: BASE | WIRE_VESTING,
      wiredMask: WIRE_EOL | WIRE_STAKING,
      treasuryAtaExists: false,
    });

    expect(steps.find((step) => step.id === "eol")?.state).toBe("done");
    expect(steps.find((step) => step.id === "staking")?.state).toBe("done");
    expect(nextWireStep(steps)?.id).toBe("vesting");
    expect(steps.find((step) => step.id === "vaults")?.state).toBe("waiting");
  });

  it("treats the cToken treasury as done once the ATA exists, even though it is not a wire bit", () => {
    const steps = buildWireChecklist({
      requiredMask: BASE,
      wiredMask: WIRE_EOL | WIRE_STAKING,
      treasuryAtaExists: true,
    });

    expect(steps.find((step) => step.id === "treasuryAta")?.state).toBe("done");
    expect(nextWireStep(steps)?.id).toBe("register");
  });

  it("keeps a failed crank as the next step and carries the error", () => {
    const steps = buildWireChecklist({
      requiredMask: BASE,
      wiredMask: WIRE_EOL,
      treasuryAtaExists: false,
      failedStep: "staking",
      failure: "The wallet does not have enough SOL to pay the fee.",
    });

    const staking = steps.find((step) => step.id === "staking");
    expect(staking?.state).toBe("failed");
    expect(staking?.error).toBe("The wallet does not have enough SOL to pay the fee.");
    expect(nextWireStep(steps)?.id).toBe("staking");
  });

  it("marks the sale open only when every included step is done", () => {
    const open = buildWireChecklist({
      requiredMask: BASE,
      wiredMask: BASE,
      treasuryAtaExists: true,
    });
    const partial = buildWireChecklist({
      requiredMask: BASE,
      wiredMask: WIRE_EOL,
      treasuryAtaExists: false,
    });

    expect(wiringComplete(open)).toBe(true);
    expect(wiringComplete(partial)).toBe(false);
    expect(wiringComplete([])).toBe(false);
  });
});
