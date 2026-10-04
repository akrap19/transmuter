import type { LaunchSolveResult } from "./types";

export function fundProceedsReady(
  solve: LaunchSolveResult | null | undefined,
): solve is LaunchSolveResult & { feasible: true; lpFrac: number; treasFrac: number; escrowFrac: number } {
  return (
    solve?.feasible === true &&
    solve.lpFrac != null &&
    solve.treasFrac != null &&
    solve.escrowFrac != null
  );
}
