import { writeFileSync } from "node:fs"

import { extractReference, GENERATED_FILE, serializeReference } from "./extract"
import { apiSymbolCount } from "./model"

/**
 * Write the reference out.
 *
 *     pnpm --filter @loom/app docs:api
 *
 * Run it after anything that changes the runtime's published surface. The
 * committed file is what the pages import, so the reference is data by the time
 * Next sees it and no page loads a compiler.
 *
 * **The script builds the package first, and that is not decoration.** Every
 * name below comes from `dist/*.d.ts` — the published surface is what the build
 * emits rather than what the source says — so this is only ever as current as
 * `dist/`. It did not build, and on 13 October it printed *"wrote 17 entry
 * points and 1599 exports"* and changed nothing after a merge brought four new
 * modules in, because the declarations it read still described the package from
 * before. The honest answer was 1634. `pnpm verify` caught it a quarter of an
 * hour later by building fresh and comparing, which is the gate doing its job
 * after the command had already said there was nothing to do.
 *
 * `docs:fences` is the other generator whose output is committed and it is
 * deliberately left alone: it reads the pages' own code blocks and writes
 * TypeScript, so there is nothing in `dist/` for it to be stale against. What
 * needs the build is the `tsc` run that reads what it wrote, and that is
 * `verify`'s to do.
 *
 * Committing a generated file earns two things worth the noise in a diff. A
 * pull request that adds an export shows what it added to the public surface,
 * in the same review as the change. And `pnpm verify` regenerates and compares,
 * so a reference nobody remembered to rebuild is a red test rather than a page
 * that quietly describes last week's package.
 */

const reference = extractReference()

writeFileSync(GENERATED_FILE, serializeReference(reference), "utf8")

const total = reference.entries.reduce((count, entry) => count + apiSymbolCount(entry), 0)

process.stdout.write(
  `loom: wrote ${reference.entries.length} entry points and ${total} exports to reference.generated.json\n`
)
