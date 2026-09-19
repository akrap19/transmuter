/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_runway_escrow.json`.
 */
export type TransmuterRunwayEscrow = {
  "address": "Dy1ddZeaR7GL2QPxWnogrFmdYio4eE5Hrm613SS2PbdK",
  "metadata": {
    "name": "transmuterRunwayEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "USDC runway escrow: fund/draw, halt/resume/advance, liquidation return to treasury"
  },
  "docs": [
    "USDC runway. Governance may halt/resume/advance; it never moves the money.",
    "`notify_liquidation` is the only non-draw transfer (to the EOL treasury)."
  ],
  "instructions": [
    {
      "name": "advance",
      "docs": [
        "Holder-path only (paired EOL). Unlocks extra USDC now, still capped at principal."
      ],
      "discriminator": [
        7,
        56,
        108,
        201,
        36,
        20,
        57,
        89
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
              }
            ]
          }
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
      "name": "draw",
      "discriminator": [
        61,
        40,
        62,
        184,
        31,
        176,
        24,
        130
      ],
      "accounts": [
        {
          "name": "teamRecipient",
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "fund",
      "discriminator": [
        218,
        188,
        111,
        221,
        152,
        113,
        174,
        7
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
              }
            ]
          }
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
      "name": "halt",
      "discriminator": [
        24,
        156,
        8,
        121,
        65,
        3,
        5,
        82
      ],
      "accounts": [
        {
          "name": "authority",
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
              }
            ]
          }
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
          "name": "usdcMint"
        },
        {
          "name": "teamRecipient"
        },
        {
          "name": "daoDirect",
          "docs": [
            "pubkey; live DAO resolution from the Registry config prefix is a",
            "later pointer-swap."
          ]
        },
        {
          "name": "registry"
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
                "path": "eolToken"
              },
              {
                "kind": "account",
                "path": "usdcMint"
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "eolTreasury",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "resume",
      "discriminator": [
        1,
        166,
        51,
        170,
        127,
        32,
        141,
        206
      ],
      "accounts": [
        {
          "name": "authority",
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
              }
            ]
          }
        }
      ],
      "args": []
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
                "path": "config.eol_token",
                "account": "escrowConfig"
              },
              {
                "kind": "account",
                "path": "config.usdc_mint",
                "account": "escrowConfig"
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
      "name": "escrowConfig",
      "discriminator": [
        138,
        174,
        227,
        187,
        239,
        148,
        1,
        44
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
      "name": "zeroAmount",
      "msg": "amount must be greater than zero"
    },
    {
      "code": 6002,
      "name": "alreadyStamped",
      "msg": "startTime already stamped"
    },
    {
      "code": 6003,
      "name": "badTimestamp",
      "msg": "timestamp must be > 0 and not in the future"
    },
    {
      "code": 6004,
      "name": "notStarted",
      "msg": "startTime has not been stamped"
    },
    {
      "code": 6005,
      "name": "alreadyFunded",
      "msg": "escrow already funded"
    },
    {
      "code": 6006,
      "name": "depositMismatch",
      "msg": "lamports/tokens received did not match amount"
    },
    {
      "code": 6007,
      "name": "notActive",
      "msg": "escrow is not ACTIVE"
    },
    {
      "code": 6008,
      "name": "notHalted",
      "msg": "escrow is not HALTED"
    },
    {
      "code": 6009,
      "name": "liquidated",
      "msg": "escrow is LIQUIDATED"
    },
    {
      "code": 6010,
      "name": "zeroDraw",
      "msg": "nothing to draw"
    },
    {
      "code": 6011,
      "name": "insufficientVault",
      "msg": "vault holds less than drawable"
    },
    {
      "code": 6012,
      "name": "unauthorized",
      "msg": "caller is not the paired EOL Token or the DAO-direct door"
    }
  ],
  "types": [
    {
      "name": "escrowConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "eolToken",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "teamRecipient",
            "type": "pubkey"
          },
          {
            "name": "daoDirect",
            "type": "pubkey"
          },
          {
            "name": "registry",
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
            "name": "fundedPrincipal",
            "type": "u64"
          },
          {
            "name": "alreadyDrawn",
            "type": "u64"
          },
          {
            "name": "advanceUnlocked",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
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
