import { createThemeRegistry, type ThemeRegistry } from "@loom/runtime"
import { createStarterPrimitiveRegistry } from "@loom/runtime/primitives"
import { describeRegistryError, type PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * What the demo may build from: the starter library, registered through the
 * public SDK exactly as any host would (0018).
 *
 * It is deliberately not the portal's own four-primitive registry. The portal's
 * exists to prove the *contract* — a card, a heading, some prose — and a demo
 * built from it would show the runtime working on something nobody would ship.
 * Two registries in one deployment is also the honest picture: a registry is a
 * per-surface decision about what a model may name here, not a global.
 */

const built = createStarterPrimitiveRegistry()

if (!built.ok) {
  throw new Error(`loom: the demo registry was refused — ${describeRegistryError(built.error)}`)
}

export const demoRegistry: PrimitiveRegistry = built.value

/** The palettes, font packs and style presets a proposal may name here (0049). */
export const demoThemes: ThemeRegistry = createThemeRegistry()
