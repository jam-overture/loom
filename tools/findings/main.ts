import { readFile } from "node:fs/promises"

import { describeFault, entriesIn, faultsIn } from "./entries.js"

/**
 * `pnpm findings:check` — the ledger seven routines share, read by something.
 *
 * It runs inside `pnpm verify` rather than beside it, because the file is
 * edited on every branch and the damage it catches is done by merging, which is
 * to say by the one action nobody re-reads afterwards.
 *
 * A pass prints the count. Two hundred entries checked and none faulty is a
 * different fact from a file that failed to open, and the exit code says the
 * same thing for both.
 */

const LEDGER = "FINDINGS.md"

const markdown = await readFile(LEDGER, "utf8").catch(() => undefined)

if (markdown === undefined) {
  process.stderr.write(`${LEDGER} could not be read — run this from the repository root\n`)
  process.exit(1)
}

const entries = entriesIn(markdown)
const faults = entries.flatMap(faultsIn)

for (const fault of faults) process.stderr.write(`${describeFault(fault)}\n`)

process.stdout.write(`${entries.length} findings, ${faults.length} malformed\n`)

process.exit(faults.length === 0 ? 0 : 1)
