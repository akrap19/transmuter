import { afterEach, describe, expect, it, vi } from "vitest";
import { startChainPoll } from "./chain-poll";

describe("startChainPoll", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a failed read without waiting for the refresh interval", async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockRejectedValueOnce(new Error("rate limit")).mockResolvedValue(undefined);
    const stop = startChainPoll(read, 30_000);

    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(read).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(2);
    stop();
  });

  it("stops retrying once a read succeeds", async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockResolvedValue(undefined);
    const stop = startChainPoll(read, 30_000);

    await vi.advanceTimersByTimeAsync(8_000);
    expect(read).toHaveBeenCalledTimes(1);
    stop();
  });
});
