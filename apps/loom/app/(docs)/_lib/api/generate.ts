import { writeFileSync } from "node:fs"

import { extractReference, GENERATED_FILE, serializeReference } from "./extract"
import { apiSymbolCount } from "./model"

/**
 * Write the reference out.
 *
 *     pnpm --filter @loom/app docs:api
 *
 * Run it after anything that changes the runtime's published surface — which is
 * to say, after `pnpm build` has produced the declarations it reads. The
 * committed file is what the pages import, so the reference is data by the time
 * Next sees it and no page loads a compiler.
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
