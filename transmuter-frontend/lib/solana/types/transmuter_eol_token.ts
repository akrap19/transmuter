/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_eol_token.json`.
 */
export type TransmuterEolToken = {
  "address": "DUYcHygp6rTdf3XY49ewhEyzpUg2QEfWECPTu5ucpaXJ",
  "metadata": {
    "name": "transmuterEolToken",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EOL Token: USDC sale, finalize gates, convertTreasury, fees, reserve mint, liquidation"
  },
  "instructions": [
    {
      "name": "accrueProtocolFees",
      "discriminator": [
        101,
        140,
        246,
        228,
        151,
        95,
        90,
        216
      ],
      "accounts": [
        {
          "name": "payer",
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
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "feeVault",
          "writable": true
        },
        {
          "name": "mint"
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
    },
    {
      "name": "castLiquidationVote",
      "discriminator": [
        171,
        162,
        55,
        240,
        98,
        168,
        132,
        53
      ],
      "accounts": [
        {
          "name": "voter",
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
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "stakingProgram"
        },
        {
          "name": "stakingConfig"
        },
        {
          "name": "stakeAccount"
        }
      ],
      "args": [
        {
          "name": "yes",
          "type": "bool"
        },
        {
          "name": "weight",
          "type": "u64"
        }
      ]
    },
    {
      "name": "castReserveGov",
      "discriminator": [
        122,
        206,
        12,
        108,
        229,
        79,
        81,
        218
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": [
        {
          "name": "yes",
          "type": "bool"
        },
        {
          "name": "weight",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimTokens",
      "discriminator": [
        108,
        216,
        210,
        231,
        0,
        212,
        42,
        64
      ],
      "accounts": [
        {
          "name": "depositor",
          "signer": true,
          "relations": [
            "deposit"
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
          "name": "saleTokenVault",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "convertTreasury",
      "discriminator": [
        198,
        109,
        5,
        248,
        181,
        138,
        132,
        91
      ],
      "accounts": [
        {
          "name": "cranker",
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
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "treasuryUsdc",
          "writable": true
        },
        {
          "name": "dexProgram"
        },
        {
          "name": "nativePool",
          "writable": true
        },
        {
          "name": "nativeVault",
          "writable": true
        },
        {
          "name": "ctokenProgram",
          "address": "GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4"
        },
        {
          "name": "ctokenConfig"
        },
        {
          "name": "ctokenReserve",
          "writable": true
        },
        {
          "name": "ctokenRevenue",
          "writable": true
        },
        {
          "name": "ctokenMint",
          "writable": true
        },
        {
          "name": "ctokenMintAuthority"
        },
        {
          "name": "ctokenTreasury",
          "writable": true
        },
        {
          "name": "eolRecord"
        },
        {
          "name": "token2022Ctoken"
        },
        {
          "name": "usdcProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxIn",
          "type": "u64"
        },
        {
          "name": "minOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "crankReserve",
      "discriminator": [
        99,
        176,
        159,
        41,
        63,
        42,
        6,
        148
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": [
        {
          "name": "backingPct",
          "type": "u64"
        }
      ]
    },
    {
      "name": "crankVolume",
      "discriminator": [
        85,
        210,
        82,
        58,
        179,
        95,
        225,
        77
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": [
        {
          "name": "volume",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "depositor",
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
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "saleUsdcVault",
          "writable": true
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "usdcProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "usdcAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "executeLiquidation",
      "discriminator": [
        189,
        55,
        38,
        121,
        165,
        84,
        96,
        124
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "writable": true
        },
        {
          "name": "treasuryUsdc",
          "writable": true
        },
        {
          "name": "protocolRevenueWallet",
          "writable": true
        },
        {
          "name": "stakingProgram"
        },
        {
          "name": "stakingConfig",
          "writable": true
        },
        {
          "name": "vestingProgram"
        },
        {
          "name": "vestingConfig",
          "writable": true
        },
        {
          "name": "teamPot",
          "writable": true
        },
        {
          "name": "teamEntry",
          "writable": true
        },
        {
          "name": "escrowProgram"
        },
        {
          "name": "escrowConfig",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true
        },
        {
          "name": "ctokenProgram",
          "address": "GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4"
        },
        {
          "name": "ctokenConfig"
        },
        {
          "name": "ctokenReserve",
          "writable": true
        },
        {
          "name": "ctokenMint",
          "writable": true
        },
        {
          "name": "ctokenMintAuthority"
        },
        {
          "name": "ctokenTreasury",
          "writable": true
        },
        {
          "name": "eolRecord"
        },
        {
          "name": "token2022Ctoken"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "usdcProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "executeReserveGov",
      "discriminator": [
        232,
        112,
        26,
        52,
        239,
        120,
        221,
        60
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": []
    },
    {
      "name": "finalize",
      "discriminator": [
        171,
        61,
        218,
        56,
        127,
        115,
        12,
        217
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "writable": true
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
          "name": "saleUsdcVault",
          "writable": true
        },
        {
          "name": "saleTokenVault",
          "writable": true
        },
        {
          "name": "lpTokenVault",
          "writable": true
        },
        {
          "name": "treasuryUsdc",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "dexProgram"
        },
        {
          "name": "poolUsdc"
        },
        {
          "name": "poolUsdcVaultA",
          "writable": true
        },
        {
          "name": "poolUsdcVaultB",
          "writable": true
        },
        {
          "name": "nativePool",
          "writable": true
        },
        {
          "name": "nativeVault",
          "writable": true
        },
        {
          "name": "escrowProgram"
        },
        {
          "name": "escrowConfig"
        },
        {
          "name": "escrowVault"
        },
        {
          "name": "vestingProgram"
        },
        {
          "name": "vestingConfig"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "usdcProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initVaults",
      "discriminator": [
        250,
        62,
        242,
        50,
        163,
        133,
        108,
        93
      ],
      "accounts": [
        {
          "name": "payer",
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
          "writable": true
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
          "name": "usdcMint"
        },
        {
          "name": "saleUsdcVault",
          "writable": true,
          "signer": true
        },
        {
          "name": "saleTokenVault",
          "writable": true,
          "signer": true
        },
        {
          "name": "lpTokenVault",
          "writable": true,
          "signer": true
        },
        {
          "name": "teamTokenVault",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasuryUsdc",
          "writable": true,
          "signer": true
        },
        {
          "name": "feeVault",
          "writable": true,
          "signer": true
        },
        {
          "name": "ctokenTreasury"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "usdcProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "name": "usdcMint"
        },
        {
          "name": "ctokenMint"
        },
        {
          "name": "factory"
        },
        {
          "name": "protocolRevenueWallet"
        },
        {
          "name": "vesting"
        },
        {
          "name": "staking"
        },
        {
          "name": "escrow"
        },
        {
          "name": "ctokenTreasury"
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
          "name": "params",
          "type": {
            "defined": {
              "name": "launchParams"
            }
          }
        }
      ]
    },
    {
      "name": "openLiquidationVote",
      "discriminator": [
        61,
        152,
        152,
        160,
        92,
        131,
        236,
        189
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": []
    },
    {
      "name": "openReserveAuto",
      "discriminator": [
        129,
        194,
        134,
        44,
        151,
        149,
        108,
        44
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": []
    },
    {
      "name": "openReserveGov",
      "discriminator": [
        53,
        155,
        159,
        192,
        15,
        76,
        174,
        82
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": []
    },
    {
      "name": "openTroubleGate",
      "discriminator": [
        148,
        63,
        174,
        194,
        213,
        149,
        45,
        43
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        }
      ],
      "args": []
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
          "name": "user",
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
          "writable": true
        },
        {
          "name": "userEol",
          "writable": true
        },
        {
          "name": "treasuryUsdc",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "redeemState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "ctokenProgram",
          "address": "GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4"
        },
        {
          "name": "ctokenConfig"
        },
        {
          "name": "ctokenReserve",
          "writable": true
        },
        {
          "name": "ctokenMint",
          "writable": true
        },
        {
          "name": "ctokenMintAuthority"
        },
        {
          "name": "ctokenTreasury",
          "writable": true
        },
        {
          "name": "eolRecord"
        },
        {
          "name": "token2022Ctoken"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "usdcProgram"
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
      "name": "reserveMint",
      "discriminator": [
        38,
        65,
        211,
        163,
        172,
        12,
        58,
        68
      ],
      "accounts": [
        {
          "name": "user",
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
          "writable": true
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
          "name": "userEol",
          "writable": true
        },
        {
          "name": "protocolRevenueWallet",
          "writable": true
        },
        {
          "name": "ctokenProgram",
          "address": "GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4"
        },
        {
          "name": "ctokenConfig"
        },
        {
          "name": "ctokenReserve",
          "writable": true
        },
        {
          "name": "ctokenRevenue",
          "writable": true
        },
        {
          "name": "ctokenMint",
          "writable": true
        },
        {
          "name": "ctokenMintAuthority"
        },
        {
          "name": "ctokenTreasury",
          "writable": true
        },
        {
          "name": "eolRecord"
        },
        {
          "name": "token2022Ctoken"
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
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "returnConfigFloat",
      "docs": [
        "Return operator SOL left on config above rent to the factory wallet."
      ],
      "discriminator": [
        41,
        115,
        86,
        107,
        38,
        108,
        50,
        8
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        },
        {
          "name": "recipient",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "seedRaydiumLp",
      "docs": [
        "Seed a Raydium CPMM pool with the new EOL mint plus USDC or WSOL.",
        "`amount_token` is EOL; `amount_quote` is the other side. remaining_accounts",
        "are the 19 Raydium `initialize` accounts after creator.",
        "",
        "Raydium pays the create-pool fee with `SystemProgram::transfer`, which",
        "cannot debit a data account, so the creator is the empty `lp_signer`",
        "PDA. Token vaults are temporarily reassigned to that PDA for the CPI."
      ],
      "discriminator": [
        106,
        127,
        173,
        16,
        77,
        197,
        34,
        120
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        },
        {
          "name": "tokenVault",
          "writable": true
        },
        {
          "name": "quoteVault",
          "writable": true
        },
        {
          "name": "lpSigner",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  115,
                  105,
                  103,
                  110,
                  101,
                  114
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
          "name": "dexProgram"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "quoteProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountToken",
          "type": "u64"
        },
        {
          "name": "amountQuote",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleProtocol",
      "discriminator": [
        107,
        206,
        164,
        24,
        79,
        135,
        120,
        190
      ],
      "accounts": [
        {
          "name": "cranker",
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
                "path": "config.mint",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "feeVault",
          "writable": true
        },
        {
          "name": "protocolEol",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "snapshotOracle",
      "docs": [
        "Permissionless Pyth (or mock_pyth) snapshot. Stale / wide-confidence",
        "prints revert so reserve-mint continuity clocks do not advance (S13)."
      ],
      "discriminator": [
        248,
        147,
        213,
        241,
        159,
        119,
        248,
        125
      ],
      "accounts": [
        {
          "name": "cranker",
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
          "name": "mint"
        },
        {
          "name": "priceFeed"
        },
        {
          "name": "ctokenTreasury"
        },
        {
          "name": "treasuryUsdc"
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "depositor",
          "signer": true,
          "relations": [
            "deposit"
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
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "saleUsdcVault",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "depositor"
              }
            ]
          }
        },
        {
          "name": "usdcProgram"
        }
      ],
      "args": [
        {
          "name": "usdcAmount",
          "type": "u64"
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
      "name": "deposit",
      "discriminator": [
        148,
        146,
        121,
        66,
        207,
        173,
        21,
        227
      ]
    },
    {
      "name": "redeemState",
      "discriminator": [
        69,
        112,
        71,
        246,
        9,
        201,
        117,
        14
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
      "name": "saleDeposit",
      "discriminator": [
        216,
        68,
        83,
        138,
        221,
        153,
        98,
        85
      ]
    },
    {
      "name": "saleFinalized",
      "discriminator": [
        40,
        86,
        126,
        227,
        165,
        195,
        95,
        182
      ]
    },
    {
      "name": "saleVoided",
      "discriminator": [
        75,
        198,
        50,
        2,
        58,
        36,
        135,
        35
      ]
    },
    {
      "name": "saleWithdrawal",
      "discriminator": [
        226,
        205,
        64,
        227,
        136,
        102,
        89,
        130
      ]
    },
    {
      "name": "tokensClaimed",
      "discriminator": [
        25,
        128,
        244,
        55,
        241,
        136,
        200,
        91
      ]
    },
    {
      "name": "treasuryShortfall",
      "discriminator": [
        129,
        30,
        11,
        159,
        213,
        95,
        97,
        223
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "badParams",
      "msg": "launch params invalid"
    },
    {
      "code": 6001,
      "name": "salePct",
      "msg": "public sale below 25%"
    },
    {
      "code": 6002,
      "name": "lpPct",
      "msg": "LP below 10%"
    },
    {
      "code": 6003,
      "name": "teamPct",
      "msg": "team above 20%"
    },
    {
      "code": 6004,
      "name": "daoPct",
      "msg": "dao airdrop above 10%"
    },
    {
      "code": 6005,
      "name": "lpSplit",
      "msg": "LP split must sum to 100% and stay in [25%, 75%]"
    },
    {
      "code": 6006,
      "name": "allocSum",
      "msg": "allocations must sum to 100%"
    },
    {
      "code": 6007,
      "name": "reservePct",
      "msg": "governed mint pct out of [5%, 15%]"
    },
    {
      "code": 6008,
      "name": "reserveGap",
      "msg": "reserve mint deactivate must sit >= 10 points above activate"
    },
    {
      "code": 6009,
      "name": "infeasible",
      "msg": "lpPct*L + treasuryMinPct*g makes this launch infeasible"
    },
    {
      "code": 6010,
      "name": "wrongStatus",
      "msg": "wrong lifecycle status"
    },
    {
      "code": 6011,
      "name": "zeroAmount",
      "msg": "amount must be positive"
    },
    {
      "code": 6012,
      "name": "saleClosed",
      "msg": "sale window has closed"
    },
    {
      "code": 6013,
      "name": "saleOpen",
      "msg": "sale is still open"
    },
    {
      "code": 6014,
      "name": "cap",
      "msg": "deposit exceeds remaining sale cap"
    },
    {
      "code": 6015,
      "name": "dust",
      "msg": "credited tokens would be zero"
    },
    {
      "code": 6016,
      "name": "depositMismatch",
      "msg": "USDC received did not match amount"
    },
    {
      "code": 6017,
      "name": "insufficientCredit",
      "msg": "insufficient deposit credit"
    },
    {
      "code": 6018,
      "name": "noEscrow",
      "msg": "escrow config required when escrowFundingNeed > 0"
    },
    {
      "code": 6019,
      "name": "alreadyClaimed",
      "msg": "already claimed"
    },
    {
      "code": 6020,
      "name": "insufficient",
      "msg": "insufficient treasury"
    },
    {
      "code": 6021,
      "name": "healthy",
      "msg": "volume is not in the trouble band"
    },
    {
      "code": 6022,
      "name": "noGate",
      "msg": "trouble gate is closed"
    },
    {
      "code": 6023,
      "name": "voteOpen",
      "msg": "vote already open"
    },
    {
      "code": 6024,
      "name": "noVote",
      "msg": "no open vote"
    },
    {
      "code": 6025,
      "name": "voteClosed",
      "msg": "vote window closed"
    },
    {
      "code": 6026,
      "name": "noQuorum",
      "msg": "quorum not met"
    },
    {
      "code": 6027,
      "name": "voteFailed",
      "msg": "holder vote failed"
    },
    {
      "code": 6028,
      "name": "allowanceOpen",
      "msg": "allowance already open"
    },
    {
      "code": 6029,
      "name": "noTrigger",
      "msg": "automatic trigger has not armed"
    },
    {
      "code": 6030,
      "name": "duration",
      "msg": "duration has not elapsed"
    },
    {
      "code": 6031,
      "name": "noAllowance",
      "msg": "no reserve-mint allowance"
    },
    {
      "code": 6032,
      "name": "vaultsReady",
      "msg": "vaults already initialised"
    },
    {
      "code": 6033,
      "name": "oracleOwner",
      "msg": "price account owner is not a pinned oracle program"
    },
    {
      "code": 6034,
      "name": "oracleLayout",
      "msg": "price account layout is not Pyth PriceUpdateV2 or mock_pyth"
    },
    {
      "code": 6035,
      "name": "oracleStale",
      "msg": "oracle print is stale"
    },
    {
      "code": 6036,
      "name": "oracleConf",
      "msg": "oracle confidence interval is too wide"
    },
    {
      "code": 6037,
      "name": "badDex",
      "msg": "dex_program is not mock_dex or Raydium CPMM"
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
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "ctokenMint",
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
            "name": "saleUsdcVault",
            "type": "pubkey"
          },
          {
            "name": "saleTokenVault",
            "type": "pubkey"
          },
          {
            "name": "lpTokenVault",
            "type": "pubkey"
          },
          {
            "name": "teamTokenVault",
            "type": "pubkey"
          },
          {
            "name": "treasuryUsdc",
            "type": "pubkey"
          },
          {
            "name": "ctokenTreasury",
            "type": "pubkey"
          },
          {
            "name": "feeVault",
            "type": "pubkey"
          },
          {
            "name": "vesting",
            "type": "pubkey"
          },
          {
            "name": "staking",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "salePrice",
            "type": "u64"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "saleTokens",
            "type": "u64"
          },
          {
            "name": "lpTokensFull",
            "type": "u64"
          },
          {
            "name": "teamTokens",
            "type": "u64"
          },
          {
            "name": "soldTokens",
            "type": "u64"
          },
          {
            "name": "raisedUsdc",
            "type": "u64"
          },
          {
            "name": "saleEnd",
            "type": "i64"
          },
          {
            "name": "escrowNeed",
            "type": "u64"
          },
          {
            "name": "minRaise",
            "type": "u64"
          },
          {
            "name": "saleBps",
            "type": "u16"
          },
          {
            "name": "lpBps",
            "type": "u16"
          },
          {
            "name": "lpSolShareBps",
            "type": "u16"
          },
          {
            "name": "lpUsdcShareBps",
            "type": "u16"
          },
          {
            "name": "sh2MaxSlippageBps",
            "type": "u64"
          },
          {
            "name": "mintPremiumBps",
            "type": "u64"
          },
          {
            "name": "convertChunk",
            "type": "u64"
          },
          {
            "name": "convertDone",
            "type": "bool"
          },
          {
            "name": "shortfallEmitted",
            "type": "bool"
          },
          {
            "name": "transferFeeBps",
            "type": "u16"
          },
          {
            "name": "redemptionTreasuryFeeBps",
            "type": "u16"
          },
          {
            "name": "redemptionRevenueFeeBps",
            "type": "u16"
          },
          {
            "name": "pendingProtocol",
            "type": "u64"
          },
          {
            "name": "pendingProtocolUnderlying",
            "type": "u64"
          },
          {
            "name": "solResidue",
            "type": "u64"
          },
          {
            "name": "escrowUsdc",
            "type": "u64"
          },
          {
            "name": "liquidated",
            "type": "bool"
          },
          {
            "name": "troubleGate",
            "type": "bool"
          },
          {
            "name": "volume",
            "type": "u64"
          },
          {
            "name": "voteYes",
            "type": "u64"
          },
          {
            "name": "voteNo",
            "type": "u64"
          },
          {
            "name": "voteClosesAt",
            "type": "i64"
          },
          {
            "name": "voteDenom",
            "type": "u64"
          },
          {
            "name": "voteOpen",
            "type": "bool"
          },
          {
            "name": "voteExecuted",
            "type": "bool"
          },
          {
            "name": "governedMintPctBps",
            "type": "u16"
          },
          {
            "name": "rmActivatePct",
            "type": "u64"
          },
          {
            "name": "rmDeactivatePct",
            "type": "u64"
          },
          {
            "name": "rmDurationSecs",
            "type": "i64"
          },
          {
            "name": "rmBelowSince",
            "type": "i64"
          },
          {
            "name": "rmAllowance",
            "type": "u64"
          },
          {
            "name": "rmAllowanceOpen",
            "type": "bool"
          },
          {
            "name": "rmOpenedAt",
            "type": "i64"
          },
          {
            "name": "rmPriceSnapshot",
            "type": "u64"
          },
          {
            "name": "rmMinted",
            "type": "u64"
          },
          {
            "name": "rmGovYes",
            "type": "u64"
          },
          {
            "name": "rmGovNo",
            "type": "u64"
          },
          {
            "name": "rmGovClosesAt",
            "type": "i64"
          },
          {
            "name": "rmGovOpen",
            "type": "bool"
          },
          {
            "name": "liqVoteWindowSecs",
            "type": "i64"
          },
          {
            "name": "oraclePrice",
            "type": "i64"
          },
          {
            "name": "oracleConf",
            "type": "u64"
          },
          {
            "name": "oracleExpo",
            "type": "i32"
          },
          {
            "name": "oraclePublishTime",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "deposit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "claimed",
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
      "name": "launchParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "salePrice",
            "type": "u64"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "saleBps",
            "type": "u16"
          },
          {
            "name": "lpBps",
            "type": "u16"
          },
          {
            "name": "lpSolShareBps",
            "type": "u16"
          },
          {
            "name": "lpUsdcShareBps",
            "type": "u16"
          },
          {
            "name": "teamBps",
            "type": "u16"
          },
          {
            "name": "investorBps",
            "type": "u16"
          },
          {
            "name": "daoBps",
            "type": "u16"
          },
          {
            "name": "escrowFundingNeed",
            "type": "u64"
          },
          {
            "name": "saleEnd",
            "type": "i64"
          },
          {
            "name": "sh2MaxSlippageBps",
            "type": "u64"
          },
          {
            "name": "governedMintPctBps",
            "type": "u16"
          },
          {
            "name": "reserveMintActivatePct",
            "type": "u64"
          },
          {
            "name": "reserveMintDeactivatePct",
            "type": "u64"
          },
          {
            "name": "reserveMintDurationSecs",
            "type": "i64"
          },
          {
            "name": "liqVoteWindowSecs",
            "type": "i64"
          },
          {
            "name": "convertChunk",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redeemState",
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
            "name": "eolBurned",
            "type": "u64"
          },
          {
            "name": "csolOwed",
            "type": "u64"
          },
          {
            "name": "csolPaid",
            "type": "u64"
          },
          {
            "name": "usdcOwed",
            "type": "u64"
          },
          {
            "name": "usdcPaid",
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
            "name": "gross",
            "type": "u64"
          },
          {
            "name": "treasuryFee",
            "type": "u64"
          },
          {
            "name": "revenueSkim",
            "type": "u64"
          },
          {
            "name": "burned",
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
      "name": "saleDeposit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "usdcAmount",
            "type": "u64"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "saleFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "raised",
            "type": "u64"
          },
          {
            "name": "treasuryPortion",
            "type": "u64"
          },
          {
            "name": "lpPortion",
            "type": "u64"
          },
          {
            "name": "runwayPortion",
            "type": "u64"
          },
          {
            "name": "unsoldBurned",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "saleVoided",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "raised",
            "type": "u64"
          },
          {
            "name": "minimumRequired",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "saleWithdrawal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokensClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "treasuryShortfall",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "realisedRemainder",
            "type": "u64"
          },
          {
            "name": "askNeed",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
