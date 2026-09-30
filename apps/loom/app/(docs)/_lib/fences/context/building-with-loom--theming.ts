import type { FontPack, Palette, StylePreset } from "@jam-overture/loom"
import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * Making it look like yours.
 *
 * Four things a deployment wrote, declared rather than written out. A palette
 * is fifty colors and the page is not about their values — it is about the one
 * line that registers them, and that line is checked against
 * `createThemeRegistry`'s real signature either way.
 */

export declare const ourLightPalette: Palette
export declare const ourDarkPalette: Palette
export declare const ourFontPack: FontPack
export declare const ourStylePreset: StylePreset

/**
 * The registry the story already built.
 *
 * The excerpt block at the foot of the page is written from inside an
 * application that has been resolving trees for pages already — a preview pane
 * is not the first thing anybody renders. Registering primitives is *Building
 * with Loom*'s own page, two doors back, and repeating it here would put the
 * section's one interesting line at the bottom of a block about something else.
 */
export declare const registry: PrimitiveRegistry
