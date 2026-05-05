use anchor_lang::prelude::*;
use solana_keccak_hasher::{hashv, Hash};

declare_id!("GTEVyfq7zL91k1zjZrJCmkeidBvgDfMdEXUUsMcQWq5r");

pub const MIN_TICK_INTERVAL: i64 = 180;
pub const MAX_NONCE_ATTEMPTS: u64 = 50_000;
pub const PROPHECY_HISTORY_DEPTH: usize = 8;
pub const SQUARE_SIZE: usize = 5;
pub const UNIQUE_CELLS: usize = 13;
pub const MAX_PROPHECY_URI_LEN: usize = 256;
pub const GLYPH_ALPHABET: &[u8; 16] = b"SATOREPNVCLDIMHU";

pub const LOOKING_GLASS_SEED: &[u8] = b"looking_glass";
pub const EPOCH_SEED: &[u8] = b"epoch";

pub const UNIQUE_CELL_COORDS: [(usize, usize); UNIQUE_CELLS] = [
    (0, 0), (0, 1), (0, 2), (0, 3), (0, 4),
    (1, 0), (1, 1), (1, 2), (1, 3), (1, 4),
    (2, 0), (2, 1), (2, 2),
];

pub fn place_glyphs(indices: &[u8; UNIQUE_CELLS]) -> [[u8; SQUARE_SIZE]; SQUARE_SIZE] {
    let mut grid = [[0u8; SQUARE_SIZE]; SQUARE_SIZE];
    for (i, &(r, c)) in UNIQUE_CELL_COORDS.iter().enumerate() {
        let glyph = GLYPH_ALPHABET[(indices[i] & 0x0F) as usize];
        grid[r][c] = glyph;
        grid[SQUARE_SIZE - 1 - r][SQUARE_SIZE - 1 - c] = glyph;
    }
    grid
}

pub fn glyphs_from_digest(initial: &Hash) -> [u8; UNIQUE_CELLS] {
    let mut out = [0u8; UNIQUE_CELLS];
    let mut current = initial.0;
    let mut byte_idx = 0usize;
    for slot in out.iter_mut() {
        if byte_idx >= 32 {
            current = hashv(&[&current]).0;
            byte_idx = 0;
        }
        *slot = current[byte_idx] & 0x0F;
        byte_idx += 1;
    }
    out
}

pub fn verify_symmetry(grid: &[[u8; SQUARE_SIZE]; SQUARE_SIZE]) -> bool {
    let n = SQUARE_SIZE;
    let last = n - 1;

    for c in 0..n {
        if grid[0][c] != grid[last][last - c] {
            return false;
        }
    }
    for c in 0..n {
        if grid[1][c] != grid[last - 1][last - c] {
            return false;
        }
    }
    for c in 0..n {
        if grid[2][c] != grid[2][last - c] {
            return false;
        }
    }

    for r in 0..n {
        if grid[r][0] != grid[last - r][last] {
            return false;
        }
    }
    for r in 0..n {
        if grid[r][1] != grid[last - r][last - 1] {
            return false;
        }
    }
    for r in 0..n {
        if grid[r][2] != grid[last - r][2] {
            return false;
        }
    }

    for i in 0..n {
        if grid[i][i] != grid[last - i][last - i] {
            return false;
        }
    }
    for i in 0..n {
        if grid[i][last - i] != grid[last - i][i] {
            return false;
        }
    }

    for r in 0..n {
        for c in 0..n {
            if grid[r][c] != grid[last - r][last - c] {
                return false;
            }
        }
    }
    true
}

pub fn compute_seed_set(
    slot: u64,
    ts: i64,
    last_prophecy_hash: &[u8; 32],
    epoch: u64,
) -> [[u8; 32]; SQUARE_SIZE] {
    let slot_le = slot.to_le_bytes();
    let ts_le = ts.to_le_bytes();
    let epoch_le = epoch.to_le_bytes();

    let prev: &[u8] = last_prophecy_hash.as_ref();
    let slot_bytes: &[u8] = slot_le.as_ref();
    let ts_bytes: &[u8] = ts_le.as_ref();
    let epoch_bytes: &[u8] = epoch_le.as_ref();

    [
        hashv(&[b"MARKETS".as_ref(), slot_bytes, ts_bytes, prev]).0,
        hashv(&[b"CHAIN".as_ref(), slot_bytes, ts_bytes, prev]).0,
        hashv(&[b"WORLD".as_ref(), slot_bytes, ts_bytes, prev]).0,
        hashv(&[b"HEAVENS".as_ref(), slot_bytes, ts_bytes, prev]).0,
        hashv(&[b"ECHO".as_ref(), prev, epoch_bytes]).0,
    ]
}

pub fn flatten_grid_row_major(grid: &[[u8; SQUARE_SIZE]; SQUARE_SIZE]) -> [u8; 25] {
    let mut out = [0u8; 25];
    for r in 0..SQUARE_SIZE {
        for c in 0..SQUARE_SIZE {
            out[r * SQUARE_SIZE + c] = grid[r][c];
        }
    }
    out
}

pub fn flatten_grid_reverse_row_major(grid: &[[u8; SQUARE_SIZE]; SQUARE_SIZE]) -> [u8; 25] {
    let mut out = [0u8; 25];
    let mut i = 0;
    for r in (0..SQUARE_SIZE).rev() {
        for c in (0..SQUARE_SIZE).rev() {
            out[i] = grid[r][c];
            i += 1;
        }
    }
    out
}

#[program]
pub mod looking_glass {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, oracle_signer: Pubkey) -> Result<()> {
        let lg = &mut ctx.accounts.looking_glass;
        lg.authority = ctx.accounts.authority.key();
        lg.oracle_signer = oracle_signer;
        lg.epoch = 0;
        lg.last_tick_ts = 0;
        lg.last_locked_square = [[0u8; SQUARE_SIZE]; SQUARE_SIZE];
        lg.last_locked_nonce = 0;
        lg.last_prophecy_hash = [0u8; 32];
        lg.prophecy_ring = [[0u8; 32]; PROPHECY_HISTORY_DEPTH];
        lg.ring_head = 0;
        lg.paused = false;
        lg.bump = ctx.bumps.looking_glass;
        Ok(())
    }

    pub fn tick(ctx: Context<Tick>) -> Result<()> {
        let lg = &mut ctx.accounts.looking_glass;
        require!(!lg.paused, OracleError::Paused);

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        require!(
            now.saturating_sub(lg.last_tick_ts) >= MIN_TICK_INTERVAL,
            OracleError::TickTooSoon
        );

        let next_epoch = lg.epoch.checked_add(1).expect("epoch overflow");

        let seeds = compute_seed_set(clock.slot, now, &lg.last_prophecy_hash, next_epoch);

        let mut nonce_found: Option<u64> = None;
        let mut chosen_glyphs: [u8; UNIQUE_CELLS] = [0u8; UNIQUE_CELLS];
        let mut chosen_grid: [[u8; SQUARE_SIZE]; SQUARE_SIZE] = [[0u8; SQUARE_SIZE]; SQUARE_SIZE];

        for nonce in 0..MAX_NONCE_ATTEMPTS {
            let nonce_le = nonce.to_le_bytes();
            let digest = hashv(&[
                seeds[0].as_ref(),
                seeds[1].as_ref(),
                seeds[2].as_ref(),
                seeds[3].as_ref(),
                seeds[4].as_ref(),
                nonce_le.as_ref(),
            ]);
            let glyph_indices = glyphs_from_digest(&digest);
            let grid = place_glyphs(&glyph_indices);
            if verify_symmetry(&grid) {
                nonce_found = Some(nonce);
                chosen_glyphs = glyph_indices;
                chosen_grid = grid;
                break;
            }
        }

        let nonce = nonce_found.ok_or(OracleError::SymmetryNotFound)?;
        let _ = chosen_glyphs;

        let row_major = flatten_grid_row_major(&chosen_grid);
        let reverse_row_major = flatten_grid_reverse_row_major(&chosen_grid);
        let forward_digest = hashv(&[b"FORWARD".as_ref(), row_major.as_ref()]).0;
        let backward_digest = hashv(&[b"BACKWARD".as_ref(), reverse_row_major.as_ref()]).0;

        let epoch_square = &mut ctx.accounts.epoch_square;
        epoch_square.epoch = next_epoch;
        epoch_square.locked_at = now;
        epoch_square.seeds = seeds;
        epoch_square.glyphs = chosen_grid;
        epoch_square.nonce = nonce;
        epoch_square.forward_digest = forward_digest;
        epoch_square.backward_digest = backward_digest;
        epoch_square.prophecy_uri = String::new();
        epoch_square.prophecy_hash = [0u8; 32];
        epoch_square.prophecy_submitted = false;
        epoch_square.bump = ctx.bumps.epoch_square;

        lg.epoch = next_epoch;
        lg.last_tick_ts = now;
        lg.last_locked_square = chosen_grid;
        lg.last_locked_nonce = nonce;

        emit!(ProphecyRequested {
            epoch: next_epoch,
            glyphs: chosen_grid,
            forward_digest,
            backward_digest,
            locked_at: now,
        });

        Ok(())
    }

    pub fn submit_prophecy(
        ctx: Context<SubmitProphecy>,
        epoch: u64,
        prophecy_uri: String,
        prophecy_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            prophecy_uri.as_bytes().len() <= MAX_PROPHECY_URI_LEN,
            OracleError::UriTooLong
        );

        let epoch_square = &mut ctx.accounts.epoch_square;
        require!(epoch_square.epoch == epoch, OracleError::EpochMismatch);
        require!(!epoch_square.prophecy_submitted, OracleError::AlreadySubmitted);

        epoch_square.prophecy_uri = prophecy_uri;
        epoch_square.prophecy_hash = prophecy_hash;
        epoch_square.prophecy_submitted = true;

        let lg = &mut ctx.accounts.looking_glass;
        let head = lg.ring_head as usize;
        lg.prophecy_ring[head] = prophecy_hash;
        lg.ring_head = ((head + 1) % PROPHECY_HISTORY_DEPTH) as u8;
        lg.last_prophecy_hash = prophecy_hash;

        emit!(ProphecyBorn {
            epoch,
            prophecy_hash,
        });

        Ok(())
    }

    pub fn rotate_oracle_signer(
        ctx: Context<RotateOracleSigner>,
        new_signer: Pubkey,
    ) -> Result<()> {
        let lg = &mut ctx.accounts.looking_glass;
        lg.oracle_signer = new_signer;
        Ok(())
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let lg = &mut ctx.accounts.looking_glass;
        lg.paused = paused;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + LookingGlass::INIT_SPACE,
        seeds = [LOOKING_GLASS_SEED],
        bump,
    )]
    pub looking_glass: Account<'info, LookingGlass>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Tick<'info> {
    #[account(
        mut,
        seeds = [LOOKING_GLASS_SEED],
        bump = looking_glass.bump,
    )]
    pub looking_glass: Account<'info, LookingGlass>,

    #[account(
        init,
        payer = payer,
        space = 8 + EpochSquare::INIT_SPACE,
        seeds = [EPOCH_SEED, &(looking_glass.epoch + 1).to_le_bytes()],
        bump,
    )]
    pub epoch_square: Account<'info, EpochSquare>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(epoch: u64)]
pub struct SubmitProphecy<'info> {
    #[account(
        mut,
        seeds = [LOOKING_GLASS_SEED],
        bump = looking_glass.bump,
        has_one = oracle_signer @ OracleError::BadSigner,
    )]
    pub looking_glass: Account<'info, LookingGlass>,

    #[account(
        mut,
        seeds = [EPOCH_SEED, &epoch.to_le_bytes()],
        bump = epoch_square.bump,
    )]
    pub epoch_square: Account<'info, EpochSquare>,

    pub oracle_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct RotateOracleSigner<'info> {
    #[account(
        mut,
        seeds = [LOOKING_GLASS_SEED],
        bump = looking_glass.bump,
        has_one = authority @ OracleError::BadAuthority,
    )]
    pub looking_glass: Account<'info, LookingGlass>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        seeds = [LOOKING_GLASS_SEED],
        bump = looking_glass.bump,
        has_one = authority @ OracleError::BadAuthority,
    )]
    pub looking_glass: Account<'info, LookingGlass>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct LookingGlass {
    pub authority: Pubkey,
    pub oracle_signer: Pubkey,
    pub epoch: u64,
    pub last_tick_ts: i64,
    pub last_locked_square: [[u8; SQUARE_SIZE]; SQUARE_SIZE],
    pub last_locked_nonce: u64,
    pub last_prophecy_hash: [u8; 32],
    pub prophecy_ring: [[u8; 32]; PROPHECY_HISTORY_DEPTH],
    pub ring_head: u8,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EpochSquare {
    pub epoch: u64,
    pub locked_at: i64,
    pub seeds: [[u8; 32]; SQUARE_SIZE],
    pub glyphs: [[u8; SQUARE_SIZE]; SQUARE_SIZE],
    pub nonce: u64,
    pub forward_digest: [u8; 32],
    pub backward_digest: [u8; 32],
    #[max_len(256)]
    pub prophecy_uri: String,
    pub prophecy_hash: [u8; 32],
    pub prophecy_submitted: bool,
    pub bump: u8,
}

#[event]
pub struct ProphecyRequested {
    pub epoch: u64,
    pub glyphs: [[u8; SQUARE_SIZE]; SQUARE_SIZE],
    pub forward_digest: [u8; 32],
    pub backward_digest: [u8; 32],
    pub locked_at: i64,
}

#[event]
pub struct ProphecyBorn {
    pub epoch: u64,
    pub prophecy_hash: [u8; 32],
}

#[error_code]
pub enum OracleError {
    #[msg("Tick was called before the minimum interval elapsed.")]
    TickTooSoon,
    #[msg("Failed to find a nonce producing a symmetric square within the attempt limit.")]
    SymmetryNotFound,
    #[msg("The oracle is currently paused.")]
    Paused,
    #[msg("Signer is not the configured oracle signer.")]
    BadSigner,
    #[msg("Signer is not the configured authority.")]
    BadAuthority,
    #[msg("A prophecy has already been submitted for this epoch.")]
    AlreadySubmitted,
    #[msg("EpochSquare epoch does not match the requested epoch.")]
    EpochMismatch,
    #[msg("Prophecy URI exceeds the maximum length.")]
    UriTooLong,
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    fn canonical_sator() -> [[u8; 5]; 5] {
        [
            *b"SATOR",
            *b"AREPO",
            *b"TENET",
            *b"OPERA",
            *b"ROTAS",
        ]
    }

    #[test]
    fn verifier_accepts_canonical_sator_square() {
        assert!(verify_symmetry(&canonical_sator()));
    }

    #[test]
    fn verifier_rejects_grid_with_one_cell_flipped() {
        let mut grid = canonical_sator();
        grid[0][0] = b'X';
        assert!(!verify_symmetry(&grid));
    }

    #[test]
    fn verifier_rejects_grid_breaking_only_180_rotation() {
        let mut grid = canonical_sator();
        grid[1][2] = b'X';
        grid[3][2] = b'Y';
        assert!(!verify_symmetry(&grid));
    }

    #[test]
    fn place_glyphs_produces_symmetric_grid_for_arbitrary_input() {
        let indices = [0u8, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        let grid = place_glyphs(&indices);
        assert!(verify_symmetry(&grid));
        for &(r, c) in UNIQUE_CELL_COORDS.iter() {
            assert_eq!(grid[r][c], grid[SQUARE_SIZE - 1 - r][SQUARE_SIZE - 1 - c]);
        }
    }

    #[test]
    fn glyphs_from_digest_returns_only_low_nibbles() {
        let h = hashv(&[b"any-input"]);
        let g = glyphs_from_digest(&h);
        for v in g.iter() {
            assert!(*v < 16);
        }
    }

    #[test]
    fn flatten_round_trip_is_consistent() {
        let grid = canonical_sator();
        let row = flatten_grid_row_major(&grid);
        let rev = flatten_grid_reverse_row_major(&grid);
        for i in 0..25 {
            assert_eq!(row[i], rev[24 - i]);
        }
    }
}
