/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_ctoken.json`.
 */
export type TransmuterCtoken = {
  "address": "GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4",
  "metadata": {
    "name": "transmuterCtoken",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "cToken (cSOL): NonTransferable mint, mintForTreasury, redeem, protocol flush"
  },
  "docs": [
    "cSOL: NonTransferable Token-2022 wrapper around SOL. Gold, age buckets,",
    "transfer fees, and cToken EOL are out of scope for this program."
  ],
  "instructions": [
    {
      "name": "flushProtocolRevenue",
      "discriminator": [
        186,
        190,
        93,
        179,
        251,
        249,
        191,
        191
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "revenuePot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  110,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "config.mint",
                "account": "config"
              }
            ]
          },
          "relations": [
            "config"
          ]
        },
        {
          "name": "protocolRevenueWallet",
          "writable": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "docs": [
            "New Token-2022 mint. Created in the handler so we control owner + space."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "revenuePot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  110,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "factory"
        },
        {
          "name": "protocolRevenueWallet"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "mintForTreasury",
      "discriminator": [
        122,
        129,
        76,
        204,
        55,
        12,
        177,
        148
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "eolRecord"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "config"
          ]
        },
        {
          "name": "revenuePot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  110,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "config"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "ctokenTreasury",
          "writable": true,
          "relations": [
            "eolRecord"
          ]
        },
        {
          "name": "eolRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "eol_record.eol_id",
                "account": "registeredEol"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "underlyingAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeem",
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "eolRecord"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          },
          "relations": [
            "config"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "ctokenTreasury",
          "writable": true,
          "relations": [
            "eolRecord"
          ]
        },
        {
          "name": "eolRecord",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "eol_record.eol_id",
                "account": "registeredEol"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerEol",
      "discriminator": [
        40,
        63,
        127,
        37,
        89,
        83,
        235,
        70
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "authority"
        },
        {
          "name": "ctokenTreasury"
        },
        {
          "name": "eolRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "arg",
                "path": "eolId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "eolId",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "registeredEol",
      "discriminator": [
        242,
        179,
        192,
        40,
        66,
        241,
        224,
        81
      ]
    },
    {
      "name": "solVault",
      "discriminator": [
        21,
        132,
        230,
        103,
        19,
        209,
        129,
        248
      ]
    }
  ],
  "events": [
    {
      "name": "redemptionCompleted",
      "discriminator": [
        46,
        189,
        147,
        218,
        232,
        71,
        143,
        119
      ]
    },
    {
      "name": "treasuryMinted",
      "discriminator": [
        135,
        209,
        252,
        211,
        119,
        103,
        189,
        6
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "premiumLegsMismatch",
      "msg": "premium legs must sum exactly to mintPremiumRate"
    },
    {
      "code": 6001,
      "name": "dust",
      "msg": "deposit too small to mint a single unit"
    },
    {
      "code": 6002,
      "name": "zeroAmount",
      "msg": "amount must be greater than zero"
    },
    {
      "code": 6003,
      "name": "insufficientBacking",
      "msg": "reserve cannot cover this redemption"
    },
    {
      "code": 6004,
      "name": "unregisteredEol",
      "msg": "caller is not a registered EOL Token of this cToken"
    },
    {
      "code": 6005,
      "name": "bptFell",
      "msg": "backing-per-token would fall"
    },
    {
      "code": 6006,
      "name": "arithmeticOverflow",
      "msg": "arithmetic overflow"
    },
    {
      "code": 6007,
      "name": "depositMismatch",
      "msg": "lamports received did not match underlyingAmount"
    }
  ],
  "types": [
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "factory",
            "type": "pubkey"
          },
          {
            "name": "protocolRevenueWallet",
            "type": "pubkey"
          },
          {
            "name": "mintAuthority",
            "type": "pubkey"
          },
          {
            "name": "reserve",
            "type": "pubkey"
          },
          {
            "name": "revenuePot",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "mintPremiumBps",
            "type": "u64"
          },
          {
            "name": "underlyingPremiumBps",
            "type": "u64"
          },
          {
            "name": "protocolPremiumBps",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "redemptionCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "caller",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "payout",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "registeredEol",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "eolId",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "ctokenTreasury",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "solVault",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "treasuryMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "caller",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "tokensMinted",
            "type": "u64"
          },
          {
            "name": "base",
            "type": "u64"
          },
          {
            "name": "underlyingPremium",
            "type": "u64"
          },
          {
            "name": "protocolPremium",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
