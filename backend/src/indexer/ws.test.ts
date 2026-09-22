import { describe, expect, it } from "vitest";
import { parseLogsNotification } from "./ws.ts";

describe("parseLogsNotification", () => {
  it("maps a Solana logsSubscribe notification onto a chain tx stub", () => {
    expect(
      parseLogsNotification({
        jsonrpc: "2.0",
        method: "logsNotification",
        params: {
          result: {
            context: { slot: 55 },
            value: { signature: "sig-ws", err: null, logs: ["Program log: hi"] },
          },
        },
      }),
    ).toEqual({
      slot: 55n,
      signature: "sig-ws",
      blockTime: null,
      logs: ["Program log: hi"],
      accountKeys: [],
      tokenTransfers: [],
      err: undefined,
    });
  });

  it("returns null for unrelated websocket messages", () => {
    expect(parseLogsNotification({ method: "slotNotification" })).toBeNull();
    expect(parseLogsNotification(null)).toBeNull();
  });
});
