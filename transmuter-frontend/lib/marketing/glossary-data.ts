export type GlossaryTerm = {
  id: string
  title: string
  body: string
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    "id": "eol-token",
    "title": "EOL token",
    "body": "The token a project launches on Transmuter, also called a reinforced token. It trades and behaves like an ordinary token, and it carries reserves underneath it from the first block plus a defined end of life."
  },
  {
    "id": "ctoken",
    "title": "cToken",
    "body": "The shared reserve asset beneath EOL tokens. A project's treasury holds cTokens. Each cToken represents an amount of the base asset that grows as the ecosystem uses it. Redemption pays out the base asset, not the cToken. Gold sits beneath the base asset where the project chooses the gold variant."
  },
  {
    "id": "escrow",
    "title": "Escrow",
    "body": "An optional, non-custodial team runway. A project can launch with no escrow. If an escrow schedule is set, it cannot be rewritten; holders may pause, unpause or advance a tranche. Unspent escrow converts into the reserve asset, joins the treasury at end of life, and is redeemed with it."
  },
  {
    "id": "contract-owned-liquidity",
    "title": "Contract-owned liquidity",
    "body": "The token's core liquidity position, owned by the contract rather than by the team, built from the same transaction flow that feeds the reserves. At end of life it joins the treasury."
  },
  {
    "id": "mint-to-scale",
    "title": "Mint to Scale",
    "body": "The only time minting happens. An exchange that opens automatically when backing stays below the threshold. SOL paid in during a Mint to Scale event goes into cSOL's reserves, the cSOL contract mints cSOL into the token's treasury, and the payer receives newly minted EOL tokens. It adds more backing than it adds claims, and it does not open above healthy backing."
  },
  {
    "id": "end-of-life",
    "title": "End of life",
    "body": "The trigger that ends a project: a gate on when a proposal can open, a governance vote, and then consolidation and burns defined in the contract. The accounting steps run without a team signature after approval. Holders then redeem."
  },
  {
    "id": "recovery",
    "title": "Recovery",
    "body": "An outcome of end of life. Each holder redeems their pro rata share of the base asset. It is a quantity of that asset, and it is not the name of the trigger."
  },
  {
    "id": "pro-rata-redemption",
    "title": "Pro rata redemption",
    "body": "No threshold to clear and no approval to wait for. Each holder redeems their share when they choose."
  },
  {
    "id": "contingency-layer",
    "title": "Contingency layer",
    "body": "Optional: gold held as a secondary contingency measure beneath a cToken's base asset, for projects that choose the gold variant."
  }
]
