import { createThemeRegistry, type ThemeRegistry } from "@jam-overture/loom"
import { createStarterPrimitiveRegistry } from "@jam-overture/loom/primitives"
import { describeRegistryError, type PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * What the site may be built from: the starter library, registered through the
 * public SDK exactly as any host would (0018).
 *
 * Nothing is added to it. §4d says the site reuses §4b's primitives and adds
 * pages rather than components, and a marketing site quietly carrying three
 * bespoke primitives would be evidence against the library rather than for it —
 * so a band this site needs and cannot build is a finding, not a local
 * component.
 */

const built = createStarterPrimitiveRegistry()

if (!built.ok) {
  throw new Error(`loom: the marketing registry was refused — ${describeRegistryError(built.error)}`)
}

export const siteRegistry: PrimitiveRegistry = built.value

/** The palettes, font packs and style presets this site may wear (0049). */
export const siteThemes: ThemeRegistry = createThemeRegistry()
