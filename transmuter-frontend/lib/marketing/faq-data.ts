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
          "Transmuter is value recovery infrastructure for tokens on Solana. An isolated treasury and contract-owned liquidity sit beneath each token, with recovery rules defined before trading. A team may set a fixed escrow schedule or choose no escrow; those terms are set before launch.",
          "The team chooses whether to use escrow and sets any schedule before launch. Every token has an isolated treasury and predefined recovery rules."
        ]
      },
      {
        "question": "Is Transmuter a launchpad?",
        "answers": [
          "No. Transmuter is infrastructure. There is a native launcher because it is the simplest way for a project to deploy with the full stack already configured, including reserves, governed escrow, contract-owned liquidity and recovery.",
          "The launcher is one access point to the protocol, not the category we are building."
        ]
      },
      {
        "question": "What backs a token launched on Transmuter?",
        "answers": [
          "Each token has an isolated treasury holding the reserve asset configured at launch.",
          "If the reserve uses a cToken, contingent gold sits beneath its base asset. That gold is not part of an ordinary project closure payout; it is the fallback if the base asset fails."
        ]
      },
      {
        "question": "Can Transmuter access project funds or critical financial functions?",
        "answers": [
          "No. We cannot move a project's treasury, take its reserves, mint its token, alter holder balances, block redemptions or force a recovery.",
          "At the financial governance layer, the founder safeguard is cancel-only: it can stop a malicious recovery proposal, but it cannot create or accelerate one. The system is deliberately designed so that intervention cannot become a route into user funds."
        ]
      },
      {
        "question": "Can someone buy the vote and take the treasury?",
        "answers": [
          "A recovery vote does not transfer reserves to the people voting. Approved recovery distributes the available reserves pro rata to holders.",
          "Influence in the vote does not confer a larger per-token payout. The protocol also uses governance safeguards whose exact boundaries and thresholds are awaiting publication."
        ]
      },
      {
        "question": "Can a team take the money and disappear?",
        "answers": [
          "A team cannot withdraw its project’s treasury at will. If configured, escrow unlocks automatically on the schedule fixed before launch, without requiring a vote for each payment.",
          "Holders can vote to pause, resume or advance the next tranche, without rewriting the schedule. Paused escrow stays in escrow until it is released or enters the treasury at recovery."
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
          "An EOL token is a token configured to use Transmuter’s treasury and recovery rules.",
          "A project may configure escrow or set it to zero. The venue does not screen or approve the team."
        ]
      },
      {
        "question": "What is a cToken?",
        "answers": [
          "A cToken is a reserve layer that sits beneath an EOL token. It is not bought or traded directly by holders.",
          "Projects retain isolated treasuries while shared ecosystem activity can strengthen the cToken layer underneath them."
        ]
      },
      {
        "question": "What is Mint to Scale?",
        "answers": [
          "Mint to Scale is an automatic exchange that accepts a minter’s payment and issues tokens when backing is below the activation threshold.",
          "It is not an unconditional source of income, and the exact trigger duration is awaiting contract verification."
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
          "A minter pays in and receives newly issued EOL tokens. The payment is deposited through the reserve layer into that token’s isolated treasury, rather than being donated into a shared project pot."
        ]
      },
      {
        "question": "What happens to my team's own allocation?",
        "answers": [
          "The team’s token allocation is separate from any escrow schedule, which can be set to zero at launch.",
          "At recovery, unsold allocation and unvested team tokens burn under the predefined rules."
        ]
      },
      {
        "question": "Is my project's treasury exposed to other projects on the protocol?",
        "answers": [
          "No. Each token has its own isolated treasury. Other project treasuries are not pooled with it.",
          "The cToken reserve layer underneath can respond to activity across multiple projects using it."
        ]
      },
      {
        "question": "Can a token launch without escrow?",
        "answers": [
          "Yes. A project can choose no escrow at launch.",
          "If a team configures escrow, its schedule is fixed before trading. Holders can pause, unpause or advance a tranche but cannot rewrite that schedule."
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
        "question": "Can Transmuter block a legitimate recovery vote?",
        "answers": [
          "The founder safeguard is cancel-only: it can halt a recovery proposal, but it cannot initiate recovery or move project reserves.",
          "The boundary of other emergency powers and the applicable governance thresholds are not yet published. The protocol should not be described as beyond human intervention."
        ]
      },
      {
        "question": "How decentralized is Transmuter?",
        "answers": [
          "The architecture uses on-chain rules and governance while retaining a narrow cancel-only founder safeguard.",
          "The full boundary between the founders, any elected council and holder governance remains to be published. No single party is described as fully powerless until that boundary is defined."
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
          "If escrow was configured, holders can pause or unpause it. Unreleased escrow enters the treasury only if recovery is approved, after which available reserves are distributed pro rata."
        ]
      },
      {
        "question": "When can a recovery be proposed?",
        "answers": [
          "A recovery proposal is subject to the protocol’s end-of-life gate and then a governance vote.",
          "Only after recovery is approved do the mechanical reserve-consolidation and token-burn steps run."
        ]
      },
      {
        "question": "How long does recovery take?",
        "answers": [
          "Recovery requires an end-of-life gate and governance approval before contract-defined distribution.",
          "The actual duration depends on the governance process. Exact voting thresholds and an authoritative timeline have not yet been published."
        ]
      },
      {
        "question": "What happens to unspent escrow if a project ends?",
        "answers": [
          "If escrow was configured, its unreleased balance enters the token treasury at recovery.",
          "A holder pause alone does not send funds to the treasury or to the voters. The funds remain in escrow until released or recovered."
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
          "Reserves remain isolated in the project treasury. If recovery is approved, available funds are distributed according to the predefined rules; the protocol does not prevent investment losses."
        ]
      },
      {
        "question": "What does a holder actually receive?",
        "answers": [
          "Recovery pays each EOL token’s defined share of the available reserve asset after governance approval. It is a quantity of an asset, not a promised fiat amount.",
          "Contingency gold beneath a cToken stays at the reserve layer at an ordinary project closure. It is intended as a fallback if the cToken’s base asset fails."
        ]
      }
    ]
  }
]
