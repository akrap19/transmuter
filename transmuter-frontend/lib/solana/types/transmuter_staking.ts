/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_staking.json`.
 */
export type TransmuterStaking = {
  "address": "729ofbpZHYSodUi5ZKXibCFeYCHy9bQ7ojuWrYXLBcZZ",
  "metadata": {
    "name": "transmuterStaking",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EOL staking: free both ways, same-account unstake, snapshotWeight, voter lock"
  },
  "docs": [
    "Staking is a change of custody, not of owner. Unstake returns only to the",
    "staking account. Transfer-fee gross-up is a no-op while fee_bps is 0."
  ],
  "instructions": [
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
          "name": "factory",
          "signer": true
        },
        {
          "name": "eolToken"
        },
        {
          "name": "mint"
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
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "notifyLiquidation",
      "discriminator": [
        221,
        75,
        134,
        107,
        146,
        58,
        172,
        40
      ],
      "accounts": [
        {
          "name": "eolToken",
          "signer": true,
          "relations": [
            "config"
          ]
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
                "path": "config.mint",
                "account": "stakeConfig"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "setVoterLock",
      "discriminator": [
        44,
        27,
        39,
        177,
        224,
        225,
        101,
        92
      ],
      "accounts": [
        {
          "name": "eolToken",
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
                "account": "stakeConfig"
              }
            ]
          }
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "stake_account.owner",
                "account": "stakeAccount"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "lockUntil",
          "type": "i64"
        }
      ]
    },
    {
      "name": "snapshotWeight",
      "discriminator": [
        101,
        193,
        187,
        58,
        169,
        69,
        59,
        71
      ],
      "accounts": [
        {
          "name": "eolToken",
          "writable": true,
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
                "account": "stakeConfig"
              }
            ]
          }
        },
        {
          "name": "stakeAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "stake_account.owner",
                "account": "stakeAccount"
              }
            ]
          }
        },
        {
          "name": "voteId"
        },
        {
          "name": "snapshot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "voteId"
              },
              {
                "kind": "account",
                "path": "stake_account.owner",
                "account": "stakeAccount"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
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
          "name": "mint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
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
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "stakeAccount"
          ]
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
          "name": "mint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "stakeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "stakeAccount",
      "discriminator": [
        80,
        158,
        67,
        124,
        50,
        189,
        192,
        255
      ]
    },
    {
      "name": "stakeConfig",
      "discriminator": [
        238,
        151,
        43,
        3,
        11,
        151,
        63,
        176
      ]
    },
    {
      "name": "voteSnapshot",
      "discriminator": [
        206,
        134,
        226,
        253,
        183,
        213,
        27,
        114
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "zeroAmount",
      "msg": "amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "liquidated",
      "msg": "new staking is disabled after liquidation"
    },
    {
      "code": 6002,
      "name": "insufficientStake",
      "msg": "staked balance is too low"
    },
    {
      "code": 6003,
      "name": "voterLock",
      "msg": "voter lock has not expired"
    },
    {
      "code": 6004,
      "name": "frozen",
      "msg": "stake is frozen (N4-E)"
    },
    {
      "code": 6005,
      "name": "insufficientVault",
      "msg": "vault cannot cover the gross-up"
    },
    {
      "code": 6006,
      "name": "badFee",
      "msg": "fee_bps must be < 10000"
    },
    {
      "code": 6007,
      "name": "overflow",
      "msg": "arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "stakeAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "everStaked",
            "type": "u64"
          },
          {
            "name": "everUnstaked",
            "type": "u64"
          },
          {
            "name": "lockUntil",
            "type": "i64"
          },
          {
            "name": "frozen",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stakeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "eolToken",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "totalStaked",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "liquidated",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteSnapshot",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "voteId",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "weight",
            "type": "u64"
          },
          {
            "name": "totalStakedAtOpen",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
