import { PublicKey } from "@solana/web3.js";

/** Streaming decode of the RegistryConfig prefix (r22). Ignores trailing bytes. */
export function decodeRegistryConfigPrefix(data: Buffer | Uint8Array) {
  const buf = Buffer.from(data);
  let o = 8;
  const team = new PublicKey(buf.subarray(o, o + 32));
  o += 32;
  const nFounders = buf.readUInt32LE(o);
  o += 4;
  const founders: PublicKey[] = [];
  for (let i = 0; i < nFounders; i++) {
    founders.push(new PublicKey(buf.subarray(o, o + 32)));
    o += 32;
  }
  const founderThreshold = buf[o];
  o += 1;
  const daoProgram = new PublicKey(buf.subarray(o, o + 32));
  o += 32;
  const ambassadorCount = buf.readUInt32LE(o);
  o += 4;
  const maxAmbassadors = buf.readUInt32LE(o);
  o += 4;
  const genesisLocked = buf[o] !== 0;
  o += 1;
  return {
    team,
    founders,
    founderThreshold,
    daoProgram,
    ambassadorCount,
    maxAmbassadors,
    genesisLocked,
    prefixEnd: o,
  };
}
