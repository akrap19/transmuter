/** Factory `wired_mask` bits. Must match `transmuter_factory`. */
export const WIRE_EOL = 1 << 0;
export const WIRE_STAKING = 1 << 1;
export const WIRE_VESTING = 1 << 2;
export const WIRE_ESCROW = 1 << 3;
export const WIRE_REGISTER = 1 << 4;
export const WIRE_POOL_USDC = 1 << 5;
export const WIRE_POOL_SOL = 1 << 6;
export const WIRE_VAULTS = 1 << 7;
export const WIRE_DAO = 1 << 8;

export type WireStepId =
  | "eol"
  | "staking"
  | "vesting"
  | "escrow"
  | "treasuryAta"
  | "register"
  | "dao"
  | "poolUsdc"
  | "poolSol"
  | "vaults";

export type WireStepState = "done" | "next" | "waiting" | "failed";

export type WireChecklistItem = {
  id: WireStepId;
  label: string;
  state: WireStepState;
  error?: string;
};

const STEPS: Array<{ id: WireStepId; label: string; bit?: number }> = [
  { id: "eol", label: "Wire EOL", bit: WIRE_EOL },
  { id: "staking", label: "Wire staking", bit: WIRE_STAKING },
  { id: "vesting", label: "Wire vesting", bit: WIRE_VESTING },
  { id: "escrow", label: "Wire escrow", bit: WIRE_ESCROW },
  { id: "treasuryAta", label: "Create cToken treasury" },
  { id: "register", label: "Register with cToken", bit: WIRE_REGISTER },
  { id: "dao", label: "Wire DAO", bit: WIRE_DAO },
  { id: "poolUsdc", label: "Wire USDC pool", bit: WIRE_POOL_USDC },
  { id: "poolSol", label: "Wire SOL pool", bit: WIRE_POOL_SOL },
  { id: "vaults", label: "Wire vaults", bit: WIRE_VAULTS },
];

export function buildWireChecklist(input: {
  requiredMask: number;
  wiredMask: number;
  treasuryAtaExists: boolean;
  failedStep?: WireStepId | null;
  failure?: string | null;
}): WireChecklistItem[] {
  const included = STEPS.filter((step) => step.bit === undefined || (input.requiredMask & step.bit) !== 0);
  const done = (step: (typeof STEPS)[number]) => {
    if (step.id === "treasuryAta") {
      return input.treasuryAtaExists || (input.wiredMask & WIRE_REGISTER) !== 0;
    }
    return step.bit !== undefined && (input.wiredMask & step.bit) !== 0;
  };

  let assignedNext = false;
  return included.map((step) => {
    if (done(step)) return { id: step.id, label: step.label, state: "done" as const };
    if (!assignedNext) {
      assignedNext = true;
      if (input.failedStep === step.id && input.failure) {
        return { id: step.id, label: step.label, state: "failed" as const, error: input.failure };
      }
      return { id: step.id, label: step.label, state: "next" as const };
    }
    return { id: step.id, label: step.label, state: "waiting" as const };
  });
}

export function nextWireStep(steps: WireChecklistItem[]): WireChecklistItem | null {
  return steps.find((step) => step.state === "next" || step.state === "failed") ?? null;
}
