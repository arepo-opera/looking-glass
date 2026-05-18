# Token Launch Script

Launches the TENET token via pump.fun's bonding curve mechanism.

## Devnet test

```bash
pnpm tsx scripts/launch-token.ts \
  --network devnet \
  --mint-keypair ~/path/to/devnet-test-mint.json \
  --creator-keypair ~/path/to/devnet-test-creator.json \
  --metadata-uri https://opera-arepo.xyz/token-metadata.json \
  --dry-run
```

## Mainnet launch

Set `SOLANA_MAINNET_RPC` to a paid RPC URL (Helius, Triton, etc.) to avoid public RPC rate limits.

```bash
SOLANA_MAINNET_RPC=https://your-paid-rpc \
pnpm tsx scripts/launch-token.ts \
  --network mainnet \
  --mint-keypair ~/vanity-keys/JMdMSQiqRxov6jaFDU7mbmyaQTMN2umrACoXUATEnET.json \
  --creator-keypair ~/treasury-keypair.json \
  --metadata-uri https://opera-arepo.xyz/token-metadata.json
```

## What it does

1. Validates all CLI arguments
2. Loads both keypairs from JSON files (solana-keygen format)
3. Verifies the mint public key ends in `tenet` (case-insensitive) — refuses to launch with the wrong keypair
4. Checks creator SOL balance (≥ 0.05 devnet, ≥ 0.1 mainnet)
5. Fetches and validates `--metadata-uri` (must return JSON with `name`, `symbol`, `description`, `image`)
6. Prints a summary block and waits for you to type `yes` to confirm
7. Builds `createV2Instruction` from `@pump-fun/pump-sdk` with `name=TENET`, `symbol=TENET`, `uri=<metadata>`, `mayhemMode=false`
8. Submits the transaction signed by `[creator, mint]`
9. Prints signature, Solscan URL, and pump.fun URL on success

## Keypair format

Keypair JSON files are the standard Solana CLI format: a JSON array of 64 byte numbers, i.e. what `solana-keygen new -o file.json` produces. Generate vanity keypairs with `solana-keygen grind --ends-with tenet:1` or a GPU grinder.

## Safety

- The script never logs, writes, or transmits private keys
- The confirmation prompt is mandatory unless `--dry-run` is passed
- All pre-transaction checks (keypair load, vanity match, balance, metadata) run before any signing
- Keypair files are gitignored repo-wide; do not place them under `scripts/keys/` or similar — keep them outside the repo

## Other scripts in this directory

This directory also holds operator scripts for the Tenet Oracle (`demo-tick.ts`, `backfill-prophecies.ts`, `generate-twelfth-axis.ts`, `init-layer-index.ts`, `rotate-oracle.ts`, `run-voice-comparison.ts`). The token launch script is unrelated to those — it's a one-shot tool for the pump.fun deployment.
