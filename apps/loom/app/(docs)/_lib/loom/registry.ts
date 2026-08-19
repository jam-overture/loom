import { createThemeRegistry, type ThemeRegistry } from "@loom/runtime"
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { describeRegistryError, type PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * What the documentation's examples may be built from: the starter library,
 * registered through the public SDK exactly as a host would.
 *
 * There is one registry for the whole site rather than one per example. A
 * registry is the allowlist of what a proposal may name (0018), and an example
 * that quietly registered a primitive of its own to make a page work would be
 * documenting a library the reader does not have.
 *
 * A refused registry throws at module scope, which is the right time: it means
 * the library the docs describe does not load, and every page on the site is
 * about to be wrong.
 */

const built = createStarterPrimitiveRegistry()

if (!built.ok) {
  throw new Error(`loom: the documentation registry was refused — ${describeRegistryError(built.error)}`)
}

export const docsRegistry: PrimitiveRegistry = built.value

/** The palettes, font packs and style presets an example may name (0049). */
export const docsThemes: ThemeRegistry = createThemeRegistry()
