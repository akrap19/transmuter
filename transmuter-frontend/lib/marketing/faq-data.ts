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
          "Transmuter is value recovery infrastructure for tokens on Solana. Each token has its own isolated treasury and its own pools nobody can pull or drain, with end of life rules defined before trading.",
          "Any holder can redeem their share at any time, in the reserves themselves.",
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
          "A token's reserves are the treasury basket of BTC, SOL and USDC, USDC that has been collected but not yet converted, and the cash side of the token's own pools.",
          "Each token holds its own basket, picked by its creator at launch."
        ]
      },
      {
        "question": "Can Transmuter access project funds or critical financial functions?",
        "answers": [
          "No. No instruction lets the creator or Transmuter take the treasury. It moves only by redemption, a holder-voted draw into escrow, and end of life. Transmuter cannot mint a token, alter holder balances or block a redemption.",
          "Every Transmuter power runs through a 3-of-5 multisig with its own signers. It can stop a passed end of life within 48 hours and can never start one.",
          "The reserves program can be upgraded so bugs can be fixed. For now that takes Transmuter's 3-of-5 multisig, with its own signers; later it will take Transmuter plus the DAO council or the DAO's holders. The governance section of /docs#governance sets out who can upgrade it."
        ]
      },
      {
        "question": "Can someone buy the vote and take the treasury?",
        "answers": [
          "An end of life vote does not transfer reserves to the people voting. Each holder redeems their pro rata share.",
          "Influence in the vote does not confer a larger per-token payout. Transmuter, together with the DAO council or the DAO's holders, can freeze a staked position. Nothing is burned or taken.",
          "The vote thresholds are in /docs."
        ]
      },
      {
        "question": "Can a team take the money and disappear?",
        "answers": [
          "A team cannot withdraw its project's treasury at will. If configured, escrow unlocks on the schedule fixed before launch, without a vote for each payment.",
          "If the work defined in a milestone is not delivered, holders can pause the escrow, resume it, or advance the next tranche, without rewriting the schedule.",
          "At most half of the escrow can be released at finalisation. Sale deposits are final once the sale closes; if a finalisation check fails, the launch voids and every depositor gets their USDC back."
        ]
      },
      {
        "question": "What kinds of projects can launch on Transmuter?",
        "answers": [
          "Token launches are permissionless. Transmuter does not approve, vet or certify the teams that use it.",
          "A memecoin has no escrow and no investors. A serious project can have escrow, and investors up to 30% of supply."
        ]
      },
      {
        "question": "What are the limits of the system?",
        "answers": [
          "Transmuter does not stop projects from failing, vet teams or make statements about token price. Reserves are worth what their assets are worth.",
          "Redemption value can fall when people sell above it, or when the reserve assets fall in price. Escrow is optional and can be set to zero at launch. Governance cannot rewrite an escrow schedule once trading begins."
        ]
      },
      {
        "question": "What does it cost?",
        "answers": [
          "Launching is free. The transfer fee is 0.60% to 2.00%, set at launch and changeable by holder vote at most three times in 12 months, taking effect about four days later.",
          "The first 0.60% is 0.20% Transmuter, 0.15% treasury, 0.15% pools, and 0.10% that buys DAO tokens and burns them. Anything above 0.60% goes to burn, the creator, the treasury or the pools.",
          "A redemption uses the highest fee in the 12 months before it. End of life uses the highest fee in the 12 months before the vote passed, and later redemptions use that same rate.",
          "Transmuter can cut its share; a cut reaches every live token and lowers its total by the same amount. A raise reaches only later launches. Mint to Scale is 0.25% on top. Staking is free both ways, with no staking reward."
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
          "Integration terms are still being developed. Transmuter does not claim other venues offer no protection: escrow-based protection and ongoing token reserves address different periods of a project's life."
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
          "An EOL token is a token configured to use Transmuter's treasury and end of life rules.",
          "A project may configure escrow or set it to zero. The venue does not screen or approve the team."
        ]
      },
      {
        "question": "What are reserve assets?",
        "answers": [
          "A reserve asset is one of the assets a token's treasury holds: 1 to 5 of BTC, SOL and USDC, picked by the creator at launch.",
          "They are collected by fixed ratios and never rebalanced. Nothing is ever written off: an asset that cannot move is left out of a redemption until it can."
        ]
      },
      {
        "question": "What is Mint to Scale?",
        "answers": [
          "Mint to Scale sells new supply above market when backing is low, paid in USDC, and the proceeds go to reserves.",
          "It opens after 6 hours under the creator's trigger. The premium opens at 50%, falls 2 points an hour, and rests at 2% after 24 hours.",
          "Up to 25% of supply per event; the yearly budget is 40% to 100%. There is no gap between events, and a closed event does not reopen."
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
          "The buyer pays USDC plus 0.25%. All of it counts as reserves at once. 0% to 50% pairs into the pools; the rest is converted into the basket."
        ]
      },
      {
        "question": "What happens to my team's own allocation?",
        "answers": [
          "At most 30%, always vested, nothing unlocked at listing. A cliff releases what has built up by then.",
          "Unvested team tokens burn at end of life; investor tokens never burn. Unsold sale tokens burn at finalisation."
        ]
      },
      {
        "question": "Is my project's treasury exposed to other projects on the protocol?",
        "answers": [
          "No. Each token has its own isolated treasury and its own basket.",
          "The only links are the 0.10% DAO buy-and-burn and an optional DAO pool."
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
          "The contracts have not been audited. Audits and legal work follow in the first half of 2027, and nothing launches before the audit. A contract address or dashboard is not currently published."
        ]
      },
      {
        "question": "What if a reserve asset is frozen?",
        "answers": [
          "A frozen reserve asset is left out of redemptions until it can move again. Nothing is ever written off.",
          "Your share of that asset stays with the holders who wait."
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
          "Transmuter's multisig can stop a passed end of life in the 48 hours before it executes, and can overrule a DAO cancel. It can never start or force one.",
          "The DAO can cancel a passed end of life. Neither can start one. The vote thresholds are in /docs."
        ]
      },
      {
        "question": "How decentralised is Transmuter?",
        "answers": [
          "Three groups: the DAO's holders, the DAO council and Transmuter's multisig. Transmuter appoints the council for now and hands that over later.",
          "Holders govern their own token. The boundary is in /docs."
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
          "Unspent escrow is paid to holders as USDC at end of life. A holder-passed escrow halt also opens the end-of-life gate."
        ]
      },
      {
        "question": "When can an end of life be proposed?",
        "answers": [
          "After the trouble condition, where the market has sat near the redemption value for about a month, after 10 days of dead price reads, after an escrow halt, or when Transmuter opens the gate.",
          "Then two parties, one of them the creator or a holder with 0.1% of supply."
        ]
      },
      {
        "question": "How long does end of life take?",
        "answers": [
          "About one month from the proposal, being a 30-day vote plus a 48-hour wait, and up to two months from the first sign of trouble.",
          "Two-thirds, with a 10% quorum. After a vote that fails for lack of quorum, 7%, then 5%."
        ]
      },
      {
        "question": "What happens to unspent escrow if a project ends?",
        "answers": [
          "Paid out in USDC, never taxed. It is not converted into reserve assets.",
          "A holder pause alone does not send funds to the treasury or to the voters. The funds remain in escrow until released or they are paid at end of life."
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
          "Any holder can redeem at any time, not only after an end of life.",
          "Reserves remain isolated in the project treasury. If end of life is approved, each holder redeems their share under the predefined rules; the protocol does not prevent investment losses."
        ]
      },
      {
        "question": "What does a holder actually receive?",
        "answers": [
          "Their share of each reserve asset, of USDC not yet converted, and of the pools' cash, minus the redemption fee. It is a quantity, counted in the assets, not a dollar amount.",
          "A holder can redeem whenever they choose."
        ]
      }
    ]
  }
]
