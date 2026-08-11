import { err, ok, type Result } from "../result.js"

import {
  STARTER_FONT_PACKS,
  STARTER_PALETTES,
  STARTER_STYLE_PRESETS,
} from "./library.js"
import {
  themeSelectionSchema,
  type FontPack,
  type Palette,
  type ResolvedTheme,
  type StylePreset,
} from "./theme.js"

/**
 * Resolving three ids into three documents, and refusing when it cannot.
 *
 * This is the same shape as the primitive resolver, for the same reason: what a
 * deployment offers is data, and a model may only choose from what is
 * registered. It is also what a catalogue is built from — a model asked to
 * re-theme needs the list and the one-line descriptions, not the hex.
 */

export type ThemeError =
  | { readonly code: "unknown-palette"; readonly id: string; readonly available: readonly string[] }
  | { readonly code: "unknown-font-pack"; readonly id: string; readonly available: readonly string[] }
  | { readonly code: "unknown-style-preset"; readonly id: string; readonly available: readonly string[] }
  | { readonly code: "malformed-selection"; readonly detail: string }

export const describeThemeError = (error: ThemeError): string =>
  error.code === "malformed-selection"
    ? `Theme selection is malformed: ${error.detail}`
    : `No ${error.code.replace("unknown-", "").replace("-", " ")} "${error.id}". Registered: ${error.available.join(", ") || "none"}.`

export type ThemeCatalogueEntry = {
  readonly id: string
  readonly name: string
  readonly description: string
}

export interface ThemeRegistry {
  /**
   * `unknown` in, because a selection arrives from the tree — storage is a
   * boundary, and the parse below is the only thing that says a selection is
   * one. A caller holding a `ThemeSelection` already satisfies it.
   */
  readonly resolve: (selection: unknown) => Result<ResolvedTheme, ThemeError>
  /** What a deployment can be themed with, as data a model can be shown. */
  readonly catalogue: () => {
    readonly palettes: readonly ThemeCatalogueEntry[]
    readonly fontPacks: readonly ThemeCatalogueEntry[]
    readonly stylePresets: readonly ThemeCatalogueEntry[]
  }
}

const entryOf = (item: { id: string; name: string; description: string }): ThemeCatalogueEntry => ({
  id: item.id,
  name: item.name,
  description: item.description,
})

const indexBy = <TItem extends { id: string }>(items: readonly TItem[]): ReadonlyMap<string, TItem> =>
  new Map(items.map((item) => [item.id, item]))

export type ThemeRegistryInput = {
  readonly palettes?: readonly Palette[]
  readonly fontPacks?: readonly FontPack[]
  readonly stylePresets?: readonly StylePreset[]
}

export const createThemeRegistry = (input: ThemeRegistryInput = {}): ThemeRegistry => {
  const palettes = indexBy(input.palettes ?? STARTER_PALETTES)
  const fontPacks = indexBy(input.fontPacks ?? STARTER_FONT_PACKS)
  const stylePresets = indexBy(input.stylePresets ?? STARTER_STYLE_PRESETS)

  return {
    resolve: (selection) => {
      const parsed = themeSelectionSchema.safeParse(selection)
      if (!parsed.success) {
        const [issue] = parsed.error.issues

        return err({
          code: "malformed-selection",
          detail: issue ? `${issue.path.join(".")}: ${issue.message}` : "unknown",
        })
      }

      const palette = palettes.get(parsed.data.palette)
      if (!palette) {
        return err({
          code: "unknown-palette",
          id: parsed.data.palette,
          available: [...palettes.keys()],
        })
      }

      const fontPack = fontPacks.get(parsed.data.fontPack)
      if (!fontPack) {
        return err({
          code: "unknown-font-pack",
          id: parsed.data.fontPack,
          available: [...fontPacks.keys()],
        })
      }

      const stylePreset = stylePresets.get(parsed.data.stylePreset)
      if (!stylePreset) {
        return err({
          code: "unknown-style-preset",
          id: parsed.data.stylePreset,
          available: [...stylePresets.keys()],
        })
      }

      return ok({ palette, fontPack, stylePreset })
    },

    catalogue: () => ({
      palettes: [...palettes.values()].map(entryOf),
      fontPacks: [...fontPacks.values()].map(entryOf),
      stylePresets: [...stylePresets.values()].map(entryOf),
    }),
  }
}
