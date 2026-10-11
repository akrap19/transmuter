import { NATIVE_MINT, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ComputeBudgetProgram, PublicKey, Transaction, type Connection } from "@solana/web3.js";
import { eolConfigPda } from "@/lib/solana/programs/eol-token";
import {
  BatchSigningUnsupported,
  ChainTransactionError,
  describeChainError,
  signAllSendAndConfirm,
  signSendAndConfirm,
  type BatchSigner,
  type ConfirmedTransaction,
} from "@/lib/solana/tx";
import { raydiumSeedAmounts, type PostSaleKind } from "./post-sale";
import {
  FINALIZE_CU,
  LP_SIGNER_LAMPORTS,
  postSaleInstructions,
  type EolPostSaleClient,
  type FactoryOutcomeClient,
  type PostSaleChain,
} from "./submit-post-sale";

/** Legacy transactions are capped at 1232 bytes on the wire. */
const PACKET_BYTES = 1232;
const EOL_STATUS_ACTIVE = 1;

/** The order the jobs must run in. Convert closes the config WSOL account, so it follows both seeds. */
const ORDER: PostSaleKind[] = ["finalize", "seedRaydiumUsdc", "seedRaydiumWsol", "convertTreasury", "claimTokens"];

type BatchConnection = Pick<Connection, "getLatestBlockhash" | "sendRawTransaction" | "confirmTransaction" | "getTransaction" | "simulateTransaction">;

export type BatchClient = EolPostSaleClient & {
  coder?: { accounts: { decode: (name: string, data: Buffer) => { status: number } } };
};

export type PostSaleBatch = {
  /** "finalize" runs the whole close-out. "setup" runs only the listed jobs that are left. */
  mode: "finalize" | "setup";
  /** For "setup": the jobs still open on chain, already in a safe order. */
  steps?: PostSaleKind[];
  chain: PostSaleChain;
  eol: BatchClient;
  factory: FactoryOutcomeClient;
  connection: BatchConnection;
  signer: BatchSigner;
  onProgress?: (done: number, total: number) => void;
  send?: typeof signAllSendAndConfirm;
};

/** One wallet approval for every transaction the close-out needs. */
export async function submitPostSaleBatch(input: PostSaleBatch): Promise<ConfirmedTransaction[]> {
  const send = input.send ?? signAllSendAndConfirm;
  try {
    const transactions = await buildBatch(input);
    return await send({
      connection: input.connection,
      signer: input.signer,
      transactions,
      onProgress: input.onProgress,
    });
  } catch (error) {
    if (error instanceof ChainTransactionError) throw error;
    const described = describeChainError(error);
    throw new ChainTransactionError(described.message, { code: described.code, cause: error });
  }
}

/** One transaction per job, in order, before any packing. Each is what a single approval would sign. */
export type PlannedStep = { kind: PostSaleKind; transaction: Transaction };

export async function planPostSale(input: PostSaleBatch): Promise<PlannedStep[]> {
  const { chain } = input;
  if (!chain.poolsReady && input.mode === "finalize") {
    throw new ChainTransactionError("Pool vaults are not on this launch yet.");
  }

  const plan = input.mode === "finalize" ? await finalizePlanSteps(input) : setupPlanSteps(input);
  const planned: PlannedStep[] = [];
  let seedsBuilt = 0;
  for (const step of plan.steps) {
    // Finalize creates the config WSOL account, so the later steps of the same run can count on it.
    const created = input.mode === "finalize" && step.kind !== "finalize";
    const stepChain = { ...plan.chain, wsolAtaExists: plan.chain.wsolAtaExists || created };
    // The first seed tops up the LP signer for the pool-creation fee. The second reuses what is left.
    const seeding = step.kind === "seedRaydiumUsdc" || step.kind === "seedRaydiumWsol";
    if (seeding && seedsBuilt++ > 0) stepChain.lpSignerLamports = LP_SIGNER_LAMPORTS;
    const transaction = new Transaction();
    if (step.kind !== "claimTokens") transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: FINALIZE_CU }));
    transaction.add(...(await postSaleInstructions(step.kind, stepChain, input.eol, input.factory)));
    planned.push({ kind: step.kind, transaction });
  }
  return planned;
}

/**
 * Merge the buyer's claim into the transaction before it when both fit under the packet limit.
 * Builds new transactions rather than mutating the planned ones, so a fallback can still send
 * each planned step on its own without a duplicate claim.
 */
export function packBatch(planned: PlannedStep[], payer: PublicKey): Transaction[] {
  const groups: Transaction[] = [];
  for (const step of planned) {
    const previous = groups[groups.length - 1];
    if (step.kind === "claimTokens" && previous && fits(previous, step.transaction, payer)) {
      groups[groups.length - 1] = new Transaction().add(...previous.instructions, ...step.transaction.instructions);
    } else {
      groups.push(step.transaction);
    }
  }
  return groups;
}

export async function buildBatch(input: PostSaleBatch): Promise<Transaction[]> {
  return packBatch(await planPostSale(input), input.chain.cranker);
}

export type StepEvent = { index: number; state: "active" | "done" | "failed"; error?: string };

/**
 * Sign once if the wallet can. If it cannot sign several transactions, or refuses the batch for a
 * reason other than a cancel, nothing has been sent, so sign each planned step in order instead.
 * A cancel stops the run at once.
 */
export async function runPostSale(
  input: PostSaleBatch & {
    onFallback?: (kinds: PostSaleKind[]) => void;
    onStep?: (event: StepEvent) => void;
    sendAll?: typeof signAllSendAndConfirm;
    sendOne?: typeof signSendAndConfirm;
  },
): Promise<ConfirmedTransaction[]> {
  const planned = await planPostSale(input).catch((error: unknown) => {
    throw asChainError(error);
  });
  const sendAll = input.sendAll ?? signAllSendAndConfirm;
  try {
    return await sendAll({
      connection: input.connection,
      signer: input.signer,
      transactions: packBatch(planned, input.chain.cranker),
      onProgress: input.onProgress,
    });
  } catch (error) {
    if (!(error instanceof BatchSigningUnsupported)) throw asChainError(error);
  }

  input.onFallback?.(planned.map((step) => step.kind));
  const sendOne = input.sendOne ?? signSendAndConfirm;
  const confirmed: ConfirmedTransaction[] = [];
  for (const [index, step] of planned.entries()) {
    input.onStep?.({ index, state: "active" });
    try {
      confirmed.push(await sendOne({ connection: input.connection, signer: input.signer, transaction: step.transaction }));
      input.onStep?.({ index, state: "done" });
    } catch (error) {
      const chainError = asChainError(error);
      input.onStep?.({ index, state: "failed", error: chainError.message });
      throw new ChainTransactionError(`Step ${index + 1} of ${planned.length} failed: ${chainError.message}`, {
        signature: chainError.signature,
        explorerUrl: chainError.explorerUrl,
        code: chainError.code,
        cause: error,
      });
    }
  }
  return confirmed;
}

function asChainError(error: unknown): ChainTransactionError {
  if (error instanceof ChainTransactionError) return error;
  const described = describeChainError(error);
  return new ChainTransactionError(described.message, { code: described.code, cause: error });
}

type Plan = { chain: PostSaleChain; steps: { kind: PostSaleKind }[] };

function setupPlanSteps(input: PostSaleBatch): Plan {
  const wanted = input.steps ?? [];
  const steps = ORDER.filter((kind) => wanted.includes(kind)).map((kind) => ({ kind }));
  if (steps.length === 0) throw new ChainTransactionError("Nothing is left to finish on this launch.");
  return { chain: input.chain, steps };
}

async function finalizePlanSteps(input: PostSaleBatch): Promise<Plan> {
  const { chain } = input;
  const finalizeTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: FINALIZE_CU }),
    ...(await postSaleInstructions("finalize", chain, input.eol, input.factory)),
  );
  const steps: { kind: PostSaleKind }[] = [{ kind: "finalize" }];
  let planChain = chain;

  const after = await simulateAfter(input, finalizeTx);
  if (after.active) {
    if (chain.venue === "raydium") {
      planChain = {
        ...chain,
        lpTokenAtoms: after.lpTokenAtoms,
        saleUsdcAtoms: after.saleUsdcAtoms,
        // Exact simulated amount, so both pools land at the same implied price. If the balance
        // drifts before the seed lands, that step fails and "Finish setup" re-simulates.
        wsolAtoms: after.wsolAtoms,
      };
      const seed = raydiumSeedAmounts(planChain);
      if (seed.usdc.token > BigInt(0) && seed.usdc.quote > BigInt(0)) steps.push({ kind: "seedRaydiumUsdc" });
      if (seed.wsol.token > BigInt(0) && seed.wsol.quote > BigInt(0)) steps.push({ kind: "seedRaydiumWsol" });
    }
    steps.push({ kind: "convertTreasury" });
    if (chain.depositAtoms > BigInt(0) && !chain.claimed) steps.push({ kind: "claimTokens" });
  }
  return { chain: planChain, steps };
}

type After = { active: boolean; lpTokenAtoms: bigint; saleUsdcAtoms: bigint; wsolAtoms: bigint };

/** Run finalize against the current chain state and read what it would leave behind. */
async function simulateAfter(input: PostSaleBatch, finalizeTx: Transaction): Promise<After> {
  const { chain, connection } = input;
  const latest = await connection.getLatestBlockhash("confirmed");
  finalizeTx.feePayer = chain.cranker;
  finalizeTx.recentBlockhash = latest.blockhash;
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, eolConfigPda(chain.mint), true, TOKEN_PROGRAM_ID);
  const watched = [chain.lpTokenVault, chain.saleUsdcVault, wsolAta, eolConfigPda(chain.mint)];

  const result = await connection.simulateTransaction(finalizeTx, undefined, watched);
  if (result.value.err) {
    throw new ChainTransactionError(
      describeChainError({ message: JSON.stringify(result.value.err), logs: result.value.logs ?? undefined }).message,
    );
  }
  const accounts = result.value.accounts ?? [];
  const configBytes = accountBytes(accounts[3]);
  if (!configBytes || !input.eol.coder) {
    throw new ChainTransactionError("Could not read the sale status after finalize. Try again.");
  }
  const status = input.eol.coder.accounts.decode("config", Buffer.from(configBytes)).status;
  return {
    active: Number(status) === EOL_STATUS_ACTIVE,
    lpTokenAtoms: tokenAmount(accountBytes(accounts[0])),
    saleUsdcAtoms: tokenAmount(accountBytes(accounts[1])),
    wsolAtoms: tokenAmount(accountBytes(accounts[2])),
  };
}

/** Decode the simulated account data into plain bytes. Nothing downstream relies on Buffer methods. */
function accountBytes(account: { data: unknown } | null | undefined): Uint8Array | null {
  const data = account?.data;
  if (!Array.isArray(data) || typeof data[0] !== "string") return null;
  return base64ToBytes(data[0]);
}

function base64ToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** SPL token and Token-2022 accounts both keep the amount at byte 64, little-endian. */
function tokenAmount(data: Uint8Array | null): bigint {
  if (!data || data.length < 72) return BigInt(0);
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(64, true);
}

function fits(base: Transaction, extra: Transaction, payer: PublicKey): boolean {
  const probe = new Transaction();
  probe.feePayer = payer;
  probe.recentBlockhash = PublicKey.default.toBase58();
  probe.add(...base.instructions, ...extra.instructions);
  try {
    return probe.serialize({ requireAllSignatures: false, verifySignatures: false }).length <= PACKET_BYTES;
  } catch {
    return false;
  }
}
