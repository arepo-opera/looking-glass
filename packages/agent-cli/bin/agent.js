#!/usr/bin/env node
// Entry shim — keeps the bin spec simple while the implementation lives
// under ../dist/cli.js (produced by `tsc`). Uses dynamic import so the
// shebang line, which must be the file's first line, is preserved.
import("../dist/cli.js")
  .then((m) => m.run())
  .catch((err) => {
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(1);
  });
