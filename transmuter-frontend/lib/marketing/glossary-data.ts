export type GlossaryTerm = {
  id: string
  title: string
  body: string
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    "id": "eol-token",
    "title": "EOL token",
    "body": "The token a project launches on Transmuter. It trades and behaves like an ordinary token, and it carries its own reserves from the first block plus a defined end of life."
  },
  {
    "id": "reserve-assets",
    "title": "Reserve assets",
    "body": "The basket backing one token: 1 to 5 of BTC, SOL and USDC, picked by the creator at launch. Each token holds its own basket."
  },
  {
    "id": "treasury",
    "title": "Treasury",
    "body": "The token's own basket of reserve assets, separate from every other token's. Holders own it and the contract manages it."
  },
  {
    "id": "pools",
    "title": "Pools",
    "body": "The token's own pools, which nobody can pull or drain. Their cash is part of the reserves. They unwind at end of life, and the SOL pool and the stablecoin pool each hold at least 20% of the liquidity. Provisional."
  },
  {
    "id": "redemption-value",
    "title": "Redemption value",
    "body": "The reserves divided by the tokens that claim them. It rises with fees, burns and Mint to Scale, and can fall when people sell above it or when the reserve assets fall in price."
  },
  {
    "id": "backing-ratio",
    "title": "Backing ratio",
    "body": "Reserves against market cap. Price-based, used for display and for the Mint to Scale gate, never to price a redemption."
  },
  {
    "id": "escrow",
    "title": "Escrow",
    "body": "An optional, non-custodial team runway. A project can launch with no escrow. If a schedule is set, it cannot be rewritten; only holders can halt, resume or advance it. Unspent escrow is paid to holders in USDC at end of life, and at most half can be released at finalisation."
  },
  {
    "id": "mint-to-scale",
    "title": "Mint to Scale",
    "body": "Sells new supply above market when backing is low, paid in USDC; the proceeds go to reserves. Up to 25% of supply per event, within a yearly budget of 40% to 100%. A closed event does not reopen."
  },
  {
    "id": "end-of-life",
    "title": "End of life",
    "body": "The trigger that ends a project: a gate on when a proposal can open, a 30-day vote, a 48-hour wait, and then consolidation and burns defined in the contract. Holders then redeem."
  },
  {
    "id": "recovery",
    "title": "Recovery",
    "body": "The share a holder gets back: each reserve asset, USDC not yet converted, and the pools' cash, not one base asset. It is a quantity, and it is not the name of the trigger."
  },
  {
    "id": "pro-rata-redemption",
    "title": "Pro rata redemption",
    "body": "Redeem whenever you choose, for a share of each reserve asset, of USDC not yet converted, and of the pools' cash. Charged at the highest fee in the 12 months before that redemption."
  },
  {
    "id": "dao-token",
    "title": "DAO token",
    "body": "Transmuter's own token, itself an EOL token. 0.10% of every transfer buys it and burns it. A DAO pool of 10% to 20% is optional. Tokens for that pool are minted, never bought, at the highest of the live price, the 24-hour average and the redemption value, with no premium."
  },
  {
    "id": "cost",
    "title": "What does it cost?",
    "body": "Launching is free. The transfer fee is 0.60% to 2.00%, set at launch, changeable by holder vote at most three times in 12 months, taking effect about four days later. The first 0.60% is 0.20% Transmuter, 0.15% treasury, 0.15% pools, and 0.10% that buys DAO tokens and burns them. Anything above 0.60% goes to burn, the creator, the treasury or the pools. A redemption uses the highest fee in the 12 months before it; end of life uses the highest fee in the 12 months before the vote passed, and later redemptions use that rate. Transmuter can cut its own share for every live token, and a raise reaches only later launches. Mint to Scale is 0.25% on top. Staking is free both ways, with no staking reward."
  },
  {
    "id": "frozen-reserve-asset",
    "title": "What if a reserve asset is frozen?",
    "body": "It is left out of redemptions until it can move. Nothing is ever written off."
  }
]
