import { describeRunTogether, runTogethersIn, separatorsIn } from "./hazards.js"
import {
  appRouteKeys,
  describeMetadataError,
  describeUnserved,
  metadataSources,
  unservedMetadata,
} from "./metadata.js"
import { describePrerenderError, prerenderedPages } from "./pages.js"

/**
 * `pnpm prerender:check` — reads what the build produced, which is the one
 * question the rest of the gate cannot ask.
 *
 * Runs after `next build` in `pnpm verify`, because that is when the artefact
 * exists. It is deliberately the last thing the gate does: everything before it
 * asks whether the source is right, and this asks what came out.
 *
 * Two things come out, and each has a defect class of its own. The **pages** a
 * reader is served carry text junctions no `textContent` assertion can see. The
 * **routes** a reader is served are the answer to a question no assertion can
 * ask at all — a metadata file that the build never read produces no artefact
 * to be wrong, only silence.
 *
 * What it prints when it passes matters as much as what it prints when it
 * fails. A count of pages, junctions and conventions read is the difference
 * between "the output is clean" and "nothing was opened", and those two are the
 * same green tick to everybody downstream of it.
 */

const found = await prerenderedPages()

if (!found.ok) {
  process.stderr.write(`${describePrerenderError(found.error)}\n`)
  process.exit(1)
}

const routes = await appRouteKeys()

if (!routes.ok) {
  process.stderr.write(`${describeMetadataError(routes.error)}\n`)
  process.exit(1)
}

const pages = found.value
const conventions = await metadataSources()

const hazards = pages.flatMap((page) => runTogethersIn(page.path, page.html))
const separators = pages.reduce((total, page) => total + separatorsIn(page.html), 0)
const unserved = unservedMetadata(conventions, routes.value)

for (const hazard of hazards) process.stderr.write(`${describeRunTogether(hazard)}\n`)
for (const source of unserved) process.stderr.write(`${describeUnserved(source)}\n`)

process.stdout.write(
  `${pages.length} prerendered pages, ${separators} text junctions, ${hazards.length} run together; ` +
    `${conventions.length} metadata conventions, ${unserved.length} unserved\n`
)

process.exit(hazards.length === 0 && unserved.length === 0 ? 0 : 1)
