import { writeFile } from "node:fs/promises"

import { generatedReadme, README_PATH } from "./collect.js"

/**
 * `pnpm decisions:index` — rewrites the index from the record files.
 *
 * The guard test asserts the committed README already matches this, so running
 * it is how you satisfy that test rather than how you satisfy the index. A
 * problem with the numbering is reported and still written: the table is not
 * what is wrong, the records are, and refusing to write would leave the index
 * stale on top of the real fault.
 */

const { readme, problems } = await generatedReadme()

await writeFile(README_PATH, readme, "utf8")

for (const problem of problems) process.stderr.write(`${problem}\n`)

process.exit(problems.length === 0 ? 0 : 1)
