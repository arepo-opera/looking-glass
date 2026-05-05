import { startAnchor, ProgramTestContext, Clock } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { AnchorError, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import * as path from "path";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey(
  "GTEVyfq7zL91k1zjZrJCmkeidBvgDfMdEXUUsMcQWq5r"
);
const SQUARE_SIZE = 5;
const PROPHECY_HISTORY_DEPTH = 8;
const MIN_TICK_INTERVAL = 180;

const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");

function loadIdl(): any {
  const idlPath = path.join(WORKSPACE_ROOT, "target", "idl", "looking_glass.json");
  return JSON.parse(fs.readFileSync(idlPath, "utf-8"));
}

function lookingGlassPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("looking_glass")],
    PROGRAM_ID
  )[0];
}

function epochSquarePda(epoch: number | bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), buf],
    PROGRAM_ID
  )[0];
}

async function advanceClock(
  context: ProgramTestContext,
  deltaSeconds: number
): Promise<void> {
  const current = await context.banksClient.getClock();
  const newClock = new Clock(
    current.slot + BigInt(1),
    current.epochStartTimestamp,
    current.epoch,
    current.leaderScheduleEpoch,
    current.unixTimestamp + BigInt(deltaSeconds)
  );
  context.setClock(newClock);
}

interface Harness {
  context: ProgramTestContext;
  provider: BankrunProvider;
  program: Program;
  payerKp: Keypair;
  oracleSignerKp: Keypair;
}

async function setupHarness(): Promise<Harness> {
  const context = await startAnchor(WORKSPACE_ROOT, [], []);
  const provider = new BankrunProvider(context);
  const program = new Program(loadIdl(), provider);
  const payerKp = context.payer as unknown as Keypair;
  const oracleSignerKp = Keypair.generate();
  return { context, provider, program, payerKp, oracleSignerKp };
}

async function callInitialize(h: Harness): Promise<void> {
  await h.program.methods
    .initialize(h.oracleSignerKp.publicKey)
    .accounts({
      lookingGlass: lookingGlassPda(),
      authority: h.payerKp.publicKey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
}

async function callTick(h: Harness, expectedNextEpoch: number): Promise<void> {
  await h.program.methods
    .tick()
    .accounts({
      lookingGlass: lookingGlassPda(),
      epochSquare: epochSquarePda(expectedNextEpoch),
      payer: h.payerKp.publicKey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
}

async function callSubmitProphecy(
  h: Harness,
  epoch: number,
  uri: string,
  hash: number[],
  signerOverride?: Keypair,
  oracleSignerKeyOverride?: PublicKey
): Promise<void> {
  const signer = signerOverride ?? h.oracleSignerKp;
  const oracleSignerKey =
    oracleSignerKeyOverride ?? h.oracleSignerKp.publicKey;
  await h.program.methods
    .submitProphecy(new BN(epoch), uri, hash)
    .accounts({
      lookingGlass: lookingGlassPda(),
      epochSquare: epochSquarePda(epoch),
      oracleSigner: oracleSignerKey,
    } as any)
    .signers([signer])
    .rpc();
}

function verifyAllEightAxes(grid: number[][]): {
  ok: boolean;
  failure?: string;
} {
  const n = SQUARE_SIZE;
  const last = n - 1;

  for (let c = 0; c < n; c++) {
    if (grid[0][c] !== grid[last][last - c]) {
      return { ok: false, failure: `row 0/4 mirror at c=${c}` };
    }
  }
  for (let c = 0; c < n; c++) {
    if (grid[1][c] !== grid[last - 1][last - c]) {
      return { ok: false, failure: `row 1/3 mirror at c=${c}` };
    }
  }
  for (let c = 0; c < n; c++) {
    if (grid[2][c] !== grid[2][last - c]) {
      return { ok: false, failure: `row 2 palindrome at c=${c}` };
    }
  }
  for (let r = 0; r < n; r++) {
    if (grid[r][0] !== grid[last - r][last]) {
      return { ok: false, failure: `col 0/4 mirror at r=${r}` };
    }
  }
  for (let r = 0; r < n; r++) {
    if (grid[r][1] !== grid[last - r][last - 1]) {
      return { ok: false, failure: `col 1/3 mirror at r=${r}` };
    }
  }
  for (let r = 0; r < n; r++) {
    if (grid[r][2] !== grid[last - r][2]) {
      return { ok: false, failure: `col 2 palindrome at r=${r}` };
    }
  }
  for (let i = 0; i < n; i++) {
    if (grid[i][i] !== grid[last - i][last - i]) {
      return { ok: false, failure: `main diag palindrome at i=${i}` };
    }
  }
  for (let i = 0; i < n; i++) {
    if (grid[i][last - i] !== grid[last - i][i]) {
      return { ok: false, failure: `anti-diag palindrome at i=${i}` };
    }
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== grid[last - r][last - c]) {
        return { ok: false, failure: `180 rotation at (${r},${c})` };
      }
    }
  }
  return { ok: true };
}

function asCharGrid(bytes: number[][]): string[] {
  return bytes.map((row) => row.map((b) => String.fromCharCode(b)).join(""));
}

function fixedHash(seed: number): number[] {
  return new Array(32).fill(0).map((_, i) => (seed * 31 + i) & 0xff);
}

describe("looking_glass", () => {
  describe("initialize", () => {
    it("creates the LookingGlass PDA and sets every field", async () => {
      const h = await setupHarness();
      await callInitialize(h);

      const lg: any = await h.program.account.lookingGlass.fetch(
        lookingGlassPda()
      );

      expect(lg.authority.toBase58()).to.equal(h.payerKp.publicKey.toBase58());
      expect(lg.oracleSigner.toBase58()).to.equal(
        h.oracleSignerKp.publicKey.toBase58()
      );
      expect(lg.epoch.toString()).to.equal("0");
      expect(lg.lastTickTs.toString()).to.equal("0");
      expect(lg.lastLockedNonce.toString()).to.equal("0");
      expect(lg.paused).to.equal(false);
      expect(lg.ringHead).to.equal(0);
      expect(Array.from(lg.lastProphecyHash)).to.deep.equal(
        new Array(32).fill(0)
      );
      for (let i = 0; i < PROPHECY_HISTORY_DEPTH; i++) {
        expect(Array.from(lg.prophecyRing[i])).to.deep.equal(
          new Array(32).fill(0)
        );
      }
      for (let r = 0; r < SQUARE_SIZE; r++) {
        expect(Array.from(lg.lastLockedSquare[r])).to.deep.equal(
          new Array(SQUARE_SIZE).fill(0)
        );
      }
    });
  });

  describe("tick", () => {
    it("produces a 5x5 grid where all 8 symmetry axes hold", async () => {
      const h = await setupHarness();
      await callInitialize(h);
      await callTick(h, 1);

      const epochSq: any = await h.program.account.epochSquare.fetch(
        epochSquarePda(1)
      );

      const grid = epochSq.glyphs.map((row: number[]) => Array.from(row));
      const result = verifyAllEightAxes(grid);
      expect(result.ok, `symmetry failure: ${result.failure}`).to.equal(true);

      const charRows = asCharGrid(grid);
      const ALPHABET = "SATOREPNVCLDIMHU";
      for (const row of charRows) {
        for (const ch of row) {
          expect(ALPHABET.includes(ch), `glyph ${ch} not in alphabet`).to.equal(
            true
          );
        }
      }

      const lg: any = await h.program.account.lookingGlass.fetch(
        lookingGlassPda()
      );
      expect(lg.epoch.toString()).to.equal("1");
      expect(epochSq.epoch.toString()).to.equal("1");
      expect(epochSq.prophecySubmitted).to.equal(false);
      expect(epochSq.prophecyUri).to.equal("");
      expect(epochSq.forwardDigest.length).to.equal(32);
      expect(epochSq.backwardDigest.length).to.equal(32);
      expect(
        Array.from(epochSq.forwardDigest).every((b) => b === 0)
      ).to.equal(false);
      expect(
        Array.from(epochSq.backwardDigest).every((b) => b === 0)
      ).to.equal(false);
    });

    it("rejects a second tick called immediately with TickTooSoon", async () => {
      const h = await setupHarness();
      await callInitialize(h);
      await callTick(h, 1);

      let caught: AnchorError | null = null;
      try {
        await callTick(h, 2);
      } catch (e: any) {
        caught = e;
      }
      expect(caught, "expected the second tick to fail").to.not.equal(null);
      const errString = String(caught);
      expect(errString).to.match(/TickTooSoon/);
    });
  });

  describe("symmetry verifier (broken-grid unit test)", () => {
    it("rejects a manually constructed broken grid", () => {
      const sator = [
        "SATOR",
        "AREPO",
        "TENET",
        "OPERA",
        "ROTAS",
      ].map((s) => Array.from(s).map((c) => c.charCodeAt(0)));
      expect(verifyAllEightAxes(sator).ok).to.equal(true);

      const broken = sator.map((r) => [...r]);
      broken[0][0] = "X".charCodeAt(0);
      const out = verifyAllEightAxes(broken);
      expect(out.ok).to.equal(false);
    });
  });

  describe("submit_prophecy", () => {
    it("fails with BadSigner when called by the wrong signer", async () => {
      const h = await setupHarness();
      await callInitialize(h);
      await callTick(h, 1);

      const wrongSigner = Keypair.generate();

      let caught: any = null;
      try {
        await callSubmitProphecy(
          h,
          1,
          "ipfs://wrong",
          fixedHash(1),
          wrongSigner,
          wrongSigner.publicKey
        );
      } catch (e: any) {
        caught = e;
      }
      expect(caught, "expected wrong-signer call to fail").to.not.equal(null);
      const msg = String(caught);
      expect(msg).to.match(/BadSigner|ConstraintHasOne/);
    });

    it("succeeds with the configured oracle_signer and updates state", async () => {
      const h = await setupHarness();
      await callInitialize(h);
      await callTick(h, 1);

      const hash = fixedHash(7);
      await callSubmitProphecy(h, 1, "ipfs://prophecy-1", hash);

      const epochSq: any = await h.program.account.epochSquare.fetch(
        epochSquarePda(1)
      );
      expect(epochSq.prophecySubmitted).to.equal(true);
      expect(epochSq.prophecyUri).to.equal("ipfs://prophecy-1");
      expect(Array.from(epochSq.prophecyHash)).to.deep.equal(hash);

      const lg: any = await h.program.account.lookingGlass.fetch(
        lookingGlassPda()
      );
      expect(lg.ringHead).to.equal(1);
      expect(Array.from(lg.lastProphecyHash)).to.deep.equal(hash);
      expect(Array.from(lg.prophecyRing[0])).to.deep.equal(hash);
    });

    it("cannot be called twice for the same epoch", async () => {
      const h = await setupHarness();
      await callInitialize(h);
      await callTick(h, 1);

      await callSubmitProphecy(h, 1, "ipfs://first", fixedHash(11));

      let caught: any = null;
      try {
        await callSubmitProphecy(h, 1, "ipfs://second", fixedHash(12));
      } catch (e: any) {
        caught = e;
      }
      expect(caught, "expected second submission to fail").to.not.equal(null);
      expect(String(caught)).to.match(/AlreadySubmitted/);
    });
  });

  describe("prophecy_ring wraparound", () => {
    it(
      "after 9 ticks + 9 prophecies, ring wraps and last_prophecy_hash matches",
      async () => {
        const h = await setupHarness();
        await callInitialize(h);

        const submittedHashes: number[][] = [];

        for (let epoch = 1; epoch <= 9; epoch++) {
          if (epoch > 1) {
            await advanceClock(h.context, MIN_TICK_INTERVAL + 30);
          }
          await callTick(h, epoch);
          const hash = fixedHash(epoch * 17);
          await callSubmitProphecy(h, epoch, `ipfs://e${epoch}`, hash);
          submittedHashes.push(hash);
        }

        const lg: any = await h.program.account.lookingGlass.fetch(
          lookingGlassPda()
        );

        expect(lg.epoch.toString()).to.equal("9");
        expect(lg.ringHead).to.equal(1);
        expect(Array.from(lg.lastProphecyHash)).to.deep.equal(
          submittedHashes[8]
        );

        // Slot 0 was overwritten by epoch 9's prophecy.
        expect(Array.from(lg.prophecyRing[0])).to.deep.equal(
          submittedHashes[8]
        );
        for (let slot = 1; slot < PROPHECY_HISTORY_DEPTH; slot++) {
          // Slot k holds the prophecy from epoch k+1 (1-indexed by epoch).
          expect(Array.from(lg.prophecyRing[slot])).to.deep.equal(
            submittedHashes[slot]
          );
        }
      }
    ).timeout(60000);
  });
});
