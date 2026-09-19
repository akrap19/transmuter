/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_vesting.json`.
 */
export type TransmuterVesting = {
  "address": "9p1LttUtL5Skg568m24NYj1DgsZAWaAcNn3w95CjJMJ4",
  "metadata": {
    "name": "transmuterVesting",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Team/investor EOL vesting: two pots, one TEAM entry, liquidation write-down burn"
  },
  "docs": [
    "Two-pot vesting. Liquidation burns unvested TEAM only (`if kind == TEAM`)."
  ],
  "instructions": [
    {
      "name": "cancelWalletChange",
      "discriminator": [
        133,
        93,
        25,
        179,
        11,
        39,
        124,
        230
      ],
      "accounts": [
        {
          "name": "recipient",
          "signer": true
        },
        {
          "name": "entry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "entry.config",
                "account": "vestingEntry"
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "recipient",
          "signer": true
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
                "account": "vestingConfig"
              }
            ]
          }
        },
        {
          "name": "entry",
          "writable": true
        },
        {
          "name": "pot",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
          "name": "factory",
          "signer": true
        },
        {
          "name": "eolToken"
        },
        {
          "name": "founder"
        },
        {
          "name": "mint"
        },
        {
          "name": "teamRecipient"
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
          "name": "teamPot",
          "writable": true,
          "signer": true
        },
        {
          "name": "investorPot",
          "writable": true,
          "signer": true
        },
        {
          "name": "teamEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "teamRecipient"
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
          "name": "schedule",
          "type": "u8"
        },
        {
          "name": "teamAllocation",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initiateWalletChange",
      "discriminator": [
        36,
        83,
        130,
        34,
        198,
        186,
        179,
        149
      ],
      "accounts": [
        {
          "name": "recipient",
          "signer": true
        },
        {
          "name": "entry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "entry.config",
                "account": "vestingEntry"
              },
              {
                "kind": "account",
                "path": "recipient"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newWallet",
          "type": "pubkey"
        }
      ]
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
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "teamPot",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "teamEntry",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "pushEntry",
      "discriminator": [
        50,
        117,
        13,
        228,
        175,
        183,
        152,
        167
      ],
      "accounts": [
        {
          "name": "founder",
          "writable": true,
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
                "account": "vestingConfig"
              }
            ]
          }
        },
        {
          "name": "pot"
        },
        {
          "name": "entry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "arg",
                "path": "recipient"
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
          "name": "recipient",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "kind",
          "type": "u8"
        }
      ]
    },
    {
      "name": "stampStartTime",
      "discriminator": [
        167,
        179,
        114,
        153,
        33,
        84,
        101,
        114
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
                "account": "vestingConfig"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "unixTs",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "vestingConfig",
      "discriminator": [
        0,
        138,
        71,
        135,
        26,
        29,
        43,
        125
      ]
    },
    {
      "name": "vestingEntry",
      "discriminator": [
        18,
        55,
        48,
        24,
        157,
        78,
        194,
        80
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "badSchedule",
      "msg": "schedule kind is not a known preset"
    },
    {
      "code": 6001,
      "name": "teamCount",
      "msg": "exactly one TEAM entry is required; a second TEAM push is forbidden"
    },
    {
      "code": 6002,
      "name": "zeroAmount",
      "msg": "amount must be greater than zero"
    },
    {
      "code": 6003,
      "name": "badKind",
      "msg": "entry kind is not investor or other"
    },
    {
      "code": 6004,
      "name": "allocExceedsPot",
      "msg": "pot allocations would exceed tokens sitting in that pot"
    },
    {
      "code": 6005,
      "name": "notStarted",
      "msg": "startTime has not been stamped"
    },
    {
      "code": 6006,
      "name": "alreadyStamped",
      "msg": "startTime already stamped"
    },
    {
      "code": 6007,
      "name": "badTimestamp",
      "msg": "timestamp must be > 0 and not in the future"
    },
    {
      "code": 6008,
      "name": "zeroClaimable",
      "msg": "nothing claimable"
    },
    {
      "code": 6009,
      "name": "insufficientPot",
      "msg": "pot holds less than the claimable amount"
    },
    {
      "code": 6010,
      "name": "afterLiquidation",
      "msg": "no push after liquidation stamp"
    },
    {
      "code": 6011,
      "name": "badWallet",
      "msg": "wallet is invalid or already the recipient"
    },
    {
      "code": 6012,
      "name": "noPending",
      "msg": "no pending wallet change"
    },
    {
      "code": 6013,
      "name": "timelock",
      "msg": "48-hour timelock has not elapsed"
    },
    {
      "code": 6014,
      "name": "overflow",
      "msg": "arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "vestingConfig",
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
            "name": "founder",
            "type": "pubkey"
          },
          {
            "name": "teamPot",
            "type": "pubkey"
          },
          {
            "name": "investorPot",
            "type": "pubkey"
          },
          {
            "name": "teamEntry",
            "type": "pubkey"
          },
          {
            "name": "schedule",
            "type": "u8"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "liquidationTimestamp",
            "type": "i64"
          },
          {
            "name": "teamCount",
            "type": "u8"
          },
          {
            "name": "teamAllocated",
            "type": "u64"
          },
          {
            "name": "investorAllocated",
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
      "name": "vestingEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "totalAllocation",
            "type": "u64"
          },
          {
            "name": "alreadyClaimed",
            "type": "u64"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "pendingWallet",
            "type": "pubkey"
          },
          {
            "name": "pendingAfter",
            "type": "i64"
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
