import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { COMPILED_DIR, compiledPrograms } from "./compiled"

/**
 * Write the pages' programs out.
 *
 *     pnpm --filter @loom/app docs:fences
 *
 * Run it after editing code on a documentation page. Then `pnpm verify`
 * typechecks what you wrote, because the file this produced is an ordinary part
 * of the application by the time `tsc` runs.
 *
 * The directory is emptied first. A page that loses its last code block, or one
 * whose blocks stop needing JSX and so change the file's extension, would
 * otherwise leave a program behind that no page any longer says — and a stale
 * file that still compiles is exactly the kind of green nobody should trust.
 */

mkdirSync(COMPILED_DIR, { recursive: true })

readdirSync(COMPILED_DIR)
  .filter((name) => name !== "README.md")
  .forEach((name) => rmSync(join(COMPILED_DIR, name)))

const programs = compiledPrograms()

programs.forEach((program) => writeFileSync(join(COMPILED_DIR, program.fileName), program.source, "utf8"))

process.stdout.write(`loom: wrote ${programs.length} page programs to _lib/fences/compiled\n`)
