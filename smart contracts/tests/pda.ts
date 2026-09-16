import { PublicKey } from "@solana/web3.js";

export function mintAuthorityPda(programId: PublicKey, mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority"), mint.toBuffer()],
    programId,
  );
}
