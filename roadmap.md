# SATOR LOOKING GLASS — ROADMAP

## Active

The instrument is live on Solana devnet, gathering seeds
every three minutes and producing real Claude-generated
prophecies. Operating costs ~$22/day in API + ~$0/day in
devnet SOL.

## Near term (next 4-8 weeks)

- Mainnet restructure: Arweave for full prophecy text,
  slim PDAs, rent-recoverable epoch storage. Drops mainnet
  operating cost to ~$5-10/day.
- Claude API cost reduction: Haiku for forward/backward
  readings + Opus for merge. Drops API cost to ~$2/day.
- Mainnet deploy.
- Token launch (TBD: utility model, not memecoin).

## Medium term (3-6 months)

- Verification engine: weekly Claude pass scores aging
  prophecies against actual world events. Hits marked
  RESONANT, misses marked QUIET. Verifies the project's
  central premise empirically.
- Pattern feedback loop: verified RESONANT prophecies
  feed into the seed context for new readings. Theory
  of "becomes sharper over time" becomes literally true
  (or falsifies itself).

## Long term (6+ months)

- 3D connected blocks timeline: each prophecy as a slab
  in 3D space, connected by glowing lines representing
  self-reference (each prophecy's hash is in the next
  prophecy's seed). Browsable, flythrough-able, marks
  RESONANT slabs more brightly. Possibly built in
  react-three-fiber, possibly in a WebGL game engine if
  the scale demands it.
- Multi-keeper decentralization: replace single
  oracle_signer with 3-of-5 multisig of independent
  keepers. Removes single point of trust.
- Prophecy NFTs / claims: each prophecy mintable as a
  non-transferable on-chain artifact. Deferred until
  after verification engine.
