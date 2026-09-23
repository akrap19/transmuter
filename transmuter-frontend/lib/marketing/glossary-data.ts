export type GlossaryTerm = {
  id: string
  title: string
  body: string
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    "id": "eol-token",
    "title": "EOL token",
    "body": "The token a project launches on Transmuter. It trades and behaves like an ordinary token, and it carries reserves underneath it from the first block plus a defined procedure for what happens if the project is finished."
  },
  {
    "id": "ctoken",
    "title": "cToken",
    "body": "The reserve layer a project's reserves are held in, either cSOL or cBTC. Nobody holds one. It is not bought, traded or redeemed directly, and what a person holds is the EOL token above it. It exists so that everything standing behind a token, including the gold beneath it, reads as one figure."
  },
  {
    "id": "escrow",
    "title": "Escrow",
    "body": "An optional, non-custodial team runway. A project can launch with no escrow. If an escrow schedule is set, it cannot be rewritten; holders may pause, unpause or advance a tranche. Unspent escrow enters the treasury only at recovery."
  },
  {
    "id": "contract-owned-liquidity",
    "title": "Contract-owned liquidity",
    "body": "The token's core liquidity position, owned by the contract rather than by the team, built from the same transaction flow that feeds the reserves."
  },
  {
    "id": "mint-to-scale",
    "title": "Mint to Scale",
    "body": "An exchange that opens automatically when backing stays below the threshold. A minter pays in above market, the proceeds enter the reserve, and tokens are issued back to them, so it adds more backing than it adds claims. It does not open above healthy backing."
  },
  {
    "id": "minting",
    "title": "Minting",
    "body": "Paying into a token's reserve and receiving tokens in return. The payment enters the cSOL treasury, cSOL is minted into that EOL token's own reserve, and the tokens go to the minter. It is the one input to the reserve that is a purchase rather than an accrual."
  },
  {
    "id": "recovery",
    "title": "Recovery",
    "body": "The end-of-life procedure: a gate on when a proposal can open, a governance vote, and then contract-defined consolidation, burns and pro rata distribution. The accounting steps run without a team signature after approval."
  },
  {
    "id": "pro-rata-distribution",
    "title": "Pro rata distribution",
    "body": "Every holder receives the same share of reserves per token held, with no threshold to clear and no claim to file."
  },
  {
    "id": "contingency-layer",
    "title": "Contingency layer",
    "body": "Gold held as a contingency beneath a cToken base asset. It stays at the cToken layer when an ordinary project closes and is a fallback if the base asset itself fails. A gold primary reserve has different redemption rights."
  }
]
