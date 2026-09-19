/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_registry.json`.
 */
export type TransmuterRegistry = {
  "address": "gA8y6oPQebWC2cNFgwKbJX9ivtWYpb6bf4pSJxkejfV",
  "metadata": {
    "name": "transmuterRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Registry shim: empty council, streaming-decodable config prefix"
  },
  "docs": [
    "Registry stand-in. Config prefix is the cross-program interface (r22):",
    "team, founders, founderThreshold, daoProgram, ambassadorCount,",
    "maxAmbassadors, genesisLocked. Consumers stream-decode and ignore",
    "trailing bytes. `ambassadorCount = 0` means quorum not met."
  ],
  "instructions": [
    {
      "name": "getAllAmbassadors",
      "discriminator": [
        223,
        79,
        104,
        122,
        172,
        140,
        200,
        170
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
              }
            ]
          }
        }
      ],
      "args": [],
      "returns": {
        "vec": "pubkey"
      }
    },
    {
      "name": "getAmbassadorCount",
      "discriminator": [
        13,
        84,
        246,
        92,
        183,
        91,
        193,
        193
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
              }
            ]
          }
        }
      ],
      "args": [],
      "returns": "u32"
    },
    {
      "name": "getCouncilLiquidationResult",
      "discriminator": [
        232,
        26,
        224,
        112,
        225,
        0,
        58,
        22
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
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "voteResult"
        }
      }
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
          "name": "team",
          "type": "pubkey"
        },
        {
          "name": "founders",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "founderThreshold",
          "type": "u8"
        },
        {
          "name": "daoProgram",
          "type": "pubkey"
        },
        {
          "name": "maxAmbassadors",
          "type": "u32"
        }
      ]
    },
    {
      "name": "isAmbassador",
      "discriminator": [
        32,
        174,
        38,
        116,
        170,
        191,
        201,
        220
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
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "who",
          "type": "pubkey"
        }
      ],
      "returns": "bool"
    },
    {
      "name": "openCouncilLiquidationVote",
      "discriminator": [
        60,
        57,
        24,
        241,
        67,
        92,
        233,
        113
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
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "windowEnd",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "registryConfig",
      "discriminator": [
        23,
        118,
        10,
        246,
        173,
        231,
        243,
        156
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "tooManyFounders",
      "msg": "too many founders"
    },
    {
      "code": 6001,
      "name": "badThreshold",
      "msg": "founder threshold does not match the founder set"
    },
    {
      "code": 6002,
      "name": "windowEnd",
      "msg": "windowEnd must be an absolute unix timestamp in the future"
    }
  ],
  "types": [
    {
      "name": "registryConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "team",
            "type": "pubkey"
          },
          {
            "name": "founders",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "founderThreshold",
            "type": "u8"
          },
          {
            "name": "daoProgram",
            "type": "pubkey"
          },
          {
            "name": "ambassadorCount",
            "type": "u32"
          },
          {
            "name": "maxAmbassadors",
            "type": "u32"
          },
          {
            "name": "genesisLocked",
            "type": "bool"
          },
          {
            "name": "isShim",
            "docs": [
              "Shim-only. After the r22 prefix so consumers ignore it."
            ],
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
      "name": "voteResult",
      "docs": [
        "Same field order as DAO `VoteResult` / spec row 27."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "exists",
            "type": "bool"
          },
          {
            "name": "resolved",
            "type": "bool"
          },
          {
            "name": "passed",
            "type": "bool"
          },
          {
            "name": "yesWeight",
            "type": "u64"
          },
          {
            "name": "noWeight",
            "type": "u64"
          },
          {
            "name": "quorumMet",
            "type": "bool"
          },
          {
            "name": "closesAt",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
