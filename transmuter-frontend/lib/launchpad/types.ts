import { fallbackCtoken, resolveCtokens } from "./ctokens";

export type SaleType = "fixed" | "dutch" | "overflow";

export type VestingPreset =
  | "None"
  | "6 Month Cliff"
  | "12 Month Linear"
  | "24 Month Linear"
  | "6M Cliff + 18M Linear"
  | "Custom";

export type CToken = {
  name: string;
  icon: string;
  base: string;
  eol: string;
  mint: string;
};

export type ToggleKey = "daoAirdrop" | "burnFee" | "creatorFee";

export type ToggleStates = Record<ToggleKey, boolean>;

export type LaunchSolveInput = {
  tokenSupply: number | null;
  escrowNeed: number;
  allocLP: number;
  allocPublic: number;
  targetRaise: number | null;
};

export type LaunchSolveResult = {
  feasible: boolean;
  needRaise?: boolean;
  supply?: number;
  escrowNeed?: number;
  lpPct: number;
  salePct: number;
  minRaise?: number;
  R?: number;
  minRaiseUsed?: number;
  clampedUp?: boolean;
  mcp?: number;
  price?: number;
  lpCash?: number;
  treasury?: number;
  lpTokens?: number;
  treasPct?: number;
  treasPctMCP?: number;
  ceilingPct?: number;
  lpFrac?: number;
  treasFrac?: number;
  escrowFrac?: number;
};

export type FeeState = {
  totalFee: number;
  lpFee: number;
  treasuryFee: number;
  burnFee: number;
  creatorFee: number;
  feeWarning: boolean;
  lpMax: number;
  treasuryMax: number;
  burnMax: number;
  creatorMax: number;
};

export type AllocationState = {
  allocLP: number;
  allocTeam: number;
  allocPublic: number;
  allocInvestors: number;
  showInvestors: boolean;
  daoAirdropPct: number;
  daoAirdrop: boolean;
};

export type LaunchStatus = "idle" | "uploading" | "signing" | "success" | "error";

export type LaunchpadState = {
  currentStep: number;
  tokenName: string;
  tokenTicker: string;
  tokenDesc: string;
  tokenWebsite: string;
  tokenTwitter: string;
  tokenTelegram: string;
  tokenDiscord: string;
  logoUrl: string | null;
  logoFileName: string | null;
  daoAirdropPct: number;
  toggles: ToggleStates;
  tokenSupply: string;
  escrowNeed: string;
  targetRaise: string;
  tokenPrice: string;
  saleWindow: string;
  saleType: SaleType;
  dutchStartPrice: string;
  dutchDecayRate: string;
  dutchDecayInterval: string;
  overflowCap: string;
  overflowForego: number;
  allocLP: number;
  allocTeam: number;
  allocPublic: number;
  allocInvestors: number;
  showInvestors: boolean;
  vesting: VestingPreset;
  selectedCToken: CToken;
  autoMintTrigger: number;
  autoMintDeactivate: number;
  voteWindow: number;
  fees: FeeState;
  raiseTouched: boolean;
  lastMinRaise: number;
  launched: boolean;
  launchStatus: LaunchStatus;
  launchError: string | null;
  launchedMint: string | null;
  launchSignature: string | null;
  launchId: number | null;
  metadataUri: string | null;
};

export { fallbackCtoken, resolveCtokens };

export const CTOKENS: CToken[] = resolveCtokens();

export const VESTING_PRESETS: { label: string; value: VestingPreset; sub: string }[] = [
  { label: "None", value: "None", sub: "All tokens unlock at launch" },
  { label: "6M Cliff", value: "6 Month Cliff", sub: "Team tokens locked 6 months" },
  { label: "12M Linear", value: "12 Month Linear", sub: "Gradual unlock over 1 year" },
  { label: "24M Linear", value: "24 Month Linear", sub: "Gradual unlock over 2 years" },
  { label: "6M + 18M", value: "6M Cliff + 18M Linear", sub: "Cliff then linear vesting" },
  { label: "Custom", value: "Custom", sub: "Define your own schedule" },
];

export const STEP_LABELS = [
  "Identity",
  "Tokenomics",
  "Backing",
  "Fees",
  "Review",
] as const;

export const initialFeeState: FeeState = {
  totalFee: 0.8,
  lpFee: 0.35,
  treasuryFee: 0.3,
  burnFee: 0.2,
  creatorFee: 0.1,
  feeWarning: false,
  lpMax: 1.75,
  treasuryMax: 1.75,
  burnMax: 1,
  creatorMax: 0.5,
};

export const initialLaunchpadState: LaunchpadState = {
  currentStep: 1,
  tokenName: "",
  tokenTicker: "",
  tokenDesc: "",
  tokenWebsite: "",
  tokenTwitter: "",
  tokenTelegram: "",
  tokenDiscord: "",
  logoUrl: null,
  logoFileName: null,
  daoAirdropPct: 2,
  toggles: { daoAirdrop: false, burnFee: false, creatorFee: false },
  tokenSupply: "",
  escrowNeed: "0",
  targetRaise: "",
  tokenPrice: "",
  saleWindow: "1 week",
  saleType: "fixed",
  dutchStartPrice: "",
  dutchDecayRate: "1.0",
  dutchDecayInterval: "10",
  overflowCap: "",
  overflowForego: 0,
  allocLP: 20,
  allocTeam: 10,
  allocPublic: 70,
  allocInvestors: 10,
  showInvestors: false,
  vesting: "None",
  selectedCToken: CTOKENS[0],
  autoMintTrigger: 7,
  autoMintDeactivate: 20,
  voteWindow: 48,
  fees: initialFeeState,
  raiseTouched: false,
  lastMinRaise: 0,
  launched: false,
  launchStatus: "idle",
  launchError: null,
  launchedMint: null,
  launchSignature: null,
  launchId: null,
  metadataUri: null,
};
