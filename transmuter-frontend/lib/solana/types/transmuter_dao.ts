/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/transmuter_dao.json`.
 */
export type TransmuterDao = {
  "address": "6obevHvyADNmvyysyj8QBfgUQUbbhZU4CvMtghbRHw3W",
  "metadata": {
    "name": "transmuterDao",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "DAO shim: exists=true, quorumMet=false on every community vote read"
  },
  "docs": [
    "DAO stand-in. `getCommunityVoteResult` always reports exists=true,",
    "quorumMet=false so a missing result cannot be read as consent."
  ],
  "instructions": [
    {
      "name": "getCommunityVoteResult",
      "discriminator": [
        218,
        76,
        9,
        219,
        254,
        229,
        129,
        169
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
      "args": []
    },
    {
      "name": "openCommunityVote",
      "discriminator": [
        49,
        46,
        6,
        10,
        84,
        167,
        149,
        13
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
          "name": "voteType",
          "type": "u8"
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
      "name": "daoConfig",
      "discriminator": [
        55,
        209,
        87,
        224,
        30,
        202,
        192,
        246
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "windowEnd",
      "msg": "windowEnd must be an absolute unix timestamp in the future"
    },
    {
      "code": 6001,
      "name": "wrongVoteType",
      "msg": "openCommunityVote does not serve this vote type"
    }
  ],
  "types": [
    {
      "name": "daoConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isShim",
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
