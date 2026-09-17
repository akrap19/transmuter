//! Governance shims: VoteType discriminants (never shift) and the Registry
//! config prefix consumers stream-decode (r22 / r26).

/// Binary community door (`openCommunityVote`). Discriminants never shift.
pub const VOTE_SENSITIVE: u8 = 0;
pub const VOTE_UPGRADE: u8 = 1;
pub const VOTE_AMBASSADOR: u8 = 2;
pub const VOTE_DAO_INTERNAL: u8 = 3;
pub const VOTE_EOL_GATE3: u8 = 4;
pub const VOTE_LIQ_DAO: u8 = 5;
pub const VOTE_FREEZE: u8 = 6;
pub const VOTE_GATE_OPEN: u8 = 7;
pub const VOTE_EMERGENCY: u8 = 8;
pub const VOTE_ESCROW_DAO: u8 = 9;
/// SH5: appended at the END so earlier discriminants never shift.
pub const VOTE_GATE1_FALLBACK: u8 = 10;

/// `openCommunityVote` serves these types only. Action-bearing types and
/// `VOTE_EMERGENCY` use other doors.
pub fn community_vote_type(vote_type: u8) -> bool {
    matches!(
        vote_type,
        VOTE_EOL_GATE3
            | VOTE_LIQ_DAO
            | VOTE_FREEZE
            | VOTE_GATE_OPEN
            | VOTE_ESCROW_DAO
            | VOTE_GATE1_FALLBACK
    )
}

/// Prefix of `RegistryConfig` (r22). Field order is the interface.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RegistryConfigPrefix {
    pub team: [u8; 32],
    pub founders: Vec<[u8; 32]>,
    pub founder_threshold: u8,
    pub dao_program: [u8; 32],
    pub ambassador_count: u32,
    pub max_ambassadors: u32,
    pub genesis_locked: bool,
}

fn read_bytes<const N: usize>(data: &[u8], offset: &mut usize) -> Option<[u8; N]> {
    let end = offset.checked_add(N)?;
    let slice = data.get(*offset..end)?;
    let mut out = [0u8; N];
    out.copy_from_slice(slice);
    *offset = end;
    Some(out)
}

fn read_u32(data: &[u8], offset: &mut usize) -> Option<u32> {
    let bytes = read_bytes::<4>(data, offset)?;
    Some(u32::from_le_bytes(bytes))
}

/// Streaming decode: skip the 8-byte Anchor discriminator, read the seven
/// prefix fields, ignore trailing bytes. A strict whole-buffer decode of
/// this prefix would pass against a minimal account and fail once the real
/// Registry appends fields.
pub fn decode_registry_config_prefix(data: &[u8]) -> Option<RegistryConfigPrefix> {
    if data.len() < 8 {
        return None;
    }
    let mut offset = 8;
    let team = read_bytes::<32>(data, &mut offset)?;
    let n = read_u32(data, &mut offset)? as usize;
    let mut founders = Vec::with_capacity(n);
    for _ in 0..n {
        founders.push(read_bytes::<32>(data, &mut offset)?);
    }
    let founder_threshold = *data.get(offset)?;
    offset += 1;
    let dao_program = read_bytes::<32>(data, &mut offset)?;
    let ambassador_count = read_u32(data, &mut offset)?;
    let max_ambassadors = read_u32(data, &mut offset)?;
    let genesis_locked = *data.get(offset)? != 0;
    Some(RegistryConfigPrefix {
        team,
        founders,
        founder_threshold,
        dao_program,
        ambassador_count,
        max_ambassadors,
        genesis_locked,
    })
}

/// Honest shim answer: the body exists and did not meet quorum (SH4 / inv. 49).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ShimVoteResult {
    pub exists: bool,
    pub resolved: bool,
    pub passed: bool,
    pub yes_weight: u64,
    pub no_weight: u64,
    pub quorum_met: bool,
    pub closes_at: i64,
}

impl ShimVoteResult {
    pub const NO_QUORUM: Self = Self {
        exists: true,
        resolved: true,
        passed: false,
        yes_weight: 0,
        no_weight: 0,
        quorum_met: false,
        closes_at: 0,
    };
}
