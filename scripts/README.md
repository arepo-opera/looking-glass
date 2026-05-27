# Token Launch Script

Launches the TENET token via pump.fun's bonding curve mechanism.

## Devnet test

```bash
pnpm tsx scripts/launch-token.ts \
  --network devnet \
  --mint-keypair ~/path/to/devnet-test-mint.json \
  --creator-keypair ~/path/to/devnet-test-creator.json \
  --metadata-uri https://opera-arepo.xyz/token-metadata.json \
  --dev-buy-sol 0.1 \
  --dry-run
```

## Mainnet launch

Set `SOLANA_MAINNET_RPC` to a paid RPC URL (Helius, Triton, etc.) to avoid public RPC rate limits.

```bash
SOLANA_MAINNET_RPC=https://your-paid-rpc \
pnpm tsx scripts/launch-token.ts \
  --network mainnet \
  --mint-keypair ~/vanity-keys/MV2Y3kgYEnfy3VwQCPV9KDif2SwgXDNwxvUWnrTENEt.json \
  --creator-keypair ~/treasury-keypair.json \
  --metadata-uri https://opera-arepo.xyz/token-metadata.json \
  --dev-buy-sol 1.5
```

## Required flags

| Flag | Description |
|---|---|
| `--network` | `devnet` or `mainnet` (no default — must be explicit) |
| `--mint-keypair` | Path to the vanity mint keypair JSON (must end in `tenet`, case-insensitive) |
| `--creator-keypair` | Path to the treasury keypair JSON (signs + funds the launch) |
| `--metadata-uri` | Public URL to the token metadata JSON |
| `--dev-buy-sol` | SOL spent on the initial buy bundled into the launch tx (must be > 0; the script refuses to launch with no dev position) |
| `--dry-run` | Optional. Validates everything and prints the summary, but does not submit. |

## What it does

1. Validates all CLI arguments (including that `--dev-buy-sol` is a positive number)
2. Loads both keypairs from JSON files (solana-keygen format)
3. Verifies the mint public key ends in `tenet` (case-insensitive) — refuses to launch with the wrong keypair
4. Checks creator SOL balance — needs `floor + dev-buy + 0.02 SOL tx-fee buffer` (floor: 0.05 devnet, 0.1 mainnet)
5. Fetches and validates `--metadata-uri` (must return JSON with `name`, `symbol`, `description`, `image`)
6. Fetches pump.fun `Global` state and computes the expected-tokens-out estimate for the dev buy
7. Prints a summary block (network, mint, creator, balance, metadata, dev-buy amount, expected tokens) and waits for you to type `yes` to confirm
8. Calls `PumpSdk.createV2AndBuyInstructions` which returns 3 instructions: `createV2` + `createAssociatedTokenAccountIdempotent` + `buy`. All three are bundled into a single atomic transaction signed by `[creator, mint]` — the creator holds tokens before any other buyer can land a tx.
9. Prints signature, Solscan URL, and pump.fun URL on success

### Slippage note

The bundled buy uses the slippage tolerance hardcoded by `createV2AndBuyInstructions` (1%). This is what pump.fun's official launch flow uses: a fresh mint has no pre-existing liquidity, so there is nothing for an MEV bot to sandwich between the create and the buy in the same transaction — slippage is essentially a guard against the buy ix mispricing itself, not against frontrunning. 1% is plenty.

## Keypair format

Keypair JSON files are the standard Solana CLI format: a JSON array of 64 byte numbers, i.e. what `solana-keygen new -o file.json` produces. Generate vanity keypairs with `solana-keygen grind --ends-with tenet:1` or a GPU grinder.

## Safety

- The script never logs, writes, or transmits private keys
- The confirmation prompt is mandatory unless `--dry-run` is passed
- All pre-transaction checks (keypair load, vanity match, balance, metadata) run before any signing
- Keypair files are gitignored repo-wide; do not place them under `scripts/keys/` or similar — keep them outside the repo

## Other scripts in this directory

This directory also holds operator scripts for the Tenet Oracle (`demo-tick.ts`, `backfill-prophecies.ts`, `generate-twelfth-axis.ts`, `init-layer-index.ts`, `rotate-oracle.ts`, `run-voice-comparison.ts`). The token launch script is unrelated to those — it's a one-shot tool for the pump.fun deployment.
