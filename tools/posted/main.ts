import { readFile } from "node:fs/promises"

import { describeMangling, manglingIn, urlsIn } from "./mangling.js"

/**
 * `pnpm posted <file> …` — the read-back, as a command rather than as a habit.
 *
 * A run posts a pull request body or a comment, reads the stored markdown back
 * through the API, writes it to a file, and points this at it. What it prints
 * is how many URLs the body carries and which of them came back with
 * characters welded on. `mangling.ts` holds the measurements that
 * are the reason this is the procedure and a length budget is not.
 *
 * **It fetches nothing.** Reading a pull request back needs credentials this
 * repository does not hold and a tool a run already has; splitting the fetch
 * from the reading keeps the half that can be tested testable, which is the
 * same split `pnpm weigh` makes for the same reason.
 *
 * **Not part of `pnpm verify`.** The text it reads is never committed, so there
 * is nothing on a branch for a gate to check. `docs/routines.md`, *Posting to
 * GitHub*, is where a run meets this.
 *
 * It exits non-zero when it finds something, so a run that forgets to read the
 * output still learns there is something to read.
 */

const bodies = process.argv.slice(2)

if (bodies.length === 0) {
  process.stderr.write("usage: pnpm posted <file> …\n")
  process.stderr.write("  each file is a pull request body or comment, read back from the API after posting\n")
  process.exit(1)
}

let mangled = 0
let unread = 0

for (const path of bodies) {
  const body = await readFile(path, "utf8").catch(() => undefined)

  if (body === undefined) {
    unread += 1
    process.stderr.write(`${path}  not read\n`)
    continue
  }

  const manglings = manglingIn(body)
  const urls = urlsIn(body).length

  if (manglings.length === 0) {
    process.stdout.write(`${path}  ${urls} URL${urls === 1 ? "" : "s"}, none mangled\n`)
    continue
  }

  mangled += manglings.length
  process.stdout.write(`${path}  ${urls} URL${urls === 1 ? "" : "s"}, ${manglings.length} mangled\n`)
  for (const mangling of manglings) process.stdout.write(`  ${describeMangling(mangling)}\n`)
}

if (mangled > 0) {
  process.stderr.write(
    `\n${mangled} run${mangled === 1 ? "" : "s"} of inserted characters. Re-posting the same text does not fix it:\n` +
      `replace the link with a backticked repository path, an autolink, or a bare URL on its own line,\n` +
      `post the replacement, and read it back again.\n`
  )
}

process.exit(mangled === 0 && unread === 0 ? 0 : 1)
