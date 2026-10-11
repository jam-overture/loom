import { STARTER_PRIMITIVES } from "@jam-overture/loom/primitives"
import { createPrimitiveRegistry, describeRegistryError, type PrimitiveRegistry } from "@jam-overture/loom/sdk"

import { serviceStatus } from "./status.service"

/**
 * The registry *A primitive of your own* renders through: the starter library,
 * plus one primitive written on that page.
 *
 * Every other example on this site is built from `docsRegistry`, and
 * `_lib/loom/registry.ts` says why: an example that quietly registered a
 * primitive of its own would be documenting a library the reader does not have.
 * That argument is still right, and this is not that. The primitive here is the
 * **subject** of the page rather than a convenience for it — the reader is shown
 * its whole file, told where it came from, and invited to write the same thing.
 * It is the same licence `_lib/reporting/catalogue.ts` takes for a component
 * that breaks its own declaration: a bench demonstrating a thing is documenting
 * that thing.
 *
 * Two properties make the page worth more than a snippet would be:
 *
 * - **It is registered beside the whole starter library**, which is what a real
 *   project looks like. A reader does not replace the library to add a word to
 *   it, and a page that demonstrated a registry of exactly one would be teaching
 *   a shape nobody ships.
 * - **The propose-a-change box works on it.** The site's own policy, the site's
 *   own interpreter, and a tree holding a primitive that does not exist outside
 *   this page. Nothing about the write path knows the difference, which is the
 *   claim the page is making.
 */

const built = createPrimitiveRegistry([...STARTER_PRIMITIVES, serviceStatus])

if (!built.ok) {
  throw new Error(
    `loom: the registry behind "a primitive of your own" was refused — ${describeRegistryError(built.error)}`
  )
}

export const ownRegistry: PrimitiveRegistry = built.value

/** The type the page writes, in one place, so nothing spells it twice. */
export const OWN_PRIMITIVE_TYPE = "status.service"

/**
 * What a reader would save it as: the type verbatim, dots included, which is the
 * convention the CLI follows and *Scaffolding a project* explains.
 */
export const OWN_PRIMITIVE_FILENAME = `${OWN_PRIMITIVE_TYPE}.ts`

/** Where the file is, from the repository root. */
export const OWN_PRIMITIVE_PATH = [
  "apps",
  "loom",
  "app",
  "(docs)",
  "_lib",
  "own",
  OWN_PRIMITIVE_FILENAME,
] as const

/**
 * The props a healthy row carries: the one the page's example uses in its middle
 * row, and the one every refusal in `proving.ts` is a variation of.
 *
 * Here rather than beside the refusals because the example catalogue reads it,
 * and the example catalogue is reached from a client component. Nothing in this
 * module touches the filesystem for that reason; `source.ts` is the half that
 * does, and only a server component imports it.
 */
export const OWN_SOUND_PROPS = {
  service: "Checkout",
  state: "degraded",
  since: "09:14 UTC",
} as const satisfies Readonly<Record<string, string>>
