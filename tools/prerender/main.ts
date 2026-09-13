import { describeRunTogether, runTogethersIn, separatorsIn } from "./hazards.js"
import { describePrerenderError, prerenderedPages } from "./pages.js"

/**
 * `pnpm prerender:check` — reads the pages a reader is actually served.
 *
 * Runs after `next build` in `pnpm verify`, because that is when the artefact
 * exists. It is deliberately the last thing the gate does: everything before it
 * asks whether the source is right, and this asks the one question none of them
 * can — what came out.
 *
 * What it prints when it passes matters as much as what it prints when it
 * fails. A count of pages and of separators read is the difference between "the
 * output is clean" and "nothing was opened", and those two are the same green
 * tick to everybody downstream of it.
 */

const found = await prerenderedPages()

if (!found.ok) {
  process.stderr.write(`${describePrerenderError(found.error)}\n`)
  process.exit(1)
}

const pages = found.value

const hazards = pages.flatMap((page) => runTogethersIn(page.path, page.html))
const separators = pages.reduce((total, page) => total + separatorsIn(page.html), 0)

for (const hazard of hazards) process.stderr.write(`${describeRunTogether(hazard)}\n`)

process.stdout.write(
  `${pages.length} prerendered pages, ${separators} text junctions, ${hazards.length} run together\n`
)

process.exit(hazards.length === 0 ? 0 : 1)
