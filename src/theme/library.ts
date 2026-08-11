import {
  fontPackSchema,
  paletteSchema,
  stylePresetSchema,
  type FontPack,
  type Palette,
  type StylePreset,
} from "./theme.js"

/**
 * The starter vocabulary, ported from the Hermes registry.
 *
 * Two palettes rather than one, deliberately: a single palette cannot show
 * whether a primitive reads its colours from the slots or hard-codes them, and
 * the port of the remaining twenty-seven is only safe once something proves a
 * primitive survives being re-themed.
 */

export const editorialPalette: Palette = paletteSchema.parse({
  id: "editorial",
  name: "Editorial",
  description: "Restrained, high-contrast magazine palette with a single muted accent.",
  slots: {
    "bg-canvas": "#fafaf7",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f0eee9",
    "bg-overlay": "#ffffff",
    "fg-default": "#0a0a0a",
    "fg-muted": "#525252",
    "fg-subtle": "#a3a3a3",
    "fg-on-accent": "#ffffff",
    accent: "#4a5b78",
    "accent-strong": "#34425a",
    "accent-subtle": "#e6ebf2",
    "brand-secondary": "#4a5b78",
    "brand-secondary-strong": "#34425a",
    "border-default": "#e5e5e5",
    "border-strong": "#0a0a0a",
    "border-subtle": "#efefe9",
    "border-accent": "#4a5b78",
  },
})

export const boldPalette: Palette = paletteSchema.parse({
  id: "bold",
  name: "Bold",
  description: "Black canvas with bright yellow and red accents. High-energy, graphic.",
  slots: {
    "bg-canvas": "#0a0a0a",
    "bg-surface": "#1a1a1a",
    "bg-surface-muted": "#0f0f0f",
    "bg-overlay": "#1a1a1a",
    "fg-default": "#f5f5f5",
    "fg-muted": "#a3a3a3",
    "fg-subtle": "#6b6b6b",
    "fg-on-accent": "#0a0a0a",
    accent: "#ffd400",
    "accent-strong": "#e0b800",
    "accent-subtle": "#3a3000",
    "brand-secondary": "#ff3344",
    "brand-secondary-strong": "#d81f2f",
    "border-default": "#2a2a2a",
    "border-strong": "#f5f5f5",
    "border-subtle": "#1f1f1f",
    "border-accent": "#ffd400",
  },
})

/**
 * Families are declared with their own fallback stacks and no loader. Loom does
 * not fetch fonts: a host that wants a webfont links it, and a primitive renders
 * correctly in the fallback until it arrives. Hermes emitted a Google Fonts URL
 * here, which put a network dependency inside a pure function.
 */
export const editorialSerifFontPack: FontPack = fontPackSchema.parse({
  id: "editorial-serif",
  name: "Editorial Serif",
  description: "Serif headlines over a humanist sans body. Reads as considered rather than loud.",
  headingFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  bodyFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 32, 48, 72],
})

export const boldSansFontPack: FontPack = fontPackSchema.parse({
  id: "bold-sans",
  name: "Bold Sans",
  description: "Compressed display headlines over a clean body. Leans on weight rather than ornament.",
  headingFamily: 'Impact, "Haettenschweiler", "Arial Narrow Bold", sans-serif',
  bodyFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headingWeight: 400,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 32, 56, 88],
})

export const comfortableStylePreset: StylePreset = stylePresetSchema.parse({
  id: "comfortable",
  name: "Comfortable",
  description: "Moderate radii and generous spacing. The safe default for reading-led pages.",
  radii: { sm: 6, md: 12, lg: 24, full: 9999 },
  spacingScale: [4, 8, 12, 20, 32, 48, 64, 96],
  motion: { fast: 150, medium: 250, slow: 400 },
  density: "comfortable",
})

export const airyModernStylePreset: StylePreset = stylePresetSchema.parse({
  id: "airy-modern",
  name: "Airy Modern",
  description: "Larger radii and looser spacing. Pairs with vibrant palettes.",
  radii: { sm: 8, md: 16, lg: 32, full: 9999 },
  spacingScale: [4, 8, 14, 22, 32, 48, 72, 96],
  motion: { fast: 180, medium: 280, slow: 450 },
  density: "comfortable",
})

export const STARTER_PALETTES: readonly Palette[] = [editorialPalette, boldPalette]
export const STARTER_FONT_PACKS: readonly FontPack[] = [editorialSerifFontPack, boldSansFontPack]
export const STARTER_STYLE_PRESETS: readonly StylePreset[] = [
  comfortableStylePreset,
  airyModernStylePreset,
]
