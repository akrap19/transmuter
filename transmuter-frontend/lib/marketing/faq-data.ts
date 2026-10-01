export type FaqItem = {
  question: string
  answers: string[]
}

export type FaqGroup = {
  id: string
  title: string
  items: FaqItem[]
}

export const faqGroups: FaqGroup[] = [
  {
    "id": "buying-questions",
    "title": "Before you commit",
    "items": [
      {
        "question": "What is Transmuter?",
        "answers": [
          "Transmuter is value recovery infrastructure for tokens on Solana. An isolated treasury and contract-owned liquidity sit beneath each token, with end of life rules defined before trading.",
          "Escrow is optional. If used, its schedule is fixed before trading."
        ]
      },
      {
        "question": "Is Transmuter a launchpad?",
        "answers": [
          "Transmuter is infrastructure first. It includes a launchpad so the infrastructure can be proven on real launches and reach founders directly. Other launch platforms can integrate the same infrastructure."
        ]
      },
      {
        "question": "What backs a token launched on Transmuter?",
        "answers": [
          "Each token has an isolated treasury holding the reserve asset configured at launch.",
          "Where the project chooses the gold variant, contingent gold sits beneath the cToken's base asset. That gold is not part of an ordinary project closure payout; it is the fallback if the base asset fails."
        ]
      },
      {
        "question": "Can Transmuter access project funds or critical financial functions?",
        "answers": [
          "No. We cannot move a project's treasury, take its reserves, mint its token, alter holder balances, block redemptions or force an end of life.",
          "At the financial governance layer, the founder safeguard is cancel-only: it can stop an end of life, but it cannot create or accelerate one. The system is deliberately designed so that intervention cannot become a route into user funds."
        ]
      },
      {
        "question": "Can someone buy the vote and take the treasury?",
        "answers": [
          "An end of life vote does not transfer reserves to the people voting. Each holder redeems their pro rata share.",
          "Influence in the vote does not confer a larger per-token payout. The vote thresholds are in /docs."
        ]
      },
      {
        "question": "Can a team take the money and disappear?",
        "answers": [
          "A team cannot withdraw its project’s treasury at will. If configured, escrow unlocks on the schedule fixed before launch, by time or by milestone, without a vote for each payment.",
          "If the work defined in a milestone is not delivered, holders can pause the escrow. Holders can also resume it or advance the next tranche, without rewriting the schedule. Paused escrow stays in escrow until it is released or joins the treasury at end of life."
        ]
      },
      {
        "question": "What kinds of projects can launch on Transmuter?",
        "answers": [
          "Token launches are permissionless. Transmuter does not approve, vet or certify the teams that use it.",
          "Projects choose their own terms at launch, including whether to use escrow. Those terms matter more than the name of the venue."
        ]
      },
      {
        "question": "What are the limits of the system?",
        "answers": [
          "Transmuter does not stop projects from failing, vet teams or make statements about token price. Reserves are worth what their assets are worth.",
          "Escrow is optional and can be set to zero at launch. Governance cannot rewrite an escrow schedule once trading begins."
        ]
      }
    ]
  },
  {
    "id": "what-transmuter-is",
    "title": "What Transmuter is",
    "items": [
      {
        "question": "Does Transmuter compete with other launchpads?",
        "answers": [
          "Other launch platforms can integrate the protocol beneath their own launch experience.",
          "Integration terms are still being developed. Transmuter does not claim other venues offer no protection: escrow-based protection and ongoing token reserves address different periods of a project’s life."
        ]
      },
      {
        "question": "What chain does Transmuter run on?",
        "answers": [
          "Solana."
        ]
      }
    ]
  },
  {
    "id": "launching",
    "title": "Launching",
    "items": [
      {
        "question": "What is an EOL token?",
        "answers": [
          "An EOL token is a token configured to use Transmuter’s treasury and end of life rules.",
          "A project may configure escrow or set it to zero. The venue does not screen or approve the team."
        ]
      },
      {
        "question": "What is a cToken?",
        "answers": [
          "cToken: the shared reserve asset beneath EOL tokens. A project's treasury holds cTokens. Each cToken represents an amount of the base asset that grows as the ecosystem uses it. Redemption pays out the base asset, not the cToken.",
          "Gold sits beneath the base asset where the project chooses the gold variant."
        ]
      },
      {
        "question": "What is Mint to Scale?",
        "answers": [
          "Mint to Scale is an automatic exchange that accepts a minter’s payment and issues tokens when backing is below the activation threshold. Minting happens only inside these events.",
          "It is not an unconditional source of income. Currently 6 hours. Testing may adjust it before launch."
        ]
      },
      {
        "question": "Can the escrow schedule be changed after launch?",
        "answers": [
          "No. Once an escrow schedule is set at launch, nobody can rewrite it.",
          "If escrow is configured, holders can pause it, unpause it or vote to advance the next tranche within the schedule already set."
        ]
      },
      {
        "question": "Where does the money go when someone mints?",
        "answers": [
          "SOL paid in during a Mint to Scale event goes into cSOL's reserves, the cSOL contract mints cSOL into the token's treasury, and the payer receives newly minted EOL tokens."
        ]
      },
      {
        "question": "What happens to my team's own allocation?",
        "answers": [
          "The team’s token allocation is separate from any escrow schedule, which can be set to zero at launch.",
          "At end of life, unsold allocation and unvested team tokens burn under the predefined rules."
        ]
      },
      {
        "question": "Is my project's treasury exposed to other projects on the protocol?",
        "answers": [
          "No. Each token has its own isolated treasury. Other project treasuries are not pooled with it.",
          "The cToken beneath it can respond to activity across multiple projects using it."
        ]
      },
      {
        "question": "Can a token launch without escrow?",
        "answers": [
          "Yes. A project can choose no escrow at launch.",
          "A team that needs no runway launches without one. If a team configures escrow, its schedule is fixed before trading. Holders can pause, unpause or advance a tranche but cannot rewrite that schedule."
        ]
      },
      {
        "question": "Are teams vetted or contracts audited?",
        "answers": [
          "Transmuter launches are permissionless: teams are not approved or vetted.",
          "The contracts have not been audited. An audit is planned for Q1 or Q2 2027; a contract address or dashboard is not currently published."
        ]
      }
    ]
  },
  {
    "id": "governance",
    "title": "Governance",
    "items": [
      {
        "question": "Can Transmuter block a legitimate end of life vote?",
        "answers": [
          "The current design is described in the docs and is being revised. A liquidation halt can stop an end of life, and cannot force one. It cannot move a treasury, mint a token, alter a balance, or block a redemption.",
          "What the halt can and cannot do, and the vote thresholds, are in /docs."
        ]
      },
      {
        "question": "How decentralized is Transmuter?",
        "answers": [
          "The current design is described in the docs and is being revised.",
          "Holders govern their own token. The protocol DAO and its council are guardians with a narrow override, and the founder halt is cancel-only. The boundary is in /docs."
        ]
      }
    ]
  },
  {
    "id": "endings",
    "title": "Endings",
    "items": [
      {
        "question": "What happens if a team abandons the project?",
        "answers": [
          "Abandonment does not give the team the right to withdraw the isolated treasury.",
          "If escrow was configured, holders can pause or unpause it. Unreleased escrow joins the treasury only if end of life is approved, after which each holder redeems their pro rata share."
        ]
      },
      {
        "question": "When can an end of life be proposed?",
        "answers": [
          "An end of life proposal is subject to the protocol’s end of life gate and then a governance vote.",
          "Only after end of life is approved do the mechanical reserve-consolidation and token-burn steps run. The gate is described in /docs."
        ]
      },
      {
        "question": "How long does end of life take?",
        "answers": [
          "About two months from vote to payout, after a 14-day vote needing a 67% supermajority and a 10% quorum.",
          "The timeline and thresholds are in /docs."
        ]
      },
      {
        "question": "What happens to unspent escrow if a project ends?",
        "answers": [
          "If escrow was configured, its unreleased balance converts into the reserve asset, joins the treasury at end of life, and is redeemed with it.",
          "A holder pause alone does not send funds to the treasury or to the voters. The funds remain in escrow until released or they join the treasury at end of life."
        ]
      }
    ]
  },
  {
    "id": "for-holders",
    "title": "For holders",
    "items": [
      {
        "question": "What do holders get?",
        "answers": [
          "Holders can see the terms a team set at launch and participate in governance over a configured escrow schedule.",
          "Reserves remain isolated in the project treasury. If end of life is approved, each holder redeems their share under the predefined rules; the protocol does not prevent investment losses."
        ]
      },
      {
        "question": "What does a holder actually receive?",
        "answers": [
          "End of life pays each EOL token’s defined share of the available base asset after the vote. It is a quantity of that asset, counted in the base asset, not a dollar amount. Each holder redeems when they choose.",
          "Where the project chooses the gold variant, contingency gold stays at the cToken on an ordinary project closure. It is a fallback if the cToken’s base asset fails."
        ]
      }
    ]
  }
]
