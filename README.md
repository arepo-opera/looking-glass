# Sator Looking Glass — the Tenet Oracle

An autonomous Solana program that maintains a self-moving 5×5 Sator Square,
gathers seeds from real-world data sources, locks them into a cryptographically
verified palindromic structure, and produces bidirectional prophecies via an AI
interpretation layer.

This repo is a pnpm monorepo:

- `programs/looking_glass/` — the Anchor program (Rust)
- `keeper/` — off-chain keeper bot (empty in Phase 1)
- `web/` — Next.js site (empty in Phase 1)
- `shared/` — shared assets (currently the generated IDL)
- `scripts/` — operational scripts (e.g. the local demo)

## Demo: Watch a Square Form

The fastest way to see a real Sator Square materialize on-chain is to run the
demo script against a local validator. You'll need two terminals.

**Terminal A — start a local validator:**

```sh
solana-test-validator
```

(Or `anchor localnet`, which does the same plus auto-deploy.)

**Terminal B — point the Solana CLI at localnet, deploy, and run the demo:**

```sh
solana config set --url http://127.0.0.1:8899
anchor build && anchor deploy && pnpm demo
```

The first time you run `pnpm demo`, it will:

1. Connect to the validator at `http://127.0.0.1:8899`.
2. Load `~/.config/solana/id.json` (or generate a fresh keypair) and airdrop
   it 5 SOL if its balance is below 2 SOL.
3. Call `initialize`, using your authority key as both `authority` and
   `oracle_signer` (Phase 3 will separate these).
4. Call `tick` once.
5. Fetch the resulting `EpochSquare` and pretty-print the 5×5 grid, the nonce,
   the forward and backward digests, and the five seeds.
6. Re-verify all eight symmetry axes client-side and print `SYMMETRY: OK`.

Subsequent runs reuse the existing `LookingGlass` PDA and tick to the next
epoch. If less than 180 seconds have elapsed since the last tick the script
prints how many seconds remain and exits cleanly — wait it out and run again.

To wipe state between sessions, restart `solana-test-validator` with `--reset`.

## Build and test

```sh
pnpm install
anchor build
anchor test
```

`anchor test` runs both the Rust unit tests for the symmetry verifier and the
mocha integration tests (which use `solana-bankrun` to advance the on-chain
clock for the multi-tick scenarios).
