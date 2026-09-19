/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_factory.json`.
 */
export type TransmuterFactory = {
  "address": "5D3y69mm4wrz7VcGsagfvnrMorvLar7ZnZaLfd3uVcfV",
  "metadata": {
    "name": "transmuterFactory",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Launchpad Factory: CREATED → WIRED → SALE, snapshotted validations, registry"
  },
  "instructions": [
    {
      "name": "addCtoken",
      "discriminator": [
        186,
        189,
        166,
        158,
        20,
        126,
        69,
        77
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        },
        {
          "name": "factory",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  116,
                  111,
                  107,
                  101,
                  110
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "addInvestor",
      "discriminator": [
        63,
        93,
        233,
        93,
        140,
        208,
        152,
        146
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        },
        {
          "name": "factory",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "wallet"
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
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
      "name": "createLaunch",
      "discriminator": [
        239,
        223,
        255,
        134,
        39,
        121,
        127,
        62
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "backingCtoken"
        },
        {
          "name": "fallbackCtoken"
        },
        {
          "name": "backingListing",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "backingCtoken"
              }
            ]
          }
        },
        {
          "name": "fallbackListing",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "fallbackCtoken"
              }
            ]
          }
        },
        {
          "name": "teamRecipient"
        },
        {
          "name": "daoContract"
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "launchId"
              }
            ]
          }
        },
        {
          "name": "mintIndex",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "launchId",
          "type": "u64"
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createLaunchParams"
            }
          }
        }
      ]
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "protocolRevenueWallet"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "registry"
        },
        {
          "name": "dao"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setProtocolParams",
      "discriminator": [
        62,
        227,
        236,
        191,
        249,
        100,
        137,
        25
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "factory"
          ]
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "sh2MaxSlippageBps",
          "type": "u64"
        },
        {
          "name": "mintPremiumBps",
          "type": "u64"
        }
      ]
    },
    {
      "name": "syncOutcome",
      "discriminator": [
        156,
        255,
        209,
        20,
        53,
        211,
        159,
        138
      ],
      "accounts": [
        {
          "name": "cranker",
          "signer": true
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "eolConfig",
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
                "path": "launch.mint",
                "account": "launch"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                185,
                90,
                170,
                48,
                94,
                106,
                6,
                126,
                132,
                77,
                22,
                181,
                28,
                140,
                127,
                108,
                59,
                127,
                239,
                231,
                195,
                87,
                122,
                184,
                4,
                229,
                94,
                183,
                141,
                107,
                168,
                137
              ]
            }
          }
        }
      ],
      "args": []
    },
    {
      "name": "wireDao",
      "discriminator": [
        57,
        203,
        130,
        161,
        43,
        170,
        219,
        7
      ],
      "accounts": [
        {
          "name": "cranker",
          "signer": true
        },
        {
          "name": "factory",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "wireEol",
      "discriminator": [
        14,
        238,
        22,
        94,
        109,
        76,
        202,
        102
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
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
            ],
            "program": {
              "kind": "account",
              "path": "eolProgram"
            }
          }
        },
        {
          "name": "eolConfig",
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
            ],
            "program": {
              "kind": "account",
              "path": "eolProgram"
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "ctokenMint"
        },
        {
          "name": "protocolRevenueWallet"
        },
        {
          "name": "vestingConfig"
        },
        {
          "name": "stakingConfig"
        },
        {
          "name": "escrowConfig"
        },
        {
          "name": "ctokenTreasury"
        },
        {
          "name": "eolProgram",
          "address": "DUYcHygp6rTdf3XY49ewhEyzpUg2QEfWECPTu5ucpaXJ"
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
      "args": []
    },
    {
      "name": "wireEscrow",
      "discriminator": [
        120,
        2,
        167,
        134,
        236,
        108,
        196,
        237
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "eolConfig"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "teamRecipient"
        },
        {
          "name": "dao"
        },
        {
          "name": "registry"
        },
        {
          "name": "escrowConfig",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowProgram",
          "address": "Dy1ddZeaR7GL2QPxWnogrFmdYio4eE5Hrm613SS2PbdK"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "wirePoolSol",
      "discriminator": [
        196,
        220,
        19,
        53,
        170,
        116,
        163,
        120
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "eolConfig"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "nativePool",
          "writable": true
        },
        {
          "name": "vaultUsdc",
          "writable": true,
          "signer": true
        },
        {
          "name": "dexProgram",
          "address": "B1Wxrd67VBAmBKKvwx41YZjgpJDfJWmJHyXfHCBfrqdV"
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
      "name": "wirePoolUsdc",
      "discriminator": [
        7,
        122,
        151,
        80,
        254,
        180,
        29,
        42
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "eolConfig"
        },
        {
          "name": "mint"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "vaultA",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultB",
          "writable": true,
          "signer": true
        },
        {
          "name": "dexProgram",
          "address": "B1Wxrd67VBAmBKKvwx41YZjgpJDfJWmJHyXfHCBfrqdV"
        },
        {
          "name": "tokenProgramA"
        },
        {
          "name": "tokenProgramB"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "wireRegister",
      "discriminator": [
        10,
        115,
        142,
        181,
        40,
        102,
        247,
        153
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "eolConfig"
        },
        {
          "name": "ctokenProgram",
          "address": "GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4"
        },
        {
          "name": "ctokenConfig"
        },
        {
          "name": "ctokenTreasury"
        },
        {
          "name": "eolRecord",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "wireStaking",
      "discriminator": [
        95,
        169,
        63,
        42,
        174,
        225,
        185,
        245
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "eolConfig"
        },
        {
          "name": "stakingConfig",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakingProgram",
          "address": "729ofbpZHYSodUi5ZKXibCFeYCHy9bQ7ojuWrYXLBcZZ"
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
      "name": "wireVaults",
      "discriminator": [
        105,
        167,
        69,
        64,
        47,
        40,
        204,
        172
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "eolConfig",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "mintAuthority"
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
          "name": "eolProgram",
          "address": "DUYcHygp6rTdf3XY49ewhEyzpUg2QEfWECPTu5ucpaXJ"
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
      "name": "wireVesting",
      "discriminator": [
        162,
        89,
        102,
        106,
        51,
        166,
        124,
        113
      ],
      "accounts": [
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.id",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "eolConfig"
        },
        {
          "name": "founder"
        },
        {
          "name": "teamRecipient"
        },
        {
          "name": "vestingConfig",
          "writable": true
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
          "writable": true
        },
        {
          "name": "vestingProgram",
          "address": "9p1LttUtL5Skg568m24NYj1DgsZAWaAcNn3w95CjJMJ4"
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
    }
  ],
  "accounts": [
    {
      "name": "cTokenListing",
      "discriminator": [
        237,
        237,
        113,
        59,
        231,
        108,
        28,
        207
      ]
    },
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
      "name": "factoryConfig",
      "discriminator": [
        29,
        197,
        255,
        232,
        22,
        128,
        67,
        26
      ]
    },
    {
      "name": "investorListing",
      "discriminator": [
        157,
        178,
        167,
        218,
        163,
        179,
        227,
        121
      ]
    },
    {
      "name": "launch",
      "discriminator": [
        144,
        51,
        51,
        163,
        206,
        85,
        213,
        38
      ]
    },
    {
      "name": "mintIndex",
      "discriminator": [
        104,
        115,
        14,
        11,
        21,
        32,
        223,
        212
      ]
    }
  ],
  "events": [
    {
      "name": "tokenLaunched",
      "discriminator": [
        225,
        232,
        190,
        147,
        213,
        192,
        220,
        168
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "launchId",
      "msg": "launch id does not match totalLaunches"
    },
    {
      "code": 6001,
      "name": "name",
      "msg": "name/symbol empty or too long"
    },
    {
      "code": 6002,
      "name": "badParams",
      "msg": "bad launch params"
    },
    {
      "code": 6003,
      "name": "saleType",
      "msg": "only FIXED sales are in MVP scope"
    },
    {
      "code": 6004,
      "name": "forfeitDest",
      "msg": "forfeit destination must be treasury"
    },
    {
      "code": 6005,
      "name": "salePct",
      "msg": "sale pct below minimum"
    },
    {
      "code": 6006,
      "name": "lpPct",
      "msg": "lp pct below minimum"
    },
    {
      "code": 6007,
      "name": "teamPct",
      "msg": "team pct above maximum"
    },
    {
      "code": 6008,
      "name": "investorPct",
      "msg": "investor allocation is not in MVP scope"
    },
    {
      "code": 6009,
      "name": "daoPct",
      "msg": "dao airdrop pct above maximum"
    },
    {
      "code": 6010,
      "name": "allocSum",
      "msg": "allocation percentages must sum to 100%"
    },
    {
      "code": 6011,
      "name": "lpSplit",
      "msg": "lp split invalid"
    },
    {
      "code": 6012,
      "name": "fee",
      "msg": "transfer fee / split invalid"
    },
    {
      "code": 6013,
      "name": "reservePct",
      "msg": "reserve-mint bounds"
    },
    {
      "code": 6014,
      "name": "reserveGap",
      "msg": "reserve-mint gap"
    },
    {
      "code": 6015,
      "name": "reserveVoteWindow",
      "msg": "reserve-mint vote window"
    },
    {
      "code": 6016,
      "name": "schedule",
      "msg": "vesting schedule"
    },
    {
      "code": 6017,
      "name": "saleWindow",
      "msg": "sale window must be 1–60 days"
    },
    {
      "code": 6018,
      "name": "fallbackSame",
      "msg": "fallback cToken equals backing"
    },
    {
      "code": 6019,
      "name": "backingWhitelist",
      "msg": "backing cToken is not whitelisted"
    },
    {
      "code": 6020,
      "name": "fallbackWhitelist",
      "msg": "fallback cToken is not whitelisted"
    },
    {
      "code": 6021,
      "name": "infeasible",
      "msg": "launch is infeasible at snapshotted g/L"
    },
    {
      "code": 6022,
      "name": "minRaise",
      "msg": "targetRaise below minRaise"
    },
    {
      "code": 6023,
      "name": "fixedRaise",
      "msg": "FIXED salePrice * salePct * supply != targetRaise"
    },
    {
      "code": 6024,
      "name": "teamRecipient",
      "msg": "team recipient required"
    },
    {
      "code": 6025,
      "name": "daoUnset",
      "msg": "dao contract required"
    },
    {
      "code": 6026,
      "name": "mint",
      "msg": "mint mismatch"
    },
    {
      "code": 6027,
      "name": "badStatus",
      "msg": "bad launch status"
    },
    {
      "code": 6028,
      "name": "needEol",
      "msg": "EOL must be wired first"
    },
    {
      "code": 6029,
      "name": "vestingNotRequired",
      "msg": "vesting is not required for this launch"
    },
    {
      "code": 6030,
      "name": "escrowNotRequired",
      "msg": "escrow is not required for this launch"
    },
    {
      "code": 6031,
      "name": "notWired",
      "msg": "wiring incomplete; SALE is unreachable"
    },
    {
      "code": 6032,
      "name": "overflow",
      "msg": "overflow"
    }
  ],
  "types": [
    {
      "name": "cTokenListing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
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
      "name": "createLaunchParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "saleType",
            "type": "u8"
          },
          {
            "name": "salePrice",
            "type": "u64"
          },
          {
            "name": "targetRaise",
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
            "name": "reserveMintVoteWindowSecs",
            "type": "i64"
          },
          {
            "name": "liqVoteWindowSecs",
            "type": "i64"
          },
          {
            "name": "convertChunk",
            "type": "u64"
          },
          {
            "name": "transferFeeBps",
            "type": "u16"
          },
          {
            "name": "feeLpBps",
            "type": "u16"
          },
          {
            "name": "feeTreasuryBps",
            "type": "u16"
          },
          {
            "name": "feeCtokenBps",
            "type": "u16"
          },
          {
            "name": "feeProtocolBps",
            "type": "u16"
          },
          {
            "name": "feeCreatorBps",
            "type": "u16"
          },
          {
            "name": "feeBurnBps",
            "type": "u16"
          },
          {
            "name": "forfeitDest",
            "type": "u8"
          },
          {
            "name": "vestingSchedule",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "factoryConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "protocolRevenueWallet",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "registry",
            "type": "pubkey"
          },
          {
            "name": "dao",
            "type": "pubkey"
          },
          {
            "name": "mintPremiumBps",
            "type": "u64"
          },
          {
            "name": "sh2MaxSlippageBps",
            "type": "u64"
          },
          {
            "name": "totalLaunches",
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
      "name": "investorListing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
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
      "name": "launch",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "eolConfig",
            "type": "pubkey"
          },
          {
            "name": "staking",
            "type": "pubkey"
          },
          {
            "name": "vesting",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "poolUsdc",
            "type": "pubkey"
          },
          {
            "name": "poolSol",
            "type": "pubkey"
          },
          {
            "name": "backingCtoken",
            "type": "pubkey"
          },
          {
            "name": "fallbackCtoken",
            "type": "pubkey"
          },
          {
            "name": "teamRecipient",
            "type": "pubkey"
          },
          {
            "name": "dao",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "wiredMask",
            "type": "u16"
          },
          {
            "name": "requiredMask",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "saleOutcome",
            "type": "u8"
          },
          {
            "name": "mintPremiumBps",
            "type": "u64"
          },
          {
            "name": "sh2MaxSlippageBps",
            "type": "u64"
          },
          {
            "name": "minRaise",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "salePrice",
            "type": "u64"
          },
          {
            "name": "targetRaise",
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
            "name": "reserveMintVoteWindowSecs",
            "type": "i64"
          },
          {
            "name": "liqVoteWindowSecs",
            "type": "i64"
          },
          {
            "name": "convertChunk",
            "type": "u64"
          },
          {
            "name": "vestingSchedule",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mintIndex",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "launchId",
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
      "name": "tokenLaunched",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "launchId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "eol",
            "type": "pubkey"
          },
          {
            "name": "staking",
            "type": "pubkey"
          },
          {
            "name": "vesting",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
