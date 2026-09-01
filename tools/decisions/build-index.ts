import { writeFile } from "node:fs/promises"

import { blocking, generatedReadme, README_PATH } from "./collect.js"

/**
 * `pnpm decisions:index` — rewrites the index from the record files.
 *
 * The guard test asserts the committed README already matches this, so running
 * it is how you satisfy that test rather than how you satisfy the index. A
 * problem with the numbering is reported and still written: the table is not
 * what is wrong, the records are, and refusing to write would leave the index
 * stale on top of the real fault.
 *
 * Only a `blocking` problem sets the exit code. A hole in the sequence prints
 * and passes, because the index it just wrote now carries a row saying so —
 * which is a better place for it than an exit code that stops six other lanes.
 */

const { readme, problems } = await generatedReadme()

await writeFile(README_PATH, readme, "utf8")

for (const problem of problems) {
  process.stderr.write(`${problem.severity === "blocking" ? "" : "note: "}${problem.message}\n`)
}

process.exit(blocking(problems).length === 0 ? 0 : 1)
